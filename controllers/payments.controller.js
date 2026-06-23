const Metodo = require('../models/method.model');
const Payment = require('../models/payments.model');
const Ticket = require('../models/ticket.model');

const { Types } = require('mongoose');

/** =====================================================================
 *  GET REPORT PAYMENT CONTABLE
=========================================================================*/
const obtenerPagosList = async (req, res = response) => {

    try {
        // Extraemos paginación y filtros dinámicos
        const { 
            desde = 0, 
            hasta = 50, 
            sort = { fecha: -1 }, // Orden por defecto: los más recientes primero
            estado, 
            vendedor,
            method,
            ruta,
            ticket,
            rifa,
            fechaInicio, 
            fechaFin
        } = req.body;

        if (!req.adminId) {
            return res.status(403).json({ ok: false, msg: 'Error de contexto multi-tenant' });
        }

        // 1. Filtro base de seguridad
        const query = {
            admin: req.adminId,
            status: true
        };

        // 2. Filtros Dinámicos
        if (estado) {
            // Si Angular nos envía un arreglo (Ej: ['Pendiente', 'Confirmado'])
            if (Array.isArray(estado)) {
                query.estado = { $in: estado };
            } else {
                // Si Angular nos envía un solo texto (Ej: 'Confirmado')
                query.estado = estado;
            }
        }
        if (vendedor) query.vendedor = vendedor;
        if (ruta) query.ruta = ruta;
        if (rifa) query.rifa = rifa;
        if (ticket) query.ticket = ticket;
        if (method) query.method = new Types.ObjectId(method);


        // 3. Filtrado Estricto de Fechas
        if (fechaInicio && fechaFin) {
            // Se asegura de tomar el rango completo de los días seleccionados
            const start = new Date(fechaInicio);
            start.setUTCHours(0, 0, 0, 0); 
            
            const end = new Date(fechaFin);
            end.setUTCHours(23, 59, 59, 999); 

            query.fecha = {
                $gte: start,
                $lte: end
            };
        }

        // 4. Ejecución en paralelo con Populate para traer la data relacional
        const [pagos, total] = await Promise.all([
            Payment.find(query)
                .populate('vendedor', 'name email role')     // Trae el nombre del cobrador
                .populate('cliente', 'nombre telefono')        // Trae los datos del comprador
                .populate('ticket', 'numero monto estado')     // Trae el número de boleto
                .populate('method', 'nombre cuenta moneda')           // Trae el nombre del banco/método
                .populate('rifa', 'name')
                .populate('ruta', 'name')
                .sort(sort)
                .skip(Number(desde))
                .limit(Number(hasta)),
            Payment.countDocuments(query)
        ]);

        res.json({
            ok: true,
            pagos,
            total
        });

    } catch (error) {
        console.log('Error en obtenerPagosList:', error);
        res.status(500).json({ ok: false, msg: 'Error al consultar la lista de pagos' });
    }
};

/** =====================================================================
 *  GET REPORT PAYMENT CONTABLE
=========================================================================*/
const obtenerReporteContable = async(req, res = response) => {
    
    try {
        // Extraemos todos los posibles filtros que envíe Angular
        const { desde, hasta, estado, vendedor, ruta, rifa, metodo, method } = req.body; 

        if (!req.adminId) {
            return res.status(403).json({ ok: false, msg: 'Error de contexto' });
        }

        // 1. Construimos el filtro base de seguridad (Multi-tenant)
        const matchFiltro = {
            admin: new Types.ObjectId(req.adminId), 
            status: true
        };

        // 2. Filtro Dinámico: Estado
        if (estado) {
            // Permite buscar 'Pendiente', 'Cancelado', o todos.
            matchFiltro.estado = estado; 
        } else {
            // Por defecto, protegemos la auditoría mostrando solo lo Confirmado
            matchFiltro.estado = 'Confirmado'; 
        }

        // 3. Filtros Dinámicos Relacionales (Cobradores, Rutas, Rifas)
        if (vendedor) matchFiltro.vendedor = new Types.ObjectId(vendedor);
        if (ruta) matchFiltro.ruta = new Types.ObjectId(ruta);
        if (rifa) matchFiltro.rifa = new Types.ObjectId(rifa);
        if (method) matchFiltro.method = new Types.ObjectId(method);
        if (metodo) matchFiltro.metodo = new Types.ObjectId(metodo);


        // 4. Filtro de Fechas Estricto
        if (desde && hasta) {
            matchFiltro.fecha = {
                $gte: new Date(desde),
                $lte: new Date(hasta)
            };
        }

        // 5. AGGREGATE: Aplicamos el súper filtro dinámico
        const reporte = await Payment.aggregate([
            { $match: matchFiltro }, // El embudo que filtra por todo lo que armamos arriba
            { 
                $group: { 
                    _id: '$method', 
                    totalMontoOriginal: { $sum: '$monto' },
                    totalEquivalenciaUSD: { $sum: '$equivalencia' },
                    cantidadTransacciones: { $sum: 1 }
                } 
            },
            { 
                $lookup: {
                    from: 'methods', 
                    localField: '_id',
                    foreignField: '_id',
                    as: 'metodoInfo'
                }
            },
            { $unwind: '$metodoInfo' }, 
            {
                // Limpieza de decimales para evitar montos como 14.2800000001 en el frontend
                $project: {
                    _id: 1,
                    metodoNombre: '$metodoInfo.nombre',
                    moneda: '$metodoInfo.moneda',
                    metodoCuenta: '$metodoInfo.cuenta',
                    totalMontoOriginal: { $round: ['$totalMontoOriginal', 2] },
                    totalEquivalenciaUSD: { $round: ['$totalEquivalenciaUSD', 2] },
                    cantidadTransacciones: 1
                }
            }
        ]);

        res.json({
            ok: true,
            reporte,
            filtrosAplicados: matchFiltro // Opcional: útil para debug en el frontend
        });

    } catch (error) {
        console.log('Error en obtenerReporteContable:', error);
        res.status(500).json({ ok: false, msg: 'Error generando el reporte contable' });
    }
};

/** =====================================================================
 *  CREATE PAYMENT
=========================================================================*/
const createPayments = async(req, res = response) => {
    
    try {
        const { pagos } = req.body; 

        if (!pagos || !Array.isArray(pagos) || pagos.length === 0) {
            return res.status(400).json({ ok: false, msg: 'No se enviaron pagos para procesar' });
        }

        // =====================================================================
        // ETAPA 1: PRE-VALIDACIÓN (Asegura que TODO el lote sea correcto)
        // =====================================================================
        for (const pagoData of pagos) {
            const ticketDB = await Ticket.findById(pagoData.ticket);
            
            if (!ticketDB) {
                return res.status(444).json({ 
                    ok: false, 
                    msg: `El ticket con ID ${pagoData.ticket} no existe.` 
                });
            }

            if (ticketDB.estado === 'Disponible' || ticketDB.disponible) {
                return res.status(400).json({
                    ok: false,
                    msg: `Error en el ticket #${ticketDB.numero}: No se pueden registrar pagos en tickets que estén en estado 'Disponible'.`
                });
            }

            // SUPER IMPORTANTE: Antes de registrar el pago, verificamos que el monto del abono no supere la deuda restante del ticket.
            const resultadoSuma = await Payment.aggregate([
                { 
                    $match: { 
                        ticket: ticketDB._id,
                        estado: { $in: ['Pendiente', 'Confirmado'] } 
                    } 
                },
                { $group: { _id: null, totalPagado: { $sum: '$equivalencia' } } }
            ]);

            const totalHistorico = resultadoSuma.length > 0 ? resultadoSuma[0].totalPagado : 0;
            // Redondeamos a 2 decimales para evitar errores de Javascript como 0.00000001
            const deudaRestante = Number((ticketDB.monto - totalHistorico).toFixed(2));

            // Si el abono supera la deuda (con un margen de tolerancia de 5 centavos por el tipo de cambio)
            if (pagoData.equivalencia > (deudaRestante + 0.05)) {
                return res.status(400).json({
                    ok: false,
                    msg: `Error en el ticket #${ticketDB.numero}: El abono enviado de $${pagoData.equivalencia} supera la deuda restante de $${deudaRestante}.`
                });
            }
        }

        // =====================================================================
        // ETAPA 2: ESCRITURA REAL
        // =====================================================================
        const pagosCreados = [];
        const ticketsActualizados = [];

        for (let pagoData of pagos) {
            pagoData.admin = req.adminId;
            pagoData.vendedor = req.uid;

            if (pagoData.monto <= 0 || pagoData.equivalencia <= 0) {
                continue; // Saltamos pagos con montos no positivos
            }

            // 1. Guardamos el recibo de pago (Nace como 'Pendiente' por defecto)
            const nuevoPago = new Payment(pagoData);
            await nuevoPago.save();
            pagosCreados.push(nuevoPago);

            // 2. Calculamos el nuevo total histórico del ticket
            const resultadoSuma = await Payment.aggregate([
                { 
                    $match: { 
                        ticket: nuevoPago.ticket,
                        estado: { $in: ['Pendiente', 'Confirmado'] } 
                    } 
                },
                { $group: { _id: null, totalPagado: { $sum: '$equivalencia' } } }
            ]);

            const nuevoTotalAbonado = resultadoSuma.length > 0 ? Number(resultadoSuma[0].totalPagado.toFixed(2)) : 0;
            const ticketDB = await Ticket.findById(nuevoPago.ticket);
            
            let nuevoEstadoTicket = ticketDB.estado; // 'Apartado' por defecto
            let completado = false;

            // 3. Verificamos si completó el pago
            if (nuevoTotalAbonado >= (ticketDB.monto - 0.05)) {
                nuevoEstadoTicket = 'Pagado';
                completado = true;
            }

            // 4. ACTUALIZACIÓN DEL TICKET (La Caché de Lectura)
            // Guardamos tanto el nuevo estado como el 'totalPagado'
            await Ticket.findByIdAndUpdate(
                ticketDB._id, 
                { 
                    estado: nuevoEstadoTicket,
                    totalPagado: nuevoTotalAbonado 
                }, 
                { useFindAndModify: false }
            );

            // IMPORTANTE: NO tocamos el saldo del 'Method' aquí.
            // Eso se hará en el controlador 'confirmarPagosLote' o si el pago
            // se crea directamente como 'Confirmado' (ej. efectivo entregado al jefe).
            if (nuevoPago.estado === 'Confirmado') {
                 await Metodo.findByIdAndUpdate(
                     nuevoPago.method,
                     { $inc: { saldo: nuevoPago.equivalencia } },
                     { useFindAndModify: false }
                 );
            }

            ticketsActualizados.push({
                tid: ticketDB._id,
                numero: ticketDB.numero,
                totalAbonado: nuevoTotalAbonado,
                resta: Number((ticketDB.monto - nuevoTotalAbonado).toFixed(2)),
                estadoActual: nuevoEstadoTicket,
                pagadoCompleto: completado
            });
        }

        res.json({
            ok: true,
            msg: 'Todos los pagos fueron registrados de forma limpia y exacta',
            pagos: pagosCreados,
            resumenTickets: ticketsActualizados
        });

    } catch (error) {
        console.log('Error en createPayments:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error interno procesando el lote de pagos'
        });
    }
};

/** =====================================================================
 *  CONFIRM PAYMENTS
=========================================================================*/
const confirmarPagosLote = async(req, res = response) => {
    
    try {
        const { pagosIds } = req.body; 

        if (!pagosIds || !Array.isArray(pagosIds) || pagosIds.length === 0) {
            return res.status(400).json({ ok: false, msg: 'No se enviaron pagos para confirmar' });
        }

        // 1. Buscamos los pagos que realmente están 'Pendientes' en la BD antes de cambiarlos
        const pagosAPromover = await Payment.find({
            _id: { $in: pagosIds },
            admin: req.adminId,
            estado: 'Pendiente'
        });

        if (pagosAPromover.length === 0) {
            return res.status(400).json({ 
                ok: false, 
                msg: 'No se encontraron pagos pendientes válidos para confirmar en este lote' 
            });
        }

        // Extraemos solo los IDs que sí se pueden confirmar
        const idsValidos = pagosAPromover.map(pago => pago._id);

        // 2. ACTUALIZACIÓN MASIVA DE ESTADOS
        await Payment.updateMany(
            { _id: { $in: idsValidos } }, 
            { $set: { estado: 'Confirmado' } }
        );

        // 3. ACTUALIZACIÓN DE SALDOS EN LOS MÉTODOS DE PAGO
        // Sumamos la equivalencia (USD) al saldo disponible de cada cuenta bancaria involucrada
        for (const pago of pagosAPromover) {
            await Metodo.findByIdAndUpdate(
                pago.method,
                { $inc: { saldo: pago.equivalencia } },
                { useFindAndModify: false }
            );
        }

        // Nota: No hace falta tocar Ticket.totalPagado aquí, porque el pago ya existía
        // en el ticket como 'Pendiente' y ya sumaba para su saldo desde que se creó.

        res.json({
            ok: true,
            msg: `${idsValidos.length} pagos fueron verificados y cargados al saldo de sus respectivas cuentas bancarias.`,
            modificados: idsValidos.length
        });

    } catch (error) {
        console.log('Error en confirmarPagosLote:', error);
        res.status(500).json({ ok: false, msg: 'Error interno procesando la confirmación' });
    }
};

/** =====================================================================
 *  CANCEL PAYMENT
=========================================================================*/
const cancelarPago = async (req, res = response) => {
    
    try {
        const pagoId = req.params.id;
        const { estadoCancelacion = 'Anulado' } = req.body;

        if (!req.adminId) {
            return res.status(403).json({ ok: false, msg: 'Error de contexto' });
        }

        // 1. Buscamos el pago asegurando pertenencia al tenant
        const pagoDB = await Payment.findOne({ _id: pagoId, admin: req.adminId });

        if (!pagoDB) {
            return res.status(404).json({ ok: false, msg: 'Pago no encontrado o sin privilegios' });
        }

        if (pagoDB.estado === 'Anulado' || pagoDB.estado === 'Rechazado') {
            return res.status(400).json({ ok: false, msg: `El pago ya se encuentra en estado ${pagoDB.estado}` });
        }

        // Guardamos el estado en memoria antes de sobreescribirlo
        const estadoAnterior = pagoDB.estado;

        // 2. Aplicamos el Soft Delete contable
        pagoDB.estado = estadoCancelacion;
        await pagoDB.save();

        // 3. REVERSO BANCARIO (Partida Doble)
        // Si el dinero ya había sido verificado e ingresado al saldo del método, se lo restamos
        if (estadoAnterior === 'Confirmado') {
            await Metodo.findByIdAndUpdate(
                pagoDB.method,
                { $inc: { saldo: -pagoDB.equivalencia } }, // Restamos el dinero usando valor negativo
                { useFindAndModify: false }
            );
        }

        // 4. RECALCULO Y ACTUALIZACIÓN DE LA CACHÉ DEL TICKET
        const ticketDB = await Ticket.findById(pagoDB.ticket);
        
        if (ticketDB) {
            // Sumamos solo lo que queda vivo (Pendiente y Confirmado)
            const resultadoSuma = await Payment.aggregate([
                { 
                    $match: { 
                        ticket: ticketDB._id, 
                        estado: { $in: ['Pendiente', 'Confirmado'] } 
                    } 
                },
                { $group: { _id: null, totalPagado: { $sum: '$equivalencia' } } }
            ]);

            const nuevoTotalAbonado = resultadoSuma.length > 0 ? Number(resultadoSuma[0].totalPagado.toFixed(2)) : 0;

            // CORRECCIÓN: Actualizamos la caché de lectura del ticket obligatoriamente
            ticketDB.totalPagado = nuevoTotalAbonado;

            // Si el ticket estaba 'Pagado' pero al quitar este abono vuelve a deber, pasa a 'Apartado'
            if (nuevoTotalAbonado < (ticketDB.monto - 0.05) && ticketDB.estado === 'Pagado') {
                ticketDB.estado = 'Apartado'; 
            }

            await ticketDB.save();
        }

        res.json({
            ok: true,
            msg: `El pago fue marcado como ${estadoCancelacion}. Se aplicaron los reversos correspondientes en bancos y tickets.`,
            pago: pagoDB
        });

    } catch (error) {
        console.log('Error en cancelarPago:', error);
        res.status(500).json({ ok: false, msg: 'Error interno al anular el pago' });
    }
};

module.exports = {
    obtenerPagosList,
    obtenerReporteContable,
    createPayments,
    confirmarPagosLote,
    cancelarPago
};