import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "./Login.css";
import logo from "../assets/bg.png";
import logo2 from "../assets/bg2.png";
import { getFirestore, getDoc, doc, collection, query, where, getDocs, } from "firebase/firestore";
import { db } from "../firebaseConfig";  
import { getAuth, sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";  

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState(""); // For forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [acceptingUser, setAcceptingUser] = useState(null); // user object for accepting terms
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null); // {user, userData, role, navigateTo, successMessage}

  const { login } = useAuth();
  const navigate = useNavigate();
  const auth = getAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await login(email, password);
      const user = userCredential.user;

      // Fetch user data from Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.data();

      if (!userData || !userData.role) {
        throw new Error("User role not found");
      }

      const role = userData.role;
      const isVerified = userData.verified;
      const isDisabled = userData.disabled; // Check if account is disabled
      const hasAcceptedTerms = userData.termsAccepted;

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

      if (!hasAcceptedTerms) {
        // Show modal and store user info for later
        setShowTermsModal(true);
        setAcceptingUser({ user, userDocRef });
        setPendingLoginData({ role, navigateTo, successMessage });
        return;
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

  // Accept Terms handler
  const handleAcceptTerms = async () => {
    if (!acceptingUser) return;
    try {
      await import("firebase/firestore").then(({ updateDoc }) =>
        updateDoc(acceptingUser.userDocRef, { termsAccepted: true })
      );
      setShowTermsModal(false);
      setAcceptedTerms(false);
      // Show success and proceed to dashboard
      if (pendingLoginData) {
        Swal.fire({
          title: "Success",
          text: pendingLoginData.successMessage,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          navigate(pendingLoginData.navigateTo);
        });
      }
    } catch (err) {
      Swal.fire("Error", "Could not accept Terms and Conditions.", "error");
    }
  };

  // Cancel Terms handler
  const handleCancelTerms = async () => {
    setShowTermsModal(false);
    setAcceptedTerms(false);
    setAcceptingUser(null);
    setPendingLoginData(null);
    // Sign out user if already logged in
    try {
      await auth.signOut();
    } catch (e) {}
    // Optionally, show a message
    Swal.fire("Notice", "You must accept the Terms and Conditions to use the system.", "info");
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

  // Particle background logic
  useEffect(() => {
    const particleCount = 16;
    const container = document.getElementById("particle-bg");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      p.style.left = Math.random() * 100 + "vw";
      p.style.animationDelay = (Math.random() * 10) + "s";
      p.style.width = p.style.height = (24 + Math.random() * 32) + "px";
      p.style.opacity = 0.15 + Math.random() * 0.25;
      container.appendChild(p);
    }
  }, []);

  return (
    <div className="login-page">
      <div id="particle-bg" className="particle-bg"></div>
      <div className="login-center-group">
        <div className="login-container">
          <div className="login-logo-stack">
            <img src={logo2} alt="Logo 2" className="login-logo secondary-logo" />
            <img src={logo} alt="Logo" className="login-logo main-logo" />
          </div>
          {/* Terms Modal */}
          {showTermsModal && (
            <div className="terms-modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div className="terms-modal" style={{background:'#fff',padding:24,borderRadius:8,maxWidth:500,width:'95%',maxHeight:'80vh',display:'flex',flexDirection:'column',boxSizing:'border-box'}}>
                <h2 style={{marginBottom:12, textAlign:'center', fontSize:'1.5rem', fontWeight:600}}>Terms and Conditions</h2>
                <div className="terms-content" style={{flex:1,overflowY:'auto',marginBottom:16,paddingRight:8}}>
                  {/* Replace with your actual terms */}
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi. Etiam euismod, urna eu tincidunt consectetur, nisi nisl aliquam nunc, eget aliquam massa nisi nec erat. Suspendisse potenti. Etiam euismod, urna eu tincidunt consectetur, nisi nisl aliquam nunc, eget aliquam massa nisi nec erat.</p>
                  <p>By using this system, you agree to abide by all rules and policies set forth by the Barangay. Your data will be handled in accordance with our privacy policy.</p>
                  <p>...</p>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:8}}>
                  <label style={{display:'flex',alignItems:'center',gap:8,fontSize:'1rem'}}>
                    <input type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)} style={{width:18,height:18}} />
                    I accept the Terms and Conditions
                  </label>
                  <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
                    <button className="login-button" style={{background:'#ccc',color:'#333',padding:'6px 18px',fontSize:'1rem',borderRadius:18,minWidth:90}} onClick={handleCancelTerms} type="button">Cancel</button>
                    <button
                      className="login-button"
                      style={{
                        marginLeft: 0,
                        padding: '6px 18px',
                        fontSize: '1rem',
                        borderRadius: 18,
                        minWidth: 90,
                        background: !acceptedTerms ? '#ccc' : '#1877f2',
                        color: !acceptedTerms ? '#888' : '#fff',
                        cursor: !acceptedTerms ? 'not-allowed' : 'pointer',
                        opacity: !acceptedTerms ? 0.7 : 1
                      }}
                      disabled={!acceptedTerms}
                      onClick={handleAcceptTerms}
                      type="button"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!showForgotPassword ? (
            <form className="login-form" onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <div className="password-field-container">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="password-toggle-button"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
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
              <button onClick={handleForgotPassword} className="login-button reset-button">Reset Password</button>
              <p className="forgot-password-link" onClick={() => setShowForgotPassword(false)}>
                Back to Login
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
