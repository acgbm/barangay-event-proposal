import React, { useEffect, useRef, useState } from 'react';
import { collection, deleteDoc, doc as firestoreDoc, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import './Header.css';
import { db } from '../firebaseConfig';
import { useAuth } from '../context/AuthContext';

function Header() {
  const { user, role } = useAuth();
  const userId = user?.uid || null;
  const [dateTime, setDateTime] = useState("");
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState(null);
  const [hasUnseenNotifications, setHasUnseenNotifications] = useState(false);
  const dropdownRef = useRef(null);
  const lastViewedRef = useRef(null);
  const normalizedRole = (role || '').toLowerCase();
  const storageKey = userId ? `notifications:lastViewed:${userId}` : null;

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = days[now.getDay()];
      const month = months[now.getMonth()];
      const date = now.getDate();
      const year = now.getFullYear();
      let hour = now.getHours();
      const minute = now.getMinutes().toString().padStart(2, '0');
      const second = now.getSeconds().toString().padStart(2, '0');
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12;
      hour = hour ? hour : 12;
      const time = `${hour}:${minute}:${second} ${ampm}`;
      setDateTime(`${day}, ${month} ${date}, ${year}, ${time}`);
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000); // update every second
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!storageKey) {
      lastViewedRef.current = null;
      return;
    }
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue) {
      const parsed = new Date(storedValue);
      if (!Number.isNaN(parsed.getTime())) {
        lastViewedRef.current = parsed;
      }
    }
  }, [storageKey]);

  useEffect(() => {
    if (!userId) {
      setDropdownOpen(false);
      setNotifications([]);
      setHasUnseenNotifications(false);
      return;
    }

    setIsLoadingNotifications(true);
    const isStaffUser = normalizedRole === 'staff' && Boolean(userId);
    const notificationsCollection = collection(db, 'notifications');
    const notificationsQuery = isStaffUser
      ? query(notificationsCollection, where('targetUserId', '==', userId))
      : query(notificationsCollection, orderBy('timestamp', 'desc'), limit(20));

    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        const viewedAt = lastViewedRef.current;
        let fetched = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : null;
          return {
            id: docSnap.id,
            message: data.message || 'Notification received.',
            type: (data.type || 'info').toLowerCase(),
            timestamp,
            proposalTitle: data.proposalTitle || '',
            proposalId: data.proposalId || '',
            targetUserId: data.targetUserId || '',
            status: data.status || '',
            isUnseen: timestamp ? !viewedAt || timestamp > viewedAt : !viewedAt,
          };
        });

        if (isStaffUser) {
          fetched = fetched
            .sort((a, b) => {
              if (!a.timestamp && !b.timestamp) return 0;
              if (!a.timestamp) return 1;
              if (!b.timestamp) return -1;
              return b.timestamp.getTime() - a.timestamp.getTime();
            })
            .slice(0, 20);
        }

        if (!isStaffUser) {
          fetched = fetched.filter((item) => {
            const roleTarget = (item.targetRole || '').toLowerCase();
            const message = (item.message || '').toLowerCase();
            if (roleTarget === 'staff') return false;
            if (message.startsWith('your event')) return false;
            return true;
          });
        }

        const seen = new Set();
        const duplicates = [];
        const deduped = [];

        fetched.forEach((item) => {
          const key = `${item.proposalId || item.id}|${item.status}|${item.targetUserId || 'all'}`;
          if (seen.has(key)) {
            duplicates.push(item.id);
          } else {
            seen.add(key);
            deduped.push(item);
          }
        });

        fetched = deduped;

        if (duplicates.length > 0) {
          duplicates.forEach((duplicateId) => {
            deleteDoc(firestoreDoc(db, 'notifications', duplicateId)).catch((err) => {
              console.error('Failed to delete duplicate notification', err);
            });
          });
        }

        setNotifications(fetched);
        setHasUnseenNotifications(fetched.some((item) => item.isUnseen));
        setIsLoadingNotifications(false);
        setNotificationError(null);
      },
      (error) => {
        console.error('Error loading notifications:', error);
        setNotificationError('Unable to load notifications.');
        setIsLoadingNotifications(false);
      }
    );

    return () => unsubscribe();
  }, [userId, normalizedRole]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((notification) => notification.isUnseen).length;
  const hasUser = Boolean(userId);

  const toggleDropdown = () => {
    setDropdownOpen((prev) => {
      const next = !prev;
      if (!prev && next) {
        markNotificationsAsSeen();
      }
      return next;
    });
  };

  const markNotificationsAsSeen = () => {
    if (!storageKey) {
      return;
    }
    const now = new Date();
    lastViewedRef.current = now;
    localStorage.setItem(storageKey, now.toISOString());
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isUnseen: false })));
    setHasUnseenNotifications(false);
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) {
      return 'Just now';
    }
    const diffMs = Date.now() - timestamp.getTime();
    if (diffMs < 60 * 1000) return 'Just now';
    if (diffMs < 60 * 60 * 1000) {
      const minutes = Math.floor(diffMs / (60 * 1000));
      return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    }
    if (diffMs < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diffMs / (60 * 60 * 1000));
      return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    }
    return timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <header className="header-pro layout-header">
      <div className="header-pro-right">
        <div className="notification-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className="notification-button"
            aria-haspopup="true"
            aria-expanded={isDropdownOpen}
            onClick={toggleDropdown}
          >
            <svg
              className="notification-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 3a6 6 0 0 0-6 6v3.382l-.447 1.34A1 1 0 0 0 6.5 15h11a1 1 0 0 0 .947-1.278L18 12.382V9a6 6 0 0 0-6-6Z"
                stroke="#2b2f38"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="#f5f6fa"
              />
              <path
                d="M14.5 18a2.5 2.5 0 0 1-5 0"
                stroke="#2b2f38"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            {hasUnseenNotifications && unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>
          {isDropdownOpen && (
            <div className="notification-dropdown">
              <div className="notification-header">
                Notifications
                <span className="notification-count">
                  {notifications.length} {notifications.length === 1 ? 'update' : 'updates'}
                </span>
              </div>
              <ul className="notification-list">
                {!hasUser && (
                  <li className="notification-empty">Sign in to view notifications.</li>
                )}
                {hasUser && notificationError && (
                  <li className="notification-empty">{notificationError}</li>
                )}
                {hasUser && !notificationError && isLoadingNotifications && (
                  <li className="notification-empty">Loading notifications...</li>
                )}
                {hasUser && !notificationError && !isLoadingNotifications && notifications.length === 0 && (
                  <li className="notification-empty">No updates yet.</li>
                )}
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={`notification-item notification-${notification.type} ${
                      notification.isUnseen ? 'is-unread' : 'is-read'
                    }`}
                  >
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{formatRelativeTime(notification.timestamp)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <span className="header-pro-date">{dateTime}</span>
      </div>
    </header>
  );
}

export default Header;
