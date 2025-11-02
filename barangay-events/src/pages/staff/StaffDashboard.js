import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebaseConfig";
import { supabase } from "../../firebaseConfig";
import { collection, getDocs, query, where, updateDoc, doc, addDoc, serverTimestamp, } from "firebase/firestore";
import Swal from "sweetalert2";
import "./StaffDashboard.css";

const StaffDashboard = () => {
  const [proposals, setProposals] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const proposalsPerPage = 5;
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    declined: 0,
    done: 0
  });
  // Search, filter, and sorting states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("date-desc");
  const [showModal, setShowModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  // Resubmit modal states
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitProposal, setResubmitProposal] = useState(null);
  const [resubmitForm, setResubmitForm] = useState({
    title: "",
    description: "",
    location: "",
    date: "",
    time: "",
    note: "",
    file: null
  });
  const [resubmitErrors, setResubmitErrors] = useState({});
  const [disabledDateTimes, setDisabledDateTimes] = useState([]);

  // Format date function
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
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

  // Handle viewing attachment
  const handleViewAttachment = (fileURL) => {
    window.open(fileURL, "_blank", "noopener,noreferrer");
  };

  // Filter and sort proposals
  const getFilteredAndSortedProposals = () => {
    let filtered = [...proposals];

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (proposal) =>
          proposal.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          proposal.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          proposal.location?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((proposal) => proposal.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          if (a.date && b.date) {
            return new Date(b.date) - new Date(a.date);
          }
          if (a.date) return -1;
          if (b.date) return 1;
          return 0;
        case "date-asc":
          if (a.date && b.date) {
            return new Date(a.date) - new Date(b.date);
          }
          if (a.date) return 1;
          if (b.date) return -1;
          return 0;
        case "title-asc":
          return (a.title || "").localeCompare(b.title || "");
        case "title-desc":
          return (b.title || "").localeCompare(a.title || "");
        case "status-asc":
          return (a.status || "").localeCompare(b.status || "");
        case "status-desc":
          return (b.status || "").localeCompare(a.status || "");
        default:
          return 0;
      }
    });

    return filtered;
  };

  // Calculate stats from proposals
  const calculateStats = (proposals) => {
    const stats = {
      total: proposals.length,
      pending: proposals.filter(p => p.status === "Pending").length,
      approved: proposals.filter(p => p.status === "Approved").length,
      declined: proposals.filter(p => ["Rejected", "Declined (Missed Deadline)"].includes(p.status)).length,
      done: proposals.filter(p => p.status === "Done").length
    };
    setStats(stats);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
        fetchUserProposals(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch disabled date/times for resubmit form
  useEffect(() => {
    const fetchDisabledDateTimes = async () => {
      try {
        const proposalsSnapshot = await getDocs(collection(db, "proposals"));
        const disabled = proposalsSnapshot.docs
          .filter(doc => doc.data().status === "Approved" && doc.data().date && doc.data().time)
          .map(doc => ({ date: doc.data().date, time: doc.data().time }));
        setDisabledDateTimes(disabled);
      } catch (err) {
        setDisabledDateTimes([]);
      }
    };
    fetchDisabledDateTimes();
  }, []);

  // ✅ Auto-Reject Proposals Past Deadline (Even Without Votes)
  const checkForAutoRejection = async () => {
    try {
      const proposalsSnapshot = await getDocs(collection(db, "proposals"));
      const currentDate = new Date();

      const proposalsToReject = proposalsSnapshot.docs.filter((docSnap) => {
        const proposal = docSnap.data();
        const deadline = new Date(proposal.deadline);
        const hasVotes = proposal.votes?.approve.length > 0 || proposal.votes?.reject.length > 0;

        return deadline < currentDate && !hasVotes && proposal.status !== "Declined (Missed Deadline)";
      });

      for (const proposalDoc of proposalsToReject) {
        const proposalRef = doc(db, "proposals", proposalDoc.id);
        await updateDoc(proposalRef, { status: "Declined (Missed Deadline)", notified: false });
        console.log("Updated:", proposalDoc.id);
      }      
    } catch (error) {
      console.error("Error auto-rejecting proposals:", error.message);
    }
  };

  // ✅ Auto-Update Approved Events to "Done" if Past the Event Date
  const updatePastEventsToDone = async () => {
    try {
      const proposalsSnapshot = await getDocs(collection(db, "proposals"));
      const currentDate = new Date();

      const pastApprovedEvents = proposalsSnapshot.docs.filter((docSnap) => {
        const proposal = docSnap.data();
        const eventDate = new Date(proposal.date); // Ensure event date is valid
        return eventDate < currentDate && proposal.status === "Approved";
      });

      for (const eventDoc of pastApprovedEvents) {
        const eventRef = doc(db, "proposals", eventDoc.id);
        await updateDoc(eventRef, { status: "Done" });
      }
    } catch (error) {
      console.error("Error updating past events to Done:", error.message);
    }
  };

  // ✅ Fetch Proposals and Check for Notifications
  const fetchUserProposals = async (uid) => {
    setIsLoading(true);
    try {
      const proposalsSnapshot = await getDocs(
        query(collection(db, "proposals"), where("userId", "==", uid))
      );
      const userProposals = proposalsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setProposals(userProposals);
      calculateStats(userProposals);
      checkForNotifications(userProposals);
    } catch (error) {
      console.error("Error fetching proposals:", error.message);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch proposals. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    let didRun = false;
    const run = async () => {
      if (userId && !didRun) {
        didRun = true;
        await checkForAutoRejection();
        await fetchUserProposals(userId);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ✅ Notify Staff of Approved or Rejected Proposals
  const checkForNotifications = (userProposals) => {
    // Only show notifications for proposals that have not been notified
    const newNotifications = userProposals.filter(
      (proposal) =>
        (proposal.status === "Approved" || proposal.status === "Rejected" || proposal.status === "Declined (Missed Deadline)" || proposal.status === "Rescheduled" || proposal.status === "Cancelled") &&
        proposal.notified !== true
    );
    if (newNotifications.length > 0) {
      // Sort by createdAt or updatedAt (if available), fallback to array order
      const sorted = [...newNotifications].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt) : (a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0));
        const bTime = b.updatedAt ? new Date(b.updatedAt) : (b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0));
        return bTime - aTime;
      });
      // Only show the most recent notification
      showNotification(sorted[0]);
    }
  };
  
  const showNotification = async (proposal) => {
    let icon = "";
    let title = "";
    let text = "";
  
    // Set notification details based on proposal status
    if (proposal.status === "Approved") {
      icon = "success";
      title = "Proposal Approved!";
      text = `Your event proposal "${proposal.title}" has been approved.`;
    } else if (proposal.status === "Rejected") {
      icon = "error";
      title = "Proposal Rejected!";
      text = `Your event proposal "${proposal.title}" has been rejected.`;
    } else if (proposal.status === "Declined (Missed Deadline)") {
      icon = "error";
      title = "Proposal Declined (Missed Deadline)!";
      text = `Your event proposal "${proposal.title}" was declined because the deadline was missed.`;
    } else if (proposal.status === "Rescheduled") {
      icon = "info";
      title = "Event Rescheduled!";
      text = `The event "${proposal.title}" has been rescheduled.`;
    } else if (proposal.status === "Cancelled") {
      icon = "error";
      title = "Event Cancelled!";
      text = `The event "${proposal.title}" has been cancelled.`;
    }
  
    // Show the notification with the appropriate message
    await Swal.fire({
      icon: icon,
      title: title,
      text: text,
    });
  
    // Update the proposal document to mark it as notified
    const proposalRef = doc(db, "proposals", proposal.id);
    await updateDoc(proposalRef, { notified: true });
  };

  

  // ✅ Run Auto-Update Functions on Dashboard Load
  useEffect(() => {
    checkForAutoRejection();
    updatePastEventsToDone();
  }, []);

  // ✅ Handle Viewing Feedback for Rejected and Cancelled Proposals
const handleViewFeedback = (feedbackArray, status) => {
  let feedbackText = "";

  if (status === "Rejected" && (!feedbackArray || feedbackArray.length === 0)) {
    Swal.fire({
      icon: "info",
      title: "No Feedback",
      text: "No rejection feedback available.",
    });
    return;
  }

  if (status === "Cancelled") {
    feedbackText = feedbackArray && feedbackArray.length > 0 
      ? feedbackArray
          .map((entry, index) => `${index + 1}. ${entry.feedback}`)
          .join("<br><br>")
      : "No cancellation feedback available.";

    Swal.fire({
      icon: "error",
      title: "Cancelled Event Feedback",
      html: `<div style="text-align:left">${feedbackText}</div>`,
    });
  } else if (status === "Rejected") {
    feedbackText = feedbackArray
      .map((entry, index) => `${index + 1}. ${entry.feedback}`)
      .join("<br><br>");

    Swal.fire({
      icon: "error",
      title: "Rejected Feedback",
      html: `<div style="text-align:left">${feedbackText}</div>`,
    });
    }
  };

  // Open resubmit modal
  const handleOpenResubmitModal = (proposal) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const minDateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const minDate = minDateObj.toISOString().split("T")[0];

    setResubmitProposal(proposal);
    setResubmitForm({
      title: proposal.title || "",
      description: proposal.description || "",
      location: proposal.location || "",
      date: proposal.date || "",
      time: proposal.time || "",
      note: proposal.note || "",
      file: null
    });
    setResubmitErrors({});
    setShowResubmitModal(true);
  };

  // Close resubmit modal
  const handleCloseResubmitModal = () => {
    setShowResubmitModal(false);
    setResubmitProposal(null);
    setResubmitForm({
      title: "",
      description: "",
      location: "",
      date: "",
      time: "",
      note: "",
      file: null
    });
    setResubmitErrors({});
  };

  // Validate resubmit form
  const validateResubmitForm = () => {
    const errors = {};
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const minDateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const today = minDateObj.toISOString().split("T")[0];

    if (!resubmitForm.title.trim()) {
      errors.title = "Event title is required.";
    } else if (!/^[A-Za-z\s]+$/.test(resubmitForm.title)) {
      errors.title = "Event title must contain letters and spaces only.";
    } else if (resubmitForm.title.length > 40) {
      errors.title = "Event title must be 40 characters or less.";
    }

    if (!resubmitForm.description.trim()) {
      errors.description = "Description is required.";
    } else if (resubmitForm.description.length > 80) {
      errors.description = "Description must be 80 characters or less.";
    }

    if (!resubmitForm.location.trim()) {
      errors.location = "Location is required.";
    } else if (!/^[A-Za-z0-9\s]+$/.test(resubmitForm.location)) {
      errors.location = "Location must contain only letters, numbers, and spaces.";
    } else if (resubmitForm.location.length > 40) {
      errors.location = "Location must be 40 characters or less.";
    }

    if (!resubmitForm.date) {
      errors.date = "Date is required.";
    } else {
      const selectedDate = new Date(resubmitForm.date);
      const todayDate = new Date(today);
      if (selectedDate <= todayDate) {
        errors.date = "Please select a future date.";
      }
    }

    if (!resubmitForm.time) {
      errors.time = "Time is required.";
    } else if (disabledDateTimes.some(dt => dt.date === resubmitForm.date && dt.time === resubmitForm.time)) {
      errors.time = "This date and time is already taken.";
    }

    if (resubmitForm.note.length > 60) {
      errors.note = "Note must be 60 characters or less.";
    }

    setResubmitErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle resubmit form submission
  const handleResubmitSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateResubmitForm()) {
      return;
    }

    try {
      let fileURL = resubmitProposal.fileURL || "";

      // Handle file upload to Supabase if a new file is selected
      if (resubmitForm.file) {
        const file = resubmitForm.file;
        const filePath = `staff/${file.name}`;

        const { data, error } = await supabase.storage
          .from("proposals")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true,
          });

        if (error) {
          throw new Error(`Upload Error: ${error.message}`);
        }

        const { data: publicData } = supabase.storage.from("proposals").getPublicUrl(filePath);
        fileURL = publicData.publicUrl;
      }

      // Create a new proposal in Firestore
      await addDoc(collection(db, "proposals"), {
        userId: resubmitProposal.userId,
        title: resubmitForm.title.trim(),
        description: resubmitForm.description.trim(),
        location: resubmitForm.location.trim(),
        date: resubmitForm.date,
        time: resubmitForm.time,
        note: resubmitForm.note.trim(),
        fileURL,
        status: "Pending",
        notified: false,
        createdAt: serverTimestamp(),
      });

      Swal.fire("Resubmitted!", "Your proposal has been resubmitted as a new entry.", "success");
      handleCloseResubmitModal();
      fetchUserProposals(userId);
    } catch (error) {
      console.error("Error resubmitting proposal:", error.message);
      Swal.fire("Error", "Failed to resubmit the proposal. Try again later.", "error");
    }
  };

  // Handle resubmit form input changes
  const handleResubmitFormChange = (field, value) => {
    if (field === "title") {
      value = value.replace(/[^a-zA-Z\s]/g, "");
      if (value.length > 40) value = value.slice(0, 40);
    } else if (field === "location") {
      value = value.replace(/[^a-zA-Z0-9\s]/g, "");
      if (value.length > 40) value = value.slice(0, 40);
    } else if (field === "description" && value.length > 80) {
      return;
    } else if (field === "note" && value.length > 60) {
      return;
    }
    setResubmitForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (resubmitErrors[field]) {
      setResubmitErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };      

  return (
    <div className="staff-dashboard">

      
      <div className="quick-stats">
        <div className="stat-card">
          <h3>Approved</h3>
          <div className="stat-value">{stats.approved}</div>
        </div>
        <div className="stat-card">
          <h3>Pending Review</h3>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card">
          <h3>Total Proposals</h3>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <h3>Declined</h3>
          <div className="stat-value">{stats.declined}</div>
        </div>
      </div>

      <div className="table-wrapper">
        <h2>My Proposals</h2>
        
        {/* Search, Filter, and Sort Controls */}
        <div className="table-controls">
          <div className="control-group">
            <input
              type="text"
              placeholder="Search proposals..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="control-group">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Declined (Missed Deadline)">Declined (Missed Deadline)</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rescheduled">Rescheduled</option>
              <option value="Done">Done</option>
            </select>
          </div>
          <div className="control-group">
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="date-desc">Date (Newest First)</option>
              <option value="date-asc">Date (Oldest First)</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
              <option value="status-asc">Status (A-Z)</option>
              <option value="status-desc">Status (Z-A)</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <table className="proposals-table">
              <thead>
                <tr>
                  <th>Event Title</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredProposals = getFilteredAndSortedProposals();
                  const paginatedProposals = filteredProposals.slice(
                    (currentPage - 1) * proposalsPerPage,
                    currentPage * proposalsPerPage
                  );

                  if (paginatedProposals.length === 0) {
                    return (
                      <tr>
                        <td colSpan="5">
                          <div className="no-data-message">
                            <i className="fas fa-file-alt"></i>
                            <p>
                              {searchQuery || statusFilter !== "All"
                                ? "No proposals match your search criteria"
                                : "No proposals submitted yet"}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return paginatedProposals.map((proposal) => (
                    <tr key={proposal.id}>
                      <td>{proposal.title}</td>
                      <td>{formatDate(proposal.date)}</td>
                      <td>{formatTime(proposal.time)}</td>
                      <td>
                        <span className={`status-badge status-${proposal.status.toLowerCase().replace(/\s/g, '-')}`}>
                          {proposal.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view-details-btn"
                            onClick={() => handleViewDetails(proposal)}
                          >
                            View Details
                          </button>
                          {(proposal.status === "Rejected" || 
                            proposal.status === "Cancelled" || 
                            proposal.status === "Declined (Missed Deadline)") && (
                            <>
                              <button
                                className="action-btn view-feedback-btn"
                                onClick={() => handleViewFeedback(proposal.feedback, proposal.status)}
                              >
                                View Feedback
                              </button>
                              <button
                                className="action-btn resubmit-btn"
                                onClick={() => handleOpenResubmitModal(proposal)}
                              >
                                Resubmit
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {(() => {
              const filteredProposals = getFilteredAndSortedProposals();
              const totalPages = Math.ceil(filteredProposals.length / proposalsPerPage);
              
              if (totalPages > 1) {
                return (
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
                );
              }
              return null;
            })()}
          </>
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
                <span>{selectedProposal.location || "-"}</span>
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
              <div className="modal-detail-row full-width">
                <strong>Status:</strong>
                <span>{selectedProposal.status || "Pending"}</span>
              </div>
            </div>
            <div className="modal-footer">
              <div style={{ textAlign: 'center', width: '100%', color: '#64748b', fontSize: '14px' }}>
                This proposal has been {selectedProposal.status || "Pending"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resubmit Modal */}
      {showResubmitModal && resubmitProposal && (
        <div className="modal-overlay" onClick={handleCloseResubmitModal}>
          <div className="modal-content resubmit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Proposal Before Resubmitting</h2>
              <button className="modal-close-btn" onClick={handleCloseResubmitModal}>
                ×
              </button>
            </div>
            <form onSubmit={handleResubmitSubmit} className="modal-body resubmit-modal-body">
              <div className="resubmit-form-row">
                <div className="resubmit-form-group">
                  <label className="resubmit-form-label">Event Title</label>
                  <input
                    type="text"
                    className="resubmit-form-input"
                    value={resubmitForm.title}
                    onChange={(e) => handleResubmitFormChange("title", e.target.value)}
                    maxLength={40}
                    required
                  />
                  {resubmitErrors.title && <span className="resubmit-error">{resubmitErrors.title}</span>}
                </div>
                <div className="resubmit-form-group">
                  <label className="resubmit-form-label">Location</label>
                  <input
                    type="text"
                    className="resubmit-form-input"
                    value={resubmitForm.location}
                    onChange={(e) => handleResubmitFormChange("location", e.target.value)}
                    maxLength={40}
                    required
                  />
                  {resubmitErrors.location && <span className="resubmit-error">{resubmitErrors.location}</span>}
                </div>
              </div>
              <div className="resubmit-form-row">
                <div className="resubmit-form-group">
                  <label className="resubmit-form-label">Date</label>
                  <input
                    type="date"
                    className="resubmit-form-input"
                    value={resubmitForm.date}
                    onChange={(e) => {
                      handleResubmitFormChange("date", e.target.value);
                      if (resubmitErrors.date) {
                        setResubmitErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.date;
                          return newErrors;
                        });
                      }
                    }}
                    min={(() => {
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const minDateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                      return minDateObj.toISOString().split("T")[0];
                    })()}
                    required
                  />
                  {resubmitErrors.date && <span className="resubmit-error">{resubmitErrors.date}</span>}
                </div>
                <div className="resubmit-form-group">
                  <label className="resubmit-form-label">Time</label>
                  <input
                    type="time"
                    className="resubmit-form-input"
                    value={resubmitForm.time}
                    onChange={(e) => {
                      handleResubmitFormChange("time", e.target.value);
                      if (resubmitErrors.time) {
                        setResubmitErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors.time;
                          return newErrors;
                        });
                      }
                    }}
                    step="1800"
                    disabled={!resubmitForm.date}
                    required
                  />
                  {resubmitForm.date && resubmitForm.time && disabledDateTimes.some(dt => dt.date === resubmitForm.date && dt.time === resubmitForm.time) && (
                    <span className="resubmit-error" style={{color: '#e53935', fontSize: '12px', marginTop: '4px', display: 'block'}}>This date and time is already taken.</span>
                  )}
                  {resubmitErrors.time && <span className="resubmit-error">{resubmitErrors.time}</span>}
                </div>
              </div>
              <div className="resubmit-form-group full-width">
                <label className="resubmit-form-label">Description</label>
                <textarea
                  className="resubmit-form-textarea"
                  value={resubmitForm.description}
                  onChange={(e) => handleResubmitFormChange("description", e.target.value)}
                  maxLength={80}
                  required
                />
                <div className="resubmit-char-count">{resubmitForm.description.length}/80 characters</div>
                {resubmitErrors.description && <span className="resubmit-error">{resubmitErrors.description}</span>}
              </div>
              <div className="resubmit-form-group full-width">
                <label className="resubmit-form-label">Note (Optional)</label>
                <textarea
                  className="resubmit-form-textarea"
                  value={resubmitForm.note}
                  onChange={(e) => handleResubmitFormChange("note", e.target.value)}
                  maxLength={60}
                />
                <div className="resubmit-char-count">{resubmitForm.note.length}/60 characters</div>
                {resubmitErrors.note && <span className="resubmit-error">{resubmitErrors.note}</span>}
              </div>
              <div className="resubmit-form-group full-width">
                <label className="resubmit-form-label">Attachment (Optional)</label>
                <input
                  type="file"
                  className="resubmit-form-file"
                  onChange={(e) => setResubmitForm(prev => ({ ...prev, file: e.target.files[0] || null }))}
                />
                {resubmitForm.file && (
                  <div className="resubmit-file-info">
                    Selected: {resubmitForm.file.name}
                    <button 
                      type="button" 
                      className="resubmit-file-remove"
                      onClick={() => setResubmitForm(prev => ({ ...prev, file: null }))}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <div className="modal-footer resubmit-modal-footer">
                <button type="button" className="resubmit-cancel-btn" onClick={handleCloseResubmitModal}>
                  Cancel
                </button>
                <button type="submit" className="resubmit-submit-btn">
                  Resubmit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
