import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebaseConfig";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import Swal from "sweetalert2";
import emailjs from 'emailjs-com';
import "./ReviewProposal.css";

const ReviewProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [officialsCount, setOfficialsCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [votedPage, setVotedPage] = useState(1);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Search, filter, and sort states for pending proposals
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingSortBy, setPendingSortBy] = useState("date"); // date, title, location, submitter
  const [pendingSortOrder, setPendingSortOrder] = useState("asc"); // asc, desc
  
  // Search, filter, and sort states for voted proposals
  const [votedSearch, setVotedSearch] = useState("");
  const [votedStatusFilter, setVotedStatusFilter] = useState("all"); // all, approved, rejected, declined
  const [votedSortBy, setVotedSortBy] = useState("date"); // date, title, status, votes
  const [votedSortOrder, setVotedSortOrder] = useState("desc"); // asc, desc
  
  const proposalsPerPage = 5;

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const proposalsSnapshot = await getDocs(collection(db, "proposals"));
        const usersSnapshot = await getDocs(collection(db, "users"));

        const fetchedProposals = [];
        let officialCount = 0;

        for (const userDoc of usersSnapshot.docs) {
          if (userDoc.data().role?.toLowerCase() === "official") {
            officialCount++;
          }
        }

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

          fetchedProposals.push({
            ...proposalData,
            id: docSnap.id,
            submitterName: fullName,
            votes: proposalData.votes || { approve: [], reject: [] },
          });
        }

        setProposals(fetchedProposals);
        setOfficialsCount(officialCount);
      } catch (error) {
        console.error("Error fetching proposals:", error.message);
      }
    };

    fetchProposals();
  }, []);

  const handleVote = async (proposalId, voteType) => {
    if (!userId) {
      Swal.fire({
        icon: "error",
        title: "Not Logged In",
        text: "You must be logged in as an official to vote.",
      });
      return;
    }
  
    try {
      const proposalRef = doc(db, "proposals", proposalId);
      const proposalSnap = await getDoc(proposalRef);
  
      if (!proposalSnap.exists()) {
        console.error("Proposal does not exist.");
        return;
      }
  
      const proposalData = proposalSnap.data();
      let votes = proposalData.votes || { approve: [], reject: [] };
  
      // Check if user has already voted
      if (votes.approve.includes(userId) || votes.reject.includes(userId)) {
        const { isConfirmed } = await Swal.fire({
          title: "Change Vote?",
          text: "You have already voted. Do you want to change your vote?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, Change Vote",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#28a745",
          cancelButtonColor: "#d33",
        });
  
        if (!isConfirmed) return;
  
        // Remove previous vote
        votes.approve = votes.approve.filter((id) => id !== userId);
        votes.reject = votes.reject.filter((id) => id !== userId);
      }
  
      // Confirm approval
      if (voteType === "approve") {
        const { isConfirmed } = await Swal.fire({
          title: "Confirm Approval",
          text: "Are you sure you want to approve this proposal?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, Approve",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#28a745",
          cancelButtonColor: "#d33",
        });
  
        if (!isConfirmed) return;
      }
  
      // Handle rejection feedback
      let rejectionFeedback = proposalData.rejectionFeedback || [];
      if (voteType === "reject") {
        const { value: feedback } = await Swal.fire({
          title: "Reject Proposal",
          input: "textarea",
          inputPlaceholder: "Enter feedback for rejection...",
          showCancelButton: true,
          confirmButtonText: "Reject",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#d33",
          preConfirm: (feedback) => {
            if (!feedback.trim()) {
              Swal.showValidationMessage("Feedback is required to reject the proposal.");
            }
            return feedback;
          },
        });
  
        if (!feedback) return;
        rejectionFeedback.push({ officialId: userId, feedback });
      }
  
      // Add new vote
      votes[voteType].push(userId);
  
      // **80% Approval Calculation**
      if (!officialsCount || officialsCount <= 0) {
        console.error("Officials count is missing or invalid.");
        return;
      }
  
      const approvalThreshold = Math.ceil(officialsCount * 0.8);
      let newStatus = "Pending";
  
      if (votes.approve.length >= approvalThreshold) {
        newStatus = "Approved";
  
        // ✅ Add Firestore Notification
        await addDoc(collection(db, "notifications"), {
          message: `Proposal "${proposalData.title}" has been approved.`,
          timestamp: serverTimestamp(),
          type: "Approved",
        });

              // Send email notification when approved
        if (proposalData.userId) {
          const userRef = doc(db, "users", proposalData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const email = userSnap.data().email;
            sendApprovalEmail(
              email,
              proposalData.title,
              proposalData.location,
              proposalData.date ? new Date(proposalData.date).toLocaleDateString() : "N/A",
              proposalData.description
            );
              // Send email
          }
        }
        
        Swal.fire({
          icon: "success",
          title: "Proposal Approved!",
          text: "This proposal has been officially approved.",
          confirmButtonColor: "#28a745",
        });
      } else if (votes.reject.length >= officialsCount) {
        newStatus = "Rejected";
  
        // ❌ Add Firestore Notification
        await addDoc(collection(db, "notifications"), {
          message: `Proposal "${proposalData.title}" has been rejected.`,
          timestamp: serverTimestamp(),
          type: "Rejected",
        });
      }
  
      // ✅ Use `setDoc()` instead of `updateDoc()`
      await setDoc(proposalRef, {
        votes,
        status: newStatus,
        rejectionFeedback,
      }, { merge: true });
  
      Swal.fire({
        icon: voteType === "approve" ? "success" : "error",
        title: voteType === "approve" ? "Vote Submitted" : "Rejected",
        text: voteType === "approve"
          ? "You have voted to approve this proposal."
          : "Proposal rejected with feedback.",
      });
  
      setProposals((prev) =>
        prev.map((p) =>
          p.id === proposalId ? { ...p, votes, status: newStatus, rejectionFeedback } : p
        )
      );

      // Close modal if open
      if (showModal && selectedProposal?.id === proposalId) {
        handleCloseModal();
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "There was an issue submitting your vote. Please try again.",
      });
    }
  };

      // This function sends an approval email to the user
      const sendApprovalEmail = (userEmail, title, location, date, description) => {
        const templateParams = {
          to_email: userEmail,
          title: title,
          location: location,
          date: date,
          description: description,
        };
      
        emailjs.send(
          'service_h7jndq1',
          'template_0ost73n',
          templateParams,
          'egepsG0sxQl7xodfy'
        )
        .then(response => {
          console.log('Email sent successfully:', response);
        })
        .catch(error => {
          console.error('Error sending email:', error);
        });
      };      
  
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
        }
      }
    } catch (error) {
      console.error("Error checking deadlines:", error.message);
    }
  };

  useEffect(() => {
    checkProposalDeadlines(); // Run immediately when the component mounts
  
    const interval = setInterval(() => {
      checkProposalDeadlines(); // Run every hour
    }, 60 * 60 * 1000);
  
    return () => clearInterval(interval); // Cleanup interval when component unmounts
  }, []);

  const handleViewAttachment = (fileURL) => {
    if (!fileURL) {
      Swal.fire({
        icon: "info",
        title: "No Attachment",
        text: "This proposal has no attached file.",
      });
      return;
    }
  
    const isImage = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(fileURL);
    if (isImage) {
      Swal.fire({
        imageUrl: fileURL,
        imageAlt: "Attachment Preview",
        showCloseButton: true,
        showConfirmButton: false, // ✅ Removed "OK" button
        width: "auto", // ✅ Ensures it fits within the viewport
        heightAuto: true, // ✅ Adjust height automatically
        customClass: {
          popup: "attachment-popup", // ✅ Apply custom styling
        },
      });
    } else {
      window.open(fileURL, "_blank");
    }
  };  

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
    // Convert "HH:MM" to "HH:MM AM/PM" format
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

  // Search function
  const searchProposals = (proposalsList, searchQuery) => {
    if (!searchQuery.trim()) return proposalsList;
    
    const query = searchQuery.toLowerCase();
    return proposalsList.filter((proposal) => {
      const title = (proposal.title || "").toLowerCase();
      const location = (proposal.location || "").toLowerCase();
      const submitter = (proposal.submitterName || "").toLowerCase();
      const description = (proposal.description || "").toLowerCase();
      
      return title.includes(query) || 
             location.includes(query) || 
             submitter.includes(query) ||
             description.includes(query);
    });
  };

  // Sort function
  const sortProposals = (proposalsList, sortBy, sortOrder) => {
    const sorted = [...proposalsList].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "title":
          aValue = (a.title || "").toLowerCase();
          bValue = (b.title || "").toLowerCase();
          break;
        case "location":
          aValue = (a.location || "").toLowerCase();
          bValue = (b.location || "").toLowerCase();
          break;
        case "submitter":
          aValue = (a.submitterName || "").toLowerCase();
          bValue = (b.submitterName || "").toLowerCase();
          break;
        case "date":
          aValue = new Date(a.date || 0).getTime();
          bValue = new Date(b.date || 0).getTime();
          break;
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        case "votes":
          const aVotes = (a.votes?.approve?.length || 0) - (a.votes?.reject?.length || 0);
          const bVotes = (b.votes?.approve?.length || 0) - (b.votes?.reject?.length || 0);
          aValue = aVotes;
          bValue = bVotes;
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
    });
    
    return sorted;
  };

  // Filter and process pending proposals
  const filteredPendingProposals = searchProposals(
    proposals.filter((p) => p.status === "Pending" || !p.status),
    pendingSearch
  );
  const sortedPendingProposals = sortProposals(
    filteredPendingProposals,
    pendingSortBy,
    pendingSortOrder
  );

  // Filter and process voted proposals
  const baseVotedProposals = proposals.filter((p) => p.status && p.status !== "Pending");
  const statusFilteredVoted = votedStatusFilter === "all" 
    ? baseVotedProposals 
    : baseVotedProposals.filter((p) => {
        const status = (p.status || "").toLowerCase();
        if (votedStatusFilter === "declined") {
          return status.includes("declined") || status.includes("missed deadline");
        }
        return status === votedStatusFilter.toLowerCase();
      });
  const searchedVotedProposals = searchProposals(statusFilteredVoted, votedSearch);
  const sortedVotedProposals = sortProposals(searchedVotedProposals, votedSortBy, votedSortOrder);

  // Pagination logic
  const pendingTotalPages = Math.ceil(sortedPendingProposals.length / proposalsPerPage);
  const votedTotalPages = Math.ceil(sortedVotedProposals.length / proposalsPerPage);

  // Reset pages when filters change
  useEffect(() => {
    setPendingPage(1);
  }, [pendingSearch, pendingSortBy, pendingSortOrder]);

  useEffect(() => {
    setVotedPage(1);
  }, [votedSearch, votedStatusFilter, votedSortBy, votedSortOrder]);

  const currentPending = sortedPendingProposals.slice(
    (pendingPage - 1) * proposalsPerPage,
    pendingPage * proposalsPerPage
  );
  const currentVoted = sortedVotedProposals.slice(
    (votedPage - 1) * proposalsPerPage,
    votedPage * proposalsPerPage
  );

  return (
    <div className="review-container" style={{ marginTop: 56 }}>

      <div className="table-wrapper">
        <h3>Pending Proposals</h3>
        
        {/* Search, Filter, and Sort Controls for Pending Proposals */}
        <div className="table-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by title, location, submitter, or description..."
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-sort-group">
            <select
              value={pendingSortBy}
              onChange={(e) => setPendingSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="location">Sort by Location</option>
              <option value="submitter">Sort by Submitter</option>
            </select>
            <button
              onClick={() => setPendingSortOrder(pendingSortOrder === "asc" ? "desc" : "asc")}
              className="sort-order-btn"
              title={pendingSortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {pendingSortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
        
        <div className="results-count">
          Showing {currentPending.length} of {sortedPendingProposals.length} proposal{sortedPendingProposals.length !== 1 ? 's' : ''}
        </div>
        
        <table className="proposals-table">
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Location</th>
              <th>Date</th>
              <th>Time</th>
              <th>Submitted By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPending.map((proposal) => {
              return (
                <tr key={proposal.id}>
                  <td>{proposal.title}</td>
                  <td>{proposal.location}</td>
                  <td>{formatDate(proposal.date)}</td>
                  <td>{formatTime(proposal.time)}</td>
                  <td>{proposal.submitterName}</td>
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
            })}
          </tbody>
        </table>
        {/* Pagination for Pending Proposals */}
        {pendingTotalPages > 1 && (
          <div className="review-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <button
              onClick={() => setPendingPage((prev) => Math.max(prev - 1, 1))}
              disabled={pendingPage === 1}
              style={{ minWidth: 90, maxWidth: 120, padding: '7px 0', borderRadius: 6, background: '#e0e7ef', color: '#222', border: 'none', fontWeight: 600, cursor: pendingPage === 1 ? 'not-allowed' : 'pointer', opacity: pendingPage === 1 ? 0.6 : 1 }}
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', fontWeight: 500 }}>
              Page {pendingPage} of {pendingTotalPages}
            </span>
            <button
              onClick={() => setPendingPage((prev) => Math.min(prev + 1, pendingTotalPages))}
              disabled={pendingPage === pendingTotalPages || pendingTotalPages === 0}
              style={{ minWidth: 90, maxWidth: 120, padding: '7px 0', borderRadius: 6, background: '#e0e7ef', color: '#222', border: 'none', fontWeight: 600, cursor: (pendingPage === pendingTotalPages || pendingTotalPages === 0) ? 'not-allowed' : 'pointer', opacity: (pendingPage === pendingTotalPages || pendingTotalPages === 0) ? 0.6 : 1 }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      <div className="table-wrapper">
        <h3>Voted Proposals</h3>
        
        {/* Search, Filter, and Sort Controls for Voted Proposals */}
        <div className="table-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by title, location, submitter, or description..."
              value={votedSearch}
              onChange={(e) => setVotedSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="filter-sort-group">
            <select
              value={votedStatusFilter}
              onChange={(e) => setVotedStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="declined">Declined</option>
            </select>
            <select
              value={votedSortBy}
              onChange={(e) => setVotedSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="date">Sort by Date</option>
              <option value="title">Sort by Title</option>
              <option value="status">Sort by Status</option>
              <option value="votes">Sort by Votes</option>
            </select>
            <button
              onClick={() => setVotedSortOrder(votedSortOrder === "asc" ? "desc" : "asc")}
              className="sort-order-btn"
              title={votedSortOrder === "asc" ? "Ascending" : "Descending"}
            >
              {votedSortOrder === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>
        
        <div className="results-count">
          Showing {currentVoted.length} of {sortedVotedProposals.length} proposal{sortedVotedProposals.length !== 1 ? 's' : ''}
        </div>
        
        <table className="proposals-table">
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Votes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentVoted.map((proposal) => {
              const statusClass =
                proposal.status &&
                ["cancelled", "declined (missed deadline)", "declined-missed-deadline", "deadline"].includes(
                  proposal.status.toLowerCase().replace(/ /g, "-")
                )
                  ? "status-cancelled"
                  : `status-${(proposal.status || "pending").toLowerCase().replace(/ /g, "-")}`;
              return (
                <tr key={proposal.id}>
                  <td>{proposal.title}</td>
                  <td>
                    ✅ {proposal.votes?.approve?.length ?? 0} / ❌ {proposal.votes?.reject?.length ?? 0}
                  </td>
                  <td>
                    <span className={`status-badge ${statusClass}`}>
                      {proposal.status || "Pending"}
                    </span>
                  </td>
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
            })}
          </tbody>
        </table>
        {/* Pagination for Voted Proposals */}
        {votedTotalPages > 1 && (
          <div className="review-pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 18 }}>
            <button
              onClick={() => setVotedPage((prev) => Math.max(prev - 1, 1))}
              disabled={votedPage === 1}
              style={{ minWidth: 90, maxWidth: 120, padding: '7px 0', borderRadius: 6, background: '#e0e7ef', color: '#222', border: 'none', fontWeight: 600, cursor: votedPage === 1 ? 'not-allowed' : 'pointer', opacity: votedPage === 1 ? 0.6 : 1 }}
            >
              Previous
            </button>
            <span style={{ alignSelf: 'center', fontWeight: 500 }}>
              Page {votedPage} of {votedTotalPages}
            </span>
            <button
              onClick={() => setVotedPage((prev) => Math.min(prev + 1, votedTotalPages))}
              disabled={votedPage === votedTotalPages || votedTotalPages === 0}
              style={{ minWidth: 90, maxWidth: 120, padding: '7px 0', borderRadius: 6, background: '#e0e7ef', color: '#222', border: 'none', fontWeight: 600, cursor: (votedPage === votedTotalPages || votedTotalPages === 0) ? 'not-allowed' : 'pointer', opacity: (votedPage === votedTotalPages || votedTotalPages === 0) ? 0.6 : 1 }}
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
                <span>{selectedProposal.submitterName}</span>
              </div>
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
            </div>
            <div className="modal-footer">
              {(selectedProposal.status === "Pending" || !selectedProposal.status) && (
                <>
                  <button
                    onClick={() => handleVote(selectedProposal.id, "approve")}
                    className="action-btn approve-btn"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleVote(selectedProposal.id, "reject")}
                    className="action-btn reject-btn"
                  >
                    Decline
                  </button>
                </>
              )}
              {selectedProposal.status && selectedProposal.status !== "Pending" && (
                <div style={{ textAlign: 'center', width: '100%', color: '#64748b', fontSize: '14px' }}>
                  This proposal has been {selectedProposal.status}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewProposals;
