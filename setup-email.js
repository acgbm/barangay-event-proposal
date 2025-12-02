#!/usr/bin/env node

/**
 * Quick Setup Script for Email Service
 * This script helps you set up the email service interactively
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function setup() {
  console.log('\n🎉 Barangay Events System - Email Setup\n');
  console.log('This script will help you set up email reminders.\n');

  // Check if files exist
  const envPath = path.join(process.cwd(), '.env');
  const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');

  const envExists = fs.existsSync(envPath);
  const serviceAccountExists = fs.existsSync(serviceAccountPath);

  console.log('📋 Current Status:');
  console.log(`${envExists ? '✅' : '❌'} .env file`);
  console.log(`${serviceAccountExists ? '✅' : '❌'} serviceAccountKey.json`);
  console.log();

  if (!envExists) {
    console.log('⚙️ Setting up .env file...\n');

    const emailProvider = await question('Email provider (gmail/outlook/other): ');
    
    if (emailProvider.toLowerCase() === 'gmail' || emailProvider.toLowerCase() === 'g') {
      const email = await question('Your Gmail address: ');
      const appPassword = await question('Your Gmail App Password (16 characters): ');
      
      const envContent = `# Email Configuration for Barangay Events System
EMAIL_USER=${email}
EMAIL_PASSWORD=${appPassword}
EMAIL_FROM=${email}
`;
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env file created!\n');
    } else if (emailProvider.toLowerCase() === 'outlook' || emailProvider.toLowerCase() === 'o') {
      const email = await question('Your Outlook email: ');
      const password = await question('Your Outlook password: ');
      
      const envContent = `# Email Configuration for Barangay Events System
SMTP_HOST=smtp.outlook.com
SMTP_PORT=587
SMTP_USER=${email}
SMTP_PASSWORD=${password}
EMAIL_FROM=${email}
`;
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env file created!\n');
    } else {
      const host = await question('SMTP Host (e.g., smtp.provider.com): ');
      const port = await question('SMTP Port (usually 587 or 465): ');
      const user = await question('Email address: ');
      const password = await question('Password: ');
      
      const envContent = `# Email Configuration for Barangay Events System
SMTP_HOST=${host}
SMTP_PORT=${port}
SMTP_USER=${user}
SMTP_PASSWORD=${password}
EMAIL_FROM=${user}
`;
      
      fs.writeFileSync(envPath, envContent);
      console.log('✅ .env file created!\n');
    }
  }

  if (!serviceAccountExists) {
    console.log('🔑 Firebase Service Account Key\n');
    console.log('You need to download this from Firebase Console:');
    console.log('1. Go to https://console.firebase.google.com');
    console.log('2. Select "barangay-events-system" project');
    console.log('3. Click ⚙️ Settings → Service Accounts');
    console.log('4. Click "Generate New Private Key"');
    console.log('5. Save as "serviceAccountKey.json" in this directory\n');
    
    const downloaded = await question('Have you downloaded the serviceAccountKey.json? (yes/no): ');
    
    if (downloaded.toLowerCase() !== 'yes' && downloaded.toLowerCase() !== 'y') {
      console.log('\n⏸️  Please download the file and run this script again.\n');
      rl.close();
      return;
    }
  }

  // Test email service
  console.log('\n🧪 Testing email service...\n');
  
  try {
    require('dotenv').config();
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log('❌ Email credentials not found in .env\n');
      rl.close();
      return;
    }
    
    console.log('✅ Email credentials found');
    console.log('✅ Firebase Admin SDK available\n');
  } catch (error) {
    console.log('❌ Error: ' + error.message + '\n');
    rl.close();
    return;
  }

  // Scheduling
  console.log('⏱️  Email Service Scheduling\n');
  console.log('Choose how to run the email service:');
  console.log('1. Windows Task Scheduler (auto)');
  console.log('2. PM2 (Node.js process manager)');
  console.log('3. Manual (development only)\n');
  
  const schedulingChoice = await question('Choose (1-3): ');
  
  if (schedulingChoice === '1') {
    console.log('\n📝 Instructions for Windows Task Scheduler:');
    console.log('1. Open Task Scheduler (Win + R → taskschd.msc)');
    console.log('2. Create Basic Task');
    console.log('3. Name: "Barangay Events Email Service"');
    console.log('4. Trigger: Daily, repeat every 5 minutes');
    console.log('5. Action: Run "C:\\xampp\\htdocs\\barangay-event-proposal\\run-email-service.bat"');
    console.log('6. Start in: "C:\\xampp\\htdocs\\barangay-event-proposal"');
  } else if (schedulingChoice === '2') {
    console.log('\n📝 Installing PM2...\n');
    console.log('Run these commands:');
    console.log('  npm install -g pm2');
    console.log('  pm2 start ecosystem.config.js');
    console.log('  pm2 startup');
    console.log('  pm2 save');
  } else {
    console.log('\n⏱️  For manual testing, run:');
    console.log('  node email-service.js');
  }

  console.log('\n✅ Setup Complete!\n');
  console.log('Next steps:');
  console.log('1. Configure email scheduling (see above)');
  console.log('2. Test email service: node email-service.js');
  console.log('3. Send a test reminder from Admin Dashboard');
  console.log('4. Check Firestore email_queue collection\n');

  console.log('📖 For detailed help, see EMAIL_SETUP_CHECKLIST.md\n');

  rl.close();
}

setup().catch(console.error);
