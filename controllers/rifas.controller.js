const { response } = require('express');

const { createTickets, createTicketsAgrupado } = require('../helpers/create-tikects');
const Rifa = require('../models/rifas.model');
const User = require('../models/users.model');
const Ticket = require('../models/ticket.model');

/** =====================================================================
 *  GET RIFAS
=========================================================================*/
const getRifaList = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        if (!query.admin) {
            return res.status(403).json({
                ok: false,
                msg: 'Error porfavor intente de nuevo mas tarde'
            });
        }

        query.admin = query.admin;
                
        const [rifas, total] = await Promise.all([
            Rifa.find(query)
            .sort(sort)
            .limit(hasta)
            .skip(desde),
            Rifa.countDocuments(query)
        ]);

        res.json({
            ok: true,
            rifas,
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
 *  GET RIFAS
=========================================================================*/
const getRifa = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;
        if (!query.admin) {
            return res.status(403).json({
                ok: false,
                msg: 'Error porfavor intente de nuevo mas tarde'
            });
        }       

        const [rifas, total] = await Promise.all([
            // .lean() es súper importante aquí para poder inyectar la data nueva al objeto
            Rifa.find(query)
            .sort(sort)
            .limit(hasta)
            .skip(desde)
            .lean(), 
            Rifa.countDocuments(query)
        ]);

        // 1. Extraemos los IDs de las rifas que acabamos de obtener
        const rifasIds = rifas.map(r => r._id);

        // 2. UNA SOLA CONSULTA a Tickets usando aggregation para contar los estados
        const ticketsStats = await Ticket.aggregate([
            { 
                $match: { rifa: { $in: rifasIds } } 
            },
            {
                $group: {
                    _id: { rifa: "$rifa", estado: "$estado" },
                    cantidad: { $sum: 1 },
                    dineroRecaudado: { $sum: "$totalPagado" }
                }
            }
        ]);

        // 3. Transformamos la respuesta de Mongoose en un diccionario rápido de leer
        const statsMap = {};
        ticketsStats.forEach(stat => {
            const rifaId = stat._id.rifa.toString();
            const estado = stat._id.estado;

            if (!statsMap[rifaId]) {
                // SOLUCIÓN: Inicializar todas las variables matemáticas en 0
                statsMap[rifaId] = { 
                    Disponible: 0, 
                    Apartado: 0, 
                    Pagado: 0,
                    RecaudadoTotal: 0,
                    RecaudadoPagado: 0,
                    RecaudadoApartado: 0
                };
            }
            
            // Mapeamos dinámicamente según el estado que llegue
            statsMap[rifaId][estado] = stat.cantidad;

            // Extraemos el dinero (por si viene nulo desde la BD, lo forzamos a 0)
            const monto = stat.dineroRecaudado || 0;

            // Acumulamos el dinero según el estado
            statsMap[rifaId].RecaudadoTotal += monto;
            
            if (estado === 'Pagado') {
                statsMap[rifaId].RecaudadoPagado += monto;
            } else if (estado === 'Apartado') {
                statsMap[rifaId].RecaudadoApartado += monto;
            }
        });

        // 4. Inyectamos la estadística a cada rifa
        const rifasConStats = rifas.map(rifa => {
            const rifaId = rifa._id.toString();
            return {
                ...rifa,
                rifid: rifaId,
                statsTickets: statsMap[rifaId] || { Disponible: 0, Apartado: 0, Pagado: 0, RecaudadoTotal: 0, RecaudadoPagado: 0, RecaudadoApartado: 0 }
            };
        });

        res.json({
            ok: true,
            rifas: rifasConStats,
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
 *  GET RIFA ID
=========================================================================*/
const getRifaId = async(req, res = response) => {

    try {
        const id = req.params.id;

        const rifaDB = await Rifa.findById(id)
            .populate('admin', 'uid email name phone empresa img');
        if (!rifaDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado esta rifa, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            rifa: rifaDB
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
 *  CREATE RIFA
=========================================================================*/
const createRifa = async(req, res = response) => {

    try {

        const uid = req.uid;

        const { agrupado } = req.body

        const userDB = await User.findById(uid);
        if (userDB.role !== 'ADMIN') {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes los privilegios para crear rifas.'
            });
        }

        // SAVE TASK
        const rifa = new Rifa(req.body);
        rifa.admin = uid;

        if (process.env.ACTIVA === 'Activa') {
            rifa.estado = 'Activa';
        }

        await rifa.save();        

        res.json({
            ok: true,
            rifa
        });

        setImmediate(async() => {
            if (agrupado) {
                await createTicketsAgrupado(rifa.monto, rifa._id, rifa.numeros, 2);            
            }else{
                await createTickets(rifa.monto, rifa._id, rifa.numeros);
            }
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
 *  UPDATE RIFA
=========================================================================*/
const updateRifa = async(req, res = response) => {

    const rifid = req.params.id;

    try {

        // SEARCH RIFA
        const rifaDB = await Rifa.findById(rifid);
        if (!rifaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ninguna rifa con este ID'
            });
        }
        // SEARCH RIFA

        // VALIDATE RIFA
        let {monto, ...campos } = req.body;

        if (rifaDB.monto !== monto) {
            campos.monto = monto;

            // 2️⃣ Actualizar tickets relacionados
            await Ticket.updateMany(
                { rifa: rifid, disponible: true },
                { monto }
            );
            
        }

        // UPDATE
        const rifaUpdate = await Rifa.findByIdAndUpdate(rifid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            rifa: rifaUpdate
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
    getRifa,
    getRifaId,
    createRifa,
    updateRifa,
    getRifaList
};