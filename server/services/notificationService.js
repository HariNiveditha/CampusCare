const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  /**
   * Create and persist a notification for an individual recipient
   */
  async createNotification({
    recipient,
    recipientRole = 'student',
    title,
    message,
    type,
    complaint = null,
    ticketNumber = '',
  }) {
    try {
      if (!recipient) {
        console.warn('Notification skipped: recipient missing');
        return null;
      }

      const notification = new Notification({
        recipient,
        recipientRole,
        title,
        message,
        type,
        complaint: complaint?._id || complaint,
        ticketNumber: ticketNumber || complaint?.ticketNumber || '',
        isRead: false,
        createdAt: new Date(),
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error.message);
      return null;
    }
  }

  /**
   * Broadcast an alert notification to all active administrators
   */
  async createAdminAlert({
    title,
    message,
    complaint = null,
    ticketNumber = '',
    type = 'ADMIN_ALERT',
  }) {
    try {
      const admins = await User.find({ role: 'admin' }, '_id');
      if (!admins || admins.length === 0) return [];

      const notifications = await Promise.all(
        admins.map((adm) =>
          this.createNotification({
            recipient: adm._id,
            recipientRole: 'admin',
            title,
            message,
            type,
            complaint,
            ticketNumber,
          })
        )
      );

      return notifications.filter(Boolean);
    } catch (error) {
      console.error('Failed to broadcast admin alert:', error.message);
      return [];
    }
  }

  /**
   * Retrieve notifications for a specific user with pagination
   */
  async getUserNotifications(userId, { page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { recipient: userId };
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return {
      notifications,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      unreadCount,
    };
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId) {
    const count = await Notification.countDocuments({
      recipient: userId,
      isRead: false,
    });
    return count;
  }

  /**
   * Mark an individual notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    return notification;
  }

  /**
   * Mark all unread notifications for a user as read
   */
  async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return result;
  }
}

module.exports = new NotificationService();
