# Push Notifications Quick Reference

## Quick Start

### 1. Set Environment Variables
```bash
# Create .env.local in barangay-events directory
REACT_APP_VAPID_KEY=your_vapid_key_from_firebase
```

### 2. Install & Deploy
```bash
# Install frontend deps
cd barangay-events
npm install

# Install and deploy Cloud Functions
cd ../cloud-functions
npm install
firebase deploy --only functions
```

### 3. Test
```bash
# Start dev server
cd ../barangay-events
npm start
```

## API Reference

### Notification Functions

#### `notifyApprovedEvent(proposal, recipientIds)`
Sends "Event Approved" notification
```javascript
import { notifyApprovedEvent } from '../../services/notificationService';

await notifyApprovedEvent(proposal, [userId1, userId2]);
```

#### `notifyDeclinedEvent(proposal, recipientIds)`
Sends "Event Declined" notification
```javascript
import { notifyDeclinedEvent } from '../../services/notificationService';

await notifyDeclinedEvent(proposal, [userId1, userId2]);
```

#### `notifyRescheduleEvent(proposal, newStartDate, newFinishDate, recipientIds)`
Sends "Event Rescheduled" notification
```javascript
import { notifyRescheduleEvent } from '../../services/notificationService';

await notifyRescheduleEvent(proposal, "2025-12-25", "2025-12-26", [userId1, userId2]);
```

#### `notifyUpcomingEvent(proposal, recipientIds)`
Sends "Event happening tomorrow" notification
```javascript
import { notifyUpcomingEvent } from '../../services/notificationService';

await notifyUpcomingEvent(proposal, [userId1, userId2]);
```

### Firebase Config Functions

#### `requestNotificationPermission()`
Requests notification permission and gets FCM token
```javascript
import { requestNotificationPermission } from '../../firebaseConfig';

const token = await requestNotificationPermission();
```

#### `setupMessageListener(callback)`
Sets up listener for foreground messages
```javascript
import { setupMessageListener } from '../../firebaseConfig';

setupMessageListener((payload) => {
  console.log('Notification received:', payload);
});
```

## Database Schema

### Users Collection
```javascript
{
  uid: "user_id",
  email: "user@example.com",
  role: "staff|official|admin",
  fcmToken: "firebase_cloud_messaging_token",
  lastTokenUpdate: Timestamp,
  // ... other user fields
}
```

### Proposals Collection
```javascript
{
  id: "proposal_id",
  title: "Event Name",
  status: "Pending|Approved|Declined|Rescheduled",
  submitterId: "user_id",
  startDate: "2025-12-25",
  startTime: "09:00",
  finishDate: "2025-12-25",
  finishTime: "17:00",
  notified1DayBefore: false,
  // ... other proposal fields
}
```

## Cloud Functions

### Deployed Functions

#### `sendPushNotification`
**Type:** HTTP Function
**URL:** `https://region-project.cloudfunctions.net/sendPushNotification`

```bash
POST /sendPushNotification
Content-Type: application/json

{
  "tokens": ["token1", "token2"],
  "notification": {
    "title": "Title",
    "body": "Message body",
    "icon": "/behublogo.png"
  },
  "data": {
    "proposalId": "id",
    "type": "approved"
  }
}
```

#### `sendUpcomingEventNotifications`
**Type:** Scheduled Function (Cloud Scheduler)
**Schedule:** Daily at 3 AM UTC (cron: `0 3 * * *`)
**Timezone:** America/Los_Angeles

Automatically finds approved events happening tomorrow and sends notifications.

## Common Tasks

### Add Notification for New Event Status

1. **Create notification function** in `notificationService.js`:
```javascript
export const notifyCustomStatus = async (proposal, recipientIds) => {
  const notificationData = {
    title: "Custom Status",
    body: `"${proposal.title}" - custom message`,
    icon: "/behublogo.png",
    data: {
      proposalId: proposal.id,
      type: "custom",
      timestamp: new Date().toISOString(),
    },
  };
  return sendNotificationsToUsers(recipientIds, notificationData);
};
```

2. **Call from component**:
```javascript
import { notifyCustomStatus } from '../../services/notificationService';

// When status changes
await notifyCustomStatus(proposal, [userId]);
```

### Change Scheduled Notification Time

Edit `cloud-functions/index.js`:
```javascript
// Change line with schedule
.schedule("0 9 * * *")  // Run at 9 AM UTC instead
.timeZone("America/New_York")  // Change timezone
```

Redeploy:
```bash
firebase deploy --only functions
```

### Debug Notifications

Check browser console:
```javascript
// Logs all FCM tokens for current user
firebase.messaging().getToken().then(token => console.log(token));

// Test notification in dev
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.showNotification('Test', { body: 'Testing' }));
});
```

Check Cloud Functions logs:
```bash
firebase functions:log
```

### Get All Users' FCM Tokens

```javascript
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const users = await getDocs(collection(db, 'users'));
const tokens = [];
users.forEach(doc => {
  if (doc.data().fcmToken) {
    tokens.push(doc.data().fcmToken);
  }
});
```

## Testing Checklist

- [ ] Notification permission request appears on first load
- [ ] FCM token saves to Firestore after permission granted
- [ ] Approve proposal → notification appears immediately
- [ ] Decline proposal → notification appears immediately
- [ ] Reschedule event → notification appears to all recipients
- [ ] Close app → background notification appears
- [ ] Click notification → app opens/focuses
- [ ] Mobile Chrome → notification received
- [ ] Mobile Safari (iOS) → notification received
- [ ] Desktop notifications work across browsers

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "VAPID key missing" | Add `REACT_APP_VAPID_KEY` to `.env.local` and restart |
| "Token not saving" | Check Firestore security rules allow user updates |
| "No notifications received" | Verify browser allows notifications (check settings) |
| "Service worker not registered" | Check `/firebase-messaging-sw.js` exists and is accessible |
| "Cloud Function 404" | Verify Cloud Functions deployed and endpoint URL is correct |
| "Scheduled function not running" | Check Cloud Scheduler job is enabled in Firebase Console |

## Performance Tips

1. **Batch notifications** - Send multiple recipients in one call
2. **Avoid duplicate tokens** - Filter before sending
3. **Set TTL on messages** - 5 minutes is default (300 seconds)
4. **Use data payloads** - Keep notification body under 240 chars
5. **Cache FCM tokens** - Don't request on every notification

## Security Best Practices

1. **Never expose VAPID key** - Keep in environment variables only
2. **Validate tokens** - Ensure user has access before sending
3. **Rate limit** - Prevent notification spam
4. **Require auth** - Check user is authenticated before allowing token updates
5. **Use HTTPS only** - Service Workers require HTTPS (except localhost)

## Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Web Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
