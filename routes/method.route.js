/** =====================================================================
 *  METHOD ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { createMethod, updateMethod, getMetodoList } = require('../controllers/method.controller');

const router = Router();

/** =====================================================================
 *  POST QUERY
=========================================================================*/
router.post('/query', validarJWT, getMetodoList);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        validarJWT,
        check('moneda', 'La moneda es obligatoria').not().isEmpty(),
        check('nombre', 'El nombre es obligatorio').not().isEmpty(),
        check('cuenta', 'La cuenta es obligatoria').not().isEmpty(),
        check('tasa', 'La tasa es obligatoria').not().isEmpty(),
        validarCampos
    ],
    createMethod
);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, updateMethod);

// EXPORT
module.exports = router;