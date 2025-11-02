
import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";


const Layout = ({ role }) => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const fetchFullName = async () => {
      if (user && role !== "admin") {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setFullName(userDoc.data().fullName || "");
        }
      }
    };
    fetchFullName();
  }, [user, role]);

  // Always show "Admin" for admin role, otherwise show the fetched fullName
  const displayName = role === "admin" ? "Admin" : fullName;

  return (
    <div className="layout">
      <Sidebar role={role} fullName={displayName} />
      <Header />
      <div className="content main-content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
