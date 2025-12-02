import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';
import { markNotificationAsRead, deleteNotification } from '../services/notificationService';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Set up real-time listener for notifications
    const notificationsRef = collection(db, "users", currentUser.uid, "notifications");
    const q = query(
      notificationsRef,
      orderBy("createdAt", "desc")
    );

    console.log(`🔔 Setting up real-time listener for user ${currentUser.uid}`);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(notif => !notif.deleted);

      setNotifications(notifs);
      
      // Count unread notifications
      const unread = notifs.filter(n => !n.read).length;
      setUnreadCount(unread);

      console.log(`✅ Received ${notifs.length} notifications (${unread} unread)`);
    }, (error) => {
      console.error("❌ Error listening to notifications:", error);
    });

    return () => {
      console.log("🔔 Unsubscribing from notifications");
      unsubscribe();
    };
  }, [currentUser]);

  const handleMarkAsRead = async (notificationId) => {
    if (!currentUser) return;
    
    try {
      await markNotificationAsRead(currentUser.uid, notificationId);
      console.log(`✅ Marked as read: ${notificationId}`);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!currentUser) return;

    try {
      await deleteNotification(currentUser.uid, notificationId);
      console.log(`✅ Deleted notification: ${notificationId}`);
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return "";
    }
  };

  return (
    <div className="notification-center-container">
      {/* Bell Icon */}
      <button
        className="notification-bell"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Notifications"
      >
        <span className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h3>Notifications {unreadCount > 0 && `(${unreadCount})`}</h3>
          </div>

          {loading ? (
            <div className="notification-loading">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="notification-empty">
              <span>📭 No notifications</span>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-item-content">
                    <div className="notification-item-title">{notif.title}</div>
                    <div className="notification-item-body">{notif.body}</div>
                    <div className="notification-item-time">
                      {formatTime(notif.createdAt)}
                    </div>
                  </div>
                  <div className="notification-item-actions">
                    {!notif.read && (
                      <button
                        className="notification-action-btn read-btn"
                        onClick={() => handleMarkAsRead(notif.id)}
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="notification-action-btn delete-btn"
                      onClick={() => handleDeleteNotification(notif.id)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
