import { useState, useEffect } from "react";
import { getFirestore, collection, setDoc, doc, getDocs, getDoc, updateDoc, deleteDoc,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  deleteUser,
  applyActionCode,
} from "firebase/auth";
import emailjs from "emailjs-com";
import Swal from "sweetalert2"; // Import SweetAlert
import "./ManageAccounts.css";

const ManageAccounts = () => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFullName, setEditFullName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editError, setEditError] = useState("");
  const accountsPerPage = 10;
  const db = getFirestore();
  const auth = getAuth();

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setEmail("");
    setRole("staff");
    setFullName("");
    setDob("");
    setPhone("");
    setEmailError("");
  };

  const handleOpenProfile = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
    setSelectedUser(null);
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditFullName(user.fullName);
    setEditDob(user.dob);
    setEditPhone(user.phone);
    setEditRole(user.role);
    setEditError("");
    setShowEditModal(true);
  };

  const handleCloseEdit = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const emailjsConfig = {
    serviceID: "service_h7jndq1",
    templateID: "template_8g30iej",
    publicKey: "egepsG0sxQl7xodfy",
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((user) => user.role !== "admin"); // Hide admin accounts

      setAccounts(usersList);
    };

    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError("");
    if (isCreating) return; // Prevent double submit
    setIsCreating(true);
    try {
      const defaultPassword = "123456";
      const userCredential = await createUserWithEmailAndPassword(auth, email, defaultPassword);
      const userId = userCredential.user.uid;
      const isAdmin = role === "admin";
      await setDoc(doc(db, "users", userId), {
        email,
        role,
        fullName,
        dob,
        phone,
        verified: true, // Temporarily auto-verify all new accounts
      });
      if (false) { // Temporarily disabled verification email logic
        // Use your production domain for verification link
        const baseUrl = "https://barangay-events-system.web.app";
        const verificationLink = `${baseUrl}/verify-email?uid=${userId}`;
        const emailParams = {
          to_email: email,
          to_name: fullName,
          user_role: role,
          user_password: defaultPassword,
          verification_link: verificationLink,
        };
        try {
          await emailjs.send(emailjsConfig.serviceID, emailjsConfig.templateID, emailParams, emailjsConfig.publicKey);
        } catch (emailError) {
          setIsCreating(false);
          setError("Account created, but failed to send verification email.");
          Swal.fire({
            icon: "warning",
            title: "Account Created, but Email Failed",
            text: "The account was created, but the verification email was not sent. Please try again.",
          });
          return;
        }
      }
      setAccounts([...accounts, { id: userId, email, role, fullName, dob, phone, verified: true }]);
      setEmail("");
      setRole("staff");
      setFullName("");
      setDob("");
      setPhone("");
      setShowCreateModal(false);
      Swal.fire({
        icon: "success",
        title: "Account Created",
        text: `Account created successfully and auto-verified.`,
      });
    } catch (err) {
      setError("Error creating account: " + err.message);
      Swal.fire({
        icon: "error",
        title: "Account Creation Failed",
        text: err.message,
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleEditAccount = async (e) => {
    e.preventDefault();
    setEditError("");

    // Validation
    if (!/^[A-Za-z\s]+$/.test(editFullName)) {
      setEditError("Full Name must only contain letters and spaces.");
      return;
    }
    if (!editDob || editDob > today) {
      setEditError("Please enter a valid date of birth.");
      return;
    }
    if (!/^09\d{9}$/.test(editPhone)) {
      setEditError("Phone number must start with 09 and be 11 digits.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", selectedUser.id), {
        fullName: editFullName,
        dob: editDob,
        phone: editPhone,
        role: editRole,
      });

      setAccounts(
        accounts.map((u) =>
          u.id === selectedUser.id
            ? { ...u, fullName: editFullName, dob: editDob, phone: editPhone, role: editRole }
            : u
        )
      );

      setShowEditModal(false);
      Swal.fire({
        icon: "success",
        title: "Account Updated",
        text: "The account has been successfully updated.",
        confirmButtonColor: "#2563eb",
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.message,
        confirmButtonColor: "#dc3545",
      });
    }
  };
  

  const handleDeleteAccount = async (userId) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action will permanently delete the account!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await deleteDoc(doc(db, "users", userId));
  
          const userToDelete = auth.currentUser;
          if (userToDelete && userToDelete.uid === userId) {
            await deleteUser(userToDelete);
          }
  
          setAccounts(accounts.filter((user) => user.id !== userId));
  
          Swal.fire({
            icon: "success",
            title: "Account Deleted",
            text: "The account has been removed successfully.",
          });
        } catch (err) {
          console.error("Error deleting account:", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to delete account.",
          });
        }
      }
    });
  };  

  const handleToggleAccountStatus = async (userId, isDisabled) => {
    const action = isDisabled ? "enable" : "disable";
  
    Swal.fire({
      title: `Are you sure you want to ${action} this account?`,
      text: `This will ${isDisabled ? "allow" : "prevent"} the user from logging in.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: `Yes, ${action} it!`,
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await updateDoc(doc(db, "users", userId), {
            disabled: !isDisabled, // Toggle the status
          });
  
          setAccounts(
            accounts.map((user) =>
              user.id === userId ? { ...user, disabled: !isDisabled } : user
            )
          );
  
          Swal.fire({
            icon: "success",
            title: isDisabled ? "Account Enabled" : "Account Disabled",
            text: isDisabled
              ? "The account has been re-enabled and can log in again."
              : "The account has been disabled and cannot log in.",
          });
        } catch (err) {
          console.error("Error updating account status:", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to update account status.",
          });
        }
      }
    });
  };
  
  // Pagination logic
  const indexOfLastAccount = currentPage * accountsPerPage;
  const indexOfFirstAccount = indexOfLastAccount - accountsPerPage;
  const currentAccounts = accounts.slice(indexOfFirstAccount, indexOfLastAccount);
  const totalPages = Math.ceil(accounts.length / accountsPerPage);

  // Helper for today's date in yyyy-mm-dd
  const today = new Date().toISOString().split('T')[0];

  // Handlers with validation
  const handleFullNameChange = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    setFullName(value);
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-digits
    if (!value.startsWith("09")) {
      value = "09" + value.replace(/^0+/, "").replace(/^9+/, "");
    }
    if (value.length > 11) value = value.slice(0, 11);
    setPhone(value);
  };

  const handleDobChange = (e) => {
    const value = e.target.value;
    if (value > today) return;
    setDob(value);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    // Simple email validation
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setEmailError("A valid email is required.");
    } else {
      setEmailError("");
    }
  };

  return (
    <div className="manage-accounts">
      <div className="manage-header">
        <h2>Manage Accounts</h2>
        <button className="add-user-btn" onClick={() => setShowCreateModal(true)}>
          + Add User
        </button>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content create-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create an Account</h2>
              <button className="modal-close-btn" onClick={handleCloseCreateModal}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleCreateAccount}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name</label>
                    <input id="fullName" type="text" placeholder="Full Name" value={fullName} onChange={handleFullNameChange} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" placeholder="Email Address" value={email} onChange={handleEmailChange} required />
                    {emailError && <span className="error-text">{emailError}</span>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="dob">Date of Birth</label>
                    <input id="dob" type="date" value={dob} onChange={handleDobChange} max={today} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input id="phone" type="tel" placeholder="09xxxxxxxxx" value={phone} onChange={handlePhoneChange} pattern="09[0-9]{9}" maxLength={11} minLength={11} required />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="staff">Staff</option>
                    <option value="official">Official</option>
                  </select>
                </div>
                <div className="modal-footer">
                  <button
                    type="submit"
                    disabled={isCreating || !!emailError}
                    className="create-account-button"
                  >
                    {isCreating ? 'Adding User...' : 'Add User Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && selectedUser && (
        <div className="modal-overlay" onClick={handleCloseProfile}>
          <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Profile</h2>
              <button className="modal-close-btn" onClick={handleCloseProfile}>×</button>
            </div>
            <div className="modal-body profile-details">
              <div className="profile-section">
                <div className="profile-avatar">
                  {selectedUser.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="profile-main-info">
                  <h3>{selectedUser.fullName}</h3>
                  <p className="profile-role">{selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}</p>
                </div>
              </div>
              
              <div className="profile-grid">
                <div className="detail-item">
                  <label>Full Name</label>
                  <span>{selectedUser.fullName}</span>
                </div>
                <div className="detail-item">
                  <label>Email Address</label>
                  <span>{selectedUser.email}</span>
                </div>
                <div className="detail-item">
                  <label>Phone Number</label>
                  <span>{selectedUser.phone || "Not provided"}</span>
                </div>
                <div className="detail-item">
                  <label>Date of Birth</label>
                  <span>{selectedUser.dob || "Not provided"}</span>
                </div>
                <div className="detail-item">
                  <label>Account Status</label>
                  <span className={selectedUser.verified ? "verified-text" : "unverified-text"}>
                    {selectedUser.verified ? "Verified" : "Unverified"}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Login Access</label>
                  <span className={selectedUser.disabled ? "disabled-text" : "enabled-text"}>
                    {selectedUser.disabled ? "Disabled" : "Enabled"}
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="edit-profile-btn" onClick={() => handleOpenEdit(selectedUser)}>
                Edit Details
              </button>
              <button className="close-profile-btn" onClick={handleCloseProfile}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={handleCloseEdit}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Account</h2>
              <button className="modal-close-btn" onClick={handleCloseEdit}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleEditAccount}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="editFullName">Full Name</label>
                    <input
                      id="editFullName"
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editEmail">Email (Read Only)</label>
                    <input id="editEmail" type="email" value={selectedUser.email} disabled />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="editDob">Date of Birth</label>
                    <input
                      id="editDob"
                      type="date"
                      value={editDob}
                      onChange={(e) => { if (e.target.value <= today) setEditDob(e.target.value); }}
                      max={today}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="editPhone">Phone Number</label>
                    <input
                      id="editPhone"
                      type="tel"
                      value={editPhone}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "");
                        if (!val.startsWith("09")) val = "09" + val;
                        if (val.length <= 11) setEditPhone(val);
                      }}
                      pattern="09[0-9]{9}"
                      maxLength={11}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="editRole">Role</label>
                  <select id="editRole" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                    <option value="staff">Staff</option>
                    <option value="official">Official</option>
                  </select>
                </div>
                {editError && <p className="error-text">{editError}</p>}
                <div className="modal-footer">
                  <button type="submit" className="save-account-button">
                    Save Changes
                  </button>
                  <button type="button" className="cancel-edit-btn" onClick={handleCloseEdit}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrapper">
      <table className="accounts-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Email Verified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentAccounts
            .filter((user) => user.role !== "admin")
            .map((user) => (
              <tr key={user.id}>
                <td>{user.fullName}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  {user.verified ? (
                    <span className="verified-badge">Verified</span>
                  ) : (
                    <span className="not-verified-badge">Not Verified</span>
                  )}
                </td>
                <td>
                  <button className="profile-btn" onClick={() => handleOpenProfile(user)}>
                    Profile
                  </button>
                  <button className="edit" onClick={() => handleOpenEdit(user)}>
                    Edit
                  </button>
                  {user.verified ? (
                    <button
                      className={`toggle ${user.disabled ? 'active' : 'inactive'}`}
                      onClick={() => handleToggleAccountStatus(user.id, user.disabled)}
                    >
                      {user.disabled ? "Enable" : "Disable"}
                    </button>
                  ) : (
                    <button className="delete" onClick={() => handleDeleteAccount(user.id)}>
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      </div>
      {/* Pagination Controls */}
      <div className="pagination-container">
        <button
          className="pagination-button"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="pagination-button"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ManageAccounts;
