import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import Swal from "sweetalert2";  // Make sure Swal is imported
import "./Sidebar.css";
import logo from "../assets/bg.png"; // Make sure to update the path

const Sidebar = ({ role }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();

  const menuItems = {
    admin: [
      { name: "Dashboard", path: "/admin-dashboard", icon: "fas fa-home" },
      { name: "Manage Accounts", path: "/manage-accounts", icon: "fas fa-users" },
      { name: "Proposals", path: "/admin-proposals", icon: "fas fa-users" },
    ],
    staff: [
      { name: "Dashboard", path: "/staff-dashboard", icon: "fas fa-home" },
      { name: "Submit Proposal", path: "/staff-proposal", icon: "fas fa-file-alt" },
      { name: "Events", path: "/events", icon: "fas fa-calendar" },
      { name: "Account", path: "/staff-account", icon: "fas fa-user" },
    ],
    official: [
      { name: "Dashboard", path: "/official-dashboard", icon: "fas fa-home" },
      { name: "Review Proposals", path: "/review-proposals", icon: "fas fa-check-circle" },
      { name: "Events", path: "/official-events", icon: "fas fa-calendar" },
      { name: "Account", path: "/official-account", icon: "fas fa-user" },
    ],
  };

  const handleLogout = () => {
    // Show a confirmation dialog before logging out
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, log out",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        // If the user confirmed, log them out
        signOut(auth)
          .then(() => {
            navigate("/login");  // Redirect to the login page after successful logout
          })
          .catch((error) => {
            console.error("Logout Error:", error.message);
          });
      }
    });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img src={logo} alt="Logo" />
      </div>
      <ul>
        {menuItems[role]?.map((item) => (
          <li key={item.name} className={location.pathname === item.path ? "active" : ""}>
            <Link to={item.path}>
              <i className={item.icon}></i> {item.name}
            </Link>
          </li>
        ))}
      </ul>
      <button className="logout-btn" onClick={handleLogout}>
        <i className="fas fa-sign-out-alt"></i> Log Out
      </button>
    </div>
  );
};

export default Sidebar;
