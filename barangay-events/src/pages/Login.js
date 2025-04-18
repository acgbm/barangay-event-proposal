import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./Login.css";
import logo from "../assets/bg.png"; // Adjust your logo path
import { getFirestore, getDoc, doc, collection, query, where, getDocs, } from "firebase/firestore";
import { db } from "../firebaseConfig";  
import { getAuth, sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";  

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState(""); // For forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false); 

  const { login } = useAuth();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await login(email, password);
      const user = userCredential.user;
  
      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
  
      if (!userData || !userData.role) {
        throw new Error("User role not found");
      }
  
      const role = userData.role;
      const isVerified = userData.verified;
      const isDisabled = userData.disabled; // Check if account is disabled
  
      // Block disabled accounts
      if (isDisabled) {
        Swal.fire("Error", "This account has been disabled.", "error");
        return;
      }
  
      // Block unverified users (except admins)
      if (!isVerified && role !== "admin") {
        Swal.fire("Error", "Please verify your email before logging in.", "error");
        return;
      }
  
      let successMessage = "Logged in successfully!";
      let navigateTo = "/dashboard";
  
      switch (role) {
        case "admin":
          successMessage = "Welcome Admin!";
          navigateTo = "/admin-dashboard";
          break;
        case "staff":
          successMessage = "Welcome Staff Member!";
          navigateTo = "/staff-dashboard";
          break;
        case "official":
          successMessage = "Welcome Official User!";
          navigateTo = "/official-dashboard";
          break;
        default:
          successMessage = "Welcome User!";
          navigateTo = "/user-dashboard";
          break;
      }
  
      Swal.fire({
        title: "Success",
        text: successMessage,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        navigate(navigateTo);
      });
  
    } catch (err) {
      Swal.fire("Error", "Invalid username or password", "error");
    }
  };    

  // Forgot Password Handler
  const handleForgotPassword = async () => {
    if (!email || !dob) {
      Swal.fire("Error", "Please enter your email and date of birth.", "error");
      return;
    }
  
    try {
      // Step 1: Check Firestore for a matching email and DOB
      const userRef = collection(db, "users"); 
      const q = query(userRef, where("email", "==", email), where("dob", "==", dob));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        Swal.fire("Error", "Invalid email or date of birth.", "error");
        return;
      }
  
      // Step 2: Send password reset email
      await sendPasswordResetEmail(auth, email);
      Swal.fire("Success", "A password reset link has been sent to your email.", "success");
    } catch (error) {
      console.error("Error fetching user:", error);
      Swal.fire("Error", error.message, "error");
    }
  }; 
  
  // Function to get user data by email from Firestore
  const getUserByEmail = async (email) => {
    const db = getFirestore();
    const usersRef = collection(db, "users"); // Adjust collection name if needed
    const q = query(usersRef, where("email", "==", email));
    const querySnapshot = await getDocs(q);
  
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data(); // Returns user data if found
    }
    return null;
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <img src={logo} alt="Logo" className="login-logo" />

        {!showForgotPassword ? (
          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span className="forgot-password" onClick={() => setShowForgotPassword(true)}>
                Forgot Password?
              </span>
            <button type="submit" className="login-button">Sign in</button>
      
          </form>
        ) : (
          <div className="forgot-password-form">
            <h2>Reset Password</h2>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />
            <button onClick={handleForgotPassword} className="reset-button">Reset Password</button>
            <p className="forgot-password-link" onClick={() => setShowForgotPassword(false)}>
              Back to Login
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
