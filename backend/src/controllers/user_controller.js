const User = require('../models/Users');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
dotenv = require('dotenv');
dotenv.config();


const getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const signUp = async (req, res) => {
    try {
        const { firstName, lastName, email, password , role, adminCode} = req.body;

        const adminKey = process.env.ADMIN_KEY;


        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);

        let finalRole = 'user'; 
        if (role === 'admin') {
            if (adminCode === adminKey) {
                finalRole = 'admin';
            } else {
                return res.status(403).json({ message: "Λάθος κωδικός έγκρισης διαχειριστή!" });
            }
        }

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: finalRole,
        });

        await newUser.save();
        res.status(201).json({ message: "User registered successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const signIn = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const payload = { id: user._id, email: user.email ,role: user.role, permissionLevel: user.permissionLevel};
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
        const refreshToken = jwt.sign(payload, process.env.REFRESH_SECRET, { expiresIn: '7d' });

        res.cookie('token', accessToken, {
            httpOnly: true,
            secure: false, 
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: false, 
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        res.json({
            message: "Logged in successfully",
            user: { 
                id: user._id, 
                firstName: user.firstName, 
                email: user.email, 
                role: user.role,
                permissionLevel: user.permissionLevel 
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

const signout = async (req, res) => {

    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/' 
    });

    return res.status(200).json({ message: "Αποσυνδεθήκατε με επιτυχία!" });
};


module.exports = {
    getAllUsers,
    signUp,
    signIn,
    updateUser,
    deleteUser,
    signout
};
