const { response } = require('express');

const ObjectId = require('mongoose').Types.ObjectId;
const crypto = require('crypto');

const Product = require('../models/products.model');
const Rifa = require('../models/rifas.model');
const User = require('../models/users.model');

/** =====================================================================
 *  GET QUERY
=========================================================================*/
const getProducts = async(req, res) => {

    try {

        const { desde, hasta, ...query } = req.body;

        const [products, total] = await Promise.all([
            Product.find(query)
            .populate('rifa')
            .populate('admin')
            .limit(hasta)
            .skip(desde),
            Product.countDocuments(query)
        ]);

        res.json({
            ok: true,
            products,
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
 *  GET ID
=========================================================================*/
const getProductId = async(req, res = response) => {

    try {
        const id = req.params.id;

        const productDB = await Product.findById(id)
            .populate('rifa')
            .populate('admin');
        if (!productDB) {
            return res.status(400).json({
                ok: false,
                msg: 'No hemos encontrado este producto, porfavor intente nuevamente.'
            });
        }

        res.json({
            ok: true,
            product: productDB
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
 *  CREATE
=========================================================================*/
const createProduct = async (req, res = response) => {
    try {

        const uid = req.uid;
        const user = await User.findById(uid);

        const { rifa, ...campos } = req.body;

        const rifaDB = await Rifa.findById(rifa);
        if (!rifaDB) {
            return res.status(400).json({ ok: false, msg: 'No existe la rifa' });
        }

        if (uid !== (String)(new ObjectId(rifaDB.admin))) {
            return res.status(401).json({ ok: false, msg: 'No tienes los privilegios para crear este producto' });
        }

        const product = new Product(campos);
        product.admin = uid;

        await product.save();

        res.json({
            ok: true,
            product,
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ ok: false, msg: 'Error Inesperado' });
    }
};

/** =====================================================================
 *  UPDATE VENTA
=========================================================================*/
const updateProduct = async(req, res = response) => {

    const pid = req.params.id;

    try {

        // SEARCH USER
        const productDB = await Product.findById(pid);
        if (!productDB) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe ningun producto con este ID'
            });
        }
        // SEARCH USER

        // VALIDATE USER
        let {...campos } = req.body;

        // UPDATE
        const productUpdate = await Product.findByIdAndUpdate(vid, campos, { new: true, useFindAndModify: false });

        res.json({
            ok: true,
            product: productUpdate
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
    getProducts,
    getProductId,
    createProduct,
    updateProduct
};