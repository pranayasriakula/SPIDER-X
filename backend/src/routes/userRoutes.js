const router = require('express').Router(); const { getUser, updateUser } = require('../controllers/userController'); const { authenticate } = require('../middleware/auth');
router.use(authenticate); router.get('/:id', getUser); router.patch('/:id', updateUser); module.exports = router;
