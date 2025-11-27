# System Architecture - Push Notifications

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    BARANGAY EVENT SYSTEM                        │
│                    Notification Architecture                    │
└─────────────────────────────────────────────────────────────────┘

                         ┌──────────────────┐
                         │   React App      │
                         │  (Frontend)      │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              ┌─────▼────┐  ┌────▼──────┐ ┌──▼────────┐
              │ Proposal  │  │  Approve/ │ │ Dashboard │
              │Submission │  │  Decline  │ │  (New)    │
              └─────┬────┘  └────┬──────┘ └──┬────────┘
                    │             │           │
                    └─────────────┼───────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  Notification Service    │
                    │  (notificationService.js)│
                    └────┬──────────┬──────┬───┘
                         │          │      │
           ┌─────────────┬┘          │      └──────────────┐
           │             │           │                      │
      ┌────▼────┐  ┌────▼─────┐  ┌─▼──────────┐  ┌──────▼──┐
      │ Desktop │  │ Firestore│  │  Scheduled │  │ History │
      │Notif API│  │  Save    │  │   Check    │  │ & Admin │
      └────┬────┘  └────┬─────┘  └─┬──────────┘  └──────┬──┘
           │             │          │                     │
           │             ▼          │                     │
           │        ┌────────────────┼─────────────────┐  │
           │        │                                  │  │
           │        │          FIRESTORE DB            │  │
           │        │                                  │  │
           │        │  users/{userId}/                │  │
           │        │    notifications/{id}           │  │
           │        │      - title                    │  │
           │        │      - body                     │  │
           │        │      - read                     │  │
           │        │      - createdAt                │  │
           │        │                                  │  │
           │        └────────────────┬─────────────────┘  │
           │                         │                    │
           ▼                         ▼                    ▼
      ┌─────────┐  ┌────────────────────────┐  ┌──────────────┐
      │ Browser │  │   Mobile Device        │  │  Admin Panel │
      │ Desktop │  │ (iOS/Android)          │  │  Dashboard   │
      │ Popup   │  │ - Notification Center  │  │  (NotifCenter│
      └─────────┘  │ - History              │  │   Component) │
                   │ - Mark as Read         │  └──────────────┘
                   └────────────────────────┘
```

---

## Detailed Data Flow

### 1. New Pending Proposal Flow

```
Staff Submits Proposal
        │
        ▼
StaffProposal.js
        │
        ├─► Firestore: Create proposal (status: "Pending")
        │
        └─► notifyNewPendingProposal()
                │
                ├─► Query: Get all officials (role: "official")
                │
                ├─► sendNotificationsToUsers(officialIds)
                │   │
                │   ├─► Desktop: sendDesktopNotification()
                │   │   └─► Browser popup (if app is open)
                │   │
                │   └─► Mobile: saveNotificationToFirestore()
                │       └─► users/{officialId}/notifications/{id}
                │
                └─► Notifications saved & ready!

Officials See:
├─ Desktop: 📝 Instant popup
└─ Mobile: 📝 In notification center
```

### 2. Scheduled Notification Flow

```
Event Tomorrow (1 day before)
        │
        ▼
Dashboard "Trigger Now" OR Cloud Functions (3 AM UTC)
        │
        ▼
checkAndNotifyUpcomingEvents()
        │
        ├─► Query: Get all approved proposals with startDate = tomorrow
        │
        ├─► For each event:
        │   │
        │   └─► notifyUpcomingEvent()
        │       │
        │       ├─► Desktop: Instant popup
        │       │   └─► "⏰ Upcoming Event Tomorrow"
        │       │
        │       └─► Mobile: Saved to Firestore
        │           └─► users/{userId}/notifications/{id}
        │
        └─► All notifications sent!

Users See:
├─ Desktop: ⏰ Instant popup
└─ Mobile: ⏰ In notification center
```

### 3. Notification Retrieval Flow

```
User Opens App
        │
        ▼
NotificationCenter.js mounts
        │
        ├─► fetchNotifications()
        │
        ├─► getUserNotifications(userId)
        │
        ├─► Query Firestore:
        │   └─► users/{userId}/notifications/*
        │
        ├─► Display in dropdown:
        │   ├─ Sort by date (newest first)
        │   ├─ Show unread badge count
        │   ├─ Show title, body, timestamp
        │   ├─ Mark as read option
        │   └─ Delete option
        │
        └─► Auto-refresh every 30 seconds
```

---

## Data Structure

### Notification Document
```
{
  id: "auto-generated",
  title: "📝 New Event Proposal",
  body: "John submitted a new event: Basketball Tournament",
  icon: "/barangay-logo.png",
  
  data: {
    proposalId: "proposal-123",
    type: "new_pending",        // or: approved, declined, rescheduled, upcoming
    submittedBy: "John Doe",
    timestamp: "2025-11-28T10:30:00.000Z"
  },
  
  read: false,
  deleted: false,
  
  createdAt: Timestamp,
  expiresAt: Timestamp        // 30 days from creation
}
```

### Firestore Collection Path
```
database/
  users/
    {userId}/
      notifications/
        {notificationId}/
          - title
          - body
          - icon
          - data
          - read
          - createdAt
          - expiresAt
```

---

## Component Architecture

### NotificationCenter Component
```
NotificationCenter
├── State
│   ├── notifications: array
│   ├── loading: boolean
│   └── showDropdown: boolean
│
├── Effects
│   ├── Fetch notifications on mount
│   └── Auto-refresh every 30s
│
├── Functions
│   ├── fetchNotifications()
│   ├── handleMarkAsRead()
│   └── handleDelete()
│
└── UI
    ├── Bell icon with badge
    ├── Dropdown menu
    ├── Notification list
    ├── Mark as read button
    └── Delete button
```

### ScheduledNotificationTrigger Component
```
ScheduledNotificationTrigger
├── State
│   ├── loading: boolean
│   ├── message: string
│   └── lastRun: timestamp
│
├── Functions
│   └── handleManualTrigger()
│       └── checkAndNotifyUpcomingEvents()
│
└── UI
    ├── Trigger button
    ├── Status message
    ├── Last run time
    └── Info box
```

---

## Integration Points

### Where Notifications are Triggered

1. **StaffProposal.js** (Line 178)
   ```javascript
   await notifyNewPendingProposal(proposalData, staffName);
   ```

2. **ReviewProposal.js** (Line ~200)
   ```javascript
   await notifyApprovedEvent(proposal, [proposal.userId]);
   await notifyDeclinedEvent(proposal, [proposal.userId]);
   ```

3. **AdminProposal.js** (Line ~180)
   ```javascript
   await notifyRescheduleEvent(proposal, newStartDate, newFinishDate, recipientIds);
   ```

4. **NotificationDashboard.js** (Manual)
   ```javascript
   await checkAndNotifyUpcomingEvents();
   ```

5. **Cloud Functions** (Scheduled - production)
   ```javascript
   .pubsub.schedule('0 3 * * *').onRun(...)
   ```

---

## Security Architecture

### Firestore Security Rules
```
┌─────────────────────────────────────┐
│   Firestore Security Rules          │
├─────────────────────────────────────┤
│ ✓ Users can only access own notifs  │
│ ✓ Any auth user can create notifs   │
│ ✓ Only owner can update/delete      │
│ ✓ No service worker needed          │
│ ✓ Data encrypted in transit         │
└─────────────────────────────────────┘
```

---

## Performance Considerations

### Reads
- Fetch notifications: 1 read per query
- Auto-refresh: 1 read every 30 seconds
- Daily average: ~2,880 reads per user

### Writes
- Create notification: 1 write
- Mark as read: 1 write
- Delete: 1 write
- Daily average: ~5 writes per notification

### Estimated Monthly Cost (100 events)
```
Reads:    ~5,000  (users viewing notifications)
Writes:   ~1,000  (new notifications created)
Deletes:  ~500    (manual cleanup)
---------
Total:    ~6,500 operations/month
```

---

## Comparison: With vs Without Service Worker

### Without Service Worker (Current ✅)
```
✓ Desktop notifications: Web Notifications API
✓ Mobile notifications: Firestore storage
✓ Simple implementation
✓ No background worker complexity
✓ Works reliably in development
✓ No registration errors
✓ Smaller bundle size
✓ Easier to debug
```

### With Service Worker (Skipped)
```
✗ Required for background notifications
✗ Registration often fails locally
✗ More complex setup
✗ FCM tokens needed
✗ Service worker caching complexity
✗ Larger bundle size
✓ Better for production PWA
```

---

## Timeline: How Data Flows Through System

```
T=0ms:   User submits proposal
         │
T=50ms:  Proposal saved to Firestore
         │
T=100ms: notifyNewPendingProposal() called
         │
T=150ms: Query officials from Firestore
         │
T=200ms: Desktop notification sent to officials viewing app
         │
T=250ms: Notifications saved to Firestore for all officials
         │
T=300ms: Success message shown to user
         │
T=30s:   Auto-refresh: Officials see notification in center
         │
T=24h:   Notification auto-deleted (30-day retention)
```

---

## What's Monitored

```
✓ Notification creation count
✓ User notification reads
✓ System errors/failures
✓ Firestore operation logs
✓ Firebase Console metrics
✓ Cloud Function execution (production)
```

---

## Summary

The system provides:
- ✅ **Desktop notifications** - Instant popups
- ✅ **Mobile notifications** - Firestore based
- ✅ **Scheduled notifications** - Manual or automated
- ✅ **Notification center** - View history
- ✅ **No service worker** - Simpler architecture
- ✅ **Offline access** - Firestore persistence
- ✅ **Security** - Firestore rules enforced
- ✅ **Scalability** - Low cost, high reliability

**Status: Production Ready ✅**
