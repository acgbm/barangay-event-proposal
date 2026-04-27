/**
 * Email Service - Real-time Firestore listener for email queue
 */

const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Initialize Firebase Admin
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin initialized');
} catch (error) {
  console.error('❌ Error loading serviceAccountKey.json:', error.message);
  process.exit(1);
}

const db = admin.firestore();

// Configure Gmail Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Send a single email
 */
async function sendEmail(doc) {
  const email = doc.data();
  try {
    console.log(`📨 Sending email to ${email.to}...`);
    
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

    console.log(`✅ Successfully sent to ${email.to}`);
  } catch (error) {
    console.error(`❌ Failed to send to ${email.to}:`, error.message);
    
    await db.collection('email_queue').doc(doc.id).update({
      status: 'failed',
      error: error.message,
      lastAttempt: admin.firestore.Timestamp.now()
    });
  }
}

// Start Real-Time Listener
console.log('🚀 Email Bot is now ACTIVE and listening for new requests...');
console.log('📡 Waiting for new emails in the queue...');

db.collection('email_queue')
  .where('status', '==', 'pending')
  .onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added' || change.type === 'modified') {
        const doc = change.doc;
        const data = doc.data();
        
        // Only process if it's still pending
        if (data.status === 'pending') {
          sendEmail(doc);
        }
      }
    });
  }, error => {
    console.error('❌ Firestore listener error:', error);
  });
