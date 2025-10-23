const express = require('express');
const authController = require('../controller/authController');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

router.get('/register', authController.getRegister);

router.post('/register', authController.register);

router.get('/login', authController.getLogin);

router.post('/login', authController.login);

router.post('/logout', verifyToken, authController.logout);

module.exports = router;