/** =====================================================================
 *  USER ROUTER
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { search, buscador } = require('../controllers/search.controller');

const router = Router();

/** =====================================================================
 *  SEARCH FOR TABLE
=========================================================================*/
router.get('/:tabla/:busqueda', search);
/** =====================================================================
 *  SEARCH FOR TABLE
=========================================================================*/



// EXPORT
module.exports = router;