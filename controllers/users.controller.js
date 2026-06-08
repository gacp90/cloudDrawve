const { response } = require('express');
const bcrypt = require('bcryptjs');

const ObjectId = require('mongoose').Types.ObjectId;

const short = require('short-uuid');

const User = require('../models/users.model');

/** ======================================================================
 *  GET USERS
=========================================================================*/
const getUsers = async(req, res) => {

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

        const [users, total] = await Promise.all([
            User.find(query, 'email name role address img valid status fecha')
            .populate('admin')
            .sort(sort)
            .limit(hasta)
            .skip(desde),
            User.countDocuments(query)
        ]);

        res.json({
            ok: true,
            users,
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
 *  GET USERS
=========================================================================*/

/** =====================================================================
 *  GET USERS ID
=========================================================================*/
const getUserId = async(req, res = response) => {

    try {
        const id = req.params.id;
        

        const userDB = await User.findById(id);
        if (!userDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este usuario, porfavor intente nuevamente.'
            });
        }
        const requesterUid = req.uid;
        const isSelf = userDB._id.toString() === requesterUid;
        const isMySeller = userDB.admin && userDB.admin.toString() === requesterUid;
        if (!isSelf && !isMySeller) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes privilegios para editar a este usuario'
            });
        }

        res.json({
            ok: true,
            user: userDB
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
 *  GET USERS ID
=========================================================================*/

/** =====================================================================
 *  CREATE USERS
=========================================================================*/
const createUsers = async(req, res = response) => {


    try {
        let { email, password } = req.body;
        email = email.trim().toLowerCase();

        const validarUsuario = await User.findOne({ email });

        if (validarUsuario) {
            return res.status(400).json({
                ok: false,
                msg: 'Ya existen alguien con este email'
            });
        }

        const user = new User(req.body);

        // ENCRYPTAR PASSWORD
        const salt = bcrypt.genSaltSync();
        user.password = bcrypt.hashSync(password, salt);
        user.email = email;

        // REFERAL CODE
        user.referralCode = short.generate();

        // SAVE USER
        await user.save();

        res.json({
            ok: true,
            user
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
 *  CREATE USERS
=========================================================================*/

/** =====================================================================
 *  UPDATE USER
=========================================================================*/
const updateUser = async (req, res = response) => {
    const targetUid = req.params.id;
    const requesterUid = req.uid;

    try {
        // 1. SEARCH USER
        const userDB = await User.findById(targetUid);
        if (!userDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningún usuario con este ID'
            });
        }

        // 2. AUTORIZACIÓN (Lo que propusiste)
        // Convertimos a string por si Mongoose los devuelve como ObjectId
        const isSelf = userDB._id.toString() === requesterUid;
        const isMySeller = userDB.admin && userDB.admin.toString() === requesterUid;

        if (!isSelf && !isMySeller) {
            return res.status(403).json({
                ok: false,
                msg: 'No tienes privilegios para editar a este usuario'
            });
        }

        // 3. SEGURIDAD DE CAMPOS (Evitar Mass Assignment)
        // Extraemos 'admin' y 'role' (o cualquier campo sensible) para que NO se guarden en 'campos'
        const { password, email, admin, role, _id, ...campos } = req.body;

        // 4. VALIDATE USERNAME
        if (userDB.email !== email) {
            const validaremail = await User.findOne({ email });
            if (validaremail) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un usuario con este email'
                });
            }
            // Si no existe, lo agregamos a los campos por actualizar
            campos.email = email;
        }

        // 5. ENCRYPT PASSWORD (Si la envía)
        if (password) {
            const salt = bcrypt.genSaltSync();
            campos.password = bcrypt.hashSync(password, salt);
        }

        if (requesterUid === (String)(new ObjectId(userDB.admin))) {
            if (role !== userDB.role) {
                campos.role = role;
            }
        }

        // 6. UPDATE
        // Nota: useFindAndModify ya no es necesario en Mongoose 6+
        const userUpdate = await User.findByIdAndUpdate(targetUid, campos, { new: true });

        // Es buena práctica no devolver el password en la respuesta, aunque esté encriptado
        userUpdate.password = '***********'; 

        res.json({
            ok: true,
            user: userUpdate
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error Inesperado. Hable con el administrador'
        });
    }
};
/** =====================================================================
 *  UPDATE USER
=========================================================================*/
/** =====================================================================
 *  DELETE USER
=========================================================================*/
const deleteUser = async(req, res = response) => {

    const id = req.uid;

    const uid = req.params.id;

    try {

        // SEARCH DEPARTMENT
        const userDB = await User.findById({ _id: uid });
        if (!userDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No existe ningun usuario con este ID'
            });
        }
        // SEARCH DEPARTMENT

        // CHANGE STATUS
        if (userDB.status === true) {

            if (id === uid) {
                return res.status(400).json({
                    ok: false,
                    msg: 'El mismo usuario no puede desactivarse o activarse'
                });
            }

            userDB.status = false;

        } else {
            userDB.status = true;
        }
        // CHANGE STATUS

        const userUpdate = await User.findByIdAndUpdate(uid, userDB, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            user: userUpdate
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
 *  DELETE USER
=========================================================================*/


// EXPORTS
module.exports = {
    getUsers,
    createUsers,
    updateUser,
    deleteUser,
    getUserId
};