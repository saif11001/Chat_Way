module.exports = (...role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: 'fail', message: 'Not authenticated' });
        }
        if(!role.includes (req.user.userRole)) {
            return res.status(403).json({
                status: 'fail',
                message: 'You are not authorized to access this resource.'
            });
        }
        return next();
    }
}