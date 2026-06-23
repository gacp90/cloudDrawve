const { response } = require('express');

const path = require('path');
const fs = require('fs');

const PDFDocument = require('pdfkit');

const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const ObjectId = require('mongoose').Types.ObjectId;

const Ticket = require('../models/ticket.model');
const User = require('../models/users.model');
const Rifa = require('../models/rifas.model');
const Ruta = require('../models/rutas.model');

/** =====================================================================
 *  SEARCH TICKET FOR CLIENT
=========================================================================*/
const searchTicket = async(req, res = response) => {

    try {

        const busqueda = req.params.busqueda;
        const rifa = req.params.rifa;

        const regex = new RegExp(busqueda, 'i');

        const tickets = await Ticket.find({
                $or: [
                    { nombre: regex },
                    { telefono: regex },
                    { cedula: regex },
                ],
                rifa
            })
            .populate('ruta')
            .populate('vendedor');

        res.json({
            ok: true,
            tickets,
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};


/** =====================================================================
 *  GET TICKET
=========================================================================*/
const obtenerPagosPendientes = async (req, res = response) => {
    try {
        // Recibimos los filtros desde el body o query (según prefieras)
        // Ejemplo: { "rifa": "ID_RIFA", "vendedor": "ID_VENDEDOR" }
        const { rifa, vendedor } = req.body;

        const query = {};

        // 1. Filtro obligatorio: La Rifa
        if (rifa) {
            query.rifa = new ObjectId(rifa);
        }

        // 2. Filtro opcional: El Vendedor (si viene, lo agregamos)
        if (vendedor) {
            query.vendedor = new ObjectId(vendedor);
        }

        // 3. Filtro de Pago Pendiente: Buscamos tickets que tengan 
        // AL MENOS UN pago con estado 'Pendiente' en su array de pagos
        query.pagos = { 
            $elemMatch: { estado: 'Pendiente' } 
        };

        // 4. Solo tickets activos en el sistema
        query.status = true;

        // Ejecutamos la consulta y el conteo en paralelo para más velocidad
        const [tickets, total] = await Promise.all([
            Ticket.find(query)
                .populate('vendedor', 'nombre email')
                .populate('cliente', 'nombre telefono')
                .sort({ fecha: -1 }),
            Ticket.countDocuments(query)
        ]);

        res.json({
            ok: true,
            tickets,
            total
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador, error al obtener pagos pendientes'
        });
    }
};

/** =====================================================================
 *  GET TICKET
=========================================================================*/
const getTicket = async(req, res) => {

    try {

        const { desde, hasta, random, sort, ...query } = req.body;        

        if (random) {

            const [tickets, total, disponibles, apartados, pagados] = await Promise.all([
                Ticket.aggregate([
                    { $match: { rifa: new ObjectId(query.rifa), estado: 'Disponible' } },
                    { $sample: { size: Number(hasta) || 1000 } } // MongoDB elige 1000 al azar súper rápido
                ]),
                Ticket.countDocuments({ rifa: query.rifa }),
                Ticket.countDocuments({ rifa: query.rifa, estado: 'Disponible' }),
                Ticket.countDocuments({ rifa: query.rifa, estado: 'Apartado' }),
                Ticket.countDocuments({ rifa: query.rifa, estado: 'Pagado' }),
            ]);
    
            res.json({
                ok: true,
                tickets,
                total,
                disponibles,
                apartados,
                pagados
            });
        }else{

            const [tickets, total, disponibles, apartados, pagados] = await Promise.all([
                Ticket.find(query)
                .populate('ruta')
                .populate('vendedor')
                .sort(sort)
                .limit(hasta)
                .skip(desde),
                Ticket.countDocuments({ rifa: query.rifa }),
                Ticket.countDocuments({ rifa: query.rifa, estado: 'Disponible' }),
                Ticket.countDocuments({ rifa: query.rifa, estado: 'Apartado' }),
                Ticket.countDocuments({ rifa: query.rifa, estado: 'Pagado' }),
            ]);
    
            res.json({
                ok: true,
                tickets,
                total,
                disponibles,
                apartados,
                pagados
            });
        }


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });

    }


};

/** =====================================================================
 *  GET PAYMENTS
=========================================================================*/


/** =====================================================================
 *  GET TICKET ID
=========================================================================*/
const getTicketId = async(req, res = response) => {

    try {
        const id = req.params.id;

        const ticketDB = await Ticket.findById(id)
            .populate('ruta')
            .populate('vendedor');
        if (!ticketDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este ticket, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            ticket: ticketDB
        });


    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};

/** =====================================================================
 *  CALCULATE PAYMENTS
=========================================================================*/
const getTicketPaid = async(req, res = response) => {

    try {

        const uid = req.uid;
        const rifid = req.params.rifa;

        let totalApartado = 0;
        let totalPagado = 0;
        let pendientes = [];

        // VERIFICAR SI ES UN ADMIN
        const user = await User.findById(uid);
        if (user.role !== 'ADMIN') {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes los privilegios necesarios para realizar esta consulta'
            });

        }

        // VERIFICAR SI ES UN ADMIN
        const rifa = await Rifa.findById(rifid);
        if (uid !== (String)(new ObjectId(rifa.admin))) {
            return res.status(401).json({
                ok: false,
                msg: 'No tienes los privilegios necesarios para realizar esta consulta'
            });
        }

        const [apartados, pagados] = await Promise.all([
            Ticket.find({ rifa: rifid, estado: 'Apartado' })
            .populate('pagos.user')
            .populate('ruta')
            .populate('vendedor'),
            Ticket.find({ rifa: rifid, estado: 'Pagado' })
            .populate('pagos.user')
            .populate('ruta')
            .populate('vendedor'),
        ]);

        // CALCULATE TODOS LOS APARTADOS
        // Asegúrate de reiniciar la lista antes de comenzar
        // this.pendientes = []; 

        for (const apartado of apartados) {
            
            // 1. Creamos una bandera local para ESTE ticket
            let tienePagoPendiente = false; 

            if (apartado.pagos && apartado.pagos.length > 0) {
                
                for (const paid of apartado.pagos) {
                    
                    // 2. Seguimos sumando el total global (Tu lógica original)
                    totalApartado += paid.monto;
                    
                    // 3. Si encontramos un pendiente, solo activamos la bandera
                    if (paid.estado === 'Pendiente') {
                        tienePagoPendiente = true;
                    }
                }
            }

            // 4. AL FINALIZAR de revisar los pagos de este ticket:
            // Si la bandera se quedó en TRUE, guardamos el ticket.
            // Al estar fuera del 'for' interno, es imposible que se guarde duplicado.
            if (tienePagoPendiente) {
                pendientes.push(apartado);
            }
        }

        // CALCULATE TODOS LOS PAGADOS
        for (let i = 0; i < pagados.length; i++) {
            const pagado = pagados[i];
            let tienePagoPendiente = false; 

            if (pagado.pagos && pagado.pagos.length > 0) {

                for (const paid of pagado.pagos) {
                    totalPagado += paid.monto;
                    if (paid.estado === 'Pendiente') {
                        tienePagoPendiente = true;
                    }
                }
            }

            if (tienePagoPendiente) {
                pendientes.push(pagado);
            }

        }

        res.json({
            ok: true,
            apartados,
            pagados,
            pendientes,
            totalApartado,
            totalPagado
        });



    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};

/** =====================================================================
 *  CREATE TICKET
=========================================================================*/
const createTicket = async(req, res = response) => {

    try {

        const uid = req.uid;

        // SAVE TASK
        const ticket = new Ticket(req.body);

        await ticket.save();

        res.json({
            ok: true,
            ticket
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }
};

/** =====================================================================
 *  POST TICKET GANADRO
=========================================================================*/
const ticketGanador = async(req, res = response) => {

    try {

        const uid = req.uid;
        const { tid, rifid } = req.body;
        
        // VERIFICAR SI ES UN ADMIN
        const user = await User.findById(uid);
        if (user.role !== 'ADMIN') {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes los privilegios necesarios para realizar esta consulta'
            });

        }

        // VERIFICAR SI ES UN ADMIN
        const rifa = await Rifa.findById(rifid);
        if (uid !== (String)(new ObjectId(rifa.admin))) {
            return res.status(401).json({
                ok: false,
                msg: 'No tienes los privilegios para realizar cambios'
            });
        }
        
        // VERIFICAR SI NO EXISTE YA EL TICKET GANADOR
        const validateGanador = await Ticket.find({rifa: rifid, ganador: true});
        if (validateGanador.length > 0) {
            return res.status(400).json({
                ok: false,
                msg: `Ya existe un ticket seleccionado como Ganador, #${validateGanador[0].numero}`
            });

        }

        // BUSCAR TICKET
        const ticketDB = await Ticket.findById(tid)
            .populate('ruta')
            .populate('vendedor');
        if (!ticketDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este ticket, porfavor intente nuevamente.'
            });
        }

        ticketDB.ganador = true;

        // UPDATE GANADOR
        await Ticket.findByIdAndUpdate(tid, {ganador: true}, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            ticket: ticketDB
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

}

/** =====================================================================
 *  SAVE TICKETS MASIVES
=========================================================================*/
const saveTicketsMasives = async(req, res = response) => {

    try {

        // DATA
        const uid = req.uid;
        const { tickets, rifid } = req.body;

        // VERIFICAR SI ES UN ADMIN
        const user = await User.findById(uid);
        if (user.role !== 'ADMIN') {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes los privilegios necesarios para realizar esta acción'
            });
        }        

        if (tickets.length === 0) {
           return res.status(400).json({
                ok: false,
                msg: 'La lista de tickets esta vacia, porfavor agregar los tickets'
            }); 
        }

        // VALIDAR RIFA
        const rifa = await Rifa.findById(rifid);
        if (!rifa) {
            return res.status(401).json({
                ok: false,
                msg: 'Esta rifa no existe'
            });
        }

        const totalDigitos = String(rifa.numeros - 1).length;

        // COMPROBAR SI LA RIFA ESTA ACTIVA
        if (rifa.estado !== 'Activa') {
            return res.status(401).json({
                ok: false,
                msg: 'Esta rifa no esta activa!'
            });
        }

        // COMPROBAR SI ES EL MISMO ADMINISTRADOR
        if (uid !== (String)(new ObjectId(rifa.admin)) ) {
            return res.status(401).json({
                ok: false,
                msg: 'No tienes los privilegios para realizar cambios'
            });
        }

        // Cargar todas las rutas activas
        const rutas = await Ruta.find({ admin: uid, status: true });
        if (!rutas.length) {
        return res.status(400).json({
            ok: false,
            msg: 'Debes agregar al menos una ruta activa'
        });
        }

        function normalizarTexto(texto) {

            texto = new String(texto)

            return texto
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, ' ')
                .trim();
        }        

        // Normalizar rutas
        const rutasMap = new Map();
            rutas.forEach(r => {
            rutasMap.set(normalizarTexto(r.name), r._id);
        });        

        const rutaDefaultId = rutas[0]._id;

        // Normalizar estado
        const normalizarEstado = (estado) => {
            const normal = (estado || '').toLowerCase().trim();
            if (normal === 'pagado') return 'Pagado';
            if (normal === 'apartado') return 'Apartado';
            return 'Apartado'; // por defecto
        };

        // Buscar todos los tickets disponibles para esta rifa
        const ticketsDB = await Ticket.find({
            rifa: rifid,
            disponible: true,
            estado: 'Disponible'
        }, { numero: 1 });

        
        
        const ticketMap = new Map();
        ticketsDB.forEach(t => ticketMap.set(t.numero, t._id));

        let actualizados = 0;
        let noEncontrados = [];
        let rutasIncorrectas = [];


        for (const ticket of tickets) {
            
            const numeroFormateado = String(ticket.numero).padStart(totalDigitos, '0');
            const tid = ticketMap.get(numeroFormateado);

            if (!tid) {
                noEncontrados.push(ticket.numero);
                continue;
            }
            
            const nombreRuta = normalizarTexto(ticket.ruta);
            const rutaId = rutasMap.get(nombreRuta) || rutaDefaultId;

            if (!rutasMap.has(nombreRuta)) {
                rutasIncorrectas.push(ticket.ruta || '');
            }

            const estado = normalizarEstado(ticket.estado);

            await Ticket.findByIdAndUpdate(tid, {
                ruta: rutaId,
                cedula: ticket.cedula,
                telefono: ticket.telefono,
                direccion: ticket.direccion,
                estado,
                nombre: ticket.nombre,
                monto: ticket.monto,
                disponible: false,
                vendedor: uid,
            }, { new: true });

            actualizados++;

        }

        res.json({
            ok: true,
            msg: `Tickets actualizados: ${actualizados}`,
            ticketsNoEncontrados: noEncontrados,
            rutasSinCoincidencia: rutasIncorrectas
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

}


/** =====================================================================
 *  UPDATE TICKET
=========================================================================*/
const updateTicket = async(req, res = response) => {

    const tid = req.params.id;
    const vendedorId = req.uid;

    try {
        // 1. Consultas en paralelo para mayor velocidad
        const [user, ticketDB] = await Promise.all([
            User.findById(vendedorId),
            Ticket.findById(tid).populate('rifa')
        ]);

        if (!ticketDB) {
            return res.status(404).json({ ok: false, msg: 'No existe ningun ticket con este ID' });
        }
        if (!user) {
            return res.status(404).json({ ok: false, msg: 'Usuario no encontrado' });
        }

        // 2. Evaluamos los permisos (Seguridad)
        const esElDueño = user._id.toString() === ticketDB.rifa.admin.toString();
        const esEmpleadoDelDueño = user.admin && user.admin.toString() === ticketDB.rifa.admin.toString();

        if (!esElDueño && !esEmpleadoDelDueño) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes privilegios para editar tickets en esta rifa.'
            });
        }

        // 3. Limpieza de Payload (Evitamos sobrescribir datos de la reserva)
        // Todo lo que se extrae explícitamente aquí, NO se actualizará.
        let { cliente, nombre, codigo, telefono, cedula, direccion, correo, ruta, vendedor, ...campos } = req.body;

        if (campos.monto && user.role === 'STAFF') {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes privilegios para editar el monto del ticket, debes de consultar al administrador.'
            });

        }

        // Si campos está vacío después de limpiar, no hay nada que actualizar
        if (Object.keys(campos).length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'No se enviaron campos válidos para actualizar.'
            });
        }

        // 4. Actualización y Populate en un solo paso
        const ticketUpdate = await Ticket.findByIdAndUpdate(
            tid, 
            campos, // Actualiza solo pagos, montos, estado, notas, etc.
            { new: true, useFindAndModify: false }
        )
        .populate('ruta')
        .populate('vendedor', 'nombre email'); // Es buena práctica limitar los datos que devuelves del vendedor

        res.json({
            ok: true,
            ticket: ticketUpdate
        });

    } catch (error) {
        console.log('Error general en updateTicket:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado al actualizar el ticket'
        });
    }
};

/** =====================================================================
 * RESERVAR TICKETS (ATÓMICO Y MASIVO)
=========================================================================*/
const reserveTickets = async(req, res = response) => {

    const { ticketIds, nombre, telefono, cedula, direccion, ruta, estado, nota, vendedor, monto, cliente, rifa } = req.body;
    const vendedorId = req.uid;

    // 1. Validaciones iniciales de entrada
    if (!rifa) {
        return res.status(400).json({
            ok: false,
            msg: 'Debe proporcionar el ID de la rifa.'
        });
    }

    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
        return res.status(400).json({
            ok: false,
            msg: 'Debe proporcionar una lista válida de IDs de tickets.'
        });
    }

    try {
        // 2. VERIFICACIÓN DE SEGURIDAD (Autorización)
        // Consultamos la BD en paralelo para mayor velocidad
        const [userDB, rifaDB] = await Promise.all([
            User.findById(vendedorId),
            Rifa.findById(rifa)
        ]);

        if (!rifaDB) {
            return res.status(404).json({ ok: false, msg: 'La rifa indicada no existe.' });
        }
        if (!userDB) {
            return res.status(404).json({ ok: false, msg: 'El usuario vendedor no existe.' });
        }

        // Evaluamos los permisos
        const esElDueño = userDB._id.toString() === rifaDB.admin.toString();
        const esEmpleadoDelDueño = userDB.admin && userDB.admin.toString() === rifaDB.admin.toString();

        if (!esElDueño && !esEmpleadoDelDueño) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes privilegios para reservar tickets en esta rifa.'
            });
        }

        const exitosos = [];
        const fallidos = [];
        const fechasReserva = new Date();

        // 3. Procesamiento secuencial atómico
        for (const tid of ticketIds) {
            try {
                // El filtro exige que ambos campos reflejen disponibilidad y que el ticket pertenezca a la rifa indicada
                const ticketReservado = await Ticket.findOneAndUpdate(
                    { 
                        _id: tid, 
                        rifa: rifa, // Añadimos esta validación extra por seguridad
                        disponible: true, 
                        estado: 'Disponible' 
                    }, 
                    { 
                        $set: { 
                            disponible: false, 
                            estado: estado || 'Apartado', 
                            vendedor: vendedorId,
                            cliente: cliente || null,
                            monto,
                            nombre: nombre,
                            telefono: telefono,
                            cedula: cedula,
                            direccion: direccion,
                            fecha: fechasReserva,
                            ruta: ruta || null, // Cuidado con nulos aquí
                            nota
                        } 
                    },
                    { new: true, useFindAndModify: false }
                )
                .populate('vendedor', 'nombre email') 
                .populate('cliente', 'nombre telefono');

                if (ticketReservado) {
                    exitosos.push({
                        id: tid,
                        numero: ticketReservado.numero,
                        estado: ticketReservado.estado
                    });
                } else {
                    const ticketExiste = await Ticket.findById(tid);
                    fallidos.push({
                        id: tid,
                        numero: ticketExiste ? ticketExiste.numero : 'Desconocido',
                        motivo: ticketExiste ? `No disponible (Estado: ${ticketExiste.estado})` : 'No existe o no pertenece a esta rifa'
                    });
                }

            } catch (err) {
                console.error(`Error aislando ticket ${tid}:`, err);
                fallidos.push({
                    id: tid,
                    motivo: 'Error interno de BD al aislar'
                });
            }
        }

        // 4. Respuesta detallada para el Frontend
        res.json({
            ok: true,
            msg: `Proceso completado. Exitosos: ${exitosos.length} | Fallidos: ${fallidos.length}`,
            exitosos,
            fallidos
        });

    } catch (error) {
        console.log('Error general en reserveTickets:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado en el servidor'
        });
    }
};

/** =====================================================================
 *  UPDATE VENDEDOR TICKET
=========================================================================*/
const updateVendedor = async(req, res = response) => {

    try {

        const tid = req.params.id;
        const uid = req.uid;

        const user = await User.findById(uid);
        if (user.role !== 'ADMIN') {
            return res.status(404).json({
                ok: false,
                msg: 'Lo siento, no tienes los privilegios necesarios para realizar este cambio.'
            });
        }

        // SEARCH TICKET
        const ticketDB = await Ticket.findById(tid);
        if (!ticketDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun ticket con este ID'
            });
        }

        // VALIDATE TICKET
        let {...campos } = req.body;

        if (ticketDB.disponible) {
            return res.status(404).json({
                ok: false,
                msg: 'El ticket esta disponible, no se puede asignar ningun vendedor'
            });
        }

        // UPDATE
        await Ticket.findByIdAndUpdate(tid, campos, { new: true, useFindAndModify: false });

        const ticketUpdate = await Ticket.findById(tid)
            .populate('ruta')
            .populate('vendedor');

        res.json({
            ok: true,
            ticket: ticketUpdate
        });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

}

/** =====================================================================
 *  TICKET RESTORE
=========================================================================*/
const restoreTicket = async(req, res = response ) => {

    try {
        const ticketId = req.params.id;
        const uid = req.uid;

        // Busca el ticket por su ID
        const ticket = await Ticket.findById(ticketId).populate('rifa');

        if (!ticket) {
            return res.status(404).json({ ok: false, msg: 'Ticket no encontrado' });
        }

        const userDB = await User.findById(uid);
        if (userDB.role === 'STAFF') {
            return res.status(403).json({ ok: false, msg: 'No tienes los privilegios necesarios para resetear este ticket' });
        }

        // ¿Es el dueño directo de la rifa?
        const esElDueño = uid.toString() === ticket.rifa.admin.toString();
        
        // ¿Es un Supervisor contratado por el dueño de la rifa?
        const esSuperDelDueño = userDB.admin && 
                                userDB.admin.toString() === ticket.rifa.admin.toString() && 
                                userDB.role === 'SUPER';

        // Si no cumple ninguna de las dos condiciones, se bloquea la acción
        if (!esElDueño && !esSuperDelDueño) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes autorización para liberar tickets de esta rifa.'
            });
        }

        // Restaura el ticket a su estado inicial
        ticket.monto = ticket.rifa.monto;
        ticket.estado = 'Disponible';
        ticket.disponible = true;
        ticket.ganador = false;
        ticket.status = true;
        ticket.pagos = [];
        ticket.img = []; // Limpiamos comprobantes viejos

        // Elimina usando $unset interno de Mongoose
        ticket.cedula = undefined;
        ticket.codigo = undefined;
        ticket.direccion = undefined;
        ticket.nombre = undefined;
        ticket.nota = undefined;
        ticket.ruta = undefined;
        ticket.telefono = undefined;
        ticket.vendedor = undefined;
        ticket.cliente = undefined;
        ticket.correo = undefined; // Limpiamos el correo
        ticket.fecha = undefined;

        // ACTUALIZACIÓN SIMULTÁNEA
        // Guardamos el ticket limpio y sumamos 1 al contador de rezagados en la Rifa
        const [ticketU, rifa] = await Promise.all([
            ticket.save(),
            Rifa.findByIdAndUpdate(
                ticket.rifa._id, 
                { $inc: { rezagados: 1 } },
                { useFindAndModify: false } // Buena práctica en Mongoose
            )
        ]);

        res.status(200).json({ 
            ok: true, 
            ticket: ticketU,
            rezagados: rifa.rezagados + 1
        });

    } catch (error) {
        console.log('Error en restoreTicket:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }
};

/** =====================================================================
 *  PAYMENTS ONLINE
=========================================================================*/
const paymentsTicketOnline = async(req, res = response) => {

    try {

        
        let datos = JSON.parse(req.body.datos);        
                
        const { tickets, ...campos} = datos;
        campos.referencia = campos.referencia.trim();
        

        if (tickets.length === 0) {
            return res.status(404).json({
                ok: false,
                msg: 'No has seleccionado ningun ticket'
            });
        }

        const existe = await Ticket.findOne({ 'pagos.referencia': campos.referencia, rifa: tickets[0].rifa });
        if (existe) {
            return res.status(404).json({
                ok: false,
                msg: 'Ya existe un pago con esta referencia'
            });
        }

        // VALIDATE IMAGE
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).json({
                ok: false,
                msg: 'No has seleccionado ningún archivo'
            });
        }

        // PROCESS IMAGE
        const file = await sharp(req.files.image.data).metadata();

        // const nameShort = file.format.split('.');
        const extFile = file.format;

        // VALID EXT
        const validExt = ['jpg', 'png', 'jpeg', 'webp', 'bmp', 'svg'];
        if (!validExt.includes(extFile)) {
            return res.status(400).json({
                ok: false,
                msg: 'No se permite este tipo de imagen, solo extenciones JPG - PNG - WEBP - SVG'
            });
        }
        // VALID EXT

        // GENERATE NAME UID
        const nameFile = `${ uuidv4() }.webp`;

        // PATH IMAGE
        const path = `./uploads/payments/${ nameFile }`;

        // Procesar la imagen con sharp (por ejemplo, redimensionar)
        await sharp(req.files.image.data)
            .webp({ equality: 75, effort: 6 })
            .toFile(path, async(err, info) => {

                let rechazados = [];
                let confirmados = [];
                
                for (let i = 0; i < tickets.length; i++) {
                    const ticket = tickets[i];

                    const tdb = await Ticket.findById(ticket.tid);
                    if (tdb.estado !== 'Disponible') {
                        rechazados.push(ticket);
                        return;
                    }

                    let pagos = [];
                    let referencia = campos.referencia;

                    if (i > 0) {
                        referencia = `${referencia} - ${i+1}/${tickets.length}`;
                    }

                    pagos.push({
                        descripcion: campos.descripcion,
                        estado: 'Pendiente',
                        monto: tdb.monto,
                        equivalencia: (campos.monto / tickets.length),
                        metodo: campos.metodo,
                        web: true,
                        referencia: referencia,
                        img: nameFile
                    })

                    tdb.pagos = pagos;
                    tdb.nombre = campos.nombre;
                    tdb.codigo = campos.codigo;
                    tdb.telefono = campos.codigo+campos.telefono;
                    tdb.cedula = campos.cedula;
                    tdb.direccion = campos.direccion;
                    tdb.correo = campos.correo || 'none';
                    tdb.ruta = campos.ruta;
                    tdb.vendedor = campos.vendedor;
                    tdb.estado = 'Apartado';
                    tdb.disponible = false;                 

                    await tdb.save();

                    confirmados.push(tdb);
                    
                };

                res.json({
                    ok: true,
                    confirmados,
                    rechazados
                });

            });
        
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

};

/** =====================================================================
 *  PAYMENTS ONLINE
=========================================================================*/
const exportTicketsPDF = async (req, res) => {
  try {
    const { rifaId } = req.params;
    const filtrosFrontend = req.body; // Recibimos los filtros desde Angular

    delete filtrosFrontend.desde;
    delete filtrosFrontend.hasta;
    delete filtrosFrontend.sort;
    

    // 📌 Buscar rifa
    const rifa = await Rifa.findById(rifaId);
    if (!rifa) {
      return res.status(404).json({ msg: 'Rifa no encontrada' });
    }
    
    // 📌 Buscar tickets con los filtros aplicados
    const tickets = await Ticket.find(filtrosFrontend).sort({ numero: 1 });

    if (!tickets || tickets.length === 0) {
      return res.status(404).json({ msg: 'No se encontraron tickets con esos filtros' });
    }

    // 📌 Crear y transmitir el PDF (Streaming)
    res.setHeader('Content-disposition', `attachment; filename="tickets-${rifa.name}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res); // El PDF viaja directamente al cliente

    doc.font('Helvetica-Bold');

    // ✅ Función para encabezado
    const drawHeader = () => {
      doc.fontSize(18).text(rifa.name, { align: 'center' });
      // Cambiamos el texto para que sea dinámico
      const subtitulo = filtrosFrontend.estado ? `Tickets: ${filtrosFrontend.estado}` : 'Reporte de Tickets';
      doc.fontSize(14).text(subtitulo, { underline: true });
      doc.moveDown(1);
    };

    drawHeader();

    // ... (Todo tu código de la cuadrícula se mantiene exactamente igual) ...
    // ✅ Configuración de la cuadrícula
    const colWidth = 46;
    const rowHeight = 35;
    const cols = 10;
    const space = 5;
    let x = doc.page.margins.left;
    let y = doc.y;

    tickets.forEach((ticket, index) => {
      if (y + rowHeight + doc.page.margins.bottom > doc.page.height) {
        doc.addPage();
        drawHeader();
        x = doc.page.margins.left;
        y = doc.y;
      }

      doc.roundedRect(x, y, colWidth, rowHeight, 5).stroke('#2d2d2d');

      doc.fillColor('#2d2d2d')
         .fontSize(18)
         .text(ticket.numero, x, y + 10, { width: colWidth, align: 'center' });

      doc.fillColor('black');

      x += colWidth + space;
      if ((index + 1) % cols === 0) {
        x = doc.page.margins.left;
        y += rowHeight + space;
      }
    });

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al generar el PDF', error: err.message });
  }
};

// EXPORTS
module.exports = {
    getTicket,
    getTicketId,
    createTicket,
    updateTicket,
    searchTicket,
    getTicketPaid,
    paymentsTicketOnline,
    restoreTicket,
    ticketGanador,
    updateVendedor,
    saveTicketsMasives,
    exportTicketsPDF,
    obtenerPagosPendientes,
    reserveTickets
};