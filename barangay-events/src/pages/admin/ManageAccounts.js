import { useState, useEffect } from "react";
import { 
  getFirestore, collection, setDoc, doc, getDocs, updateDoc, deleteDoc 
} from "firebase/firestore";
import { 
  getAuth, createUserWithEmailAndPassword, deleteUser 
} from "firebase/auth";
import "./ManageAccounts.css";

const ManageAccounts = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(null);
  const db = getFirestore();
  const auth = getAuth();

  useEffect(() => {
    const fetchAccounts = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.role !== "admin");

      setAccounts(usersList);
    };

    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;

      await setDoc(doc(db, "users", userId), {
        email,
        role,
        fullName,
        dob,
        phone,
      });

      setAccounts([...accounts, { id: userId, email, role, fullName, dob, phone }]);

      setEmail("");
      setPassword("");
      setRole("staff");
      setFullName("");
      setDob("");
      setPhone("");
    } catch (err) {
      setError("Error creating account: " + err.message);
    }
  };

  const handleEditAccount = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        fullName,
        dob,
        phone,
        role,
      });

      setAccounts(
        accounts.map((user) =>
          user.id === userId ? { ...user, fullName, dob, phone, role } : user
        )
      );
      setEditMode(null);
    } catch (err) {
      console.error("Error updating account:", err);
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
    } catch (err) {
      console.error("Error deleting account:", err);
    }
  };

  return (
    <div className="manage-accounts">
  <h2>Manage Accounts</h2>

  <form onSubmit={handleCreateAccount}>
    <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
    <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
          <td>
            <button onClick={() => setEditMode(user.id)}>Edit</button>
            <button onClick={() => handleDeleteAccount(user.id)} style={{ backgroundColor: "#dc3545" }}>Remove</button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
  );
};

export default ManageAccounts;
