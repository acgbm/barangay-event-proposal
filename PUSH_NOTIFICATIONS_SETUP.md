# Push Notifications Setup Guide

This guide explains how to set up push notifications for your Barangay Event Proposal System for both mobile and desktop users.

## Overview

The system now supports push notifications for:
- ✅ Event Approved notifications
- ✅ Event Declined notifications
- ✅ Event Rescheduled notifications
- ✅ Upcoming events (1 day before)

Notifications work on:
- **Desktop**: Web Notifications API (Chrome, Firefox, Edge, Safari)
- **Mobile**: Firebase Cloud Messaging (iOS and Android)

## Prerequisites

1. Firebase project with Cloud Messaging enabled
2. Node.js and npm installed
3. Firebase CLI installed globally (`npm install -g firebase-tools`)

## Step 1: Get Your VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `barangay-events-system`
3. Go to **Project Settings** (gear icon)
4. Navigate to **Cloud Messaging** tab
5. Copy the **Web Push certificates** - generate one if needed
6. Copy the **Server key** and **Sender ID** for later use

## Step 2: Configure Environment Variables

Create a `.env.local` file in the `barangay-events` directory:

```bash
cp barangay-events/.env.local.example barangay-events/.env.local
```

Edit `.env.local` and add your VAPID key:

```
REACT_APP_VAPID_KEY=your_vapid_key_here
```

## Step 3: Install Dependencies

### Frontend
```bash
cd barangay-events
npm install
```

### Cloud Functions (Backend)
```bash
cd ../cloud-functions
npm install
```

## Step 4: Deploy Cloud Functions

```bash
cd cloud-functions
firebase login
firebase deploy --only functions
```

This will deploy:
- `sendPushNotification`: HTTP endpoint for sending notifications
- `sendUpcomingEventNotifications`: Scheduled function that runs daily at 3 AM UTC

## Step 5: Update Backend Notification Endpoint

If you deployed Cloud Functions, update your backend endpoint:

In `.env.local`:
```
REACT_APP_NOTIFICATION_ENDPOINT=https://your-region-your-project.cloudfunctions.net/sendPushNotification
```

Replace `your-region` and `your-project` with your Firebase project details.

## Step 6: Test Notifications

1. Start the React app:
```bash
cd barangay-events
npm start
```

2. Open the app in your browser
3. When prompted, **allow notifications**
4. The system will automatically:
   - Request notification permission
   - Retrieve and store the FCM token in the user's Firestore document
   - Set up message listeners for foreground notifications

5. To test:
   - Approve or decline a proposal → notification sent to staff
   - Reschedule an event → notification sent to staff and officials
   - Events happening tomorrow → daily notifications at 3 AM UTC

## How It Works

### Request Permission & Get FCM Token
When users log in, the system:
1. Requests notification permission
2. Generates an FCM token
3. Stores the token in the Firestore user document

### Sending Notifications

**Approval/Decline Flow:**
- Official votes and reaches majority → system sends push notification
- Notification service retrieves user FCM tokens
- Backend Cloud Function sends via Firebase Cloud Messaging

**Reschedule Flow:**
- Admin reschedules event → system fetches all officials' and submitter's tokens
- Sends reschedule notification to all relevant parties

**Upcoming Events Flow:**
- Scheduled Cloud Function runs daily at 3 AM UTC
- Finds all approved events happening tomorrow
- Sends notifications 1 day before to submitter and all officials

### Service Worker
- Handles background notifications (when app is closed)
- Shows native OS notifications
- Handles notification clicks to bring user back to app

## Troubleshooting

### Notifications not working?

1. **Check browser support**: Ensure you're using a modern browser (Chrome 50+, Firefox 44+, Edge 17+)

2. **Permission denied**: 
   - Check if you've blocked notifications in browser settings
   - Clear browser cache and site data
   - Try incognito/private mode

3. **FCM token not saving**:
   - Check browser console for errors
   - Verify VAPID key in .env.local
   - Check Firestore user document has `fcmToken` field

4. **Cloud Functions not sending**:
   - Check Firebase Cloud Functions logs
   - Verify endpoint URL is correct
   - Check user FCM tokens exist in Firestore

5. **Scheduled notifications not running**:
   - Check Cloud Scheduler in Firebase Console
   - Verify Cloud Function logs for errors
   - Ensure timezone is set correctly (currently America/Los_Angeles)

## API Endpoints

### Send Notification Endpoint
```
POST /api/send-notification

Body:
{
  "tokens": ["token1", "token2", ...],
  "notification": {
    "title": "Event Approved",
    "body": "Your event has been approved!",
    "icon": "/behublogo.png"
  },
  "data": {
    "proposalId": "proposal_id",
    "type": "approved"
  }
}

Response:
{
  "success": true,
  "successCount": 2,
  "failureCount": 0,
  "errors": []
}
```

## Database Changes

The system automatically adds/updates these fields in Firestore:

**users collection:**
- `fcmToken` (string): Device's Firebase Cloud Messaging token
- `lastTokenUpdate` (timestamp): When the token was last updated

**proposals collection:**
- `notified1DayBefore` (boolean): Whether 1-day-before notification was sent

## Files Modified/Created

### Frontend
- `src/firebaseConfig.js` - Added Firebase Messaging configuration
- `src/context/AuthContext.js` - Added FCM token retrieval on login
- `src/services/notificationService.js` - NEW: Notification helper functions
- `src/pages/admin/AdminProposal.js` - Added reschedule notifications
- `src/pages/official/ReviewProposal.js` - Added approval/decline notifications
- `public/firebase-messaging-sw.js` - NEW: Service worker for background notifications
- `src/index.js` - Added Firebase service worker registration
- `.env.local.example` - NEW: Environment variables template

### Backend
- `cloud-functions/index.js` - NEW: Cloud Functions for sending notifications
- `cloud-functions/package.json` - NEW: Dependencies for Cloud Functions

## Next Steps

1. Customize notification messages in `src/services/notificationService.js`
2. Add notification UI/toast notifications using react-toastify
3. Create notification preferences for users
4. Add analytics to track notification engagement
5. Set up notification delivery reports

## Support

For Firebase Cloud Messaging documentation, visit:
https://firebase.google.com/docs/cloud-messaging

For testing with Firebase Local Emulator:
https://firebase.google.com/docs/emulator-suite/install_emulator_suite
