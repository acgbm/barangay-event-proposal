import React, { useState, useEffect } from 'react';
import { getUserNotifications, markNotificationAsRead, deleteNotification } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      // Refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const notifs = await getUserNotifications(currentUser.uid);
      // Filter out deleted notifications
      setNotifications(notifs.filter(n => !n.deleted));
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
    setLoading(false);
  };

  const handleMarkAsRead = async (e, notificationId) => {
    e.stopPropagation();
    await markNotificationAsRead(currentUser.uid, notificationId);
    await fetchNotifications();
  };

  const handleDelete = async (e, notificationId) => {
    e.stopPropagation();
    await deleteNotification(currentUser.uid, notificationId);
    await fetchNotifications();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-center">
      <div 
        className="notification-bell"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="unread-badge">{unreadCount}</span>
        )}
      </div>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications {unreadCount > 0 && `(${unreadCount} unread)`}</h3>
            <button 
              className="close-btn"
              onClick={() => setShowDropdown(false)}
            >
              ✕
            </button>
          </div>

          <div className="notification-list">
            {loading && <div className="loading">Loading...</div>}
            
            {!loading && notifications.length === 0 && (
              <div className="empty-state">
                <p>No notifications yet</p>
              </div>
            )}

            {!loading && notifications.map((notif) => (
              <div
                key={notif.id}
                className={`notification-item ${notif.read ? 'read' : 'unread'}`}
              >
                <div className="notification-content">
                  <div className="notification-title">{notif.title}</div>
                  <div className="notification-body">{notif.body}</div>
                  <div className="notification-time">
                    {formatNotificationTime(notif.createdAt)}
                  </div>
                </div>

                <div className="notification-actions">
                  {!notif.read && (
                    <button
                      className="action-btn mark-read"
                      onClick={(e) => handleMarkAsRead(e, notif.id)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                  <button
                    className="action-btn delete"
                    onClick={(e) => handleDelete(e, notif.id)}
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="notification-footer">
            {notifications.length > 0 && (
              <button 
                className="refresh-btn"
                onClick={fetchNotifications}
              >
                Refresh
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
