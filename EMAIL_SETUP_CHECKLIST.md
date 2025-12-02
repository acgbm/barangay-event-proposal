# Email Setup Checklist ✅

Complete the following steps to enable email reminders in your Barangay Events System.

## Step 1: Get Gmail App Password ⚙️

> If using a different email provider, skip to Step 3.

- [ ] Go to [myaccount.google.com/security](https://myaccount.google.com/security)
- [ ] Enable **2-Step Verification** (if not already enabled)
- [ ] Go back to Security → **App passwords**
- [ ] Select: **Mail** → **Windows Computer** (or your device)
- [ ] Google will generate a 16-character password
- [ ] **Copy this password** (you'll need it next)

## Step 2: Configure Email in `.env` File 📧

Edit the `.env` file in the root directory:

```bash
C:\xampp\htdocs\barangay-event-proposal\.env
```

Update with your email:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=paste-the-16-char-password-here
EMAIL_FROM=your-email@gmail.com
```

**For other email providers:**

```
# Outlook
SMTP_HOST=smtp.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password

# Or other SMTP provider
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASSWORD=your-password
```

Save the file (Ctrl+S).

⚠️ **IMPORTANT:** `.env` is already in `.gitignore` - it won't be committed to Git.

## Step 3: Get Firebase Service Account Key 🔑

This allows the Node.js script to access your Firestore database.

- [ ] Go to [Firebase Console](https://console.firebase.google.com)
- [ ] Select your **"barangay-events-system"** project
- [ ] Click the **⚙️ Settings** icon (top-left, next to project name)
- [ ] Click **"Service Accounts"** tab
- [ ] Click **"Generate New Private Key"** button
- [ ] A JSON file will download automatically
- [ ] Rename it to: `serviceAccountKey.json`
- [ ] Move it to: `C:\xampp\htdocs\barangay-event-proposal\`

Your project structure should look like:
```
barangay-event-proposal/
├── .env
├── .env.template
├── serviceAccountKey.json  ← Place it here
├── email-service.js
├── barangay-events/
└── ...
```

## Step 4: Test Email Service 🧪

Open PowerShell and run:

```powershell
cd C:\xampp\htdocs\barangay-event-proposal
node email-service.js
```

**Expected output:**
```
📧 Starting email queue processing...
✅ No pending emails to process
✅ Email service completed
```

If you see errors, check:
- [ ] `.env` file has correct credentials
- [ ] `serviceAccountKey.json` is in the right location
- [ ] Gmail App Password is correct (not regular password)
- [ ] 2-Step Verification is enabled on Gmail

## Step 5: Schedule Email Service to Run Every 5 Minutes ⏱️

Choose ONE of these methods:

### Option A: Windows Task Scheduler (Easiest for Windows)

1. **Open Task Scheduler:**
   - Press `Win + R`
   - Type `taskschd.msc`
   - Press Enter

2. **Create a Basic Task:**
   - Click **"Create Basic Task"** (right panel)
   - **Name:** `Barangay Events Email Service`
   - **Description:** `Process email queue every 5 minutes`
   - Click **Next**

3. **Set Trigger:**
   - Select **"Daily"**
   - Click **Next**
   - In the next screen, click **"Custom"** → **"New"**
   - Set to repeat every 5 minutes
   - Click **Next**

4. **Set Action:**
   - Select **"Start a program"**
   - **Program/script:** `C:\xampp\htdocs\barangay-event-proposal\run-email-service.bat`
   - **Start in:** `C:\xampp\htdocs\barangay-event-proposal`
   - Click **Next**
   - Click **Finish**

### Option B: PM2 (Node.js Process Manager)

```powershell
# Install PM2 globally
npm install -g pm2

# Start the email service
pm2 start ecosystem.config.js

# Keep it running on system startup
pm2 startup
pm2 save
```

### Option C: Manual Testing (During Development)

```powershell
# Run every 5 minutes manually
while ($true) { 
    node email-service.js
    Start-Sleep -Seconds 300
}
```

## Step 6: Verify Everything Works 🎉

1. **Test the notification system:**
   - Run `npm start` in the React app
   - Login to Admin Dashboard
   - Send a test reminder
   - Check Firestore `email_queue` collection

2. **Check email_queue in Firestore:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - **Firestore Database** → **Collections** → **email_queue**
   - You should see documents with status:
     - `pending` (before script runs)
     - `sent` (after email is sent)

3. **Verify emails received:**
   - Check your inbox for the reminder email
   - Subject should be like: "🎉 Event Reminder: [Event Name]"
   - Or: "🗳️ Action Required: Vote Needed on [Proposal Name]"

## Troubleshooting 🔧

### Emails not sending?

**Problem:** Status stays as `pending` in Firestore

**Solutions:**
1. Check if email service script is running
2. Run `node email-service.js` manually to see errors
3. Verify `.env` file has correct Gmail credentials
4. Make sure Gmail App Password is used (not regular password)
5. Check if 2-Step Verification is enabled on Gmail

### "Cannot find module" errors?

```powershell
# Reinstall packages
npm install firebase-admin nodemailer dotenv
```

### Task Scheduler not running the script?

1. Open Task Scheduler
2. Find "Barangay Events Email Service"
3. Right-click → **Run** to test manually
4. Check **History** tab to see error messages

### PM2 troubleshooting?

```powershell
# Check PM2 status
pm2 status

# View logs
pm2 logs email-service

# Restart service
pm2 restart email-service

# Stop service
pm2 stop email-service

# Remove service
pm2 delete email-service
```

## Complete! 🚀

Once all steps are done:

✅ Email credentials configured
✅ Firestore permissions set
✅ Email service scheduled
✅ System ready to send reminders!

Now when you send reminders from the Admin Dashboard:
- ✅ In-app notifications will appear instantly
- ✅ Emails will be queued to Firestore
- ✅ Background service will send emails automatically
- ✅ Both desktop and mobile users will receive notifications + emails

---

## Quick Reference

**Files created:**
- `.env` - Email credentials (KEEP SECRET!)
- `serviceAccountKey.json` - Firebase credentials (KEEP SECRET!)
- `email-service.js` - Background email processor
- `ecosystem.config.js` - PM2 configuration
- `run-email-service.bat` - Windows batch script

**Commands to remember:**
```bash
# Test email service
node email-service.js

# Install PM2 and start
npm install -g pm2
pm2 start ecosystem.config.js

# View PM2 logs
pm2 logs email-service
```

**Security reminder:**
- Both `.env` and `serviceAccountKey.json` are in `.gitignore`
- Never commit these files to Git
- Never share these with anyone
- These files contain sensitive credentials

Need help? Check `EMAIL_SETUP.md` for detailed documentation.
