const express = require('express');
const adminController = require('../controller/adminController');
const verifyToken = require('../middlewares/verifyToken');
const allowedTo = require('../middlewares/allowedTo');
const userRole = require('../utils/userRole');

const router = express.Router();

router.use(verifyToken);

router.use(allowedTo(userRole.ADMIN));

router.get('/', adminController.getAdminPage);

router.get('/api/chats', adminController.getActiveChats);

router.get('/api/messages/:userId', adminController.getUserMessages);

router.post('/api/messages/mark-read/:userId', adminController.markMessagesAsRead);

module.exports = router;