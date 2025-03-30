import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebaseConfig";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import Swal from "sweetalert2";
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
  
      if (!proposalSnap.exists()) return;
  
      const proposalData = proposalSnap.data();
      let votes = proposalData.votes || { approve: [], reject: [] };
      let rejectionFeedback = proposalData.rejectionFeedback || [];
  
      const hasApproved = votes.approve.includes(userId);
      const hasRejected = votes.reject.includes(userId);
  
      // **If user already voted, ask for confirmation before allowing vote change**
      if (hasApproved || hasRejected) {
        const { isConfirmed: changeConfirmed } = await Swal.fire({
          title: "Change Vote?",
          text: `You have already voted. Are you sure you want to change your vote to ${voteType === "approve" ? "approve" : "reject"}?`,
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, Change Vote",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#28a745",
          cancelButtonColor: "#d33",
        });
  
        if (!changeConfirmed) return; // If cancelled, do nothing
      }
  
      // **Confirm before voting (for both approve and reject)**
      const { isConfirmed } = await Swal.fire({
        title: voteType === "approve" ? "Confirm Approval" : "Confirm Rejection",
        text: `Are you sure you want to ${voteType === "approve" ? "approve" : "reject"} this proposal?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: voteType === "approve" ? "Yes, Approve" : "Yes, Reject",
        cancelButtonText: "Cancel",
        confirmButtonColor: voteType === "approve" ? "#28a745" : "#d33",
        cancelButtonColor: "#d33",
      });
  
      if (!isConfirmed) return; // If cancelled, do nothing
  
      // **Remove user's previous vote**
      votes.approve = votes.approve.filter((id) => id !== userId);
      votes.reject = votes.reject.filter((id) => id !== userId);
  
      // **Handle rejection feedback**
      if (voteType === "reject") {
        const { value: feedback } = await Swal.fire({
          title: "Reject Proposal",
          input: "textarea",
          inputPlaceholder: "Enter feedback for rejection...",
          inputAttributes: { "aria-label": "Enter feedback" },
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
  
        if (!feedback) return; // If cancelled, do nothing
  
        rejectionFeedback.push({ officialId: userId, feedback });
      }
  
      // **Add new vote**
      votes[voteType].push(userId);
  
      // **80% Approval Calculation**
      const totalOfficials = officialsCount;
      const approvalThreshold = Math.ceil(totalOfficials * 0.8); // 80% of total officials
      let newStatus = "Pending";
  
      if (votes.approve.length >= approvalThreshold) {
        newStatus = "Approved";
  
        // **Notify when proposal is approved**
        Swal.fire({
          icon: "success",
          title: "Proposal Approved!",
          text: "This proposal has been officially approved.",
          confirmButtonColor: "#28a745",
        });
      } else if (votes.reject.length >= totalOfficials) {
        newStatus = "Rejected";
      }
  
      await updateDoc(proposalRef, {
        votes,
        status: newStatus,
        rejectionFeedback,
      });
  
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
      console.error("Error voting:", error.message);
    }
  };
  

  const checkProposalDeadlines = async () => {
    try {
      const proposalsSnapshot = await getDocs(collection(db, "proposals"));
      const today = new Date();

      for (const docSnap of proposalsSnapshot.docs) {
        const proposalData = docSnap.data();
        const proposalRef = doc(db, "proposals", docSnap.id);

        if (!proposalData.date || proposalData.status !== "Pending") continue;

        const eventDate = new Date(proposalData.date);
        const oneDayBefore = new Date(eventDate);
        oneDayBefore.setDate(eventDate.getDate() - 1);

        if (today >= oneDayBefore) {
          await updateDoc(proposalRef, { status: "Rejected" });

          Swal.fire({
            icon: "info",
            title: "Proposal Auto Declined",
            text: `The proposal "${proposalData.title}" has been automatically rejected due to the deadline.`,
          });
        }
      }
    } catch (error) {
      console.error("Error checking deadlines:", error.message);
    }
  };

  useEffect(() => {
    checkProposalDeadlines();
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
