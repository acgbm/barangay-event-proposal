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

  return (
    <div className="login-container">
      <img src={logo} alt="Logo" className="login-logo" />

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
        <button type="submit" className="login-button">Sign in</button>
      </form>
    </div>
  );
};

export default Login;
