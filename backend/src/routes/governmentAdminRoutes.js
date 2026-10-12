const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const controller = require('../controllers/governmentController');

router.use(authenticate, authorize('ADMIN'));
router.get('/', controller.list);
router.post('/:id/approve', controller.approve);
router.post('/:id/reject', controller.reject);
router.post('/:id/revoke', controller.revoke);
router.get('/:id/audit', controller.audit);

module.exports = router;
