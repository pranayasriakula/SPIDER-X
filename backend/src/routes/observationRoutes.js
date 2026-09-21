const router = require('express').Router(); const { latestObservations } = require('../controllers/observationController'); const { authenticate, authorize } = require('../middleware/auth');
router.get('/latest', authenticate, authorize('AUTHORITY', 'ADMIN'), latestObservations); module.exports = router;
