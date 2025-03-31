import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebaseConfig";
import { supabase } from "../../firebaseConfig";
import { collection, getDocs, query, where, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import Swal from "sweetalert2";
import "./StaffDashboard.css";

const StaffDashboard = () => {
  const [proposals, setProposals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);

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

        return deadline < currentDate && !hasVotes && proposal.status !== "Rejected";
      });

      for (const proposalDoc of proposalsToReject) {
        const proposalRef = doc(db, "proposals", proposalDoc.id);
        await updateDoc(proposalRef, { status: "Rejected", notified: false });
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
    try {
      const proposalsSnapshot = await getDocs(
        query(collection(db, "proposals"), where("userId", "==", uid))
      );
      const userProposals = proposalsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setProposals(userProposals);
      checkForNotifications(userProposals);
    } catch (error) {
      console.error("Error fetching proposals:", error.message);
    }
  };

  // ✅ Notify Staff of Approved or Rejected Proposals
  const checkForNotifications = (userProposals) => {
    const newNotifications = userProposals.filter(
      (proposal) =>
        (proposal.status === "Approved" || proposal.status === "Rejected") &&
        proposal.notified !== true
    );

    if (newNotifications.length > 0) {
      setNotifications(newNotifications);
      newNotifications.forEach((proposal) => showNotification(proposal));
    }
  };

  const showNotification = async (proposal) => {
    await Swal.fire({
      icon: proposal.status === "Approved" ? "success" : "error",
      title: `Proposal ${proposal.status}!`,
      text: `Your event proposal "${proposal.title}" has been ${proposal.status.toLowerCase()}.`,
    });

    const proposalRef = doc(db, "proposals", proposal.id);
    await updateDoc(proposalRef, { notified: true });
  };

  // ✅ Run Auto-Update Functions on Dashboard Load
  useEffect(() => {
    checkForAutoRejection();
    updatePastEventsToDone();
  }, []);

  // ✅ Handle Viewing Feedback for Rejected Proposals
  const handleViewFeedback = (feedbackArray) => {
    if (!feedbackArray || feedbackArray.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Feedback",
        text: "No rejection feedback available.",
      });
      return;
    }

    const feedbackText = feedbackArray
      .map((entry, index) => `${index + 1}. ${entry.feedback}`)
      .join("<br><br>");

    Swal.fire({
      icon: "error",
      title: "Rejected Feedback",
      html: `<div style="text-align:left">${feedbackText}</div>`,
    });
  };

  const handleResubmitProposal = async (proposal) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Proposal Before Resubmitting",
      html: `
        <div style="text-align:left; font-size: 12px; padding: 5px 10px;">
          <label for="swal-title" style="font-weight: bold; font-size: 12px;">Event Title</label>
          <input id="swal-title" class="swal2-input" style="width: 90%; font-size: 12px; padding: 5px;" value="${proposal.title}">
          
          <label for="swal-description" style="font-weight: bold; font-size: 12px;">Description</label>
          <textarea id="swal-description" class="swal2-textarea" style="width: 90%; font-size: 12px; height: 50px; padding: 5px;">${proposal.description}</textarea>
          
          <label for="swal-location" style="font-weight: bold; font-size: 12px;">Location</label>
          <input id="swal-location" class="swal2-input" style="width: 90%; font-size: 12px; padding: 5px;" value="${proposal.location || ""}">
          
          <label for="swal-date" style="font-weight: bold; font-size: 12px;">Date</label>
          <input id="swal-date" class="swal2-input" type="date" style="width: 90%; font-size: 12px; padding: 5px;" value="${proposal.date}">
          
          <label for="swal-note" style="font-weight: bold; font-size: 12px;">Note</label>
          <textarea id="swal-note" class="swal2-textarea" style="width: 90%; font-size: 12px; height: 50px; padding: 5px;">${proposal.note || ""}</textarea>
          
          <label for="swal-attachment" style="font-weight: bold; font-size: 12px;">Attachment</label>
          <input id="swal-attachment" class="swal2-file" type="file" style="font-size: 12px; padding: 3px;">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Resubmit",
      preConfirm: () => {
        return {
          title: document.getElementById("swal-title").value,
          description: document.getElementById("swal-description").value,
          location: document.getElementById("swal-location").value,
          date: document.getElementById("swal-date").value,
          note: document.getElementById("swal-note").value,
          attachment: document.getElementById("swal-attachment").files[0], // Get file
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
      <h2>My Proposals</h2>

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
                <td>{proposal.description}</td>
                <td>{proposal.date}</td>
                <td className={`status-${proposal.status?.toLowerCase() || "pending"}`}>
                  {proposal.status || "Pending"}
                </td>
                <td>
                  {proposal.status === "Rejected" ? (
                    <div className="action-buttons">
                      <button className="view-feedback-btn" onClick={() => handleViewFeedback(proposal.rejectionFeedback)}>
                        View Feedback
                      </button>
                      <button className="resubmit-btn" onClick={() => handleResubmitProposal(proposal)}>
                        Resubmit Proposal
                      </button>
                    </div>
                  ) : proposal.status === "Done" ? (
                    <button className="resubmit-btn" onClick={() => handleResubmitProposal(proposal)}>
                      Resubmit Proposal
                    </button>
                  ) : (
                    "N/A"
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5">No proposals submitted yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StaffDashboard;
