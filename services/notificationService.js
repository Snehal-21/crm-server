const Notification = require('../models/Notification');

let io; // Socket.IO instance

/**
 * Initialize the notification service with Socket.IO
 */
const init = (socketIo) => {
  io = socketIo;
};

/**
 * Create a notification and emit it via Socket.IO
 */
const createNotification = async ({ recipient, type, message, lead, metadata = {} }) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      message,
      lead,
      metadata
    });

    // Emit real-time notification to user's room
    if (io) {
      io.to(recipient.toString()).emit('notification', {
        _id: notification._id,
        type: notification.type,
        message: notification.message,
        lead: notification.lead,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
        metadata: notification.metadata
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

/**
 * Notify multiple recipients
 */
const notifyMany = async (recipients, notificationData) => {
  const promises = recipients.map(recipient =>
    createNotification({ ...notificationData, recipient })
  );
  return Promise.all(promises);
};

module.exports = { init, createNotification, notifyMany };
