import React, { useState } from 'react';
import { checkAndNotifyUpcomingEvents } from '../services/notificationService';
import './ScheduledNotificationTrigger.css';

const ScheduledNotificationTrigger = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [lastRun, setLastRun] = useState(null);

  const handleManualTrigger = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      console.log('🔄 Manually triggering upcoming event notifications...');
      const result = await checkAndNotifyUpcomingEvents();
      
      if (result.success) {
        setMessage(`✅ Check complete! Sent notifications to ${result.notified} user(s) for events tomorrow.`);
        setLastRun(new Date().toLocaleTimeString());
      } else {
        setMessage(`⚠️ ${result.message}`);
      }
    } catch (error) {
      console.error('Error triggering notifications:', error);
      setMessage(`❌ Error: ${error.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="scheduled-notification-trigger">
      <div className="trigger-card">
        <h3>🔔 Scheduled Notifications</h3>
        
        <p className="description">
          Check and send notifications for upcoming events (1 day before the event date).
        </p>

        <button
          onClick={handleManualTrigger}
          disabled={loading}
          className={`trigger-button ${loading ? 'loading' : ''}`}
        >
          {loading ? '⏳ Checking...' : '🔄 Trigger Now'}
        </button>

        {lastRun && (
          <div className="last-run">
            Last run: {lastRun}
          </div>
        )}

        {message && (
          <div className={`message ${message.includes('❌') ? 'error' : message.includes('⚠️') ? 'warning' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="info-box">
          <h4>📋 How It Works:</h4>
          <ul>
            <li>Checks all approved events scheduled for tomorrow</li>
            <li>Sends desktop & mobile notifications to event owners</li>
            <li>Notifications are saved to Firestore for offline access</li>
            <li>In production, this runs automatically daily at 3 AM UTC</li>
          </ul>
        </div>

        <div className="prod-info">
          <strong>🚀 Production Setup:</strong>
          <p>In production, set up a Cloud Scheduler to call this function daily.</p>
        </div>
      </div>
    </div>
  );
};

export default ScheduledNotificationTrigger;
