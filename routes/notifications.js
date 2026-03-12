const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/rbac');

router.use(authenticate);
router.use(authorize('notification:read'));

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;
