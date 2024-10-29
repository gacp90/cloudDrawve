const { response } = require('express');
const bcrypt = require('bcryptjs');

const short = require('short-uuid');

const User = require('../models/users.model');

/** ======================================================================
 *  GET USERS
=========================================================================*/
const getUsers = async(req, res) => {

    try {

        const { desde, hasta, sort, ...query } = req.body;

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
const updateUser = async(req, res = response) => {

    const uid = req.params.id;

    try {

        // SEARCH USER
        const userDB = await User.findById(uid);
        if (!userDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun usuario con este ID'
            });
        }
        // SEARCH USER

        // VALIDATE USER
        const { password, usuario, ...campos } = req.body;
        if (userDB.usuario !== usuario) {
            const validarUsuario = await User.findOne({ usuario });
            if (validarUsuario) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un usuario con este nombre'
                });
            }
        }

        if (password) {

            // ENCRYPTAR PASSWORD
            const salt = bcrypt.genSaltSync();
            campos.password = bcrypt.hashSync(password, salt);

        }

        // UPDATE
        campos.usuario = usuario;
        const userUpdate = await User.findByIdAndUpdate(uid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            user: userUpdate
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