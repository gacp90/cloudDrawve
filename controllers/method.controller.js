const { response } = require('express');
const { Types } = require('mongoose');

const Metodo = require('../models/method.model');
const User = require('../models/users.model');

/** =====================================================================
 *  GET METODOS
=========================================================================*/
const getMetodoList = async(req, res = response) => {

    try {
        // 1. Extraemos los parámetros con valores por defecto para evitar errores
        const { desde = 0, hasta = 50, sort, ...query } = req.body;

        // Validamos por precaución
        if (!req.adminId) {
            return res.status(404).json({
                ok: false,
                msg: 'Error porfavor intente de nuevo mas tarde'
            });
        }

        // 2. SEGURIDAD MULTI-TENANT: Anclamos la consulta al dueño absoluto
        query.admin = req.adminId;
               
        // 3. Consultas en paralelo para la paginación y los datos
        const [metodos, total] = await Promise.all([
            Metodo.find(query)
            .sort(sort)
            .limit(Number(hasta))
            .skip(Number(desde)),
            Metodo.countDocuments(query)
        ]);
        
        res.json({
            ok: true,
            metodos,
            total
        });

    } catch (error) {
        console.log('Error en getMetodoList:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error inesperado, por favor intente nuevamente'
        });
    }
};

/** =====================================================================
 *  CREATE METHOD
=========================================================================*/
const createMethod = async(req, res = response) => {

    try {
        // 1. Verificación de Roles (Usando el contexto del middleware, sin tocar MongoDB)
        if (req.userRole !== 'ADMIN') {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes los privilegios para crear métodos de pago.'
            });
        }

        // 2. Crear instancia y asignar el dueño absoluto (Tenant)
        const metodo = new Metodo(req.body);
        metodo.admin = req.adminId;

        // 3. Guardar en la base de datos
        await metodo.save();        

        res.json({
            ok: true,
            metodo
        });

    } catch (error) {
        console.log('Error en createMethod:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado'
        });
    }
};


/** =====================================================================
 *  UPDATE METHOD
=========================================================================*/
const updateMethod = async(req, res = response) => {

    const methodid = req.params.id;

    try {
        
        if (req.userRole !== 'ADMIN') {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes los privilegios para editar métodos de pago.'
            });
        }

        // 1. Validamos que el contexto del tenant exista por precaución
        if (!req.adminId) {
            return res.status(403).json({
                ok: false,
                msg: 'Error de contexto: No se identificó el ecosistema'
            });
        }

        // 2. Extraemos los campos que vienen del frontend
        let { ...campos } = req.body;

        // Opcional: Impedimos que por error o malicia modifiquen el dueño del método
        delete campos.admin; 

        // 3. ACTUALIZACIÓN BLINDADA EN UN SOLO PASO
        // Buscamos el método por su ID, pero EXIGIMOS que el campo admin coincida con req.adminId.
        // Si un administrador del Ecosistema A intenta mandar el ID de un método del Ecosistema B,
        // la consulta no hará match con ningún documento y devolverá null de forma segura.
        const metodoUpdate = await Metodo.findOneAndUpdate(
            { 
                _id: methodid, 
                admin: req.adminId 
            }, 
            campos, 
            { new: true, useFindAndModify: false }
        );

        if (!metodoUpdate) {
            return res.status(404).json({
                ok: false,
                msg: 'No se encontró el método de pago o no tienes privilegios para editarlo'
            });
        }

        res.json({
            ok: true,
            metodo: metodoUpdate
        });

    } catch (error) {
        console.log('Error en updateMethod:', error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado al intentar actualizar el método de pago'
        });
    }
};

// EXPORTS
module.exports = {
    createMethod,
    updateMethod,
    getMetodoList
};