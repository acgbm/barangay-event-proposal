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
  const [editMode, setEditMode] = useState(null);
  const [editFullName, setEditFullName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("");
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
        verified: isAdmin ? true : false, // Admins are automatically verified
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
          console.error("EmailJS error:", emailError);
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
  
      // Reset fields
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
      console.error("Account creation error:", err);
      setError("Error creating account: " + err.message);
      Swal.fire({
        icon: "error",
        title: "Account Creation Failed",
        text: err.message,
      });
    }
  };
  
  const handleEditAccount = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        fullName: editFullName,
        dob: editDob,
        phone: editPhone,
        role: editRole,
      });
  
      setAccounts(
        accounts.map((user) =>
          user.id === userId
            ? { ...user, fullName: editFullName, dob: editDob, phone: editPhone, role: editRole }
            : user
        )
      );
  
      setEditMode(null); // Exit edit mode after saving
  
      Swal.fire({
        icon: "success",
        title: "Account Updated",
        text: "The account has been successfully updated.",
      });
    } catch (err) {
      console.error("Error updating account:", err);
  
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: err.message,
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
  
  return (
    <div className="manage-accounts">
      <h2>Manage Accounts</h2>

      <form onSubmit={handleCreateAccount}>
        <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
        <input type="tel" placeholder="Phone Number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/, ""))} required />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="staff">Staff</option>
          <option value="official">Official</option>
        </select>
        <button type="submit">Create</button>
      </form>

      <h3>Existing Accounts</h3>
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
            {accounts
              .filter((user) => user.role !== "admin") // Hide admin accounts
              .map((user) => (
                <tr key={user.id}>
                  <td>
                    {editMode === user.id ? (
                      <input
                        type="text"
                        value={editFullName}
                        onChange={(e) => setEditFullName(e.target.value)}
                      />
                    ) : (
                      user.fullName
                    )}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    {editMode === user.id ? (
                      <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                        <option value="staff">Staff</option>
                        <option value="official">Official</option>
                      </select>
                    ) : (
                      user.role
                    )}
                  </td>
                  <td>
                    {editMode === user.id ? (
                      <input
                        type="date"
                        value={editDob}
                        onChange={(e) => setEditDob(e.target.value)}
                      />
                    ) : (
                      user.dob
                    )}
                  </td>
                  <td>
                    {editMode === user.id ? (
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    ) : (
                      user.phone
                    )}
                  </td>
                  <td>{user.verified ? "✅ Verified" : "❌ Not Verified"}</td>
                  <td>
                    {editMode === user.id ? (
                      <>
                        <button
                          onClick={() => handleEditAccount(user.id)}
                          style={{ backgroundColor: "#28a745", marginRight: "5px" }}
                        >
                          Save
                        </button>
                        <button onClick={() => setEditMode(null)} style={{ backgroundColor: "#6c757d" }}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditMode(user.id);
                            setEditFullName(user.fullName);
                            setEditDob(user.dob);
                            setEditPhone(user.phone);
                            setEditRole(user.role);
                          }}
                          style={{ backgroundColor: "#007bff", marginRight: "5px" }}
                        >
                          Edit
                        </button>
                        {user.verified ? (
                          <button
                            onClick={() => handleToggleAccountStatus(user.id, user.disabled)}
                            style={{
                              backgroundColor: user.disabled ? "#28a745" : "#6c757d", // Green for enable, Gray for disable
                              cursor: "pointer",
                            }}
                          >
                            {user.disabled ? "Enable Account" : "Disable Account"}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDeleteAccount(user.id)}
                            style={{ backgroundColor: "#dc3545" }}
                          >
                            Delete Account
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
      </table>
    </div>
  );
};

export default ManageAccounts;
