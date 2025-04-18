import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, sendEmailVerification, sendPasswordResetEmail } from "firebase/auth"; // Added sendEmailVerification
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

export { db, auth, sendVerificationEmail, sendPasswordReset }; // Exported sendVerificationEmail
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
