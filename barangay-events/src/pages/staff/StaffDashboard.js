import React from "react";
import Sidebar from "../../components/Sidebar";

const StaffDashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar role="staff" />
      <div className="dashboard-content">
        <h1>Staff Dashboard</h1>
        <p>View your event proposals and track approvals.</p>
      </div>
    </div>
  );
};

export default StaffDashboard;
