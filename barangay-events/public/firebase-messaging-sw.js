// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDE9jzst_l5vBM5iLwK00zjbmxdOcwy_Jg",
  authDomain: "barangay-events-system.firebaseapp.com",
  projectId: "barangay-events-system",
  storageBucket: "barangay-events-system.firebasestorage.app",
  messagingSenderId: "1007773200344",
  appId: "1:1007773200344:web:7937b595d70e26967dccad",
  measurementId: "G-MPFTCCC66F"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Background message received:', payload);
  
  const notificationTitle = payload.notification?.title || 'Event Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/barangay-logo.png',
    badge: '/barangay-logo.png',
    tag: 'notification',
    requireInteraction: false
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

