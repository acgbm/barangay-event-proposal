import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  setDoc,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
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
      }));

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

  const handleDeleteAccount = async (userId) => {
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
          {accounts.map((user) => (
            <tr key={user.id}>
              <td>{user.fullName}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.dob}</td>
              <td>{user.phone}</td>
              <td>{user.verified ? "✅ Verified" : "❌ Not Verified"}</td>
              <td>
                {user.role !== "admin" && (
                  <button onClick={() => handleDeleteAccount(user.id)} style={{ backgroundColor: "#dc3545" }}>Remove</button>
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
