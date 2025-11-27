import React from 'react';
import NotificationCenter from '../components/NotificationCenter';
import ScheduledNotificationTrigger from '../components/ScheduledNotificationTrigger';
import './NotificationDashboard.css';

const NotificationDashboard = () => {
  return (
    <div className="notification-dashboard">
      <div className="dashboard-container">
        <h1>📢 Notification Management</h1>
        
        <div className="dashboard-grid">
          <div className="dashboard-section">
            <h2>Your Notifications</h2>
            <p className="section-desc">View all your notifications (desktop & mobile)</p>
            <NotificationCenter />
          </div>

          <div className="dashboard-section">
            <h2>Scheduled Notifications</h2>
            <p className="section-desc">Manually trigger notifications for upcoming events</p>
            <ScheduledNotificationTrigger />
          </div>
        </div>

        <div className="info-panel">
          <h3>ℹ️ How Notifications Work</h3>
          <div className="info-content">
            <div className="info-item">
              <h4>📝 New Pending Proposal</h4>
              <p>Officials are notified when staff submits a new event proposal</p>
            </div>

            <div className="info-item">
              <h4>🎉 Event Approved</h4>
              <p>Staff is notified when their proposal is approved by officials</p>
            </div>

            <div className="info-item">
              <h4>❌ Event Declined</h4>
              <p>Staff is notified when their proposal is declined</p>
            </div>

            <div className="info-item">
              <h4>📅 Event Rescheduled</h4>
              <p>Notifications sent when an approved event is rescheduled</p>
            </div>

            <div className="info-item">
              <h4>⏰ Upcoming Event Reminder</h4>
              <p>Automatic reminder 1 day before the event date (desktop & mobile)</p>
            </div>
          </div>
        </div>

        <div className="feature-panel">
          <h3>✨ Features</h3>
          <ul>
            <li>✅ Desktop notifications (instant popups)</li>
            <li>✅ Mobile notifications (saved in Firestore)</li>
            <li>✅ Notification history (view all past notifications)</li>
            <li>✅ Mark as read / Delete notifications</li>
            <li>✅ No service worker required</li>
            <li>✅ Scheduled notifications (1 day before events)</li>
            <li>✅ Offline access (stored in Firestore)</li>
            <li>✅ Auto-refresh every 30 seconds</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NotificationDashboard;
