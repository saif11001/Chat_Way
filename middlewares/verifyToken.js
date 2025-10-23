const jwt = require('jsonwebtoken');
const httpStatusText = require('../utils/httpStatusText');
const User = require('../models/user');

const verifyToken = async (req, res, next) => {

    const accessToken = req.cookies.accessToken;
    try{
        if (accessToken) {
            const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN);
            req.user = decoded;
            return next();
        }    
    } catch (error) {
        if(error.name !== 'TokenExpiredError') {
            console.error("Token verification error:", error);
            return next(error);
        }
    }

    const refreshToken = req.cookies.refreshToken;
    if(!refreshToken) {
        console.log("Access token expired and no refresh token available.");
        return res.redirect('/auth/login');
    }
    try{
        const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
        const user = await User.findByPk(decodedRefreshToken.id);
        
        if(!user) {
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            console.log('Invalid refresh token. Please login again.');
            return res.res.redirect('/auth/login');
        }

        const newAccessToken = jwt.sign({ id: user.id, email: user.email, userRole: user.userRole }, process.env.ACCESS_TOKEN, { expiresIn: process.env.ACCESS_TOKEN_EXP } );
        const newRefreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN, { expiresIn: process.env.REFRESH_TOKEN_EXP });

        user.refreshToken = newRefreshToken;        
        await user.save();

        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 15 * 60 * 1000,
        })
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: "strict",
            maxAge: 10 * 24 * 60 * 60 * 1000,
        })

        // req.user = jwt.decode(newAccessToken);
        req.user = jwt.verify(newAccessToken, process.env.ACCESS_TOKEN);
        console.log("Token refreshed for user:", user.id)
        next();

    }catch (error) {        
        console.error("Refresh token error:", error);
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.redirect('/auth/login');
    }
}

module.exports = verifyToken;
