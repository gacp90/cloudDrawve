const { response } = require('express');

const path = require('path');
const fs = require('fs');

const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const ObjectId = require('mongoose').Types.ObjectId;

const Ticket = require('../models/ticket.model');
const User = require('../models/users.model');
const Rifa = require('../models/rifas.model');

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
const getTicket = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

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

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });

    }


};


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
        for (let i = 0; i < apartados.length; i++) {
            const apartado = apartados[i];

            if (apartado.pagos && apartado.pagos.length > 0) {

                for (const paid of apartado.pagos) {
                    totalApartado += paid.monto;
                    if (paid.estado === 'Pendiente') {
                        pendientes.push(apartado);
                    }
                }

            }

        }

        // CALCULATE TODOS LOS PAGADOS
        for (let i = 0; i < pagados.length; i++) {
            const pagado = pagados[i];

            if (pagado.pagos && pagado.pagos.length > 0) {

                for (const paid of pagado.pagos) {
                    totalPagado += paid.monto;
                    if (paid.estado === 'Pendiente') {
                        pendientes.push(pagado);
                    }
                }
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
 *  UPDATE TICKET
=========================================================================*/
const updateTicket = async(req, res = response) => {

    const tid = req.params.id;

    try {

        // SEARCH TICKET
        const ticketDB = await Ticket.findById(tid);
        if (!ticketDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun ticket con este ID'
            });
        }
        // SEARCH TICKET

        // VALIDATE TICKET
        let {...campos } = req.body;

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

};

/** =====================================================================
 *  PAYMENTS ONLINE
=========================================================================*/
const paymentsTicketOnline = async(req, res = response) => {

    try {

        const { tickets, ...campos} = req.body;
        campos.referencia = campos.referencia.trim();

        if (tickets.length === 0) {
            return res.status(404).json({
                ok: false,
                msg: 'No has seleccionado ningun ticket'
            });
        }

        const existe = await Ticket.findOne({ 'pagos.referencia': campos.referencia });
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
                        referencia = `${referencia}-${i+1}`;
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

// EXPORTS
module.exports = {
    getTicket,
    getTicketId,
    createTicket,
    updateTicket,
    searchTicket,
    getTicketPaid,
    paymentsTicketOnline
};