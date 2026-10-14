const router = require('express').Router(); const c = require('../controllers/actionController'); const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate, authorize('AUTHORITY', 'ADMIN')); router.post('/', c.createAction); router.get('/', c.listActions); router.get('/:id', c.getAction); router.patch('/:id', c.updateAction); module.exports = router;
