import { createContext, useContext, useState, useEffect } from "react";
import { auth, db, requestNotificationPermission, setupMessageListener, initializeMessaging } from "../firebaseConfig";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    // Initialize messaging when app loads
    initializeMessaging().then(() => {
      console.log('✅ Messaging initialized');
    }).catch(error => {
      console.error('Failed to initialize messaging:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser(currentUser);
            setRole(userData?.role || "staff");
            
            // Request notification permission
            const permission = await requestNotificationPermission();
            if (permission) {
              console.log('✅ Notifications enabled');
            }
          } else {
            setUser(null);
            setRole(null);
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

    if (userDoc.exists()) {
      setRole(userDoc.data().role); // ✅ Store role after login
    }

    return userCredential;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
