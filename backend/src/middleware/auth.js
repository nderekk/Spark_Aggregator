const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    let token = req.cookies.token;

    const authHeader = req.headers['authorization'];
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        
        req.userID = verified.id; 
        next();
    } catch (error) {
        res.status(401).json({ message: "Token expired or invalid" });
    }
};

module.exports = verifyToken;