const router = require('express').Router(); const c = require('../controllers/resourceController'); const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate); router.get('/', c.listResources); router.post('/', authorize('AUTHORITY', 'ADMIN'), c.createResource); router.patch('/:id', authorize('AUTHORITY', 'ADMIN'), c.updateResource); module.exports = router;
