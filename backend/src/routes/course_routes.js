const express = require('express');
const router = express.Router();
const courseController = require('../controllers/course_controller');
const {verifyToken,isAdmin} = require('../middleware/auth'); 

router.get('/', verifyToken, courseController.getAllCourses);
router.get('/favorites',  verifyToken, courseController.getFavoriteCourses);
router.get('/recentlyViewed', verifyToken, courseController.getRecentlyViewedCourses);
router.get('/:id',  courseController.getCourse);
router.get('/:id/similar', courseController.getSimilarCourses); // thema me to token
router.get('/sync/:source', verifyToken, courseController.syncSource);
router.post('/:id/favorites',  verifyToken, courseController.postFavoriteCourse);
router.delete('/:id/favorites',  verifyToken, courseController.deleteFavoriteCourse);
router.post('/:id/recentlyViewed', verifyToken, courseController.postRecentlyViewedCourse);

router.get('/sources', verifyToken,isAdmin, courseController.getAvailableSources);
router.post('/sync-courses', verifyToken,isAdmin, courseController.syncAllSources);

router.get('/:id',  courseController.getCourse);
router.get('/:id/similar', courseController.getSimilarCourses);

router.get('/sync/:source', verifyToken, isAdmin,courseController.syncSource);

router.post('/', verifyToken,courseController.createCourse);
router.put('/:id', verifyToken, courseController.updateCourse);
router.delete('/:id', verifyToken, courseController.deleteCourse);

module.exports = router;