const { response } = require('express');

const ObjectId = require('mongoose').Types.ObjectId;

const Cliente = require('../models/clientes.model');
const User = require('../models/users.model');
const Ticket = require('../models/ticket.model');
const Ruta = require('../models/rutas.model');

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
 *  SAVE CLIENTS MASIVES
=========================================================================*/
const createClientsMasives = async(req, res = response) => {

    try {

        const uid = req.uid;
        let admin = req.uid;
        const { clients } = req.body;

        // ASIGNAR ADMIN
        const user = await User.findById(uid);
        if (user.role !== 'ADMIN') {
            admin = user.admin;
        }

        // Cargar todas las rutas activas
        const rutas = await Ruta.find({ admin: uid, status: true });
        if (!rutas.length) {
            return res.status(400).json({
                ok: false,
                msg: 'Debes agregar al menos una ruta activa'
            });
        }

        function normalizarTexto(texto) {

            texto = new String(texto)

            return texto
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/\s+/g, ' ')
                .trim();
        }        

        // Normalizar rutas
        const rutasMap = new Map();
            rutas.forEach(r => {
            rutasMap.set(normalizarTexto(r.name), r._id);
        });        

        const rutaDefaultId = rutas[0]._id;
        let noCreados = 0;
        let rutasIncorrectas = [];
        const clientsArray = [];

        for (const client of clients) {            

            if ( !client.nombre || !client.codigo || !client.telefono || !client.cedula || !client.direccion || !client.ruta ) {
                noCreados++;
                continue;
            }

            const clientDB = await Cliente.findOne({cedula: client.cedula, admin});
            if (clientDB) {
                noCreados++;
                continue;
            }

            if (client.correo) {
                client.correo = client.correo.toLowerCase().trim();
            }
            
            const nombreRuta = normalizarTexto(client.ruta);
            const rutaId = rutasMap.get(nombreRuta) || rutaDefaultId;

            if (!rutasMap.has(nombreRuta)) {
                rutasIncorrectas.push(nombreRuta.ruta || '');
            }

             // Crea el ticket y agrégalo al array
            clientsArray.push({
                nombre: client.nombre,
                codigo: client.codigo,
                telefono: client.telefono,
                cedula: client.cedula,
                direccion: client.direccion,
                correo: client.correo,
                admin: admin,
                ruta: rutaId,
            });

        }

        // Inserta todos los clientes en una sola operación
        await Cliente.insertMany(clientsArray);
        
        res.json({
            ok: true,
            msg: `Clientes creados: ${clientsArray.length}`,
            noCreados,
            rutasSinCoincidencia: rutasIncorrectas
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
    getClienteId,
    createClientsMasives
};