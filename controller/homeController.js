const path = require('path');
const fs = require('fs');
const User = require('../models/user'); // ← المهم ده!

const getHomePage = async (req, res) => {
    try {
        const userId = req.user.id;
        const token = req.cookies.accessToken;

        // Redirect admin to admin panel
        if (req.user.userRole === 'admin') {
            return res.redirect('/admin');
        }

        const user = await User.findByPk(userId);
        if (!user) {
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
            return res.redirect('/auth/login');
        }

        // Read HTML file
        const htmlPath = path.join(__dirname, '..', 'public', 'home.html');
        let htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Replace template variables
        htmlContent = htmlContent.replace('<%=userId%>', userId);
        htmlContent = htmlContent.replace('<%=token%>', token);
        htmlContent = htmlContent.replace('<%= userId %>', userId);
        htmlContent = htmlContent.replace('<%= token %>', token);

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