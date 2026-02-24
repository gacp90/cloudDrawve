/** =====================================================================
 *  PRODUCTS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getProducts, getProductId, createProduct, updateProduct } = require('../controllers/products.controller');

const router = Router();

/** =====================================================================
 *  POST PRODUCTS
=========================================================================*/
router.post('/query', validarJWT, getProducts);

/** =====================================================================
 *  GET PRODUCT ID
=========================================================================*/
router.get('/:id', getProductId);

/** =====================================================================
 *  POST CREATE PRODUCT
=========================================================================*/
router.post('/', validarJWT, createProduct);

/** =====================================================================
 *  PUT PRODUCT
=========================================================================*/
router.put('/:id', validarJWT, updateProduct);

// EXPORT
module.exports = router;