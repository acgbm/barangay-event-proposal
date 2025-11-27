# Push Notifications - System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER DEVICES                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐                  │
│  │  Desktop Browser │    │   Mobile Device  │                  │
│  │  (Chrome/FF/Edge)│    │  (Chrome/Safari) │                  │
│  │                  │    │                  │                  │
│  │ Service Worker ◄─┼────┼─ Service Worker  │                  │
│  │   (Background)   │    │  (Background)    │                  │
│  └──────────────────┘    └──────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
           ▲                          ▲
           │                          │
           │ Firebase Cloud Messaging (FCM)
           │                          │
           └──────────────┬───────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│              FIREBASE CLOUD MESSAGING                            │
│                    (Google Services)                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
    ┌──────▼──────┐  ┌────▼──────┐  ┌───▼──────────┐
    │ Foreground  │  │ Background│  │  Scheduled   │
    │ Notifications│  │ Notifications│  │  Notifications│
    │ (App Open)  │  │ (App Closed) │  │  (Daily 3AM)   │
    └──────┬──────┘  └────┬──────┘  └───┬──────────┘
           │              │              │
           └──────────────┼──────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│              FIREBASE CLOUD FUNCTIONS                            │
│                (Backend Services)                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐      ┌──────────────────────┐         │
│  │ sendPushNotification │      │ sendUpcomingEvents   │         │
│  │  (HTTP Endpoint)     │      │  (Scheduled Daily)   │         │
│  │                      │      │                      │         │
│  │ - Receives tokens    │      │ - Finds tomorrow's   │         │
│  │ - Sends via FCM      │      │   approved events    │         │
│  │ - Handles errors     │      │ - Gets user tokens   │         │
│  │                      │      │ - Sends batch notify │         │
│  └──────────────────────┘      └──────────────────────┘         │
└──────┬───────────────────────────────────┬──────────────────────┘
       │                                   │
       └───────────────┬───────────────────┘
                       │
┌──────────────────────▼────────────────────────────────────────┐
│                 FIRESTORE DATABASE                            │
├──────────────────────────────────────────────────────────────┤
│  Users Collection          Proposals Collection               │
│  ┌──────────────────┐      ┌──────────────────┐              │
│  │ uid              │      │ id               │              │
│  │ email            │      │ title            │              │
│  │ role             │      │ status           │              │
│  │ fcmToken ◄──────┼──────┤ submitterId      │              │
│  │ lastTokenUpdate  │      │ startDate        │              │
│  └──────────────────┘      │ notified1DayBefore│            │
│                            └──────────────────┘              │
└──────────────────────────────────────────────────────────────┘
       ▲                              ▲
       │                              │
       └──────────────┬───────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                REACT FRONTEND APPLICATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Auth Context                                           │   │
│  │  - Requests notification permission on login           │   │
│  │  - Gets FCM token                                       │   │
│  │  - Saves token to Firestore                            │   │
│  │  - Sets up message listener                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          ▲                                       │
│                          │                                       │
│  ┌──────────────┐   ┌────┴────────┐   ┌──────────────┐         │
│  │  ReviewProp. │   │ Notification│   │AdminProposal │         │
│  │              │   │  Service    │   │              │         │
│  │ - Approve    │   │             │   │ - Reschedule │         │
│  │ - Decline    ├───┤ - Approved  │───┤              │         │
│  │ Triggers     │   │ - Declined  │   │ Triggers     │         │
│  │ notification │   │ - Rescheduled│   │ notification │         │
│  │ send         │   │ - Upcoming  │   │ send         │         │
│  └──────────────┘   │             │   └──────────────┘         │
│                     │ Sends FCM   │                             │
│                     │ tokens to   │                             │
│                     │ Cloud Func  │                             │
│                     └─────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

## Notification Flow Diagram

### Approval/Decline Flow
```
Official Reviews Proposal
         │
         ▼
Official Votes (Approve/Decline)
         │
         ▼
Check Majority Threshold
         │
         ├─ Majority Reached (Approved)
         │         │
         │         ▼
         │  Create Firestore Notification
         │         │
         │         ▼
         │  Call notifyApprovedEvent()
         │         │
         │         ▼
         │  Fetch Staff FCM Token
         │         │
         │         ▼
         │  Send to Cloud Function
         │         │
         │         ▼
         │  Firebase Cloud Messaging
         │         │
         │         ▼
         │  Staff Device Receives Notification
         │
         ├─ Majority Reached (Declined)
         │         │
         │         ▼
         │  [Similar to Approved flow]
```

### Reschedule Flow
```
Admin Clicks Reschedule
         │
         ▼
Submit New Dates
         │
         ▼
Update Firestore Proposal
         │
         ▼
Call notifyRescheduleEvent()
         │
         ▼
Fetch Recipients:
- Submitter ID
- All Official IDs
         │
         ▼
Get FCM Tokens from Firestore
         │
         ▼
Send to Cloud Function (Batch)
         │
         ▼
Firebase Cloud Messaging
         │
         ▼
All Recipients Get Notification
```

### Scheduled (1 Day Before) Flow
```
Daily Scheduler Trigger (3 AM UTC)
         │
         ▼
Cloud Function: sendUpcomingEventNotifications()
         │
         ▼
Query Firestore:
- status = "Approved"
- startDate = tomorrow
- notified1DayBefore = false
         │
         ▼
For Each Event:
Get Submitter Token + All Official Tokens
         │
         ▼
Send Batch Notification via FCM
         │
         ▼
Update notified1DayBefore = true
         │
         ▼
All Recipients Get Notification
```

## Data Flow Diagram

```
┌──────────────────────┐
│  User Logs In        │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ AuthContext.useEffect triggered      │
│ - Request notification permission    │
│ - User grants permission             │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ requestNotificationPermission()       │
│ - Gets FCM token from Firebase       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Save to Firestore                    │
│ - users/{uid}                        │
│   - fcmToken                         │
│   - lastTokenUpdate                  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ setupMessageListener()               │
│ - Listens for foreground messages    │
│ - Shows web notifications            │
└──────────────────────────────────────┘
```

## Component Interaction

```
ReviewProposal.js
    │
    ├─ Vote on proposal
    │    │
    │    └─► Check majority
    │
    ├─ IF Approved Reached
    │    │
    │    └─► notifyApprovedEvent()
    │
    └─ IF Declined Reached
         │
         └─► notifyDeclinedEvent()

         
AdminProposal.js
    │
    ├─ Click Reschedule
    │    │
    │    └─► handleRescheduleSubmit()
    │
    ├─ Update proposal dates
    │    │
    │    └─► Reset status to "Pending"
    │
    └─► notifyRescheduleEvent()


Cloud Functions (Backend)
    │
    ├─► sendPushNotification (HTTP)
    │    │
    │    └─► Receives tokens + notification
    │        Sends via Firebase Cloud Messaging
    │
    └─► sendUpcomingEventNotifications (Scheduled)
         │
         └─► Runs daily at 3 AM UTC
             Sends tomorrow's event notifications
```

## Token Lifecycle

```
User Login
   │
   ▼
Request Permission
   │
   ├─ User Denies
   │    └─► Return null (no token)
   │
   ├─ User Grants (First Time)
   │    │
   │    ▼
   │ Generate FCM Token
   │    │
   │    ▼
   │ Save to Firestore
   │    │
   │    ▼
   │ Ready to receive notifications
   │
   └─ Already Granted
        │
        ▼
     Get FCM Token
        │
        ▼
     Save to Firestore
        │
        ▼
     Ready to receive notifications


Token Refresh
     │
     ▼
Firebase Auto-Refreshes Token
     │
     ├─ On browser update
     ├─ On security incident
     ├─ Periodically (annually)
     │
     ▼
AuthContext detects change
     │
     ▼
Updates fcmToken in Firestore
     │
     └─► Always has latest token
```

## Notification Types Matrix

| Type | Trigger | Recipients | Send Method | Frequency |
|------|---------|-----------|-------------|-----------|
| Approved | Official reaches majority approve | Staff member | Immediate | Per proposal |
| Declined | Official reaches majority decline | Staff member | Immediate | Per proposal |
| Rescheduled | Admin reschedules event | Staff + Officials | Immediate | Per reschedule |
| Upcoming | Tomorrow's date matches | Staff + Officials | Scheduled | Daily (3 AM) |

## Technology Stack

```
Frontend: React 19
├─ Firebase SDK (modular)
│  ├─ Authentication
│  ├─ Firestore
│  └─ Cloud Messaging
├─ Service Workers
└─ Web Notifications API

Backend: Firebase Cloud Functions
├─ Node.js
├─ Firebase Admin SDK
└─ Google Cloud Messaging

Database: Firestore
├─ users collection (tokens)
└─ proposals collection (notification status)

Infrastructure: Google Cloud Platform
├─ Cloud Messaging
├─ Cloud Functions
├─ Cloud Scheduler
└─ Firestore
```

---

**Architecture Version**: 1.0
**Last Updated**: November 28, 2025
