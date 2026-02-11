const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');
const {verifyToken} = require('../middleware/auth');

router.post('/signup',userController.signUp);
router.post('/signin',userController.signIn);
router.post('/signout',userController.signout);
router.get('/', verifyToken,userController.getAllUsers);
router.put('/:id', verifyToken,userController.updateUser);
router.delete('/:id', verifyToken,userController.deleteUser);

module.exports = router;