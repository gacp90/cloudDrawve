/** =====================================================================
 *  RIFAS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getRifa, getRifaId, createRifa, updateRifa, getRifaList } = require('../controllers/rifas.controller');

const router = Router();

/** =====================================================================
 *  POST RIFAS
=========================================================================*/
router.post('/list', getRifaList);

/** =====================================================================
 *  POST RIFAS
=========================================================================*/
router.post('/query', getRifa);

/** =====================================================================
 *  GET RIFA ID
=========================================================================*/
router.get('/:id', getRifaId);

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
 *  PUT RIFA
=========================================================================*/
router.put('/:id', validarJWT, updateRifa);

// EXPORT
module.exports = router;