const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const Message = require('../models/message');
const User = require('../models/user');

const getAdminPage = async (req, res) => {
    try {
        const userId = req.user.id;
        const token = req.cookies.accessToken;

        console.log("Admin page request - User ID:", userId);
        console.log("Token exists:", !!token);

        const admin = await User.findByPk(userId);
        if (!admin) {
            console.log("Admin not found in database");
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return res.redirect('/auth/login');
        }

        console.log("Admin found:", admin.name);

        let htmlContent = fs.readFileSync(
            path.join(__dirname, '..', 'public', 'admin.html'), 
            'utf8'
        );

        htmlContent = htmlContent.replace(/<%=\s*userId\s*%>/g, userId);
        htmlContent = htmlContent.replace(/<%=\s*token\s*%>/g, token);

        console.log("Sending admin page to user:", userId);

        res.send(htmlContent);
    } catch (error) {
        console.error("Admin page error:", error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

const getActiveChats = async (req, res, next) => {
    try {
        const chats = await Message.findAll({
            attributes: [
                'roomId',
                [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastMessageTime'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'messageCount'],
                [Sequelize.literal(`SUM(CASE WHEN "isRead" = false THEN 1 ELSE 0 END)`), 'unreadCount']
                // [Sequelize.literal(`SUM(CASE WHEN "isRead" = 0 THEN 1 ELSE 0 END)`), 'unreadCount']
                // [Sequelize.literal(`SUM(CASE WHEN isRead = 0 THEN 1 ELSE 0 END)`), 'unreadCount']
                // [Sequelize.literal('SUM(CAST(isRead AS UNSIGNED) = 0)'), 'unreadCount']
            ],
            group: ['roomId'],
            order: [[Sequelize.fn('MAX', Sequelize.col('createdAt')), 'DESC']],
            raw: true
        });

        const chatList = await Promise.all(
            chats.map(async (chat) => {
                const user = await User.findByPk(chat.roomId, {
                    attributes: ['id', 'name', 'email']
                });

                const lastMessage = await Message.findOne({
                    where: { roomId: chat.roomId },
                    order: [['createdAt', 'DESC']]
                });

                return {
                    userId: chat.roomId,
                    userName: user ? user.name : 'Unknown User',
                    userEmail: user ? user.email : '',
                    lastMessage: lastMessage ? lastMessage.content : '',
                    lastMessageTime: chat.lastMessageTime,
                    messageCount: chat.messageCount,
                    unreadCount: chat.unreadCount || 0
                };
            })
        );

        res.json({ status: 'success', data: chatList });
    } catch (error) {
        console.error("Error getting active chats:", error);
        next(error);
    }
};

const getUserMessages = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const messages = await Message.findAll({
            where: { roomId: userId },
            order: [['createdAt', 'ASC']]
        });

        res.json({ 
            status: 'success', 
            data: messages.map(msg => ({
                id: msg.id,
                content: msg.content,
                senderId: msg.senderId,
                senderType: msg.senderType,
                createdAt: msg.createdAt
            }))
        });
    } catch (error) {
        console.error("Error getting user messages:", error);
        next(error);
    }
};

const markMessagesAsRead = async (req, res, next) => {
    try {
        const { userId } = req.params;

        const [affectedCount] = await Message.update(
            { isRead: true },
            { where: { roomId: userId, senderType: 'user', isRead: false } }
        );
        console.log(`Updated ${affectedCount} messages for user ${userId}`);


        res.json({ status: 'success', message: 'Messages marked as read', count: affectedCount });
    } catch (error) {
        console.error("Error marking messages as read:", error);
        next(error);
    }
};

module.exports = {
    getAdminPage,
    getActiveChats,
    getUserMessages,
    markMessagesAsRead
};