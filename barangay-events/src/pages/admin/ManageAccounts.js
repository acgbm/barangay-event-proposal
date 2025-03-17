import { useState, useEffect } from "react";
import { getFirestore, collection, addDoc, setDoc, doc, getDocs, deleteDoc } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, deleteUser } from "firebase/auth";

const ManageAccounts = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff"); // Default role
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const db = getFirestore();
  const auth = getAuth();

  // ✅ Fetch existing accounts from Firestore
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

  // ✅ Create account & ensure Firestore document ID matches Authentication UID
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Step 1: Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userId = user.uid; // Use this UID for Firestore document ID

      // Step 2: Save user details in Firestore (UID as document ID)
      await setDoc(doc(db, "users", userId), {
        email,
        role,
      });

      // Update state to show the new user
      setAccounts([...accounts, { id: userId, email, role }]);
      setEmail("");
      setPassword("");
      setRole("staff");
    } catch (err) {
      setError("Error creating account: " + err.message);
    }
  };

  // ✅ Delete user from Firebase Authentication & Firestore
  const handleDeleteAccount = async (userId) => {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, "users", userId));

      // Find user in Authentication and delete
      const userToDelete = auth.currentUser; // Firebase does not allow deleting other users directly
      if (userToDelete && userToDelete.uid === userId) {
        await deleteUser(userToDelete);
      }

      // Update state to remove user
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
            {user.email} - {user.role}
            <button onClick={() => handleDeleteAccount(user.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageAccounts;
