import React from "react";
import Sidebar from "../../components/Sidebar";

const AdminDashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar role="admin" />
      <div className="dashboard-content">
        <h1>Admin Dashboard</h1>
        <p>Welcome, Admin! Here you can manage accounts and view analytics.</p>
      </div>
    </div>
  );
};

export default AdminDashboard;
