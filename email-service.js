/**
 * Email Service - Process email queue from Firestore
 * This script processes pending emails and sends them via SMTP
 * 
 * Installation:
 * npm install firebase-admin nodemailer dotenv
 * 
 * Usage:
 * node email-service.js
 * 
 * Or run periodically with:
 * every 5 minutes: node /path/to/email-service.js (via Task Scheduler or cron)
 */

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Alternative for other email providers:
// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   secure: true,
//   auth: {
//     user: process.env.SMTP_USER,
//     pass: process.env.SMTP_PASSWORD
//   }
// });

/**
 * Process email queue
 */
async function processEmailQueue() {
  try {
    console.log('📧 Starting email queue processing...');

    // Get all pending emails
    const emailsSnapshot = await db
      .collection('email_queue')
      .where('status', '==', 'pending')
      .limit(10)
      .get();

    if (emailsSnapshot.empty) {
      console.log('✅ No pending emails to process');
      return;
    }

    console.log(`📬 Found ${emailsSnapshot.size} pending email(s)`);

    let successCount = 0;
    let errorCount = 0;

    // Process each email
    for (const doc of emailsSnapshot.docs) {
      const email = doc.data();

      try {
        // Send email
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: email.to,
          subject: email.subject,
          html: email.htmlContent
        });

        // Update status to sent
        await db.collection('email_queue').doc(doc.id).update({
          status: 'sent',
          sentAt: admin.firestore.Timestamp.now(),
          error: null
        });

        console.log(`✅ Email sent to ${email.to}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error sending email to ${email.to}:`, error.message);

        // Update status with error
        await db.collection('email_queue').doc(doc.id).update({
          status: 'failed',
          error: error.message,
          retries: (email.retries || 0) + 1
        });

        errorCount++;
      }
    }

    console.log(`\n📊 Email Processing Complete:`);
    console.log(`✅ Sent: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
  } catch (error) {
    console.error('❌ Email queue processing failed:', error);
  }
}

// Run the email processor
processEmailQueue()
  .then(() => {
    console.log('\n✅ Email service completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
