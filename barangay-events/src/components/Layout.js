
import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseConfig";
import { doc, getDoc } from "firebase/firestore";


const Layout = ({ role }) => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    const fetchFullName = async () => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setFullName(userDoc.data().fullName || "");
        }
      }
    };
    fetchFullName();
  }, [user]);

  return (
    <div className="layout">
      <Sidebar role={role} fullName={fullName} />
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;
