import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import "./OfficialDashboard.css";

const OfficialDashboard = () => {
  const [proposals, setProposals] = useState([]);
  const [statistics, setStatistics] = useState({
    upcoming: 0,
    pending: 0,
    cancelled: 0,
    rejected: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const proposalsPerPage = 5;

  // ✅ Fetch Proposals and Check for Notifications
  const fetchProposals = async () => {
    try {
      const proposalsSnapshot = await getDocs(collection(db, "proposals"));
      const allProposals = proposalsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setProposals(allProposals);
      updateStatistics(allProposals);
    } catch (error) {
      console.error("Error fetching proposals:", error.message);
    }
  };

  // ✅ Update Statistics for Proposals
  const updateStatistics = (allProposals) => {
    const upcoming = allProposals.filter(
      (proposal) => proposal.status === "Approved" && new Date(proposal.date) > new Date()
    ).length;
    const pending = allProposals.filter((proposal) => proposal.status === "Pending").length;
    const cancelled = allProposals.filter((proposal) => proposal.status === "Cancelled").length;
    const rejected = allProposals.filter((proposal) => proposal.status === "Rejected").length;

    setStatistics({
      upcoming,
      pending,
      cancelled,
      rejected,
    });
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  // Helper to format date as 'Month Day, Year'
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Pagination logic
  const indexOfLastProposal = currentPage * proposalsPerPage;
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage;
  const currentProposals = proposals.slice(indexOfFirstProposal, indexOfLastProposal);
  const totalPages = Math.ceil(proposals.length / proposalsPerPage);

  return (
    <div className="official-dashboard" style={{ marginTop: 56 }}>
      <h1>Official Dashboard</h1>

      <div className="quick-stats">
        <div className="stat-card">
          <h3>Upcoming Events</h3>
          <div className="stat-value">{statistics.upcoming}</div>
        </div>
        <div className="stat-card">
          <h3>Pending Events</h3>
          <div className="stat-value">{statistics.pending}</div>
        </div>
        <div className="stat-card">
          <h3>Cancelled Events</h3>
          <div className="stat-value">{statistics.cancelled}</div>
        </div>
        <div className="stat-card">
          <h3>Rejected Events</h3>
          <div className="stat-value">{statistics.rejected}</div>
        </div>
      </div>

      <div className="table-wrapper">
        <h2>All Proposals</h2>
        <table className="proposals-table">
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Status</th>
              <th>Date</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {currentProposals.length > 0 ? (
              currentProposals.map((proposal) => {
                const statusClass =
                  proposal.status &&
                  ["cancelled", "declined-missed-deadline", "deadline"].includes(
                    proposal.status.toLowerCase().replace(/ /g, "-")
                  )
                    ? "status-cancelled"
                    : `status-${(proposal.status || "pending").toLowerCase().replace(/ /g, "-")}`;
                return (
                  <tr key={proposal.id}>
                    <td>{proposal.title}</td>
                    <td>
                      <span className={`status-badge ${statusClass}`}>
                        {proposal.status}
                      </span>
                    </td>
                    <td>{formatDate(proposal.date)}</td>
                    <td>{proposal.location}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center' }}>No proposals found.</td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="official-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ minWidth: 90, maxWidth: 120, padding: '7px 0', borderRadius: 6, background: '#e0e7ef', color: '#222', border: 'none', fontWeight: 600, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.6 : 1 }}
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', fontWeight: 500 }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ minWidth: 90, maxWidth: 120, padding: '7px 0', borderRadius: 6, background: '#e0e7ef', color: '#222', border: 'none', fontWeight: 600, cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', opacity: (currentPage === totalPages || totalPages === 0) ? 0.6 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficialDashboard;
