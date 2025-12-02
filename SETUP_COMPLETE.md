# 🎉 Email Setup Complete!

Your Barangay Events System is now ready to send email reminders!

## ✅ What's Set Up

- ✅ Email notification functions in the app
- ✅ Background Node.js email service
- ✅ Firestore email queue collection
- ✅ All configuration files created
- ✅ Documentation and guides included

## 📋 Quick Setup Checklist

Follow these steps in order:

### 1️⃣ Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select **"barangay-events-system"** project
3. Click **⚙️ Settings** → **Service Accounts**
4. Click **"Generate New Private Key"**
5. Save the file as **`serviceAccountKey.json`**
6. Place it in: `C:\xampp\htdocs\barangay-event-proposal\`

### 2️⃣ Configure Email Credentials

Edit the `.env` file in the root directory:

**For Gmail (Recommended):**
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=your-email@gmail.com
```

To get Gmail App Password:
1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to App passwords
4. Select Mail → Windows Computer
5. Copy the 16-character password

**For Outlook or other providers:**
```
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-email@provider.com
SMTP_PASSWORD=your-password
```

### 3️⃣ Update Firestore Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Firestore Database → **Rules** tab
3. Add the `email_queue` rules from `FIRESTORE_RULES_UPDATE.md`
4. Click **Publish**

### 4️⃣ Test Email Service

Open PowerShell and run:
```powershell
cd C:\xampp\htdocs\barangay-event-proposal
node email-service.js
```

Expected output:
```
📧 Starting email queue processing...
✅ No pending emails to process
✅ Email service completed
```

### 5️⃣ Schedule Email Service (Choose One)

**Option A: Windows Task Scheduler**
- Open Task Scheduler
- Create Basic Task: "Barangay Events Email Service"
- Run: `C:\xampp\htdocs\barangay-event-proposal\run-email-service.bat`
- Trigger: Repeat every 5 minutes

**Option B: PM2 (Recommended)**
```powershell
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

**Option C: Manual (Development)**
```powershell
node email-service.js
```

## 🧪 Test It Out

1. Start your React app: `npm start` in `barangay-events/`
2. Login as Admin
3. Go to Admin Dashboard
4. Click "Send Reminder"
5. Send a test reminder
6. Check Firestore `email_queue` collection
7. Should see email with status `sent` after a few seconds

## 📧 How It Works

```
User sends reminder
        ↓
Email queued to Firestore
        ↓
Background service runs every 5 min
        ↓
Reads pending emails from Firestore
        ↓
Sends via Gmail/SMTP
        ↓
Updates status to "sent" in Firestore
        ↓
Recipient gets email + notification
```

## 📁 Files Created

```
barangay-event-proposal/
├── .env                          ← Email credentials
├── .env.template                 ← Template (reference)
├── .gitignore                    ← Protects .env
├── email-service.js              ← Background processor
├── setup-email.js                ← Interactive setup
├── ecosystem.config.js           ← PM2 configuration
├── run-email-service.bat         ← Windows script
├── EMAIL_SETUP.md                ← Detailed guide
├── EMAIL_SETUP_CHECKLIST.md      ← Step-by-step
├── FIRESTORE_RULES_UPDATE.md     ← Security rules
└── serviceAccountKey.json        ← Firebase credentials (you add this)
```

## 🔒 Security Notes

⚠️ **IMPORTANT:**
- `.env` is in `.gitignore` - Never commit it!
- `serviceAccountKey.json` is sensitive - Never share it!
- These files contain credentials to your email & Firebase
- Keep them safe and secure

## 🆘 Troubleshooting

**Emails not sending?**
1. Check if Task Scheduler/PM2 is running
2. Run `node email-service.js` manually
3. Check `.env` has correct credentials
4. For Gmail: Use App Password, not regular password
5. Verify `serviceAccountKey.json` location

**"Cannot find module" errors?**
```powershell
npm install firebase-admin nodemailer dotenv
```

**Task Scheduler not working?**
- Open Task Scheduler
- Find the task
- Right-click → Run
- Check History tab for errors

**PM2 issues?**
```powershell
pm2 status
pm2 logs email-service
pm2 restart email-service
```

## 📞 Support

If something goes wrong:

1. **Check EMAIL_SETUP_CHECKLIST.md** for detailed steps
2. **Read EMAIL_SETUP.md** for comprehensive guide
3. **View Firestore email_queue** for status
4. **Run email-service.js manually** to see errors

## 🚀 Production Ready

Your system now includes:

✅ Real-time in-app notifications
✅ Email reminders for events
✅ Vote reminders for officials
✅ Fully automated email processing
✅ Error tracking in Firestore
✅ HTML formatted emails
✅ Zero Cloud Functions needed
✅ Completely FREE (except email provider)

## Next Steps

1. ✅ Complete setup (you are here!)
2. ✅ Test email service
3. ✅ Schedule to run automatically
4. ✅ Send test reminder
5. ✅ Deploy to production
6. ✅ Monitor email_queue collection

## 💡 Tips

- **Test frequently** - Always test reminders before showing to users
- **Monitor Firestore** - Check email_queue for failed emails
- **Keep credentials safe** - Never commit .env or serviceAccountKey.json
- **Check logs** - Task Scheduler/PM2 logs help debug issues
- **Update rules** - If you get permission errors, check Firestore rules

---

**Questions?** Check the detailed guides:
- `EMAIL_SETUP.md` - Comprehensive documentation
- `EMAIL_SETUP_CHECKLIST.md` - Step-by-step guide
- `FIRESTORE_RULES_UPDATE.md` - Security rules setup

**You're all set! 🎉**
