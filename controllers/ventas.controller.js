const { response } = require('express');

const ObjectId = require('mongoose').Types.ObjectId;
const crypto = require('crypto');

const axios = require('axios');

const Venta = require('../models/ventas.model');
const Ticket = require('../models/ticket.model');
const Rifa = require('../models/rifas.model');
const { generarHtmlTickets } = require('../helpers/mails-templates');
const { sendMail } = require('../helpers/send-mail');
const { agregarVentaAColaEnvio } = require('../queues/envio.queue');

/** =====================================================================
 *  GET QUERY
=========================================================================*/
const getVentas = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [ventas, total] = await Promise.all([
            Venta.find(query)
            .populate('rifa')
            .populate('tickets.ticket')
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Venta.countDocuments(query)
        ]);

        res.json({
            ok: true,
            ventas,
            total
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
 *  GET ID
=========================================================================*/
const getVentaId = async(req, res = response) => {

    try {
        const id = req.params.id;

        const ventaDB = await Venta.findById(id)
            .populate('rifa')
            .populate('tickets.ticket');
        if (!ventaDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado esta ruta, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            venta: ventaDB,
            signature: hashHex,
            amountInCents: montoCents
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
 *  GET ID
=========================================================================*/
const verificarVentaWompi = async(req, res = response) => {

    const { id } = req.params;

    try {
        const ventaDB = await Venta.findById(id)
            .populate({
                path: 'rifa',
                populate: {
                    path: 'admin',
                    select: 'name empresa img phone' // Solo traes lo necesario para el soporte o el correo
                }
            })
            .populate('tickets.ticket');
        if (!ventaDB) {
            return res.status(404).json({ ok: false, msg: 'Venta no encontrada' });
        }

        // Si ya está pagada, no consultamos a Wompi, ahorramos recursos
        if (ventaDB.estado === 'Pagado') {
            return res.json({ ok: true, estado: 'Pagado', venta: ventaDB });
        }

        // Consultar a Wompi por referencia
        // Usamos la Private Key para ver detalles de transacciones
        const { data } = await axios.get(`https://production.wompi.co/v1/transactions?reference=${id}`, {
            headers: { Authorization: `Bearer ${process.env.WOMPI_PRV_KEY}` }
        });

        const transaccion = data.data[0]; // Wompi devuelve un array, tomamos la más reciente

        if (transaccion && transaccion.status === 'APPROVED') {
            // ACTUALIZACIÓN ATÓMICA
            ventaDB.estado = 'Pagado';
            // Aquí puedes guardar el ID de transacción de Wompi para auditoría
            ventaDB.wompi_id = transaccion.id; 
            await ventaDB.save();

            // Liberar tickets al estado 'Vendido'
            const idsTickets = ventaDB.tickets.map(t => t.ticket);
            await Ticket.updateMany(
                { _id: { $in: idsTickets } },
                { $set: { estado: 'Pagado', disponible: false } }
            );

            const html = await generarHtmlTickets(ventaDB);
            await sendMail(ventaDB.correo, '¡Pago Confirmado!', html, '¡Pago Confirmado!');

            // CREAR ENVIO CON SKYDROPX
            if (ventaDB.pais === 'Colombia' && ventaDB.donar) {
                await agregarVentaAColaEnvio(id);
                console.log("Venta enviada a la cola de procesamiento asíncrono.");                          
            }

            return res.json({ ok: true, estado: 'Pagado', venta: ventaDB });
        }

        // Si llegó aquí y no está aprobado, devolvemos el estado actual (Pendiente/Rechazado)
        console.log(transaccion);
        
        res.json({
            ok: true,
            estado: transaccion ? transaccion.status : 'Pendiente',
            venta: ventaDB
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error al verificar pago' });
    }
}

/** =====================================================================
 *  CREATE
=========================================================================*/
const createVenta = async (req, res = response) => {
    let ticketsReservadosIds = []; // Para rastrear y liberar si algo falla
    try {
        const { qty, rifa, ...campos } = req.body;

        const rifaDB = await Rifa.findById(rifa);
        if (!rifaDB) return res.status(400).json({ ok: false, msg: 'No existe la rifa' });

        // 1. Lógica de reintentos optimizada
        let ticketsReservadosFinales = [];
        let intentos = 0;
        const MAX_INTENTOS = 3;

        while (ticketsReservadosFinales.length < qty && intentos < MAX_INTENTOS) {
            const faltantes = qty - ticketsReservadosFinales.length;

            const seleccionados = await Ticket.aggregate([
                { $match: { 
                    rifa: new ObjectId(rifa), 
                    estado: 'Disponible',
                    _id: { $nin: ticketsReservadosIds } 
                }},
                { $sample: { size: faltantes } }
            ]);

            if (seleccionados.length === 0) break;

            // EJECUCIÓN EN PARALELO: Mucho más rápido para 290 tickets
            const promesas = seleccionados.map(t => 
                Ticket.findOneAndUpdate(
                    { _id: t._id, estado: 'Disponible' },
                    { $set: { 
                        estado: 'Apartado',
                        disponible: false,
                        nombre: campos.nombre,
                        cedula: campos.cedula,
                        telefono: campos.codigo + campos.telefono,
                        correo: campos.correo,
                        rifa: rifa,
                        vendedor: rifaDB.admin,
                        pagos: [{
                            descripcion: `Reserva Wompi: ${qty} boletas`,
                            estado: 'Pendiente',
                            monto: rifaDB.monto,
                            web: true
                        }]
                    }},
                    { new: true }
                )
            );

            const resultados = await Promise.all(promesas);
            
            // Filtrar los que sí se pudieron reservar (por si hubo colisión)
            for (const r of resultados) {
                if (r) {
                    ticketsReservadosFinales.push({ ticket: r._id });
                    ticketsReservadosIds.push(r._id);
                }
            }
            intentos++;
        }

        if (ticketsReservadosFinales.length < qty) {
            // ROLLBACK: Liberar los que alcanzamos a apartar
            await Ticket.updateMany(
                { _id: { $in: ticketsReservadosIds } },
                { $set: { estado: 'Disponible', disponible: true }, $unset: { nombre: "", cedula: "", telefono: "", pagos: "" } }
            );
            return res.status(400).json({ ok: false, msg: 'No hay suficientes boletas disponibles.' });
        }

        // 2. Crear la Venta
        // Calculamos el monto basado en el precio unitario de la rifa por la cantidad
        const montoTotal = 45000 * campos.item.qty; 

        const ventaNew = new Venta({
            ...campos,
            rifa,
            tickets: ticketsReservadosFinales,
            monto: montoTotal,
            statusEnvio: (campos.donar)? 'Donado': 'Pendiente',
        });

        // 3. Firma Wompi
        const montoCents = Math.round(montoTotal * 100);
        const cadenaConcatenada = `${ventaNew._id.toString()}${montoCents}COP${process.env.WOMPI_INTEGRITY_SECRET}`;
        const hashHex = crypto.createHash('sha256').update(cadenaConcatenada).digest('hex');

        ventaNew.signature = hashHex;
        ventaNew.amountInCents = montoCents;
        
        await ventaNew.save();

        res.json({
            ok: true,
            venta: ventaNew,
            signature: hashHex,
            amountInCents: montoCents
        });

    } catch (error) {
        console.log("ERROR EN VENTA:", error);
        // ROLLBACK de emergencia si el error ocurre después de apartar tickets
        if (ticketsReservadosIds.length > 0) {
            await Ticket.updateMany(
                { _id: { $in: ticketsReservadosIds } },
                { $set: { estado: 'Disponible', disponible: true } }
            );
        }
        res.status(500).json({ ok: false, msg: 'Error al procesar la reserva' });
    }
};

// const createVenta = async (req, res = response) => {
//     try {
//         const { qty, rifa, ...campos } = req.body;

//         const rifaDB = await Rifa.findById(rifa);
//         if (!rifaDB) {
//             return res.status(400).json({ ok: false, msg: 'No existe la rifa' });
//         }
        
//         // Validaciones de cantidad
//         if (qty > rifaDB.max || qty < rifaDB.min) {
//             return res.status(400).json({
//                 ok: false,
//                 msg: `Cantidad no permitida (Min: ${rifaDB.min} / Max: ${rifaDB.max})`
//             });
//         }        

//         let ticketsReservados = [];
//         let intentos = 0;
//         const MAX_INTENTOS = 3;

//         // Bucle para intentar completar la cantidad solicitada (qty)
//         while (ticketsReservados.length < qty && intentos < MAX_INTENTOS) {
//             const faltantes = qty - ticketsReservados.length;

//             // 1. Buscamos tickets disponibles (excluyendo los que ya reservamos en este ciclo)
//             const seleccionados = await Ticket.aggregate([
//                 { $match: { 
//                     rifa: new ObjectId(rifa), 
//                     estado: 'Disponible',
//                     _id: { $nin: ticketsReservados.map(t => t._id) } // No repetir los que ya tenemos
//                 }},
//                 { $sample: { size: faltantes } }
//             ]);

//             if (seleccionados.length === 0) break; // Ya no hay más tickets físicos en la DB

//             // 2. Intentamos "tomar" esos tickets de forma atómica
//             for (const t of seleccionados) {
//                 const reservado = await Ticket.findOneAndUpdate(
//                     { _id: t._id, estado: 'Disponible' }, // SELECCION ATOMICA DEL TICKET DISPONIBLE
//                     { 
//                         $set: { 
//                             estado: 'Apartado',
//                             disponible: false,
//                             nombre: campos.nombre,
//                             cedula: campos.cedula,
//                             ruta: campos.ruta,
//                             codigo: campos.codigo,
//                             direccion: campos.direccion,
//                             correo: campos.correo,
//                             telefono: campos.codigo + campos.telefono,
//                             vendedor: rifaDB.admin,
//                             monto: rifaDB.monto,
//                             // ... resto de tus campos ...
//                             pagos: [{
//                                 descripcion: `Pago Wompi por ${qty} ticket(s)`,
//                                 estado: 'Pendiente',
//                                 monto: rifaDB.monto,
//                                 web: true
//                             }]
//                         }
//                     },
//                     { new: true }
//                 );

//                 if (reservado) {
//                     ticketsReservados.push({ ticket: reservado._id });
//                 }
//                 // Si 'reservado' es null, alguien ya lo reservo. El bucle 'while' se encargará de buscar otro disponible.
//             }
//             intentos++;
//         }

//         // 3. Verificamos si logramos conseguir todos
//         if (ticketsReservados.length < qty) {
//             // Si después de los intentos no se completó (ej. se acabaron los tickets de la rifa)
//             // Aquí podrías decidir si cancelar todo o dejarle solo los que se pudieron
//             return res.status(400).json({
//                 ok: false,
//                 msg: 'No fue posible reservar todos los tickets, intenta de nuevo.'
//             });
//         }

//         // PRECIO DEL ITEM
//         campos.item.price = 45000;

//         // 4. Crear la Venta final
//         const ventaNew = new Venta({
//             ...campos,
//             rifa,
//             tickets: ticketsReservados,
//             monto: campos.item.price * campos.item.qty,
//         });

//         await ventaNew.save();

//         const venta = await Venta.findById(ventaNew._id)
//             .populate('rifa')
//             .populate('tickets.ticket');

//         const montoCents = Math.round(venta.monto * 100);
//         const moneda = 'COP';
//         const secretoIntegridad = process.env.WOMPI_INTEGRITY_SECRET; // Guarda esto en tu .env        
        
//         // 1. Crear la cadena de texto
//         const cadenaConcatenada = `${venta._id.toString()}${montoCents}${moneda}${secretoIntegridad}`;

//         // 2. Generar el Hash SHA-256
//         const hashHex = crypto
//             .createHash('sha256')
//             .update(cadenaConcatenada)
//             .digest('hex');

//         ventaNew.signature = hashHex;
//         ventaNew.amountInCents = montoCents;
//         await ventaNew.save();


//         res.json({
//             ok: true,
//             msg: 'Tickets apartados con éxito',
//             venta,
//             signature: hashHex,
//             amountInCents: montoCents
//         });

//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ ok: false, msg: 'Error Inesperado' });
//     }
// };

/** =====================================================================
 *  UPDATE VENTA
=========================================================================*/
const updateVenta = async(req, res = response) => {

    const vid = req.params.id;

    try {

        // SEARCH USER
        const ventaDB = await Venta.findById(vid);
        if (!ventaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ninguna venta con este ID'
            });
        }
        // SEARCH USER

        // VALIDATE USER
        let {...campos } = req.body;

        // UPDATE
        const ventaUpdate = await Venta.findByIdAndUpdate(vid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            venta: ventaUpdate
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }

};

// EXPORTS
module.exports = {
    getVentas,
    getVentaId,
    createVenta,
    updateVenta,
    verificarVentaWompi
};