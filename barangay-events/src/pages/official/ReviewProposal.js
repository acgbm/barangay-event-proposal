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
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Ensure we compare only the date (not time)
  
      for (const docSnap of proposalsSnapshot.docs) {
        const proposalData = docSnap.data();
        const proposalRef = doc(db, "proposals", docSnap.id);
  
        if (!proposalData.date || proposalData.status !== "Pending") continue;
  
        const eventDate = new Date(proposalData.date);
        eventDate.setHours(0, 0, 0, 0); // Remove time component for accurate comparison
  
        const oneDayBefore = new Date(eventDate);
        oneDayBefore.setDate(eventDate.getDate() - 1);
  
        if (today.getTime() === oneDayBefore.getTime()) {
          await updateDoc(proposalRef, { status: "Declined (Missed Deadline)" });
  
          await addDoc(collection(db, "notifications"), {
            message: `Proposal "${proposalData.title}" has been automatically declined due to missing the deadline.`,
            timestamp: serverTimestamp(),
            type: "Declined",
          });
  
          Swal.fire({
            icon: "info",
            title: "Proposal Auto Declined",
            text: `The proposal "${proposalData.title}" has been automatically declined due to missing the deadline.`,
          });
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

  return (
    <div className="review-container">
      <h2>Review Proposals</h2>

      <table className="proposals-table">
        <thead>
          <tr>
            <th>Event Title</th>
            <th>Description</th>
            <th>Location</th>
            <th>Date</th>
            <th>Note</th>
            <th>Submitted By</th>
            <th>Attachment</th>
            <th>Votes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {proposals
            .filter((p) => p.status === "Pending" || !p.status)
            .map((proposal) => (
              <tr key={proposal.id}>
                <td>{proposal.title}</td>
                <td>{proposal.description}</td>
                <td>{proposal.location}</td>
                <td>{proposal.date}</td>
                <td>{proposal.note || "No note provided"}</td>
                <td>{proposal.submitterName}</td>
                <td>
                  <button
                    className="attachment-btn"
                    onClick={() => handleViewAttachment(proposal.fileURL)}
                  >
                    View
                  </button>
                </td>
                <td>
                  ✅ {proposal.votes?.approve?.length ?? 0} / ❌ {proposal.votes?.reject?.length ?? 0}
                </td>
                <td>
                  <button
                    onClick={() => handleVote(proposal.id, "approve")}
                    className="approve-btn"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleVote(proposal.id, "reject")}
                    className="reject-btn"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      <h3>Voted Proposals</h3>
      <table className="proposals-table">
        <thead>
          <tr>
            <th>Event Title</th>
            <th>Votes</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {proposals
            .filter((p) => p.status && p.status !== "Pending")
            .map((proposal) => (
              <tr key={proposal.id}>
                <td>{proposal.title}</td>
                <td>
                  ✅ {proposal.votes?.approve?.length ?? 0} / ❌ {proposal.votes?.reject?.length ?? 0}
                </td>
                <td className={`status-${(proposal.status || "Pending").toLowerCase()}`}>
                  {proposal.status || "Pending"}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReviewProposals;
