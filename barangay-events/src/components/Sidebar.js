import React, { useState } from "react";
import {
  Home,
  Users,
  FileText,
  ClipboardList,
  Calendar,
  User,
  LogOut,
  CheckCircle2
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import Swal from "sweetalert2";  // Make sure Swal is imported
import "./Sidebar.css";
import logo from "../assets/bg.png"; // Make sure to update the path

const Sidebar = ({ role, fullName }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();

  // Use Lucide icons for a professional, monochrome look
  const menuItems = {
    admin: [
      { name: "Dashboard", path: "/admin-dashboard", icon: <Home size={18} style={{marginRight: 8}} /> },
      { name: "Accounts", path: "/manage-accounts", icon: <Users size={18} style={{marginRight: 8}} /> },
      { name: "Proposals", path: "/admin-proposals", icon: <FileText size={18} style={{marginRight: 8}} /> },
    ],
    staff: [
      { name: "Dashboard", path: "/staff-dashboard", icon: <Home size={18} style={{marginRight: 8}} /> },
      { name: "Submit Proposal", path: "/staff-proposal", icon: <ClipboardList size={18} style={{marginRight: 8}} /> },
      { name: "Events", path: "/events", icon: <Calendar size={18} style={{marginRight: 8}} /> },
      { name: "Account", path: "/staff-account", icon: <User size={18} style={{marginRight: 8}} /> },
    ],
    official: [
      { name: "Dashboard", path: "/official-dashboard", icon: <Home size={18} style={{marginRight: 8}} /> },
      { name: "Proposals", path: "/review-proposals", icon: <CheckCircle2 size={18} style={{marginRight: 8}} /> },
      { name: "Events", path: "/official-events", icon: <Calendar size={18} style={{marginRight: 8}} /> },
      { name: "Account", path: "/official-account", icon: <User size={18} style={{marginRight: 8}} /> },
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
    <>
      {/* Hamburger button for mobile */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen((open) => !open)}
        aria-label="Toggle sidebar"
      >
        <span className="bar"></span>
        <span className="bar"></span>
        <span className="bar"></span>
      </button>
      {/* Sidebar always above overlay in DOM order */}
      <div className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-logo">
          <img src={logo} alt="Logo" />
        </div>
        <div style={{ marginBottom: 32 }}></div>
        {fullName && (
          <>
            <div className="sidebar-fullname">{fullName}</div>
            {(role === 'staff' || role === 'official') && (
              <div className="sidebar-role-label">
                {role === 'staff' ? 'Staff' : 'Official'}
              </div>
            )}
          </>
        )}
        <ul>
          {menuItems[role]?.map((item, idx, arr) => (
            <React.Fragment key={item.name}>
              {/* Add line above Dashboard */}
              {idx === 0 && <hr className="sidebar-divider" />}
              <li className={location.pathname === item.path ? "active" : ""}>
                <Link to={item.path} onClick={() => setSidebarOpen(false)}>
                  {item.icon} {item.name}
                </Link>
              </li>
              {/* Add line below Account (last item) */}
              {idx === arr.length - 1 && <hr className="sidebar-divider" />}
            </React.Fragment>
          ))}
        </ul>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={28} />
        </button>
      </div>
    </>
  );
};

export default Sidebar;
