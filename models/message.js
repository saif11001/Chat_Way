const Sequelize = require('sequelize');
const sequelize = require('../config/DB');

const Message = sequelize.define('Message', 
    {
        roomId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        senderId: {
            type: Sequelize.STRING,
            allowNull: false
        },
        senderType: {
            type: Sequelize.ENUM('user', 'admin'),
            allowNull: false,
            defaultValue: 'user'
        },
        content: {
            type: Sequelize.TEXT,
            allowNull: false
        },
        isRead: {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = Message;