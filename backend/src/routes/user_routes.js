const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');
const auth = require('../middleware/auth');

router.post('/signup',userController.signUp);
router.post('/signin',userController.signIn);
router.post('/signout',userController.signout);
router.get('/', auth,userController.getAllUsers);
router.put('/:id', auth,userController.updateUser);
router.delete('/:id', auth,userController.deleteUser);

module.exports = router;