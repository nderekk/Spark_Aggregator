const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {

    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        req.user = verified; 
        next();
    } catch (error) {
        res.status(401).json({ message: "Token expired or invalid" });
    }
};

module.exports = verifyToken;