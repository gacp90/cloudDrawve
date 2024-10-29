/** =====================================================================
 *  MOVIMIENTOS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { getMovimientos, getMovimientoId, createMovimiento, updateMovimiento, deleteMovimiento } = require('../controllers/movimientos.controller');

// CONTROLLERS

const router = Router();

/** =====================================================================
 *  POST MOVIMIENTOS
=========================================================================*/
router.post('/query', validarJWT, getMovimientos);
/** =====================================================================
 *  POST MOVIMIENTOS
=========================================================================*/

/** =====================================================================
 *  GET MOVIMIENTO ID
=========================================================================*/
router.get('/:id', validarJWT, getMovimientoId);
/** =====================================================================
 *  GET MOVIMIENTO ID
=========================================================================*/

/** =====================================================================
 *  POST CREATE MOVIMIENTO
=========================================================================*/
router.post('/', [
        validarJWT,
        check('descripcion', 'La descripcion es obligatoria').not().isEmpty(),
        check('monto', 'El monto es olbigatorio').not().isEmpty(),
        check('type', 'El tipo es olbigatorio').not().isEmpty(),
        check('rifa', 'La rifa es olbigatoria').isMongoId(),
        validarCampos
    ],
    createMovimiento
);
/** =====================================================================
 *  POST CREATE MOVIMIENTO
=========================================================================*/

/** =====================================================================
 *  PUT MOVIMIENTO
=========================================================================*/
router.put('/:id', validarJWT, updateMovimiento);

/** =====================================================================
 *  DELETE MOVIMIENTO
=========================================================================*/
router.delete('/:moid', validarJWT, deleteMovimiento);

// EXPORT
module.exports = router;