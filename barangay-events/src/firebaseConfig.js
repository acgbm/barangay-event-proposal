import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDE9jzst_l5vBM5iLwK00zjbmxdOcwy_Jg",
  authDomain: "barangay-events-system.firebaseapp.com",
  projectId: "barangay-events-system",
  storageBucket: "barangay-events-system.firebasestorage.app",
  messagingSenderId: "1007773200344",
  appId: "1:1007773200344:web:7937b595d70e26967dccad",
  measurementId: "G-MPFTCCC66F"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
