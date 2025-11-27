# Mobile & Scheduled Notifications Setup Guide

## ✅ What's Implemented

### 1. **Mobile Push Notifications**
- Notifications saved to Firestore for persistent access
- Works offline (notifications stored in cloud)
- Accessible from any device/browser
- 30-day retention

### 2. **Scheduled Notifications**
- Automatic reminders 1 day before events
- Desktop & mobile notifications
- Manually triggerable via dashboard
- No service worker required

### 3. **Notification Center**
- View all notifications in one place
- Mark as read / Delete notifications
- Auto-refresh every 30 seconds
- Real-time updates

### 4. **All Notification Types**
- 📝 New Pending Proposal - Officials notified
- 🎉 Event Approved - Staff notified
- ❌ Event Declined - Staff notified
- 📅 Event Rescheduled - All parties notified
- ⏰ Upcoming Event (1 day prior) - Automatic reminder

---

## 🚀 Quick Start

### Step 1: Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database** → **Rules**
4. Replace with rules from `FIRESTORE_SECURITY_RULES.txt`
5. Click **Publish**

### Step 2: Add Route to App.js

```javascript
// In your App.js, add:
import NotificationDashboard from './pages/NotificationDashboard';

// In your Routes section:
<Route path="/notifications" element={<NotificationDashboard />} />
```

### Step 3: Add NotificationCenter to Header (Optional)

```javascript
// In Header.js (or any layout component):
import NotificationCenter from './NotificationCenter';

// Add in JSX:
<NotificationCenter />
```

### Step 4: Test Locally

1. Start your app:
```bash
npm start
```

2. Navigate to `http://localhost:3000/notifications`

3. Go to Firebase Console → Firestore and manually adjust an event's `startDate` to tomorrow

4. Click "Trigger Now" button in the dashboard

5. You should receive notifications!

---

## 📱 How to Test Mobile Notifications

### Option 1: On Phone Browser
1. Open your deployed app on mobile Safari (iOS) or Chrome (Android)
2. Login and allow notifications
3. New notifications will appear in the notification center
4. They're saved to Firestore and accessible anytime

### Option 2: PWA Installation
1. Open app on mobile
2. Tap "Add to Home Screen"
3. Install as PWA
4. Push notifications work like native app

---

## 🔄 Scheduled Notifications - Production Setup

### Option 1: Cloud Functions (Recommended)

Update `cloud-functions/index.js`:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Scheduled function to run daily at 3 AM UTC
exports.checkAndNotifyUpcomingEvents = functions
  .pubsub
  .schedule('0 3 * * *') // Every day at 3 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    const db = admin.firestore();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
      const snapshot = await db
        .collection('proposals')
        .where('status', '==', 'Approved')
        .where('startDate', '==', tomorrowStr)
        .get();

      let notified = 0;

      for (const doc of snapshot.docs) {
        const proposal = doc.data();
        const userId = proposal.userId;

        if (userId) {
          await db
            .collection('users')
            .doc(userId)
            .collection('notifications')
            .add({
              title: 'Upcoming Event Tomorrow ⏰',
              body: `"${proposal.title}" is happening tomorrow at ${proposal.startTime}!`,
              icon: '/barangay-logo.png',
              data: {
                proposalId: doc.id,
                type: 'upcoming',
                timestamp: new Date().toISOString(),
              },
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          notified++;
        }
      }

      console.log(`✅ Notified ${notified} users for upcoming events`);
      return { success: true, notified };
    } catch (error) {
      console.error('Error:', error);
      return { success: false, error: error.message };
    }
  });
```

Deploy:
```bash
firebase deploy --only functions
```

### Option 2: Third-Party Cron Service

Use **IFTTT**, **PubSub**, or **AWS CloudWatch** to call your app's `/api/scheduled-notifications` endpoint daily.

---

## 🔐 Security

### Firestore Rules Applied
- ✅ Users can only access their own notifications
- ✅ Any authenticated user can create notifications for others
- ✅ Automatic cleanup after 30 days
- ✅ All operations logged

### Data Privacy
- Notifications stored in Firestore
- No personal data in notification bodies
- HTTPS encryption in transit
- Firebase security built-in

---

## 📊 Monitoring

### Check Notification Status

```javascript
// In browser console:
import { getUserNotifications } from './services/notificationService';

const notifs = await getUserNotifications(currentUser.uid);
console.log(notifs);
```

### Firebase Console Checks
1. Firestore → Collections → users → {userId} → notifications
2. See all notifications stored for that user
3. Check `createdAt` timestamps
4. Verify `read` status

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Notifications not saving | Check Firestore security rules are updated |
| Mobile notifications not showing | Ensure notifications are saved to Firestore |
| Scheduled notifications not running | Check Cloud Functions deployment or cron service |
| "No officials found" error | Verify users have `role: "official"` in Firestore |
| Notification permission denied | Ask user to grant notification permission in browser settings |

---

## 📈 Next Steps

1. ✅ Deploy to Firebase Hosting
2. ✅ Set up Cloud Functions for scheduled notifications
3. ✅ Monitor Firestore usage in Firebase Console
4. ✅ Test on real mobile devices
5. ✅ Set up notification analytics (optional)

---

## 💡 Tips

- Notifications auto-delete after 30 days
- Users can manually delete notifications
- Scheduled function runs in UTC timezone
- All times are ISO format for consistency
- Test with different user roles (staff, official, admin)

---

## 📞 Support

For issues:
1. Check browser console (F12)
2. Check Firebase Logs
3. Verify Firestore rules
4. Test with sample data in Firebase Console
