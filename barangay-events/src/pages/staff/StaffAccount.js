import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import Swal from "sweetalert2";
import "./StaffAccount.css";

const StaffAccount = () => {
  const [staffData, setStaffData] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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

    if (newPassword !== confirmPassword) {
      return Swal.fire({
        icon: "error",
        title: "Password Mismatch",
        text: "New passwords do not match.",
      });
    }

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
    }
  };

  return (
    <div className="staff-account-container">
      <h2>Account Profile</h2>

      {staffData && (
        <div className="staff-account-info">
          <p><strong>Full Name:</strong> {staffData.fullName}</p>
          <p><strong>Email:</strong> {staffData.email}</p>
          <p><strong>Date of Birth:</strong> {staffData.dob}</p>
          <p><strong>Phone Number:</strong> {staffData.phone}</p>
        </div>
      )}

      <hr className="staff-account-separator" />

      <div className="password-section">
        <h3 className="staff-account-subheading">Change Password</h3>
        <form onSubmit={handleChangePassword} className="staff-account-form">
          <div className="form-field">
            <label>Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label>Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button type="submit">Update Password</button>
        </form>
      </div>
    </div>
  );
};

export default StaffAccount;
