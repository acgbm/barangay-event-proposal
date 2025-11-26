import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig"; // Firebase Firestore
import { collection, query, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import "./AdminProposal.css"; // Ensure this file is styled

// Helper to format date as "Month DD, YYYY"
function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr; // fallback for invalid
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Helper to format time
const formatTime = (timeString) => {
  if (!timeString) return "-";
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const AdminProposal = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const proposalsPerPage = 10;
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Search, filter, and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, approved, cancelled, declined, rescheduled
  const [sortBy, setSortBy] = useState("date"); // date, title, status
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc

  // Fetch proposals from Firestore
  const fetchProposals = async () => {
    setLoading(true);
    try {
      const proposalsQuery = query(collection(db, "proposals"));
      const querySnapshot = await getDocs(proposalsQuery);
      const proposalsList = [];
      
      for (const docSnap of querySnapshot.docs) {
        const proposalData = docSnap.data();
        let fullName = "Unknown";
        
        if (proposalData.userId) {
          const userRef = doc(db, "users", proposalData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            fullName = userSnap.data().fullName;
          }
        }
        
        proposalsList.push({
          id: docSnap.id,
          ...proposalData,
          submitterName: fullName,
        });
      }
      
      setProposals(proposalsList);
    } catch (error) {
      console.error("Error fetching proposals:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  // Handle event rescheduling
  const handleReschedule = async (proposal) => {
    // Get the current date in YYYY-MM-DD format
    const currentDate = new Date().toISOString().split("T")[0]; // Format as 'YYYY-MM-DD'
  
    const { value: newStartDate } = await Swal.fire({
      title: "Reschedule Event",
      input: "date",
      inputLabel: "New Start Date",
      inputValue: proposal.startDate,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "You must provide a new start date!";
        }
      },
      inputAttributes: {
        min: currentDate, // Disables selecting past dates
      },
    });
  
    if (!newStartDate) return;

    const { value: newFinishDate } = await Swal.fire({
      title: "Reschedule Event",
      input: "date",
      inputLabel: "New Finish Date",
      inputValue: proposal.finishDate,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "You must provide a new finish date!";
        }
        if (value < newStartDate) {
          return "Finish date must be after start date!";
        }
      },
      inputAttributes: {
        min: newStartDate, // Finish date must be after start date
      },
    });
  
    if (newFinishDate) {
      try {
        const proposalRef = doc(db, "proposals", proposal.id);
        await updateDoc(proposalRef, {
          startDate: newStartDate,
          finishDate: newFinishDate,
          status: "Rescheduled", // Update the status to "Rescheduled"
        });
  
        // Notify both staff and official side about the rescheduling
        Swal.fire({
          icon: "success",
          title: "Event Rescheduled",
          text: `The event "${proposal.title}" has been rescheduled from ${formatDate(proposal.startDate)} to ${formatDate(newStartDate)}.`,
        });
  
        fetchProposals(); // Re-fetch proposals to update the view
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error Rescheduling Event",
          text: error.message,
        });
      }
    }
  };

  // Handle event cancellation
  const handleCancel = async (proposal) => {
    const { value: reason } = await Swal.fire({
      title: "Cancel Event",
      input: "textarea",
      inputLabel: "Reason for Cancellation",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "You must provide a reason for cancellation!";
        }
      },
    });

    if (reason) {
      try {
        const proposalRef = doc(db, "proposals", proposal.id);
        await updateDoc(proposalRef, {
          status: "Cancelled",
          cancellationReason: reason, // Store the reason for cancellation
        });

        // Notify both staff and official side about the cancellation
        Swal.fire({
          icon: "error",
          title: "Event Cancelled",
          text: `The event "${proposal.title}" has been cancelled. Reason: ${reason}`,
        });

        fetchProposals(); // Re-fetch proposals to update the view
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Error Cancelling Event",
          text: error.message,
        });
      }
    }
  };

  // Handle view details modal
  const handleViewDetails = (proposal) => {
    setSelectedProposal(proposal);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProposal(null);
  };

  const handleViewAttachment = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
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
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        case "date":
          aValue = new Date(a.startDate || 0).getTime();
          bValue = new Date(b.startDate || 0).getTime();
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

  // Determine the color of the status text
  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "#2ecc40"; // green
      case "Pending":
        return "#f59e0b"; // yellow
      case "Rejected":
        return "#e74c3c"; // red (shown as Declined)
      case "Declined (Missed Deadline)":
        return "#e74c3c"; // red
      case "Cancelled":
        return "#888"; // gray
      case "Rescheduled":
        return "#6c63ff"; // purple/blue
      case "Done":
        return "#2563eb"; // blue
      default:
        return "#22223b";
    }
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
    <div className="admin-proposal">
      <h2>Proposals</h2>
      {loading ? <p>Loading proposals...</p> : null}
      
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
            <option value="rescheduled">Rescheduled</option>
            <option value="declined">Declined</option>
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
            <option value="status">Sort by Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="sort-order-btn"
            title={sortOrder === "asc" ? "Sort Descending" : "Sort Ascending"}
          >
            {sortOrder === "asc" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      {sortedProposals.length > 0 && (
        <div className="results-count">
          Showing {currentProposals.length} of {sortedProposals.length} proposal{sortedProposals.length !== 1 ? 's' : ''}
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Status</th>
              <th>View Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProposals.map((proposal) => (
              <tr key={proposal.id}>
                <td>{proposal.title}</td>
                <td>{formatDate(proposal.startDate)} - {formatDate(proposal.finishDate)}</td>
                <td>
                  <span className="status-badge" style={{ background: getStatusColor(proposal.status)+"22", color: getStatusColor(proposal.status) }}>
                    {proposal.status === "Rejected" ? "Declined" : (proposal.status || "Pending")}
                  </span>
                </td>
                <td className="view-details-cell">
                  <button className="viewDetailsButton" onClick={() => handleViewDetails(proposal)}>View Details</button>
                </td>
                <td className={
                  proposal.status === "Approved" || proposal.status === "Rescheduled"
                    ? "action-buttons"
                    : "no-actions-cell"
                }>
                  {proposal.status === "Approved" && (
                    <>
                      <button className="rescheduleButton" onClick={() => handleReschedule(proposal)}>Reschedule</button>
                      <button className="cancelButton" onClick={() => handleCancel(proposal)}>Cancel</button>
                    </>
                  )}
                  {proposal.status === "Rescheduled" && (
                    <>
                      <button className="rescheduleButton" onClick={() => handleReschedule(proposal)}>Reschedule Again</button>
                      <button className="cancelButton" onClick={() => handleCancel(proposal)}>Cancel</button>
                    </>
                  )}
                  {(proposal.status === "Cancelled" || proposal.status === "Rejected" || proposal.status === "Pending" || proposal.status === "Declined (Missed Deadline)") && (
                    <span className="no-actions-text">No actions available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div className="pagination-container">
        <button
          className="pagination-button"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="pagination-button"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </button>
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
                <span>{selectedProposal.location || "-"}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Start Date:</strong>
                <span>{formatDate(selectedProposal.startDate)}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Finish Date:</strong>
                <span>{formatDate(selectedProposal.finishDate)}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Start Time:</strong>
                <span>{formatTime(selectedProposal.startTime)}</span>
              </div>
              <div className="modal-detail-row">
                <strong>Finish Time:</strong>
                <span>{formatTime(selectedProposal.finishTime)}</span>
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
              {selectedProposal.cancellationReason && (
                <div className="modal-detail-row full-width">
                  <strong>Cancellation Reason:</strong>
                  <span>{selectedProposal.cancellationReason}</span>
                </div>
              )}
              {selectedProposal.votes && (
                <div className="modal-detail-row full-width">
                  <strong>Votes:</strong>
                  <div className="votes-display">
                    <span className="vote-count approve-count">
                      ✅ Approve: {selectedProposal.votes?.approve?.length ?? 0}
                    </span>
                    <span className="vote-count reject-count">
                      ❌ Decline: {selectedProposal.votes?.reject?.length ?? 0}
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

export default AdminProposal;
