/** =====================================================================
 *  RUTAS ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');
const { getSms, getSmsClient, createSms } = require('../controllers/sms.controller');

// CONTROLLERS

const router = Router();

/** =====================================================================
 *  POST RUTAS
=========================================================================*/
router.post('/query', getSms);

/** =====================================================================
 *  GET RUTA ID
=========================================================================*/
router.get('/:cid', validarJWT, getSmsClient);

/** =====================================================================
 *  POST CREATE RUTA
=========================================================================*/
router.post('/', createSms);

// EXPORT
module.exports = router;