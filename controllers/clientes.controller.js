const { response } = require('express');

const ObjectId = require('mongoose').Types.ObjectId;

const Cliente = require('../models/clientes.model');
const User = require('../models/users.model');
const Ticket = require('../models/ticket.model');

/** ======================================================================
 *  GET
=========================================================================*/
const getClients = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;
        const uid = req.uid;

        // VERIFICAR SI ES UN ADMIN
        const user = await User.findById(uid);
        if (user.role === 'ADMIN') {
            query.admin = uid;
        }else {
            query.admin = user.admin;
        }
        
        const [clientes, total] = await Promise.all([
            Cliente.find(query)
            .populate('ruta')
            .populate('admin')
            .sort(sort)
            .limit(hasta)
            .skip(desde),
            Cliente.countDocuments(query)
        ]);

        res.json({
            ok: true,
            clientes,
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
 *  GET CLIENT ID
=========================================================================*/
const getClienteId = async(req, res = response) => {

    try {
        const id = req.params.id;

        const uid = req.uid;

        // VERIFICAR SI ES UN ADMIN
        const user = await User.findById(uid)
            .populate('ruta')
            .populate('admin');
        if (user.role !== 'ADMIN') {
            return res.status(400).json({
                ok: false,
                msg: 'No tienes los privilegios necesarios'
            });

        }

        query.admin = uid;

        const clienteDB = await Cliente.findById(id);
        if (!clienteDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este cliente, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            cliente: clienteDB
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
 *  CREATE CLIENT
=========================================================================*/
const createCliente = async(req, res = response) => {

    try {
        
        const uid = req.uid;        
        const cliente = new Cliente(req.body);
        
        // ASIGNAR ADMIN
        const user = await User.findById(uid);
        if (user.role === 'ADMIN') {
            cliente.admin = uid;
        }else {
            cliente.admin = user.admin;
        }
        
        // SI VIENE EL CORREO
        if (cliente.email) {
            cliente.email = email = email.trim().toLowerCase();
        }
        
        // SAVE CLIENTE
        await cliente.save();

        const clienteN = await Cliente.findById(cliente._id)
            .populate('ruta')
            .populate('admin');

        res.json({
            ok: true,
            cliente: clienteN
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado al crear el cliente'
        });
    }
};

/** =====================================================================
 *  UPDATE CLIENTE
=========================================================================*/
const updateCliente = async(req, res = response) => {

    const cid = req.params.id;
    const uid = req.uid;

    try {

        // ASIGNAR ADMIN
        const user = await User.findById(uid);
        

        // SEARCH CLIENTE
        const clienteDB = await Cliente.findById(cid);
        if (!clienteDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun usuario con este ID'
            });
        }
        // SEARCH CLIENTE

        // VERIFICAR PERMISOS
        if (user.role === 'ADMIN') {            
            if (uid !== (String)(new ObjectId(clienteDB.admin))) {
                return res.status(401).json({
                    ok: false,
                    msg: 'No tienes los privilegios para realizar cambios'
                });
            }
        }else {
            if ((String)(new ObjectId(user.admin)) !== (String)(new ObjectId(clienteDB.admin))) {
                return res.status(401).json({
                    ok: false,
                    msg: 'No tienes los privilegios para realizar cambios'
                });
            }
        }

        // UPDATE CLIENTE
        const { ...campos } = req.body;
        const clienteUpdate = await Cliente.findByIdAndUpdate(cid, campos, { new: true, useFindAndModify: false });

        // 2️⃣ Actualizar tickets relacionados
        await Ticket.updateMany(
            { cliente: cid },
            { nombre: clienteUpdate.nombre, telefono: clienteUpdate.telefono, cedula: clienteUpdate.cedula, direccion: clienteUpdate.direccion, ruta: clienteUpdate.ruta, sms: clienteUpdate.sms }
        );

        const cliente = await Cliente.findById(cid)
            .populate('ruta')
            .populate('admin');

        res.json({
            ok: true,
            cliente
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
 *  DELETE USER
=========================================================================*/
const deleteCliente = async(req, res = response) => {

    const uid = req.uid;

    const cid = req.params.id;

    try {

        // SEARCH DEPARTMENT
        const clienteDb = await User.findById(cid);
        if (!clienteDb) {
            return res.status(400).json({
                ok: false,
                msg: 'No existe ningun cliente con este ID'
            });
        }
        // SEARCH DEPARTMENT

        // VERIFICAR PERMISOS
        const user = await User.findById(uid);
        if (user.role !== 'ADMIN') {    
            return res.status(401).json({
                ok: false,
                msg: 'No tienes los privilegios para realizar cambios'
            });        
        }
        
        if (uid !== (String)(new ObjectId(clienteDB.admin))) {
            return res.status(401).json({
                ok: false,
                msg: 'No tienes los privilegios para realizar cambios'
            });
        }

        // CHANGE STATUS
        if (clienteDb.status === true) {
            userDB.status = false;
        } else {
            userDB.status = true;        }
        // CHANGE STATUS

        const clienteUpdate = await Cliente.findByIdAndUpdate(cid, userDB, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            cliente: clienteUpdate
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, porfavor intente nuevamente'
        });
    }

};


// EXPORTS
module.exports = {
    getClients,
    createCliente,
    updateCliente,
    deleteCliente,
    getClienteId
};