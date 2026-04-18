import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import Swal from "sweetalert2";
import { ShieldCheck, UserCircle, Eye, EyeOff } from "lucide-react";
import "./StaffAccount.css";

const StaffAccount = () => {
  const [staffData, setStaffData] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Visibility states for password fields
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const fetchStaffInfo = async () => {
      try {
        const user = auth.currentUser;
        const staffRef = doc(db, "users", user.uid);
        const staffSnap = await getDoc(staffRef);
        if (staffSnap.exists()) {
          setStaffData(staffSnap.data());
        }
      } catch (error) {
        console.error("Failed to fetch staff data:", error);
      }
    };

    fetchStaffInfo();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (isLoading) return;

    if (newPassword !== confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New passwords do not match.",
      });
    }

    setIsLoading(true);

    const user = auth.currentUser;
    const credentials = EmailAuthProvider.credential(user.email, currentPassword);

    try {
      await reauthenticateWithCredential(user, credentials);
      await updatePassword(user, newPassword);

      Swal.fire({
        icon: "success",
        title: "Password Updated",
        text: "Your password has been updated successfully.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Error updating password:", error.message);
      if (error.code === "auth/wrong-password") {
        Swal.fire({
          icon: "error",
          title: "Incorrect Password",
          text: "Your current password is incorrect.",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: "Failed to update password. Please try again.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="account-management-wrapper">
      <header className="page-header">
        <div className="header-content">
          <h1>Account Settings</h1>
          <p>View your profile details and manage your account security preferences.</p>
        </div>
      </header>

      <div className="settings-grid">
        {/* Profile Information Card */}
        <div className="settings-card">
          <div className="card-header">
            <div className="icon-wrapper">
              <UserCircle size={22} strokeWidth={1.5} />
            </div>
            <div className="header-text">
              <h3>Profile Information</h3>
              <span>Your personal account details</span>
            </div>
          </div>
          
          <div className="card-body">
            {staffData ? (
              <div className="profile-info-grid">
                <div className="info-item">
                  <label>Full Name</label>
                  <p>{staffData.fullName}</p>
                </div>

                <div className="info-item">
                  <label>Email Address</label>
                  <p>{staffData.email}</p>
                </div>

                <div className="info-item">
                  <label>Date of Birth</label>
                  <p>
                    {staffData.dob ? new Date(staffData.dob).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                  </p>
                </div>

                <div className="info-item">
                  <label>Phone Number</label>
                  <p>{staffData.phone || "—"}</p>
                </div>
              </div>
            ) : (
              <div className="loading-container">
                <div className="shimmer"></div>
                <span>Loading your profile data...</span>
              </div>
            )}
          </div>
        </div>

        {/* Security / Password Card */}
        <div className="settings-card">
          <div className="card-header">
            <div className="icon-wrapper">
              <ShieldCheck size={22} strokeWidth={1.5} />
            </div>
            <div className="header-text">
              <h3>Security</h3>
              <span>Update your login credentials</span>
            </div>
          </div>
          
          <div className="card-body">
            <form onSubmit={handleChangePassword} className="modern-security-form">
              <div className="form-input-group full-width">
                <label>Current Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    required
                    placeholder="Verify your identity"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    tabIndex="-1"
                  >
                    {showCurrentPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <div className="form-input-group full-width">
                <label>New Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    tabIndex="-1"
                  >
                    {showNewPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <div className="form-input-group full-width">
                <label>Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Repeat for confirmation"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <div className="form-footer">
                <button 
                  type="submit" 
                  className={`modern-save-btn ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="btn-loader">
                      <div className="spinner"></div>
                      <span>Updating...</span>
                    </div>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffAccount;
