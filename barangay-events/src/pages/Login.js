import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./Login.css";
import logo from "../assets/bg.png"; // Adjust your logo path
import { getDoc, doc } from "firebase/firestore"; 
import { db } from "../firebaseConfig";  // Ensure db is correctly imported from firebase config


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await login(email, password);
      const user = userCredential.user;
  
      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid)); // Ensure Firestore is imported
      const userData = userDoc.data();
  
      if (!userData || !userData.role) {
        throw new Error("User role not found");
      }
  
      const role = userData.role;
  
      Swal.fire({
        title: "Success",
        text: "Logged in successfully!",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      }).then(() => {
        if (role === "admin") navigate("/admin-dashboard");
        else if (role === "staff") navigate("/staff-dashboard");
        else if (role === "official") navigate("/official-dashboard");
        else navigate("/dashboard");
      });
  
    } catch (err) {
      Swal.fire("Error", "Invalid username or password", "error");
    }
  };  

  return (
    <div className="login-container">
      <img src={logo} alt="Logo" className="login-logo" />

      <form className="login-form" onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
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
        <button type="submit" className="login-button">Sign in</button>
      </form>
    </div>
  );
};

export default Login;
