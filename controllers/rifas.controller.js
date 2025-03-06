const { response } = require('express');

const { createTickets } = require('../helpers/create-tikects');
const Rifa = require('../models/rifas.model');
const User = require('../models/users.model');


/** =====================================================================
 *  GET RIFAS
=========================================================================*/
const getRifa = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

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

        await createTickets(rifa.monto, rifa._id, rifa.numeros);

        res.json({
            ok: true,
            rifa
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
        let {...campos } = req.body;

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
    updateRifa
};