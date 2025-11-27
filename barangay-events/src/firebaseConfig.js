import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mqrrkgmhmdhwlyzbkaoc.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xcnJrZ21obWRod2x5emJrYW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI5MDkyMzAsImV4cCI6MjA1ODQ4NTIzMH0.R7SdS9KDtxFaPYxTAYJUvCi449HN1uh1qCOj9OPPH1M";

const firebaseConfig = {
  apiKey: "AIzaSyDE9jzst_l5vBM5iLwK00zjbmxdOcwy_Jg",
  authDomain: "barangay-events-system.firebaseapp.com",
  projectId: "barangay-events-system",
  storageBucket: "barangay-events-system.firebasestorage.app",
  messagingSenderId: "1007773200344",
  appId: "1:1007773200344:web:7937b595d70e26967dccad",
  measurementId: "G-MPFTCCC66F",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize messaging only when needed
let messaging = null;
let serviceWorkerRegistration = null;

// Function to send a verification email
const sendVerificationEmail = async (user) => {
  if (user) {
    await sendEmailVerification(user);
  }
};

// Function to send a password reset email
const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset email sent!" };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

// Initialize messaging and service worker
export const initializeMessaging = async () => {
  try {
    // Skip service worker registration for now - just enable desktop notifications
    console.log('✅ Desktop notifications enabled');
    return true;
  } catch (error) {
    console.error('Error initializing messaging:', error);
    return false;
  }
};

// Function to request FCM token for push notifications
export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.log('⚠️ Notifications not supported in this browser');
      return null;
    }

    // Check current permission status
    if (Notification.permission === 'granted') {
      console.log('✅ Notification permission already granted');
      return 'desktop-notification';
    }

    if (Notification.permission === 'denied') {
      console.warn('⚠️ Notification permission denied by user');
      return null;
    }

    // Request permission from user
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Notification permission granted by user');
      return 'desktop-notification';
    }

    return null;
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return null;
  }
};

// Function to listen for foreground messages with callback
export const setupMessageListener = (callback) => {
  try {
    if (!messaging) {
      console.warn('Messaging not initialized');
      return;
    }
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      if (callback) {
        callback(payload);
      }
    });
  } catch (error) {
    console.error('Error setting up message listener:', error);
  }
};

export { db, auth, sendVerificationEmail, sendPasswordReset };
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
