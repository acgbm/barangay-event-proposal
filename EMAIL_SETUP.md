# Email Reminder Setup Guide

This guide helps you set up email reminders for your Barangay Events System without using Cloud Functions.

## How It Works

1. **Frontend** (React) saves email requests to `email_queue` collection in Firestore
2. **Backend Script** (Node.js) processes the queue every 5 minutes
3. **Emails** are sent via Gmail, Outlook, or any SMTP provider
4. **Status** is tracked: pending → sent/failed

## Prerequisites

- Node.js installed
- Gmail account (or other SMTP email provider)
- Firebase project with Firestore enabled

## Step 1: Set Up Environment Variables

Create a `.env` file in the root directory:

```bash
# Gmail Setup
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Or use other SMTP provider
# SMTP_HOST=smtp.outlook.com
# SMTP_PORT=587
# SMTP_USER=your-email@outlook.com
# SMTP_PASSWORD=your-password
```

### Getting Gmail App Password:

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go back to Security → App passwords
4. Select Mail → Windows Computer (or your device)
5. Copy the 16-character password
6. Use this as `EMAIL_PASSWORD` in `.env`

## Step 2: Install Dependencies

```bash
cd c:\xampp\htdocs\barangay-event-proposal
npm install firebase-admin nodemailer dotenv
```

## Step 3: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to Project Settings (gear icon)
4. Click "Service Accounts"
5. Click "Generate New Private Key"
6. Save the file as `serviceAccountKey.json` in the project root

**⚠️ IMPORTANT: Add this to `.gitignore`:**
```
serviceAccountKey.json
.env
```

## Step 4: Test Email Service

```bash
node email-service.js
```

Should output something like:
```
📧 Starting email queue processing...
✅ No pending emails to process
✅ Email service completed
```

## Step 5: Schedule Email Service to Run Periodically

### Option A: Windows Task Scheduler

1. Open "Task Scheduler"
2. Create Basic Task
3. Name: "Barangay Events Email Service"
4. Trigger: "Every 5 minutes"
5. Action: "Start a program"
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `C:\xampp\htdocs\barangay-event-proposal\email-service.js`
   - Start in: `C:\xampp\htdocs\barangay-event-proposal`

### Option B: Cron Job (Linux/Mac)

```bash
*/5 * * * * cd /path/to/barangay-event-proposal && node email-service.js >> email-service.log 2>&1
```

### Option C: Use PM2 (Recommended)

```bash
npm install -g pm2

# Create pm2 config file (ecosystem.config.js)
module.exports = {
  apps: [{
    name: 'email-service',
    script: './email-service.js',
    cron: '*/5 * * * *',
    exec_mode: 'fork'
  }]
};

# Start service
pm2 start ecosystem.config.js

# Keep it running
pm2 startup
pm2 save
```

## Step 6: Verify in Firestore

After sending a reminder:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Firestore → Collections → `email_queue`
3. You should see documents with:
   - `status: "pending"` (before processing)
   - `status: "sent"` (after email sent)
   - `sentAt: timestamp` (when sent)

## Features

✅ **Automatic Email Reminders** when:
- Event reminders are sent
- Vote reminders for pending proposals are sent

✅ **Features:**
- HTML formatted emails with event details
- Automatic retry on failure
- Error tracking
- Status monitoring in Firestore

✅ **Email Queue Statuses:**
- `pending` - Waiting to be sent
- `sent` - Successfully sent
- `failed` - Failed to send (retry limit reached)

## Troubleshooting

### Emails not sending?

1. Check `.env` file has correct credentials
2. If using Gmail, verify App Password is set
3. Check email_queue collection in Firestore
4. Run `node email-service.js` manually and check console output

### Gmail says "Less secure app access"?

- Gmail App Password is the recommended solution
- DO NOT enable "Less secure app access"
- Always use App Passwords with 2FA enabled

### Check Email Service Logs

```bash
# View recent logs (if using PM2)
pm2 logs email-service

# Or check log file
tail -f email-service.log
```

## Production Deployment

When deploying to production:

1. Set environment variables in your hosting provider
2. Schedule email service to run continuously
3. Monitor email_queue collection for failures
4. Set up alerts for failed emails

For Firebase Hosting + Cloud Run:
- Deploy the Node.js script as a Cloud Run job
- Trigger it with Cloud Scheduler (free tier available!)
- This replaces the need for local scheduling

## Support

If emails aren't sending:
1. Check Firestore email_queue collection
2. Review error messages in the `error` field
3. Check email provider (Gmail/Outlook/etc) settings
4. Verify credentials in `.env` file

---

**Cost:** Completely FREE! Uses only:
- Firestore (free tier includes enough storage)
- Node.js (open source)
- Your email provider (Gmail free, or paid SMTP)
