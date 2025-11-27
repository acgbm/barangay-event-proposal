# ✅ MOBILE & SCHEDULED NOTIFICATIONS - SETUP CHECKLIST

## 📋 PRE-SETUP VERIFICATION

- [ ] You have Firebase project created
- [ ] You have Firestore database set up
- [ ] You have React app running locally
- [ ] You have admin access to Firebase Console

---

## 🚀 STEP 1: UPDATE FIRESTORE SECURITY RULES (5 minutes)

### Action 1.1: Go to Firebase Console
- [ ] Open https://console.firebase.google.com
- [ ] Select your project
- [ ] Click on **Firestore Database** in left sidebar

### Action 1.2: Update Rules
- [ ] Click on **Rules** tab (next to Data)
- [ ] Copy all text from `FIRESTORE_SECURITY_RULES.txt` in your project root
- [ ] Clear the current rules
- [ ] Paste the new rules
- [ ] Review the rules (should allow user access + notifications)
- [ ] Click **Publish** (blue button)
- [ ] Wait for confirmation message

### Verification 1.3: Rules Published
- [ ] You see "Rules updated successfully" message
- [ ] Rules tab shows your new rules
- [ ] No errors in console

---

## 🗂️ STEP 2: ADD ROUTE TO APP.JS (2 minutes)

### Action 2.1: Open App.js
- [ ] Open `src/App.js` in your editor

### Action 2.2: Add Import
- [ ] Find the section with other page imports (near top)
- [ ] Add this line:
```javascript
import NotificationDashboard from './pages/NotificationDashboard';
```

### Action 2.3: Add Route
- [ ] Find your `<Routes>` section
- [ ] Add this route (can be anywhere in the list):
```javascript
<Route path="/notifications" element={<NotificationDashboard />} />
```

### Verification 2.4: Save and Check
- [ ] File saved (Ctrl+S or Cmd+S)
- [ ] No syntax errors (red squiggles)
- [ ] File compiles without errors

---

## 🧪 STEP 3: TEST LOCALLY (5 minutes)

### Action 3.1: Start App
- [ ] Open terminal in project root
- [ ] Run: `npm start`
- [ ] Wait for "Compiled successfully" message
- [ ] Browser opens to http://localhost:3000

### Action 3.2: Navigate to Dashboard
- [ ] Go to: http://localhost:3000/notifications
- [ ] Page loads without errors
- [ ] You see "📢 Notification Management" heading

### Action 3.3: Test Layout
- [ ] You see two main sections:
  - [ ] "Your Notifications" section
  - [ ] "Scheduled Notifications" section
- [ ] You see information panels below
- [ ] No console errors (F12 to check)

---

## 🔔 STEP 4: TEST NEW PENDING PROPOSAL NOTIFICATION

### Action 4.1: Create Two Accounts
- [ ] Logout if logged in
- [ ] Create Staff account (email: staff@test.com)
- [ ] Create Official account (email: official@test.com)
- [ ] Make sure Official account has role="official" in Firestore

### Action 4.2: Submit Proposal (as Staff)
- [ ] Login as staff@test.com
- [ ] Navigate to Staff Dashboard
- [ ] Submit a new event proposal
- [ ] Fill in all fields
- [ ] Click Submit
- [ ] See success message

### Action 4.3: Check Notification (as Official)
- [ ] Logout
- [ ] Login as official@test.com
- [ ] Go to /notifications dashboard
- [ ] You should see a notification with:
  - [ ] Title: "📝 New Event Proposal"
  - [ ] Body: Shows staff name and proposal title
- [ ] Check browser console (F12)
- [ ] You see "✅ Notification saved to Firestore for user..."

---

## 🎯 STEP 5: TEST NOTIFICATION CENTER

### Action 5.1: Open Notification Center
- [ ] While in notifications dashboard
- [ ] Find the "Your Notifications" section
- [ ] Look for the 🔔 bell icon (if NotificationCenter is embedded)
- [ ] Click it to see dropdown

### Action 5.2: Test Interactions
- [ ] You see notifications listed
- [ ] Click ✓ button to mark as read
- [ ] See notification fade (mark as read)
- [ ] Click 🗑 button to delete
- [ ] Notification disappears from list
- [ ] Unread badge count updates

### Action 5.3: Test Auto-refresh
- [ ] Leave dashboard open
- [ ] Go to Firebase Console
- [ ] Manually add a test notification document in:
  - [ ] Firestore → users → {your-user-id} → notifications
  - [ ] Add: title: "Test", body: "Testing auto-refresh"
- [ ] Wait 30 seconds
- [ ] New notification appears without refresh

---

## ⏰ STEP 6: TEST SCHEDULED NOTIFICATIONS

### Action 6.1: Setup Test Event
- [ ] Go to Firebase Console → Firestore
- [ ] Find a proposal with status: "Approved"
- [ ] Edit its `startDate` field
- [ ] Change to tomorrow's date (e.g., 2025-11-29)
- [ ] Save changes

### Action 6.2: Trigger Scheduled Check
- [ ] Go back to /notifications dashboard
- [ ] Find "Scheduled Notifications" section
- [ ] Click "🔄 Trigger Now" button
- [ ] Wait for response

### Action 6.3: Verify Result
- [ ] You see message: "✅ Check complete! Sent notifications to..."
- [ ] Or message: "⚠️ No events found for tomorrow"
- [ ] If event found, check Your Notifications section
- [ ] You should see new ⏰ notification
- [ ] Check browser console for logs

---

## 📱 STEP 7: TEST ON MOBILE (OPTIONAL)

### Action 7.1: Mobile Simulator
- [ ] Press F12 (Developer Tools)
- [ ] Click device toggle icon (top-left)
- [ ] Select iPhone or Android
- [ ] Reload page
- [ ] Test notifications on mobile view

### Action 7.2: Real Mobile Device
- [ ] Deploy to Firebase: `firebase deploy`
- [ ] Get your Firebase Hosting URL
- [ ] Open on iPhone Safari or Android Chrome
- [ ] Login and allow notifications
- [ ] Test all notification types

---

## 🔐 STEP 8: VERIFY SECURITY RULES

### Action 8.1: Check Rules in Console
- [ ] Firebase Console → Firestore → Rules
- [ ] Verify rules include:
  - [ ] Users can access own notifications
  - [ ] Collection path: `users/{userId}/notifications`
  - [ ] Read permission for authenticated users
  - [ ] Write permission for authorized users

### Action 8.2: Test Permissions
- [ ] Login as User A
- [ ] Check that you can't access User B's notifications
- [ ] Verify only your notifications are visible
- [ ] Logout and check access is denied

---

## ✅ FINAL VERIFICATION CHECKLIST

### Code Integration
- [ ] App.js has NotificationDashboard import
- [ ] Route added to App.js correctly
- [ ] No console errors when running
- [ ] All components load without errors

### Firestore
- [ ] Security rules updated
- [ ] Rules published successfully
- [ ] Notifications saving to Firestore
- [ ] Can view in Firebase Console

### Functionality
- [ ] Notifications display correctly
- [ ] Mark as read works
- [ ] Delete works
- [ ] Auto-refresh works
- [ ] Scheduled trigger works
- [ ] All notification types appear

### Security
- [ ] Users can only see own notifications
- [ ] Unauthorized access denied
- [ ] No sensitive data exposed
- [ ] All operations authenticated

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Deploy
- [ ] All tests pass locally
- [ ] No console errors
- [ ] Firestore rules active
- [ ] App builds: `npm run build`

### Deploy Frontend
- [ ] Run: `firebase deploy --only hosting`
- [ ] Wait for completion
- [ ] Visit your Firebase Hosting URL
- [ ] Test notifications work on production

### Deploy Cloud Functions (Optional - for scheduled automation)
- [ ] Update `cloud-functions/index.js` with checkAndNotifyUpcomingEvents
- [ ] Run: `firebase deploy --only functions`
- [ ] Check Cloud Functions logs in Firebase Console

### Post-Deploy Verification
- [ ] Notifications work on production URL
- [ ] Mobile notifications working
- [ ] Firestore storage verified
- [ ] No production errors in logs

---

## 📊 MONITORING (Ongoing)

### Daily Checks
- [ ] Monitor Firestore usage in Firebase Console
- [ ] Check for any errors in Cloud Functions logs
- [ ] Verify notifications are being created
- [ ] Monitor notification delivery

### Weekly Checks
- [ ] Review notification statistics
- [ ] Check for failed notifications
- [ ] Verify security rules are still in place
- [ ] Monitor Firestore storage growth

### Monthly Checks
- [ ] Review total notification volume
- [ ] Check auto-deletion is working (30-day retention)
- [ ] Verify cost is within budget
- [ ] Plan for any scaling needs

---

## 🆘 TROUBLESHOOTING

### Problem: "Route not found" error
- **Solution:** Verify route is added to App.js correctly
- **Check:** Look for typos in import and route path

### Problem: "Collection not found" error
- **Solution:** Check Firestore security rules are updated
- **Action:** Verify notifications collection exists in Firestore

### Problem: Notifications not appearing
- **Solution:** Check browser console for errors (F12)
- **Action:** Verify Firestore rules allow writes
- **Verify:** Check that notifications are being saved (Firebase Console)

### Problem: "Permission denied" error
- **Solution:** Update Firestore security rules
- **Action:** Copy rules from FIRESTORE_SECURITY_RULES.txt and publish

### Problem: Components not loading
- **Solution:** Check all imports are correct
- **Action:** Verify file paths in import statements

---

## 📞 SUPPORT RESOURCES

**If you get stuck, check these files:**

1. **ADD_NOTIFICATION_ROUTE.md** - Route setup help
2. **FIRESTORE_SECURITY_RULES.txt** - Security rules reference
3. **MOBILE_SCHEDULED_NOTIFICATIONS_SETUP.md** - Complete setup guide
4. **NOTIFICATION_SYSTEM_ARCHITECTURE.md** - System design help
5. **Browser Console (F12)** - Error messages and logs
6. **Firebase Console Logs** - Backend errors

---

## ✨ SUCCESS INDICATORS

### You Know It's Working When:
✅ Notifications appear in notification center
✅ Desktop popups show when app is open
✅ Mobile notifications save to Firestore
✅ Scheduled trigger shows success message
✅ Mark as read removes unread badge
✅ Delete removes notification from list
✅ Auto-refresh updates every 30 seconds
✅ No console errors
✅ Firestore shows notification documents
✅ Security rules allow proper access

---

## 🎉 COMPLETION STATUS

After completing all steps above:

✅ **Setup Complete** - You're ready to use notifications!
✅ **Tested** - All features verified working
✅ **Secure** - Firestore rules protecting data
✅ **Documented** - All documentation available
✅ **Deployed** - Ready for production

---

**Status: ✅ ALL STEPS COMPLETE**

You now have a fully functional mobile and scheduled notification system!

**Questions? Check the documentation files or the browser console for errors.**
