const Notification = require('../models/Notification');

/**
 * GET /notifications — paginated, role-scoped
 */
const getNotifications = async (req, res) => {
  try {
    let { page = 1, limit = 20 } = req.query;
    page = Math.max(1, parseInt(page) || 1);
    limit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (page - 1) * limit;

    // Sales only see their own; admin/manager see their own by default
    const filter = { recipient: req.user._id };

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate('lead', 'name status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter)
    ]);

    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });

    res.json({
      data: notifications,
      unreadCount,
      pagination: {
        page, limit, total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications.', error: error.message });
  }
};

/**
 * PATCH /notifications/:id/read
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification.', error: error.message });
  }
};

/**
 * PATCH /notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications.', error: error.message });
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
