const { response } = require('express');

const ObjectId = require('mongoose').Types.ObjectId;

const Movimiento = require('../models/movimientos.model');
const User = require('../models/users.model');
const Rifa = require('../models/rifas.model');


/** =====================================================================
 *  GET MOVIMIENTOS
=========================================================================*/
const getMovimientos = async(req, res) => {

    try {

        const { desde, hasta, ...query } = req.body;

        let totalMovimiento = 0;

        const [movimientos, total] = await Promise.all([
            Movimiento.find(query)
            .limit(hasta)
            .skip(desde),
            Movimiento.countDocuments(query)
        ]);

        if (movimientos.length > 0) {
            for (const movimiento of movimientos) {
                totalMovimiento += movimiento.monto;
            }
        }

        res.json({
            ok: true,
            movimientos,
            totalMovimiento,
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
 *  GET MOVIMIENTO ID
=========================================================================*/
const getMovimientoId = async(req, res = response) => {

    try {
        const id = req.params.id;

        const movimientoDB = await Movimiento.findById(id);
        if (!movimientoDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este movimiento, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            movimiento: movimientoDB
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
 *  CREATE MOVIMIENTO
=========================================================================*/
const createMovimiento = async(req, res = response) => {

    try {

        const uid = req.uid;

        const user = await User.findById(uid);
        if (user.role !== 'ADMIN') {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes los privilegios para registrar este movimiento'
            });
        }

        const rifa = await Rifa.findById(req.body.rifa);
        if (uid !== (String)(new ObjectId(rifa.admin))) {
            return res.status(401).json({
                ok: false,
                msg: 'No tienes los privilegios para crear movimientos en esta rifa'
            });
        }

        // SAVE TASK
        const movimiento = new Movimiento(req.body);
        movimiento.user = uid;

        await movimiento.save();

        res.json({
            ok: true,
            movimiento
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
 *  UPDATE MOVIMIENTO
=========================================================================*/
const updateMovimiento = async(req, res = response) => {

    try {

        const moid = req.params.id;

        // SEARCH MOVIMIENTO
        const movimientoDB = await Movimiento.findById(moid);
        if (!movimientoDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun movimiento con este ID'
            });
        }
        // SEARCH MOVIMIENTO

        // VALIDATE MOVIMIENTO
        let {...campos } = req.body;

        // UPDATE
        const movimientoUpdate = await Movimiento.findByIdAndUpdate(moid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            movimiento: movimientoUpdate
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
 *  DELETE MOVIMIENTO
=========================================================================*/
const deleteMovimiento = async(req, res = response) => {

    try {

        const moid = req.params.moid;
        const uid = req.uid;

        const user = await User.findById(uid);
        if (user.role !== 'ADMIN') {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes los privilegios para registrar este movimiento'
            });
        }

        await Movimiento.findByIdAndDelete(moid);

        res.json({
            ok: true,
            msg: 'Se ha eliminado este egreso correctamente'
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
    getMovimientos,
    getMovimientoId,
    createMovimiento,
    updateMovimiento,
    deleteMovimiento
};