const { response } = require('express');

const Sms = require('../models/sms.model');
const Client = require('../models/clientes.model');


/** =====================================================================
 *  GET SMS
=========================================================================*/
const getSms = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

        const [sms, total] = await Promise.all([
            Sms.find(query)
            .limit(hasta)
            .skip(desde)
            .sort(sort),
            Sms.countDocuments()
        ]);

        res.json({
            ok: true,
            sms,
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
 *  GET SMS ID
=========================================================================*/
const getSmsClient = async(req, res = response) => {

    try {
        const cid = req.params.cid;

        const smsDB = await Sms.find({cliente: cid});

        res.json({
            ok: true,
            ruta: smsDB
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
 *  LIMPIAR NUMERO SMS
=========================================================================*/
function normalizarNumero(numero) {
    return numero
        .replace(/\D/g, '')           // Elimina todo excepto números
        .replace(/^58/, '')           // Remueve "58" al inicio
        .replace(/^0/, '');           // Remueve el primer cero si existe
}

/** =====================================================================
 *  CREATE SMS
=========================================================================*/
const createSms = async(req, res = response) => {

    try {

        const uid = req.uid;
        
        // SAVE TASK
        console.log('================= Body =============');
        console.log(req.body);
        console.log('==============================');
        
        const sms = new Sms(req.body);
        // SAVE TASK
        console.log('================= sms =============');
        console.log(sms);
        console.log('==============================');
        sms.number = normalizarNumero(number);

        if (sms.number.length < 8) {
            res.json({
                ok: true
            });
        }

        const clienteDB = await Client.findOne({admin: sms.admin, telefono: sms.number});

        sms.cliente = clienteDB._id;
        
        await sms.save();

        res.json({
            ok: true,
            sms
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
    getSms,
    getSmsClient,
    createSms
};