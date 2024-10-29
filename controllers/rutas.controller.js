const { response } = require('express');

const Ruta = require('../models/rutas.model');


/** =====================================================================
 *  GET RUTAS
=========================================================================*/
const getRutas = async(req, res) => {

    try {

        const { desde, hasta, ...query } = req.body;

        const [rutas, total] = await Promise.all([
            Ruta.find(query)
            .limit(hasta)
            .skip(desde),
            Ruta.countDocuments()
        ]);

        res.json({
            ok: true,
            rutas,
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
 *  GET RUTA ID
=========================================================================*/
const getRutaId = async(req, res = response) => {

    try {
        const id = req.params.id;

        const rutaDB = await Ruta.findById(id);
        if (!rutaDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado esta ruta, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            ruta: rutaDB
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
 *  CREATE RUTA
=========================================================================*/
const createRuta = async(req, res = response) => {

    try {

        const uid = req.uid;

        // SAVE TASK
        const ruta = new Ruta(req.body);
        ruta.admin = uid;

        await ruta.save();

        res.json({
            ok: true,
            ruta
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
 *  UPDATE RUTA
=========================================================================*/
const updateRuta = async(req, res = response) => {

    const ruid = req.params.id;

    try {

        // SEARCH USER
        const rutaDB = await Ruta.findById(ruid);
        if (!rutaDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ninguna ruta con este ID'
            });
        }
        // SEARCH USER

        // VALIDATE USER
        let {...campos } = req.body;

        // UPDATE
        const rutaUpdate = await Ruta.findByIdAndUpdate(ruid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            ruta: rutaUpdate
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
    getRutas,
    getRutaId,
    createRuta,
    updateRuta
};