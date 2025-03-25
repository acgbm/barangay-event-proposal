import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import "./Sidebar.css";

const Sidebar = ({ role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();

  const menuItems = {
    admin: [
      { name: "Dashboard", path: "/admin-dashboard" },
      { name: "Manage Accounts", path: "/manage-accounts" },
    ],
    staff: [
      { name: "Dashboard", path: "/staff-dashboard" },
      { name: "Submit Proposal", path: "/staff-proposal" },
      { name: "Events", path: "/staff-events" },
      { name: "Account", path: "/staff-account" },
    ],
    official: [
      { name: "Dashboard", path: "/official-dashboard" },
      { name: "Review Proposals", path: "/review-proposals" },
      { name: "Events", path: "/official-events" },
      { name: "Account", path: "/official-account" },
    ],
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login"); // Redirect to Login Page
    } catch (error) {
      console.error("Logout Error:", error.message);
    }
  };

  return (
    <div className="sidebar">
      <h2>{role.charAt(0).toUpperCase() + role.slice(1)} Panel</h2>
      <ul>
        {menuItems[role]?.map((item) => (
          <li key={item.name} className={location.pathname === item.path ? "active" : ""}>
            <Link to={item.path}>{item.name}</Link>
          </li>
        ))}
      </ul>
      <button className="logout-btn" onClick={handleLogout}>Logout</button>
      {/* Logout Button */}
    </div>
  );
};

export default Sidebar;
