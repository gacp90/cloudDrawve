/** =====================================================================
 *  UPLOADS ROUTER
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const expressFileUpload = require('express-fileupload');
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { fileUpload, getImages, deleteImg } = require('../controllers/uploads.controller');

const router = Router();

router.use(expressFileUpload());

/** =====================================================================
 *  UPLOADS
=========================================================================*/
router.put('/:tipo/:id', validarJWT, fileUpload);
/** =====================================================================
 *  UPLOADS
=========================================================================*/

/** =====================================================================
 *  GET IMAGES
=========================================================================*/
router.get('/:tipo/:image', getImages);
/** =====================================================================
 *  GET IMAGES
=========================================================================*/
/** =====================================================================
 *  DELETE IMAGES
=========================================================================*/
router.delete('/delete/:type/:img/:id', validarJWT, deleteImg);
/** =====================================================================
 *  DELETE IMAGES
=========================================================================*/

// EXPORT
module.exports = router;