const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const httpStatusText = require('../utils/httpStatusText');
const path = require('path');

const getRegister = (req, res, next) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'auth.html'));
}

const register = async (req, res, next) => {
    const { name, email, password } = req.body;
    try{
        const olduser = await User.findOne({ where: { email: email } });
        if(olduser) {
            return res.redirect('/auth/register?error=email_exists');
        };

        const hashPassword = await bcrypt.hash(password, 12);
        
        const user = await User.create({
            name: name,
            email: email,
            password: hashPassword
        })

        const accessToken = jwt.sign({ id: user.id, email: user.email, userRole: user.userRole }, process.env.ACCESS_TOKEN, { expiresIn: process.env.ACCESS_TOKEN_EXP } );
        const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN, { expiresIn: process.env.REFRESH_TOKEN_EXP });

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000,
        })
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 10 * 24 * 60 * 60 * 1000,
        });

        const redirectUrl = user.userRole === 'admin' ? '/admin' : '/';
        return res.redirect(redirectUrl);

    } catch (error) {
        console.log('Register error: ', error);
        next(error);
    }
}

const getLogin = (req, res, next) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'auth.html'));
}

const login = async (req, res, next) => {
    const { email, password } = req.body;
    try{
        const user = await User.findOne({ where: { email: email } });
        if(!user) {
            return res.redirect('/auth/login?error=user_not_found');
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if(!isEqual) {
            return res.redirect('/auth/login?error=wrong_password');
        }

        const accessToken = jwt.sign({ id: user.id, email: user.email, userRole: user.userRole }, process.env.ACCESS_TOKEN, { expiresIn: process.env.ACCESS_TOKEN_EXP });
        const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN, {expiresIn: process.env.REFRESH_TOKEN_EXP });

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000,
        })
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 10 * 24 * 60 * 60 * 1000,
        });

        console.log('Login successful for user:', user.id)
        const redirectUrl = user.userRole === 'admin' ? '/admin' : '/';
        return res.redirect(redirectUrl);

    } catch (error) {
        console.log('Login error: ', error);
        next(error);
    }
}

const logout = async (req, res, next) => {
    const userId = req.user.id;
    try{
        const user = await User.findByPk(userId);
        if(!user) {
            return res.status(404).json({ status: httpStatusText.FAIL, message: 'User not found!'});
        }

        user.refreshToken = null;
        await user.save();
        
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        // res.status(200).json({ status: httpStatusText.SUCCESS, message: 'Logged out successfully.' });
        return res.redirect('/auth/login');

    }catch (error) {
        console.log('Logout error: ', error);
        next(error);
    }
}

module.exports = {
    getRegister,
    register,
    getLogin,
    login,
    logout
}