const router = require('express').Router(); const c = require('../controllers/notificationController'); const { authenticate } = require('../middleware/auth');
router.use(authenticate); router.get('/', c.listNotifications); router.patch('/:id/read', c.markRead); module.exports = router;
