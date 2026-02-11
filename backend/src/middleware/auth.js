const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {

    const token = req.cookies.token;

    if (!token) {
        console.log("No token provided in cookies");
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        req.user = verified; 
        next();
    } catch (error) {
        console.error("Token verification failed:", error);
        res.status(401).json({ message: "Token expired or invalid" });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: "Access Denied: Admins Only" });
    }
};

module.exports = {
    verifyToken,
    isAdmin
};