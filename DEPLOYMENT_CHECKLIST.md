# Deployment Checklist - Push Notifications

## Pre-Deployment ✅

### Prerequisites
- [ ] Firebase project created
- [ ] Cloud Messaging enabled in Firebase project
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Node.js 18+ installed
- [ ] Git repository initialized

### Documentation Review
- [ ] Read `IMPLEMENTATION_COMPLETE.md`
- [ ] Read `PUSH_NOTIFICATIONS_SETUP.md`
- [ ] Review `NOTIFICATION_QUICK_REFERENCE.md`

## Configuration ✅

### Get VAPID Key
- [ ] Open Firebase Console
- [ ] Navigate to Project Settings → Cloud Messaging
- [ ] Note Web Push certificate (VAPID key)
- [ ] Store securely (will use in .env.local)

### Environment Variables
- [ ] Create `.env.local` in `barangay-events/` directory
- [ ] Add `REACT_APP_VAPID_KEY=your_key_here`
- [ ] (Optional) Add `REACT_APP_NOTIFICATION_ENDPOINT` if using custom backend

### Verify Files Exist
- [ ] `src/services/notificationService.js` exists
- [ ] `public/firebase-messaging-sw.js` exists
- [ ] `cloud-functions/index.js` exists
- [ ] `.env.local` exists with VAPID key

## Installation ✅

### Frontend Dependencies
```bash
cd barangay-events
npm install
```
- [ ] Installation successful
- [ ] No errors in console

### Cloud Functions Dependencies
```bash
cd ../cloud-functions
npm install
```
- [ ] Installation successful
- [ ] `node_modules` directory created
- [ ] `firebase-admin` and `firebase-functions` installed

## Deployment ✅

### Cloud Functions
```bash
cd cloud-functions
firebase login
firebase deploy --only functions
```
- [ ] Login successful
- [ ] Deployment succeeded
- [ ] Functions visible in Firebase Console
- [ ] Note the deployed function URLs

### Frontend Build & Deployment
```bash
cd ../barangay-events
npm run build
firebase deploy --only hosting
```
- [ ] Build completed without errors
- [ ] `build/` directory created
- [ ] Deployment to hosting successful
- [ ] App is live and accessible

## Post-Deployment Testing ✅

### Browser Testing
- [ ] Open app in Chrome
- [ ] Notification permission popup appears
- [ ] Grant permission
- [ ] Check browser console for errors
- [ ] FCM token appears in console (optional debug)

### Firestore Verification
- [ ] Open Firebase Console
- [ ] Go to Firestore Database
- [ ] Check `users` collection
- [ ] Current user document has `fcmToken` field
- [ ] `lastTokenUpdate` timestamp is recent

### Notification Sending
- [ ] Login as staff with proposal
- [ ] Login as official in different browser
- [ ] Official approves staff's proposal
- [ ] Notification appears in staff's browser/device
- [ ] Notification contains correct title and message

### Reschedule Testing
- [ ] Login as admin
- [ ] Find an approved event
- [ ] Click reschedule button
- [ ] Change dates and submit
- [ ] Notification sent to all officials and submitter
- [ ] Verify notification received

### Scheduled Function Testing
- [ ] Create approved event with tomorrow's date
- [ ] Wait until 3:01 AM UTC (or adjust schedule for testing)
- [ ] Check Cloud Functions logs: `firebase functions:log`
- [ ] Verify function executed and sent notifications
- [ ] (Optional) Manually trigger in Functions shell

## Mobile Testing ✅

### Android
- [ ] Install Chrome browser
- [ ] Open app in Chrome
- [ ] Grant notification permission
- [ ] Test approval notification
- [ ] Verify notification appears in notification center
- [ ] Click notification - app opens

### iOS
- [ ] Open Safari
- [ ] Open app in Safari
- [ ] Grant notification permission
- [ ] Test approval notification
- [ ] Verify notification appears
- [ ] Click notification - app opens

## Error Checking ✅

### Browser Console
- [ ] No errors related to messaging
- [ ] No CORS errors
- [ ] No "VAPID key missing" warnings

### Cloud Functions Logs
```bash
firebase functions:log
```
- [ ] No error logs
- [ ] Notification send shows success
- [ ] No failed token delivery

### Firestore Rules
- [ ] Users can update their own `fcmToken`
- [ ] No permission denied errors

## Performance Verification ✅

### Page Load
- [ ] App loads in < 3 seconds
- [ ] No performance degradation
- [ ] Service worker doesn't slow down startup

### Notification Delivery
- [ ] Desktop notification appears < 1 second
- [ ] Mobile notification appears < 3 seconds
- [ ] No duplicate notifications

### Cloud Functions
- [ ] Function executes < 5 seconds
- [ ] Scheduled function runs at correct time
- [ ] No timeout errors

## Documentation ✅

### Developer Handoff
- [ ] All documentation files created
- [ ] SETUP guide is clear and complete
- [ ] Quick reference guide covers common tasks
- [ ] Troubleshooting section covers known issues
- [ ] Code has inline comments explaining logic

### Comments in Code
- [ ] `notificationService.js` has clear function descriptions
- [ ] `firebase-messaging-sw.js` has comments
- [ ] Cloud Functions have explanatory comments
- [ ] Key functions documented with JSDoc

## Monitoring Setup ✅

### Cloud Functions Logging
- [ ] Enabled logging in Cloud Functions
- [ ] Set up alerts for failed notifications (optional)
- [ ] Created dashboard to view logs

### Analytics (Optional)
- [ ] Consider adding analytics for notification engagement
- [ ] Track which notifications are most successful
- [ ] Monitor delivery rates

## Backup & Recovery ✅

- [ ] Code committed to git
- [ ] `.env.local` backed up securely (not in git)
- [ ] Cloud Functions code backed up
- [ ] Firestore rules backed up
- [ ] Can rollback if issues arise

## Final Sign-Off ✅

### QA Checklist
- [ ] All notifications working correctly
- [ ] No breaking changes to existing features
- [ ] Mobile and desktop both working
- [ ] Background and foreground notifications work
- [ ] Scheduled notifications run on time
- [ ] No performance issues
- [ ] Error handling works properly
- [ ] Logging provides visibility

### Stakeholder Communication
- [ ] Team aware of new features
- [ ] Users instructed to enable notifications
- [ ] Support team trained on troubleshooting
- [ ] Documentation shared with team

### Go-Live Decision
- [ ] All items checked off
- [ ] No critical issues remaining
- [ ] Ready for production
- [ ] Rollback plan in place if needed

---

## Rollback Plan (If Needed)

1. Disable Cloud Functions:
```bash
firebase deploy --only hosting
# Then comment out notification calls in code
```

2. Remove notifications from code:
- Comment out imports in AdminProposal.js
- Comment out imports in ReviewProposal.js
- Remove notification calls from functions

3. Redeploy:
```bash
npm run build
firebase deploy --only hosting
```

4. Users' FCM tokens will remain but be unused (safe)

---

**Deployment Checklist Version**: 1.0
**Last Updated**: November 28, 2025
**Status**: Ready for deployment review
