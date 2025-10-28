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
        
    console.log('📝 Register attempt:', { name, email });
    
    try {
        if (!name || !email || !password) {
            console.log('Missing fields');
            return res.status(400).json({
                status: httpStatusText.FAIL,
                message: 'All fields are required'
            });
        }

        const olduser = await User.findOne({ where: { email: email } });
        if (olduser) {
            console.log('Email already exists');
            return res.status(409).json({
                status: httpStatusText.FAIL,
                message: 'Email already exists'
            });
        }

        const hashPassword = await bcrypt.hash(password, 12);
        
        const user = await User.create({
            name: name,
            email: email,
            password: hashPassword
        });

        console.log('User created:', user.id);

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, userRole: user.userRole }, 
            process.env.ACCESS_TOKEN, 
            { expiresIn: process.env.ACCESS_TOKEN_EXP }
        );
        
        const refreshToken = jwt.sign(
            { id: user.id }, 
            process.env.REFRESH_TOKEN, 
            { expiresIn: process.env.REFRESH_TOKEN_EXP }
        );

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000,
        });
        
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 10 * 24 * 60 * 60 * 1000,
        });

        const redirectUrl = user.userRole === 'admin' ? '/admin' : '/';
        
        console.log('Registration successful, redirecting to:', redirectUrl);
        
        return res.status(200).json({
            status: httpStatusText.SUCCESS,
            message: 'Registration successful',
            redirectUrl: redirectUrl
        });

    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({
            status: httpStatusText.ERROR,
            message: error.message || 'Registration failed'
        });
    }
}

const getLogin = (req, res, next) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'auth.html'));
}

const login = async (req, res, next) => {
    const { email, password } = req.body;
    
    console.log('Login attempt:', email);
    
    try {
        if (!email || !password) {
            console.log('Missing credentials');
            return res.status(400).json({
                status: httpStatusText.FAIL,
                message: 'Email and password are required'
            });
        }

        const user = await User.findOne({ where: { email: email } });
        
        if (!user) {
            console.log('User not found');
            return res.status(404).json({
                status: httpStatusText.FAIL,
                message: 'User not found'
            });
        }

        const isEqual = await bcrypt.compare(password, user.password);
        
        if (!isEqual) {
            console.log('Wrong password');
            return res.status(401).json({
                status: httpStatusText.FAIL,
                message: 'Incorrect password'
            });
        }

        const accessToken = jwt.sign(
            { id: user.id, email: user.email, userRole: user.userRole }, 
            process.env.ACCESS_TOKEN, 
            { expiresIn: process.env.ACCESS_TOKEN_EXP }
        );
        
        const refreshToken = jwt.sign(
            { id: user.id }, 
            process.env.REFRESH_TOKEN, 
            { expiresIn: process.env.REFRESH_TOKEN_EXP }
        );

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000,
        });
        
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 10 * 24 * 60 * 60 * 1000,
        });

        const redirectUrl = user.userRole === 'admin' ? '/admin' : '/';
        
        console.log('Login successful for user:', user.id, '- redirecting to:', redirectUrl);
        
        return res.status(200).json({
            status: httpStatusText.SUCCESS,
            message: 'Login successful',
            redirectUrl: redirectUrl
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            status: httpStatusText.ERROR,
            message: error.message || 'Login failed'
        });
    }
}

const logout = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ 
                status: httpStatusText.FAIL, 
                message: 'User not found!'
            });
        }

        user.refreshToken = null;
        await user.save();
        
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        
        return res.redirect('/auth/login');

    } catch (error) {
        console.error('Logout error:', error);
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