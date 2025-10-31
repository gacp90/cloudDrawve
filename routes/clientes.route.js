/** =====================================================================
 *  USER ROUTER 
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// MIDDLEWARES
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

const { getClients, getClienteId, createCliente, updateCliente, deleteCliente } = require('../controllers/clientes.controller');

const router = Router();

/** =====================================================================
 *  GET CLIENT
=========================================================================*/
router.post('/query', validarJWT, getClients);

/** =====================================================================
 *  GET CLIENT ID
=========================================================================*/
router.get('/user/:id', validarJWT, getClienteId);

/** =====================================================================
 *  POST CREATE CLIENT
=========================================================================*/
router.post('/', [
        validarJWT,
        check('nombre', 'El nombre es olbigatorio').not().isEmpty(),
        check('telefono', 'El telefono es obligatorio').not().isEmpty(),
        check('cedula', 'La Cedula es obligatoria').not().isEmpty(),
        validarCampos
    ],
    createCliente
);

/** =====================================================================
 *  PUT CLIENT
=========================================================================*/
router.put('/:id', validarJWT, updateCliente);

/** =====================================================================
 *  DELETE CLIENT
=========================================================================*/
router.delete('/:id', validarJWT, deleteCliente);



// EXPORT
module.exports = router;