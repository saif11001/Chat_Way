const express = require('express');
const homeController = require('../controller/homeController');
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

router.get('/', verifyToken, homeController.getHomePage);

module.exports = router;