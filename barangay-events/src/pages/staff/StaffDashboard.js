import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebaseConfig";
import { supabase } from "../../firebaseConfig";
import { collection, getDocs, query, where, updateDoc, doc, addDoc, serverTimestamp, } from "firebase/firestore";
import Swal from "sweetalert2";
import "./StaffDashboard.css";

const StaffDashboard = () => {
  const [proposals, setProposals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    declined: 0
  });

  // Format date function
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Calculate stats from proposals
  const calculateStats = (proposals) => {
    const stats = {
      total: proposals.length,
      pending: proposals.filter(p => p.status === "Pending").length,
      approved: proposals.filter(p => p.status === "Approved").length,
      declined: proposals.filter(p => ["Rejected", "Declined (Missed Deadline)"].includes(p.status)).length
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

  const handleResubmitProposal = async (proposal) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Proposal Before Resubmitting",
      html: `
        <div style="text-align:center; font-size: 13px; padding: 5px 10px;">
          <label for="swal-title" style="font-weight: bold; font-size: 13px; margin-bottom:2px; display:block; text-align:center;">Event Title</label>
          <input id="swal-title" class="swal2-input" style="width: 96%; font-size: 13px; padding: 7px; margin-bottom:8px; text-align:center;" maxlength="40" value="${proposal.title}">
          <label for="swal-description" style="font-weight: bold; font-size: 13px; margin-bottom:2px; display:block; text-align:center;">Description</label>
          <textarea id="swal-description" class="swal2-textarea" style="width: 96%; font-size: 13px; height: 50px; padding: 7px; margin-bottom:8px; text-align:center;" maxlength="80">${proposal.description}</textarea>
          <label for="swal-location" style="font-weight: bold; font-size: 13px; margin-bottom:2px; display:block; text-align:center;">Location</label>
          <input id="swal-location" class="swal2-input" style="width: 96%; font-size: 13px; padding: 7px; margin-bottom:8px; text-align:center;" maxlength="40" value=${proposal.location ? `"${proposal.location}"` : ""}>
          <label for="swal-date" style="font-weight: bold; font-size: 13px; margin-bottom:2px; display:block; text-align:center;">Date</label>
          <input id="swal-date" class="swal2-input" type="date" style="width: 96%; font-size: 13px; padding: 7px; margin-bottom:8px; text-align:center;" min="2025-06-27" value="${proposal.date}">
          <label for="swal-note" style="font-weight: bold; font-size: 13px; margin-bottom:2px; display:block; text-align:center;">Note</label>
          <textarea id="swal-note" class="swal2-textarea" style="width: 96%; font-size: 13px; height: 50px; padding: 7px; margin-bottom:8px; text-align:center;" maxlength="60">${proposal.note || ""}</textarea>
          <label for="swal-attachment" style="font-weight: bold; font-size: 13px; margin-bottom:2px; display:block; text-align:center;">Attachment</label>
          <input id="swal-attachment" class="swal2-file" type="file" style="font-size: 13px; padding: 3px; display:block; margin:0 auto; text-align:center;">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Resubmit",
      customClass: {
        popup: 'swal2-modern',
        confirmButton: 'swal2-modern-btn',
        cancelButton: 'swal2-modern-btn-cancel'
      },
      preConfirm: () => {
        const title = document.getElementById("swal-title").value.trim();
        const description = document.getElementById("swal-description").value.trim();
        const location = document.getElementById("swal-location").value.trim();
        const date = document.getElementById("swal-date").value;
        const note = document.getElementById("swal-note").value.trim();
        const attachment = document.getElementById("swal-attachment").files[0];
        // Validation
        if (!title) {
          Swal.showValidationMessage("Event title is required.");
          return false;
        }
        if (!/^[A-Za-z\s]+$/.test(title)) {
          Swal.showValidationMessage("Event title must contain letters and spaces only.");
          return false;
        }
        if (title.length > 40) {
          Swal.showValidationMessage("Event title must be 40 characters or less.");
          return false;
        }
        if (!description) {
          Swal.showValidationMessage("Description is required.");
          return false;
        }
        if (description.length > 80) {
          Swal.showValidationMessage("Description must be 80 characters or less.");
          return false;
        }
        if (!location) {
          Swal.showValidationMessage("Location is required.");
          return false;
        }
        if (!/^[A-Za-z0-9\s]+$/.test(location)) {
          Swal.showValidationMessage("Location must contain only letters, numbers, and spaces.");
          return false;
        }
        if (location.length > 40) {
          Swal.showValidationMessage("Location must be 40 characters or less.");
          return false;
        }
        if (!date) {
          Swal.showValidationMessage("Date is required.");
          return false;
        }
        const today = new Date("2025-06-26");
        const selectedDate = new Date(date);
        if (selectedDate <= today) {
          Swal.showValidationMessage("Please select a future date.");
          return false;
        }
        if (note.length > 60) {
          Swal.showValidationMessage("Note must be 60 characters or less.");
          return false;
        }
        return {
          title,
          description,
          location,
          date,
          note,
          attachment,
        };
      },
    });
  
    if (!formValues) return;
  
    try {
      let fileURL = ""; // Store new file URL if uploaded
  
      // ✅ Handle file upload to Supabase
      if (formValues.attachment) {
        const file = formValues.attachment;
        const filePath = `staff/${file.name}`;
  
        // Upload file to Supabase
        const { data, error } = await supabase.storage
          .from("proposals") // Bucket name
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: true, // Allow overwriting
          });
  
        if (error) {
          throw new Error(`Upload Error: ${error.message}`);
        }
  
        // Get public URL of uploaded file
        const { data: publicData } = supabase.storage.from("proposals").getPublicUrl(filePath);
        fileURL = publicData.publicUrl;
      }
  
      // ✅ Create a new proposal in Firestore
      const proposalsRef = collection(db, "proposals"); // Reference to proposals collection
      await addDoc(proposalsRef, {
        userId: proposal.userId, // Keep the same owner
        title: formValues.title,
        description: formValues.description,
        location: formValues.location,
        date: formValues.date,
        note: formValues.note,
        fileURL, // Store file URL
        status: "Pending", // Mark as new submission
        notified: false,
        createdAt: serverTimestamp(), // Track submission time
      });
  
      Swal.fire("Resubmitted!", "Your proposal has been resubmitted as a new entry.", "success");
      fetchUserProposals(userId);
    } catch (error) {
      console.error("Error resubmitting proposal:", error.message);
      Swal.fire("Error", "Failed to resubmit the proposal. Try again later.", "error");
    }
  };      

  return (
    <div className="staff-dashboard">
      <h1>Dashboard</h1>
      
      <div className="quick-stats">
        <div className="stat-card">
          <h3>Total Proposals</h3>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <h3>Pending Review</h3>
          <div className="stat-value">{stats.pending}</div>
        </div>
        <div className="stat-card">
          <h3>Approved</h3>
          <div className="stat-value">{stats.approved}</div>
        </div>
        <div className="stat-card">
          <h3>Declined</h3>
          <div className="stat-value">{stats.declined}</div>
        </div>
      </div>

      <div className="table-wrapper">
        <h2>My Proposals</h2>
        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
        ) : (
          <table className="proposals-table">
            <thead>
              <tr>
                <th>Event Title</th>
                <th>Description</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length > 0 ? (
                proposals.map((proposal) => (
                  <tr key={proposal.id}>
                    <td>{proposal.title}</td>
                    <td>
                      <div className="description-cell" title={proposal.description}>
                        {proposal.description}
                      </div>
                    </td>
                    <td>{formatDate(proposal.date)}</td>
                    <td>
                      <span className={`status-badge status-${proposal.status.toLowerCase().replace(/\s/g, '-')}`}>
                        {proposal.status}
                      </span>
                    </td>
                    <td>
                      {(proposal.status === "Rejected" || 
                        proposal.status === "Cancelled" || 
                        proposal.status === "Declined (Missed Deadline)") && (
                        <div className="action-buttons">
                          <button
                            className="action-btn view-feedback-btn"
                            onClick={() => handleViewFeedback(proposal.feedback, proposal.status)}
                          >
                            View Feedback
                          </button>
                          <button
                            className="action-btn resubmit-btn"
                            onClick={() => handleResubmitProposal(proposal)}
                          >
                            Resubmit
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5">
                    <div className="no-data-message">
                      <i className="fas fa-file-alt"></i>
                      <p>No proposals submitted yet</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;
