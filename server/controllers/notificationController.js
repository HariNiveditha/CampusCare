const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

// Get current user's notifications (Paginated)
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;

    const data = await notificationService.getUserNotifications(userId, { page, limit });
    res.json(data);
  } catch (error) {
    console.error('getNotifications error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve notifications', error: error.message });
  }
};

// Get current user's unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadCount = await notificationService.getUnreadCount(userId);
    res.json({ unreadCount });
  } catch (error) {
    console.error('getUnreadCount error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve unread count', error: error.message });
  }
};

// Mark single notification as read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Forbidden: You cannot modify another user\'s notifications.' });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json(notification);
  } catch (error) {
    console.error('markAsRead error:', error.message);
    res.status(500).json({ message: 'Failed to mark notification as read', error: error.message });
  }
};

// Mark all notifications for current user as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await notificationService.markAllAsRead(userId);
    res.json({
      message: 'All notifications marked as read.',
      modifiedCount: result.modifiedCount !== undefined ? result.modifiedCount : (result.nModified || 0),
    });
  } catch (error) {
    console.error('markAllAsRead error:', error.message);
    res.status(500).json({ message: 'Failed to mark all as read', error: error.message });
  }
};
