import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./Login.css";
import logo from "../assets/bg.png"; // Adjust your logo path
import { getDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";  
import { getAuth, sendPasswordResetEmail } from "firebase/auth";  

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
  
      // Fetch user role & verification status from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
  
      if (!userData || !userData.role) {
        throw new Error("User role not found");
      }
  
      const role = userData.role;
      const isVerified = userData.verified; // Get verification status

      // Block unverified users (except admins)
      if (!isVerified && role !== "admin") {
        Swal.fire("Error", "Please verify your email before logging in.", "error");
        return;
      }

      let successMessage = "Logged in successfully!";
      let navigateTo = "/dashboard";
      let title = "Success";
      let icon = "success";

      // Customize message and redirect based on user role
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
        title: title,
        text: successMessage,
        icon: icon,
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
      await sendPasswordResetEmail(auth, email);
      Swal.fire(
        "Success",
        "A password reset link has been sent to your email.",
        "success"
      );
    } catch (error) {
      Swal.fire("Error", error.message, "error");
    }
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
