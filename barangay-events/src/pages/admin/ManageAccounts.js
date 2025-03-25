import { useState, useEffect } from "react";
import { 
  getFirestore, collection, setDoc, doc, getDocs, updateDoc, deleteDoc 
} from "firebase/firestore";
import { 
  getAuth, createUserWithEmailAndPassword, deleteUser 
} from "firebase/auth";

const ManageAccounts = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff"); // Default role
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(null); // Track which user is being edited
  const db = getFirestore();
  const auth = getAuth();

  // ✅ Fetch accounts from Firestore (excluding admin)
  useEffect(() => {
    const fetchAccounts = async () => {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.role !== "admin"); // Exclude admin

      setAccounts(usersList);
    };

    fetchAccounts();
  }, []);

  // ✅ Create an account & ensure Firestore document ID matches Firebase Authentication UID
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Step 1: Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid; // Use UID for Firestore document ID

      // Step 2: Save user details in Firestore
      await setDoc(doc(db, "users", userId), {
        email,
        role,
        fullName,
        dob,
        phone,
      });

      // Update state to show the new user
      setAccounts([...accounts, { id: userId, email, role, fullName, dob, phone }]);

      // Reset form
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

  // ✅ Edit user details
  const handleEditAccount = async (userId) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        fullName,
        dob,
        phone,
        role,
      });

      // Update local state
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

  // ✅ Delete user from Firestore & Firebase Authentication
  const handleDeleteAccount = async (userId) => {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "users", userId));

      // Find user in Authentication and delete
      const userToDelete = auth.currentUser;
      if (userToDelete && userToDelete.uid === userId) {
        await deleteUser(userToDelete);
      }

      // Update state
      setAccounts(accounts.filter((user) => user.id !== userId));
    } catch (err) {
      console.error("Error deleting account:", err);
    }
  };

  return (
    <div>
      <h2>Manage Accounts</h2>

      {/* ✅ Create Account Form */}
      <form onSubmit={handleCreateAccount}>
        <input 
          type="text" 
          placeholder="Full Name" 
          value={fullName} 
          onChange={(e) => setFullName(e.target.value)} 
          required 
        />
        <input 
          type="email" 
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
        <input 
          type="date" 
          value={dob} 
          onChange={(e) => setDob(e.target.value)} 
          required 
        />
        <input 
          type="tel" 
          placeholder="Phone Number" 
          value={phone} 
          onChange={(e) => setPhone(e.target.value.replace(/\D/, ""))} 
          required 
        />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="staff">Staff</option>
          <option value="official">Official</option>
        </select>
        <button type="submit">Create Account</button>
        {error && <p>{error}</p>}
      </form>

      {/* ✅ List of Accounts */}
      <h3>Existing Accounts</h3>
      <ul>
        {accounts.map((user) => (
          <li key={user.id}>
            {editMode === user.id ? (
              // Edit Mode
              <>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Full Name"
                />
                <input 
                  type="date" 
                  value={dob} 
                  onChange={(e) => setDob(e.target.value)} 
                />
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value.replace(/\D/, ""))} 
                  placeholder="Phone Number"
                />
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="official">Official</option>
                </select>
                <button onClick={() => handleEditAccount(user.id)}>Save</button>
                <button onClick={() => setEditMode(null)}>Cancel</button>
              </>
            ) : (
              // Display Mode
              <>
                {user.fullName} - {user.email} - {user.role} - {user.dob} - {user.phone}
                <button onClick={() => setEditMode(user.id)}>Edit</button>
                <button onClick={() => handleDeleteAccount(user.id)}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageAccounts;
