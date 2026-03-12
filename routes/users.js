const express = require('express');
const router = express.Router();
const { getAllUsers, updateUserRole, getMe } = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');
const { authorize, restrictTo } = require('../middlewares/rbac');

router.use(authenticate);

router.get('/me', getMe);
router.get('/', authorize('user:read'), restrictTo('admin'), getAllUsers);
router.patch('/:id/role', authorize('user:write'), restrictTo('admin'), updateUserRole);

module.exports = router;
