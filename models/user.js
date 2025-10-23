const Sequelize = require('sequelize');

const sequelize = require('../config/DB');
const userRole = require('../utils/userRole');

const User = sequelize.define('User', 
    {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        email: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            }
        },
        password: {
            type: Sequelize.STRING,
            allowNull: false
        },
        userRole: {
            type: Sequelize.ENUM(userRole.USER, userRole.ADMIN),
            allowNull: false,
            defaultValue: userRole.USER,
        },
        refreshToken: {
            type: Sequelize.STRING,
            allowNull: true,
            defaultValue: null
        }
    },
    {
        timestamps: true
    }
)

module.exports = User;