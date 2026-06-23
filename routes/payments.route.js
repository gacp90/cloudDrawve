/** =====================================================================
 *  PAYMENTS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { obtenerPagosList, obtenerReporteContable, createPayments, confirmarPagosLote, cancelarPago } = require('../controllers/payments.controller');

const router = Router();

/** =====================================================================
 *  POST QUERY
=========================================================================*/
router.post('/query', validarJWT, obtenerPagosList);

/** =====================================================================
 *  POST QUERY
=========================================================================*/
router.post('/query/report', validarJWT, obtenerReporteContable);

/** =====================================================================
 *  POST CREATE
=========================================================================*/
router.post('/', [
        validarJWT
    ],
    createPayments
);

/** =====================================================================
 *  POST CONFRIM LOTE
=========================================================================*/
router.post('/confirmar-lote', [
        validarJWT
    ],
    confirmarPagosLote
);

/** =====================================================================
 *  PUT
=========================================================================*/
router.put('/:id', validarJWT, cancelarPago);

// EXPORT
module.exports = router;