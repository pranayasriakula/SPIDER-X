const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/governmentController');

router.use(authenticate);
router.post('/applications', authorize('PUBLIC'), controller.submit);
router.get('/applications/me', controller.ownStatus);
router.get('/applications/me/history', controller.ownHistory);

module.exports = router;
