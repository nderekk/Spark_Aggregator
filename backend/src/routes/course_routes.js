const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course_controller');
const verifyToken = require('../middleware/auth'); 

router.get('/',  courseController.getAllCourses);
router.get('/:id',  courseController.getCourse);
router.get('/:id/similar', verifyToken,courseController.getSimilarCourses); // thema me to token
router.get('/sync/:source', verifyToken, courseController.syncSource);

router.post('/', verifyToken,courseController.createCourse);
router.put('/:id', verifyToken, courseController.updateCourse);
router.delete('/:id', verifyToken, courseController.deleteCourse);


module.exports = router;