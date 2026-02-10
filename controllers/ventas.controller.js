const { response } = require('express');

const ObjectId = require('mongoose').Types.ObjectId;

const Venta = require('../models/ventas.model');
const Ticket = require('../models/ticket.model');
const Rifa = require('../models/rifas.model');

/** =====================================================================
 *  GET QUERY
=========================================================================*/
const getVentas = async(req, res) => {

    try {

        const { desde, hasta, ...query } = req.body;

        const [ventas, total] = await Promise.all([
            Venta.find(query)
            .populate('rifa')
            .populate('tickets.ticket')
            .limit(hasta)
            .skip(desde),
            Venta.countDocuments()
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
            venta: ventaDB
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
 *  CREATE
=========================================================================*/
const createVenta = async (req, res = response) => {
    try {
        const { qty, rifa, ...campos } = req.body;

        const rifaDB = await Rifa.findById(rifa);
        if (!rifaDB) {
            return res.status(400).json({ ok: false, msg: 'No existe la rifa' });
        }
        
        // Validaciones de cantidad
        if (qty > rifaDB.max || qty < rifaDB.min) {
            return res.status(400).json({
                ok: false,
                msg: `Cantidad no permitida (Min: ${rifaDB.min} / Max: ${rifaDB.max})`
            });
        }        

        let ticketsReservados = [];
        let intentos = 0;
        const MAX_INTENTOS = 3;

        // Bucle para intentar completar la cantidad solicitada (qty)
        while (ticketsReservados.length < qty && intentos < MAX_INTENTOS) {
            const faltantes = qty - ticketsReservados.length;

            // 1. Buscamos tickets disponibles (excluyendo los que ya reservamos en este ciclo)
            const seleccionados = await Ticket.aggregate([
                { $match: { 
                    rifa: new ObjectId(rifa), 
                    estado: 'Disponible',
                    _id: { $nin: ticketsReservados.map(t => t._id) } // No repetir los que ya tenemos
                }},
                { $sample: { size: faltantes } }
            ]);

            if (seleccionados.length === 0) break; // Ya no hay más tickets físicos en la DB

            // 2. Intentamos "secuestrar" esos tickets de forma atómica
            for (const t of seleccionados) {
                const reservado = await Ticket.findOneAndUpdate(
                    { _id: t._id, estado: 'Disponible' }, // Condición de victoria
                    { 
                        $set: { 
                            estado: 'Apartado',
                            disponible: false,
                            nombre: campos.nombre,
                            cedula: campos.cedula,
                            ruta: campos.ruta,
                            codigo: campos.codigo,
                            correo: campos.correo,
                            telefono: campos.codigo + campos.telefono,
                            vendedor: rifaDB.admin,
                            monto: rifaDB.monto,
                            // ... resto de tus campos ...
                            pagos: [{
                                descripcion: `Pago Wompi por ${qty} ticket(s)`,
                                estado: 'Pendiente',
                                monto: rifaDB.monto,
                                web: true
                            }]
                        }
                    },
                    { new: true }
                );

                if (reservado) {
                    ticketsReservados.push({ ticket: reservado._id });
                }
                // Si 'reservado' es null, alguien lo ganó. El bucle 'while' se encargará.
            }
            intentos++;
        }

        // 3. Verificamos si logramos conseguir todos
        if (ticketsReservados.length < qty) {
            // Si después de los intentos no se completó (ej. se acabaron los tickets de la rifa)
            // Aquí podrías decidir si cancelar todo o dejarle solo los que se pudieron
            return res.status(400).json({
                ok: false,
                msg: 'No fue posible reservar todos los tickets, intenta de nuevo.'
            });
        }

        // 4. Crear la Venta final
        const ventaNew = new Venta({
            ...campos,
            rifa,
            tickets: ticketsReservados,
            monto: rifaDB.monto * qty
        });

        await ventaNew.save();

        const venta = await Venta.findById(ventaNew._id)
            .populate('rifa')
            .populate('tickets.ticket');

        res.json({
            ok: true,
            msg: 'Tickets apartados con éxito',
            venta
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error Inesperado' });
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

//         // 1. Obtener tickets aleatorios
//         const ticketsArray = await Ticket.aggregate([
//             { $match: { rifa: new ObjectId(rifa), estado: 'Disponible' } },
//             { $sample: { size: Number(qty) } }
//         ]);

//         if (ticketsArray.length < qty) {
//             return res.status(400).json({ ok: false, msg: 'No hay suficientes tickets disponibles' });
//         }

//         // 2. Actualizar tickets uno por uno (o podrías usar updateMany si los datos fueran iguales)
//         const idsTickets = [];
        
//         for (const t of ticketsArray) {
//             const dataActualizar = {
//                 nombre: campos.nombre,
//                 telefono: campos.codigo + campos.telefono,
//                 cedula: campos.cedula,
//                 direccion: campos.direccion,
//                 correo: campos.correo,
//                 vendedor: campos.vendedor,
//                 estado: 'Apartado',
//                 disponible: false,
//                 pagos: [{
//                     descripcion: `Pago Wompi de ${qty} ticket(s)`,
//                     estado: 'Pendiente',
//                     monto: rifaDB.precio, // Asumiendo que el precio viene de la rifa
//                     web: true,
//                 }]
//             };

//             // Actualizamos el ticket
//             await Ticket.findByIdAndUpdate(t._id, dataActualizar);
            
//             // Formatear para el modelo de Venta: { ticket: id }
//             idsTickets.push({ ticket: t._id });
//         }

//         // 3. Crear la Venta
//         const ventaNew = new Venta({
//             ...campos,
//             rifa,
//             tickets: idsTickets,
//             monto: rifaDB.precio * qty // Cálculo automático del total
//         });

//         await ventaNew.save();

//         res.json({
//             ok: true,
//             venta: ventaNew
//         });

//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ ok: false, msg: 'Error Inesperado' });
//     }
// };


/** =====================================================================
 *  UPDATE RUTA
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
    updateVenta
};