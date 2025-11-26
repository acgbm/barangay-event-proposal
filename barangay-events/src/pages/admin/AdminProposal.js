import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig"; // Firebase Firestore
import { collection, query, getDocs, updateDoc, doc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
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
  const [showVotesModal, setShowVotesModal] = useState(false);
  const [votesData, setVotesData] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleProposal, setRescheduleProposal] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    startDate: "",
    startTime: "",
    finishDate: "",
    finishTime: "",
  });
  
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

  // Handle opening reschedule modal
  const handleReschedule = (proposal) => {
    setRescheduleProposal(proposal);
    setRescheduleForm({
      startDate: proposal.startDate,
      startTime: proposal.startTime,
      finishDate: proposal.finishDate,
      finishTime: proposal.finishTime,
    });
    setShowRescheduleModal(true);
  };

  // Handle reschedule form input change
  const handleRescheduleFormChange = (e) => {
    const { name, value } = e.target;
    setRescheduleForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle reschedule submission
  const handleRescheduleSubmit = async () => {
    if (!rescheduleForm.startDate || !rescheduleForm.finishDate) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please fill in both start and finish dates.",
      });
      return;
    }

    if (rescheduleForm.finishDate < rescheduleForm.startDate) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Dates",
        text: "Finish date must be after start date.",
      });
      return;
    }

    try {
      const proposalRef = doc(db, "proposals", rescheduleProposal.id);
      await updateDoc(proposalRef, {
        startDate: rescheduleForm.startDate,
        startTime: rescheduleForm.startTime,
        finishDate: rescheduleForm.finishDate,
        finishTime: rescheduleForm.finishTime,
        status: "Pending",
        votes: {
          approve: [],
          reject: [],
        },
      });

      // Create notification for officials about the rescheduled proposal
      await addDoc(collection(db, "notifications"), {
        message: `Proposal "${rescheduleProposal.title}" has been rescheduled and requires re-voting.`,
        timestamp: serverTimestamp(),
        type: "Pending",
        status: "Pending",
        targetRole: "official",
        targetUserId: null,
        proposalId: rescheduleProposal.id,
        proposalTitle: rescheduleProposal.title || "",
      });

      Swal.fire({
        icon: "success",
        title: "Event Rescheduled",
        text: `The event "${rescheduleProposal.title}" has been successfully rescheduled and returned to pending status for re-voting.`,
      });

      setShowRescheduleModal(false);
      setRescheduleProposal(null);
      setRescheduleForm({
        startDate: "",
        startTime: "",
        finishDate: "",
        finishTime: "",
      });
      fetchProposals();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error Rescheduling Event",
        text: error.message,
      });
    }
  };

  // Handle close reschedule modal
  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setRescheduleProposal(null);
    setRescheduleForm({
      startDate: "",
      startTime: "",
      finishDate: "",
      finishTime: "",
    });
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

  const handleViewVotes = async (proposal) => {
    try {
      // Fetch fullNames for approve votes
      let approveVoters = [];
      if (proposal.votes?.approve && proposal.votes.approve.length > 0) {
        approveVoters = await Promise.all(
          proposal.votes.approve.map(async (userId) => {
            try {
              const userRef = doc(db, "users", userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                return { userId, fullName: userSnap.data().fullName || "Unknown" };
              }
              return { userId, fullName: "Unknown" };
            } catch (error) {
              console.error("Error fetching user:", error);
              return { userId, fullName: "Unknown" };
            }
          })
        );
      }

      // Fetch fullNames for reject votes
      let rejectVoters = [];
      if (proposal.votes?.reject && proposal.votes.reject.length > 0) {
        rejectVoters = await Promise.all(
          proposal.votes.reject.map(async (userId) => {
            try {
              const userRef = doc(db, "users", userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                return { userId, fullName: userSnap.data().fullName || "Unknown" };
              }
              return { userId, fullName: "Unknown" };
            } catch (error) {
              console.error("Error fetching user:", error);
              return { userId, fullName: "Unknown" };
            }
          })
        );
      }

      // Set votes data with fullNames
      setVotesData({
        ...proposal,
        approveVoters,
        rejectVoters,
      });
      setShowVotesModal(true);
    } catch (error) {
      console.error("Error viewing votes:", error);
      setVotesData(proposal);
      setShowVotesModal(true);
    }
  };

  const handleCloseVotesModal = () => {
    setShowVotesModal(false);
    setVotesData(null);
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
              <th>Votes</th>
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
                <td className="votes-cell">
                  {proposal.votes && (proposal.votes.approve?.length > 0 || proposal.votes.reject?.length > 0) ? (
                    <button className="votes-button" onClick={() => handleViewVotes(proposal)}>
                      👍 {proposal.votes.approve?.length ?? 0} | 👎 {proposal.votes.reject?.length ?? 0}
                    </button>
                  ) : (
                    <span className="no-votes-text">No votes yet</span>
                  )}
                </td>
                <td className="view-details-cell">
                  <button className="viewDetailsButton" onClick={() => handleViewDetails(proposal)}>View Details</button>
                </td>
                <td className={
                  proposal.status === "Approved"
                    ? "action-buttons"
                    : "no-actions-cell"
                }>
                  {proposal.status === "Approved" && (
                    <>
                      <button className="rescheduleButton" onClick={() => handleReschedule(proposal)}>Reschedule</button>
                      <button className="cancelButton" onClick={() => handleCancel(proposal)}>Cancel</button>
                    </>
                  )}
                  {(proposal.status === "Cancelled" || proposal.status === "Rejected" || proposal.status === "Pending" || proposal.status === "Declined (Missed Deadline)" || proposal.status === "Rescheduled") && (
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

      {/* Modal for Viewing Votes Details */}
      {showVotesModal && votesData && (
        <div className="modal-overlay" onClick={handleCloseVotesModal}>
          <div className="modal-content votes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Votes - {votesData.title}</h2>
              <button className="modal-close-btn" onClick={handleCloseVotesModal}>
                ×
              </button>
            </div>
            <div className="modal-body votes-modal-body">
              <div className="votes-table-wrapper">
                <table className="votes-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Vote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {votesData.approveVoters && votesData.approveVoters.map((voter) => (
                      <tr key={`approve-${voter.userId}`} className="vote-row approve-row">
                        <td className="voter-name-cell">{voter.fullName}</td>
                        <td className="vote-badge-cell">
                          <span className="vote-badge approve-badge">✓ Approved</span>
                        </td>
                      </tr>
                    ))}
                    {votesData.rejectVoters && votesData.rejectVoters.map((voter) => (
                      <tr key={`reject-${voter.userId}`} className="vote-row reject-row">
                        <td className="voter-name-cell">{voter.fullName}</td>
                        <td className="vote-badge-cell">
                          <span className="vote-badge reject-badge">✕ Declined</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!votesData.approveVoters || votesData.approveVoters.length === 0) && 
                 (!votesData.rejectVoters || votesData.rejectVoters.length === 0) && (
                  <div className="no-votes-message">
                    <p>No votes recorded yet for this proposal.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Rescheduling Event */}
      {showRescheduleModal && rescheduleProposal && (
        <div className="modal-overlay" onClick={handleCloseRescheduleModal}>
          <div className="modal-content reschedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reschedule Event: {rescheduleProposal.title}</h2>
              <button className="modal-close-btn" onClick={handleCloseRescheduleModal}>
                ×
              </button>
            </div>
            <div className="modal-body reschedule-modal-body">
              <div className="form-section">
                <h3>Start Date & Time</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={rescheduleForm.startDate}
                      onChange={handleRescheduleFormChange}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      value={rescheduleForm.startTime}
                      onChange={handleRescheduleFormChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Finish Date & Time</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Finish Date</label>
                    <input
                      type="date"
                      name="finishDate"
                      value={rescheduleForm.finishDate}
                      onChange={handleRescheduleFormChange}
                      min={rescheduleForm.startDate || new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>Finish Time</label>
                    <input
                      type="time"
                      name="finishTime"
                      value={rescheduleForm.finishTime}
                      onChange={handleRescheduleFormChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseRescheduleModal}>
                Cancel
              </button>
              <button className="btn-submit" onClick={handleRescheduleSubmit}>
                Reschedule Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProposal;
