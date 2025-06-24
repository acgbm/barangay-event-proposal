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
  const accountsPerPage = 5;
  const db = getFirestore();
  const auth = getAuth();

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
        verified: isAdmin ? true : false,
      });
      if (!isAdmin) {
        const verificationLink = `http://localhost:3000/verify-email?uid=${userId}`;
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
      setAccounts([...accounts, { id: userId, email, role, fullName, dob, phone, verified: isAdmin }]);
      setEmail("");
      setRole("staff");
      setFullName("");
      setDob("");
      setPhone("");
      Swal.fire({
        icon: "success",
        title: "Account Created",
        text: isAdmin
          ? `Admin account created successfully.`
          : `A verification email has been sent to ${email}. The user cannot log in until they verify their email.`,
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
  
  const handleEditAccount = async (user) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Account',
      html:
        `<input id="swal-fullname" class="swal2-input" placeholder="Full Name" value="${user.fullName}" maxlength="50" pattern="[A-Za-z\s]+" autocomplete="off">` +
        `<input id="swal-dob" class="swal2-input" type="date" value="${user.dob}" max="${today}">` +
        `<input id="swal-phone" class="swal2-input" placeholder="09xxxxxxxxx" value="${user.phone}" maxlength="11" pattern="09[0-9]{9}" autocomplete="off">` +
        `<select id="swal-role" class="swal2-input" style="height:40px;">
          <option value="staff" ${user.role === 'staff' ? 'selected' : ''}>Staff</option>
          <option value="official" ${user.role === 'official' ? 'selected' : ''}>Official</option>
        </select>`,
      focusConfirm: false,
      confirmButtonText: 'Save',
      showCancelButton: true,
      cancelButtonColor: '#6c757d',
      confirmButtonColor: '#007bff',
      customClass: {
        popup: 'swal2-modern',
        confirmButton: 'swal2-modern-btn',
        cancelButton: 'swal2-modern-btn-cancel'
      },
      preConfirm: () => {
        const fullName = document.getElementById('swal-fullname').value.trim();
        const dob = document.getElementById('swal-dob').value;
        const phone = document.getElementById('swal-phone').value.trim();
        const role = document.getElementById('swal-role').value;
        // Validation
        if (!/^[A-Za-z\s]+$/.test(fullName)) {
          Swal.showValidationMessage('Full Name must only contain letters and spaces.');
          return false;
        }
        if (!dob || dob > today) {
          Swal.showValidationMessage('Please enter a valid date of birth.');
          return false;
        }
        if (!/^09\d{9}$/.test(phone)) {
          Swal.showValidationMessage('Phone number must start with 09 and be 11 digits.');
          return false;
        }
        return { fullName, dob, phone, role };
      }
    });

    if (formValues) {
      try {
        await updateDoc(doc(db, "users", user.id), {
          fullName: formValues.fullName,
          dob: formValues.dob,
          phone: formValues.phone,
          role: formValues.role,
        });
        setAccounts(
          accounts.map((u) =>
            u.id === user.id
              ? { ...u, ...formValues }
              : u
          )
        );
        Swal.fire({
          icon: "success",
          title: "Account Updated",
          text: "The account has been successfully updated.",
          confirmButtonColor: '#007bff',
          customClass: { popup: 'swal2-modern' }
        });
      } catch (err) {
        Swal.fire({
          icon: "error",
          title: "Update Failed",
          text: err.message,
          confirmButtonColor: '#dc3545',
          customClass: { popup: 'swal2-modern' }
        });
      }
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
      <h2>Manage Accounts</h2>

      <form onSubmit={handleCreateAccount}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input id="fullName" type="text" placeholder="Full Name" value={fullName} onChange={handleFullNameChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="Email" value={email} onChange={handleEmailChange} required />
            {emailError && <span style={{color:'#dc3545', fontSize:'0.95em'}}>{emailError}</span>}
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
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="staff">Staff</option>
              <option value="official">Official</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={isCreating || !!emailError} style={isCreating ? {opacity:0.6, cursor:'not-allowed'} : {}}>
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </form>

      <h3>Existing Accounts</h3>
      <div style={{overflowX: 'auto', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)'}}>
      <table className="accounts-table">
        <thead>
          <tr>
            <th>Full Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Date of Birth</th>
            <th>Phone</th>
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
                <td>{user.dob}</td>
                <td>{user.phone}</td>
                <td>{user.verified ? <span style={{color:'#28a745', fontWeight:600}}>✅ Verified</span> : <span style={{color:'#dc3545', fontWeight:600}}>❌ Not Verified</span>}</td>
                <td>
                  <button className="edit" onClick={() => handleEditAccount(user)}>
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
      <div style={{display: 'flex', justifyContent: 'center', marginTop: '12px', gap: '10px'}}>
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          style={{minWidth: 90, maxWidth: 120, padding: '7px 0', borderRadius: 6, background: '#e0e7ef', color: '#222', border: 'none', fontWeight: 600, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.6 : 1}}
        >
          Previous
        </button>
        <span style={{alignSelf: 'center', fontWeight: 500}}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          style={{minWidth: 90, maxWidth: 120, padding: '7px 0', borderRadius: 6, background: '#e0e7ef', color: '#222', border: 'none', fontWeight: 600, cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', opacity: (currentPage === totalPages || totalPages === 0) ? 0.6 : 1}}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ManageAccounts;
