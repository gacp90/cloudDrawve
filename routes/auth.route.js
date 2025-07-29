/** =====================================================================
 *  LOGIN ROUTER
=========================================================================*/
const { Router } = require('express');
const { check } = require('express-validator');

// HELPERS
const { validarCampos } = require('../middlewares/validar-campos');
const { validarJWT } = require('../middlewares/validar-jwt');

// CONTROLLERS
const { login, renewJWT, rePass } = require('../controllers/auth.controller');

const router = Router();

/** =====================================================================
 *  LOGIN
=========================================================================*/
router.post('/', [
        check('email', 'El email es olbigatorio').not().isEmpty(),
        check('password', 'La contraseña es obligatoria').not().isEmpty(),
        validarCampos
    ],
    login
);

/** =====================================================================
 *  RENEW TOKEN
=========================================================================*/
router.get('/renew', validarJWT, renewJWT);

/** =====================================================================
 *  RECUPERAR CONTRASEÑA
=========================================================================*/
router.post('/recuperar/password', [
        check('email', 'El email es obligatorio').not().isEmpty(),
        validarCampos
    ],
    rePass
);


// EXPORT
module.exports = router;