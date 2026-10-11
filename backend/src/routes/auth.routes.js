const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const router = express.Router();

router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/register/institution', AuthController.registerInstitution);
router.post('/register/ngo', AuthController.registerNgo);
router.post('/register/recycler', AuthController.registerRecycler);
router.get('/me', authenticate, AuthController.getProfile);
router.patch('/me', authenticate, AuthController.updateProfile);

module.exports = router;
