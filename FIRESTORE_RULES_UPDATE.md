# Firestore Security Rules Update

Add these rules to your Firestore Security Rules to allow email queue operations.

## Current Rules Location:
Firebase Console → Firestore Database → Rules tab

## Add These Rules:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection and notifications subcollection
    match /users/{userId} {
      allow read, write: if request.auth != null;
      allow read, update, delete: if request.auth.uid == userId;
      allow create: if request.auth != null;
      allow get, list: if true;

      allow update: if request.auth == null && 
                    request.resource.data.emailVerified == true;

      // Notifications subcollection
      match /notifications/{notificationId} {
        allow read: if request.auth.uid == userId;
        allow create, write: if request.auth != null;
        allow delete: if request.auth.uid == userId;
      }
    }
    
    // Email Queue - for sending reminders
    match /email_queue/{emailId} {
      // Frontend can create emails
      allow create: if request.auth != null;
      
      // Backend service account can read and update
      allow read, update: if true;
      
      // Never allow delete from frontend
      allow delete: if false;
    }

    match /notifications/{docId} {
      allow read: if request.auth != null;
      allow delete: if request.auth != null;
      allow create, update: if false;
    }

    match /users/{userId}/resetPassword {
      allow create: if true;
    }

    match /proposals/{proposalId} {
      allow create, read, update, delete: if true;
    }

    match /proposals/{proposalId} {
      allow update: if request.auth != null;
    }

    match /proposals/{proposalId}/votes/{voteId} {
      allow create, update: if request.auth != null;
    }

    match /notifications/{notificationId} {
      allow create: if request.auth != null;
    }
  }
}
```

## Steps:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select "barangay-events-system" project
3. Go to **Firestore Database** → **Rules** tab
4. Replace everything with the rules above
5. Click **Publish**

⚠️ Important sections:
- `match /email_queue/{emailId}` - New rule for email queue
- Frontend can `create` emails
- Backend can `read` and `update` emails
- No one can delete from frontend (protection)

The `email_queue` collection doesn't need to exist beforehand. Firestore will create it automatically when the first email is queued.
