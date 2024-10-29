/** =====================================================================
 *  RIFAS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getRifa, getRifaId, createRifa, updateRifa } = require('../controllers/rifas.controller');

const router = Router();

/** =====================================================================
 *  POST RIFAS
=========================================================================*/
router.post('/query', getRifa);
/** =====================================================================
 *  POST RIFAS
=========================================================================*/

/** =====================================================================
 *  GET RIFA ID
=========================================================================*/
router.get('/:id', getRifaId);
/** =====================================================================
 *  GET RIFA ID
=========================================================================*/

/** =====================================================================
 *  POST CREATE RIFA
=========================================================================*/
router.post('/', [
        validarJWT,
        check('name', 'El nombre es olbigatorio').not().isEmpty(),
        validarCampos
    ],
    createRifa
);
/** =====================================================================
 *  POST CREATE RIFA
=========================================================================*/

/** =====================================================================
 *  PUT RIFA
=========================================================================*/
router.put('/:id', validarJWT, updateRifa);
/** =====================================================================
 *  PUT RIFA
=========================================================================*/

// EXPORT
module.exports = router;