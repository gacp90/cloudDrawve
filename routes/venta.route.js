/** =====================================================================
 *  VENTAS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { getVentas, getVentaId, createVenta, updateVenta, verificarVentaWompi } = require('../controllers/ventas.controller');

const router = Router();

/** =====================================================================
 *  POST VENTAS
=========================================================================*/
router.post('/query', validarJWT, getVentas);

/** =====================================================================
 *  GET VENTA ID
=========================================================================*/
router.get('/:id', getVentaId);

/** =====================================================================
 *  GET VERIFICAR WOMPI
=========================================================================*/
router.get('/verificar/:id', verificarVentaWompi);

/** =====================================================================
 *  POST CREATE VENTA
=========================================================================*/
router.post('/', [        
        check('nombre', 'El nombre es olbigatorio').not().isEmpty(),
        check('telefono', 'El telefono es olbigatorio').not().isEmpty(),
        check('cedula', 'La cedula es olbigatoria').not().isEmpty(),
        check('direccion', 'La direccion es olbigatoria').not().isEmpty(),
        check('correo', 'El correo es olbigatorio').isEmail(),
        validarCampos
    ],
    createVenta
);

/** =====================================================================
 *  PUT VENTA
=========================================================================*/
router.put('/:id', validarJWT, updateVenta);

// EXPORT
module.exports = router;