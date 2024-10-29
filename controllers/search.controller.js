const { response } = require('express');

const User = require('../models/users.model');

/** =====================================================================
 *  SEARCH FOR TABLE
=========================================================================*/
const search = async(req, res = response) => {

    const busqueda = req.params.busqueda;
    const tabla = req.params.tabla;
    const regex = new RegExp(busqueda, 'i');
    const desde = Number(req.query.desde) || 0;
    const hasta = Number(req.query.hasta) || 50;

    let data = [];
    let total;

    const numeros = /^[0-9]+$/;
    let number = false;

    if (busqueda.match(numeros)) {
        number = true;
    } else {
        number = false;
    }

    switch (tabla) {

        case 'users':

            // data = await User.find({ name: regex });
            [data, total] = await Promise.all([
                User.find({
                    $or: [
                        { email: regex },
                        { name: regex },
                        { role: regex },
                        { address: regex }
                    ]
                }),
                User.countDocuments()
            ]);
            break;

        default:
            res.status(400).json({
                ok: false,
                msg: 'Error en los parametros de la busquedad'
            });
            break;

    }

    res.json({
        ok: true,
        resultados: data,
        total
    });

};
/** =====================================================================
 *  SEARCH FOR TABLE
=========================================================================*/


// EXPORTS
module.exports = {
    search
};