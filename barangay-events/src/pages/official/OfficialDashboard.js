import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
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
  
  // Search, filter, and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, approved, rejected, cancelled, declined
  const [sortBy, setSortBy] = useState("date"); // date, title, location, status
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  
  // Modal states
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ✅ Fetch Proposals and Check for Notifications
  const fetchProposals = async () => {
    try {
      const proposalsSnapshot = await getDocs(collection(db, "proposals"));
      const allProposals = [];

      for (const docSnap of proposalsSnapshot.docs) {
        const proposalData = docSnap.data();
        let fullName = "Unknown";

        if (proposalData.userId) {
          const userRef = doc(db, "users", proposalData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            fullName = userSnap.data().fullName;
          }
        }

        allProposals.push({
          id: docSnap.id,
          ...proposalData,
          submitterName: fullName,
        });
      }

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

  // ✅ Automatic Decline Function - Checks for past dates and deadline
  const checkProposalDeadlines = async () => {
    try {
      const proposalsSnapshot = await getDocs(collection(db, "proposals"));
      const usersSnapshot = await getDocs(collection(db, "users"));
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Ensure we compare only the date (not time)

      // Count total officials
      let officialCount = 0;
      for (const userDoc of usersSnapshot.docs) {
        if (userDoc.data().role?.toLowerCase() === "official") {
          officialCount++;
        }
      }

      if (officialCount <= 0) {
        console.error("No officials found. Cannot check voting requirements.");
        return;
      }

      const approvalThreshold = Math.ceil(officialCount * 0.8);
      let proposalsUpdated = false;

      for (const docSnap of proposalsSnapshot.docs) {
        const proposalData = docSnap.data();
        const proposalRef = doc(db, "proposals", docSnap.id);

        if (!proposalData.date || proposalData.status !== "Pending") continue;

        const eventDate = new Date(proposalData.date);
        eventDate.setHours(0, 0, 0, 0); // Remove time component for accurate comparison

        // Check if voting requirements are NOT met
        const votes = proposalData.votes || { approve: [], reject: [] };
        const approveCount = votes.approve?.length || 0;

        const oneDayBefore = new Date(eventDate);
        oneDayBefore.setDate(eventDate.getDate() - 1);

        // Check if event date has already passed (past date)
        const isPastDate = today.getTime() > eventDate.getTime();
        
        // Check if today is one day before the event date
        const isOneDayBefore = today.getTime() === oneDayBefore.getTime();

        // Decline if:
        // 1. Event date has passed, OR
        // 2. Today is one day before event date
        // AND voting requirements are NOT met
        if ((isPastDate || isOneDayBefore) && approveCount < approvalThreshold) {
          await updateDoc(proposalRef, { status: "Declined (Missed Deadline)" });

          const declineReason = isPastDate 
            ? "event date has passed"
            : "missing the deadline";

          await addDoc(collection(db, "notifications"), {
            message: `Proposal "${proposalData.title}" has been automatically declined because the ${declineReason} and voting requirements were not met.`,
            timestamp: serverTimestamp(),
            type: "Declined",
          });

          console.log(`Proposal "${proposalData.title}" has been automatically declined (${declineReason}).`);
          proposalsUpdated = true;
        }
      }

      // Refresh proposals only if any were updated
      if (proposalsUpdated) {
        fetchProposals();
      }
    } catch (error) {
      console.error("Error checking deadlines:", error.message);
    }
  };

  useEffect(() => {
    fetchProposals();
    checkProposalDeadlines(); // Run immediately when component mounts

    // Set up interval to check deadlines every hour
    const interval = setInterval(() => {
      checkProposalDeadlines(); // Run every hour
    }, 60 * 60 * 1000);

    return () => clearInterval(interval); // Cleanup interval when component unmounts
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

  // Helper to format time
  const formatTime = (timeString) => {
    if (!timeString) return "-";
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Handle viewing attachment
  const handleViewAttachment = (fileURL) => {
    if (!fileURL) {
      return;
    }

    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileURL);
    if (isImage) {
      window.open(fileURL, "_blank");
    } else {
      window.open(fileURL, "_blank");
    }
  };

  // Handle opening modal with proposal details
  const handleViewDetails = (proposal) => {
    setSelectedProposal(proposal);
    setShowModal(true);
  };

  // Handle closing modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProposal(null);
  };

  // Search function
  const searchProposals = (proposalsList, query) => {
    if (!query.trim()) return proposalsList;
    
    const searchTerm = query.toLowerCase();
    return proposalsList.filter((proposal) => {
      const title = (proposal.title || "").toLowerCase();
      const location = (proposal.location || "").toLowerCase();
      const submitter = (proposal.submitterName || "").toLowerCase();
      const description = (proposal.description || "").toLowerCase();
      
      return title.includes(searchTerm) || 
             location.includes(searchTerm) || 
             submitter.includes(searchTerm) ||
             description.includes(searchTerm);
    });
  };

  // Sort function
  const sortProposals = (proposalsList, sortField, order) => {
    const sorted = [...proposalsList].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case "title":
          aValue = (a.title || "").toLowerCase();
          bValue = (b.title || "").toLowerCase();
          break;
        case "location":
          aValue = (a.location || "").toLowerCase();
          bValue = (b.location || "").toLowerCase();
          break;
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        case "date":
          aValue = new Date(a.date || 0).getTime();
          bValue = new Date(b.date || 0).getTime();
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === "string") {
        return order === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }
    });
    
    return sorted;
  };

  // Filter and process proposals
  const baseFilteredProposals = statusFilter === "all"
    ? proposals
    : proposals.filter((p) => {
        const status = (p.status || "").toLowerCase();
        if (statusFilter === "declined") {
          return status.includes("declined") || status.includes("missed deadline");
        }
        return status === statusFilter.toLowerCase();
      });
  
  const searchedProposals = searchProposals(baseFilteredProposals, searchQuery);
  const sortedProposals = sortProposals(searchedProposals, sortBy, sortOrder);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(sortedProposals.length / proposalsPerPage);
  const indexOfLastProposal = currentPage * proposalsPerPage;
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage;
  const currentProposals = sortedProposals.slice(indexOfFirstProposal, indexOfLastProposal);

  return (
    <div className="official-dashboard" style={{ marginTop: 56 }}>


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
        
        {/* Search, Filter, and Sort Controls */}
        <div className="table-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by title, location, or submitter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-sort-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
              <option value="declined">Declined</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="location">Sort by Location</option>
              <option value="status">Sort by Status</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="sort-order-btn"
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {sortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
        
        <div className="results-count">
          Showing {currentProposals.length} of {sortedProposals.length} proposal{sortedProposals.length !== 1 ? 's' : ''}
        </div>
        
        <table className="proposals-table">
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Status</th>
              <th>Date</th>
              <th>Location</th>
              <th>Actions</th>
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
                    <td>
                      <button
                        onClick={() => handleViewDetails(proposal)}
                        className="action-btn view-details-btn"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No proposals found.</td>
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

      {/* Modal for Viewing Proposal Details */}
      {showModal && selectedProposal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Proposal Details</h2>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-detail-row full-width">
                <strong>Event Title:</strong>
                <span>{selectedProposal.title}</span>
              </div>
              <div className="modal-detail-row full-width">
                <strong>Description:</strong>
                <span>{selectedProposal.description || "No description provided"}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Location:</strong>
                <span>{selectedProposal.location}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Date:</strong>
                <span>{formatDate(selectedProposal.date)}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Time:</strong>
                <span>{formatTime(selectedProposal.time)}</span>
              </div>
              {selectedProposal.fileURL && (
                <div className="modal-detail-row">
                  <strong>Attachment:</strong>
                  <button
                    className="attachment-btn"
                    onClick={() => handleViewAttachment(selectedProposal.fileURL)}
                  >
                    View Attachment
                  </button>
                </div>
              )}
              {selectedProposal.note && (
                <div className="modal-detail-row full-width">
                  <strong>Note:</strong>
                  <span>{selectedProposal.note}</span>
                </div>
              )}
              <div className="modal-detail-row">
                <strong>Submitted By:</strong>
                <span>{selectedProposal.submitterName || "Unknown"}</span>
              </div>
              <div className="modal-detail-row full-width">
                <strong>Status:</strong>
                <span>{selectedProposal.status || "Pending"}</span>
              </div>
              {selectedProposal.votes && (
                <div className="modal-detail-row full-width">
                  <strong>Votes:</strong>
                  <div className="votes-display">
                    <span className="vote-count approve-count">
                      ✅ Approve: {selectedProposal.votes?.approve?.length ?? 0}
                    </span>
                    <span className="vote-count reject-count">
                      ❌ Reject: {selectedProposal.votes?.reject?.length ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <div style={{ textAlign: 'center', width: '100%', color: '#64748b', fontSize: '14px' }}>
                This proposal has been {selectedProposal.status || "Pending"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficialDashboard;
