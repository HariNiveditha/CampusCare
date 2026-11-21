import React, { useState, useEffect, useRef, useCallback } from 'react';
import { notificationAPI } from '../api/api';

const NotificationBell = ({ onNotificationClick }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      // Gracefully ignore background poll errors
    }
  }, []);

  // Fetch full notifications list when dropdown is opened
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await notificationAPI.getNotifications({ page: 1, limit: 15 });
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for unread count every 20 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 20000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // When opening dropdown, fetch fresh notifications
  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (notification, e) => {
    e.stopPropagation();
    if (notification.isRead) return;
    try {
      await notificationAPI.markAsRead(notification._id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'COMPLAINT_ACKNOWLEDGEMENT':
      case 'ACKNOWLEDGEMENT':
        return '📬';
      case 'STATUS_UPDATE':
        return '🔄';
      case 'COMPLAINT_ESCALATION':
        return '⚡';
      case 'ADMIN_ALERT':
      case 'SYSTEM_ALERT':
        return '🚨';
      default:
        return '🔔';
    }
  };

  const formatTime = (ts) => {
    try {
      const now = new Date();
      const past = new Date(ts);
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        style={{
          position: 'relative',
          background: isOpen ? '#FFE5CC' : '#FFF0E6',
          border: '1px solid #FF9F5A',
          color: '#FF7A29',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '18px',
          transition: 'all 0.2s ease',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#EF4444',
              color: 'white',
              fontSize: '11px',
              fontWeight: '700',
              borderRadius: '10px',
              padding: '1px 6px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '50px',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFF8F3',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#1F2937' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#FF9F5A',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FF7A29',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List Content */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
                Loading notifications...
              </div>
            ) : error ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#EF4444', fontSize: '13px' }}>
                {error}
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '36px 16px', textAlign: 'center', color: '#9CA3AF' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📭</div>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: '500' }}>No notifications yet</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>
                  Workflow alerts and updates will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => {
                    if (!n.isRead) {
                      handleMarkAsRead(n, { stopPropagation: () => {} });
                    }
                    if (onNotificationClick) {
                      onNotificationClick(n);
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #F3F4F6',
                    backgroundColor: n.isRead ? '#FFFFFF' : '#FFF9F5',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ fontSize: '20px', lineHeight: 1, marginTop: '2px' }}>
                    {getTypeIcon(n.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          fontWeight: n.isRead ? '600' : '700',
                          color: '#1F2937',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title}
                      </h4>
                      <span style={{ fontSize: '11px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                        {formatTime(n.createdAt)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: '12px',
                        color: n.isRead ? '#6B7280' : '#374151',
                        lineHeight: 1.4,
                      }}
                    >
                      {n.message}
                    </p>
                    {n.ticketNumber && (
                      <span
                        style={{
                          display: 'inline-block',
                          marginTop: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: '#FF7A29',
                          backgroundColor: '#FFF0E6',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        #{n.ticketNumber}
                      </span>
                    )}
                  </div>
                  {!n.isRead && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FF7A29',
                        marginTop: '6px',
                        flexShrink: 0,
                      }}
                      title="Unread"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
