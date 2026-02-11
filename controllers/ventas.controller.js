const { response } = require('express');

const ObjectId = require('mongoose').Types.ObjectId;
const crypto = require('crypto');

const axios = require('axios');

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

    const { id } = req.params; // ID de la Venta (referencia)

    try {
        const ventaDB = await Venta.findById(id);
        if (!ventaDB) {
            return res.status(404).json({ ok: false, msg: 'Venta no encontrada' });
        }

        if (!ventaDB.signature) {
            // Generar firma de integridad nuevamente para permitir reintentos si está pendiente
            const montoCents = ventaDB.monto; // Asegúrate que este campo esté en tu modelo
            const cadena = `${ventaDB._id.toString()}${montoCents}COP${process.env.WOMPI_INTEGRITY_SECRET}`;
            ventaDB.signature = crypto.createHash('sha256').update(cadena).digest('hex');            
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

            return res.json({ ok: true, estado: 'Pagado', venta: ventaDB });
        }

        // Si llegó aquí y no está aprobado, devolvemos el estado actual (Pendiente/Rechazado)
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

        const montoCents = Math.round(venta.monto * 100);
        const moneda = 'COP';
        const secretoIntegridad = process.env.WOMPI_INTEGRITY_SECRET; // Guarda esto en tu .env        
        
        // 1. Crear la cadena de texto
        const cadenaConcatenada = `${venta._id.toString()}${montoCents}${moneda}${secretoIntegridad}`;

        // 2. Generar el Hash SHA-256
        const hashHex = crypto
            .createHash('sha256')
            .update(cadenaConcatenada)
            .digest('hex');

        ventaNew.signature = hashHex;
        ventaNew.amountInCents = montoCents;
        await ventaNew.save();


        res.json({
            ok: true,
            msg: 'Tickets apartados con éxito',
            venta,
            signature: hashHex,
            amountInCents: montoCents
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
    updateVenta,
    verificarVentaWompi
};