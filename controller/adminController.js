const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const Message = require('../models/message');
const User = require('../models/user');

const getAdminPage = async (req, res) => {
    const userId = req.user.id;
    const token = req.cookies.accessToken;

    const admin = await User.findByPk(userId);
    if (!admin) {
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.redirect('/auth/login');
    }

    let htmlContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'admin.html'), 'utf8');

    htmlContent = htmlContent.replace('<%=userId%>', userId);
    htmlContent = htmlContent.replace('<%=token%>', token);
    htmlContent = htmlContent.replace('<%= userId %>', userId);
    htmlContent = htmlContent.replace('<%= token %>', token);

    res.send(htmlContent);
};

const getActiveChats = async (req, res, next) => {
    try {
        const chats = await Message.findAll({
            attributes: [
                'roomId',
                [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastMessageTime'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'messageCount']
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

                const unreadCount = await Message.count({
                    where: { 
                        roomId: chat.roomId,
                        senderType: 'user',
                        isRead: false
                    }
                });

                return {
                    userId: chat.roomId,
                    userName: user ? user.name : 'Unknown User',
                    userEmail: user ? user.email : '',
                    lastMessage: lastMessage ? lastMessage.content : '',
                    lastMessageTime: chat.lastMessageTime,
                    messageCount: chat.messageCount,
                    unreadCount: unreadCount
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

    await Message.update(
      { isRead: true },
      { where: { roomId: userId, senderType: 'user', isRead: false } }
    );

    res.json({ status: 'success', message: 'Messages marked as read' });
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