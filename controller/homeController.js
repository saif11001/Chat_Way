const path = require('path');
const fs = require('fs');
const User = require('../models/user');

const getHomePage = async (req, res) => {
    try {
        const userId = req.user.id;
        const token = req.cookies.accessToken;

        console.log("========================================");
        console.log("HOME PAGE REQUEST");
        console.log("User ID:", userId);
        console.log("Token exists:", !!token);
        console.log("Token preview:", token ? token.substring(0, 20) + '...' : 'NONE');
        console.log("========================================");

        if (req.user.userRole === 'admin') {
            console.log("Admin detected, redirecting to /admin");
            return res.redirect('/admin');
        }

        const user = await User.findByPk(userId);
        if (!user) {
            console.log("User not found in database");
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return res.redirect('/auth/login');
        }

        console.log("User found:", user.name);

        const htmlPath = path.join(__dirname, '..', 'public', 'home.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        const hasUserIdPlaceholder = htmlContent.includes('<%=');
        console.log("HTML contains placeholders:", hasUserIdPlaceholder);

        htmlContent = htmlContent
            .replace(/<%=\s*userId\s*%>/g, String(userId))
            .replace(/<%=\s*token\s*%>/g, String(token));

        const stillHasPlaceholders = htmlContent.includes('<%=');
        console.log("Placeholders remaining after replace:", stillHasPlaceholders);

        if (stillHasPlaceholders) {
            console.error("WARNING: Some placeholders were not replaced!");
        }

        console.log("Sending home page to user:", userId);

        res.send(htmlContent);
    } catch (error) {
        console.error("Home page error:", error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    getHomePage
};