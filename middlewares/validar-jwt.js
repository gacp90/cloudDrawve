/**
 * VALIDATE JWT
 */

const { response } = require("express");
const jwt = require('jsonwebtoken');
const User = require('../models/users.model');

const validarJWT = async (req, res = response, next) => {

    // 1. READ TOKEN
    const token = req.header('x-token');

    if (!token) {
        return res.status(401).json({
            ok: false,
            msg: 'No existe token, debe iniciar sesión'
        });
    }

    let uid;

    // 2. VERIFICACIÓN CRIPTOGRÁFICA DEL TOKEN
    try {
        const payload = jwt.verify(token, process.env.SECRET_SEED_JWT);
        uid = payload.uid;
    } catch (error) {
        return res.status(401).json({
            ok: false,
            msg: 'Token inválido o expirado'
        });
    }

    // 3. RESOLUCIÓN MULTI-TENANT (Base de Datos)
    try {
        const userDB = await User.findById(uid);

        if (!userDB) {
            return res.status(401).json({
                ok: false,
                msg: 'Token no válido - El usuario ya no existe'
            });
        }

        if (!userDB.status) {
            return res.status(401).json({
                ok: false,
                msg: 'Token no válido - Usuario inactivo'
            });
        }

        // Inyectamos las variables globales para los controladores
        req.uid = uid;
        req.userRole = userDB.role;
        
        // LA MAGIA: Calculamos quién es el dueño del ecosistema
        req.adminId = userDB.admin ? userDB.admin.toString() : userDB._id.toString();

        next();

    } catch (error) {
        console.log('Error en validarJWT:', error);
        return res.status(500).json({
            ok: false,
            msg: 'Error interno validando credenciales'
        });
    }
};

const validarJWTClient = (req, res = response, next) => {

    // READ TOKEN
    const token = req.header('x-token');

    if (!token) {
        return res.status(401).json({
            ok: false,
            msg: 'No existen token, debe de iniciar session'
        });
    }

    try {

        const { cid } = jwt.verify(token, process.env.SECRET_SEED_JWT);

        req.cid = cid;
        next();

    } catch (error) {
        return res.status(401).json({
            ok: false,
            msg: 'Token invalido, debe de iniciar session'
        });

    }

};


module.exports = {
    validarJWT,
    validarJWTClient
};