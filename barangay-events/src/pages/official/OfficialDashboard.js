import React from "react";
import Sidebar from "../../components/Sidebar";

const OfficialDashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar role="official" />
      <div className="dashboard-content">
        <h1>Official Dashboard</h1>
        <p>Review and vote on event proposals.</p>
      </div>
    </div>
  );
};

export default OfficialDashboard;
