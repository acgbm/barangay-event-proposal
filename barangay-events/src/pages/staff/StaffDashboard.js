import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import Swal from "sweetalert2"; // ✅ Added SweetAlert2 for popups
import "./StaffDashboard.css";

const StaffDashboard = () => {
  const [proposals, setProposals] = useState([]);
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

  const fetchUserProposals = async (uid) => {
    try {
      const proposalsSnapshot = await getDocs(collection(db, "proposals"));
      const userProposals = proposalsSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((proposal) => proposal.userId === uid);

      setProposals(userProposals);
    } catch (error) {
      console.error("Error fetching proposals:", error.message);
    }
  };

  const handleViewFeedback = (feedbackArray) => {
    if (!feedbackArray || feedbackArray.length === 0) {
      Swal.fire({
        icon: "info",
        title: "No Feedback",
        text: "No rejection feedback available.",
      });
      return;
    }
  
    // Format the feedback properly
    const feedbackText = feedbackArray
      .map((entry, index) => `${index + 1}. ${entry.feedback}`) // Extract feedback text
      .join("<br><br>"); // Proper HTML formatting
  
    Swal.fire({
      icon: "error",
      title: "Rejected Feedback",
      html: `<div style="text-align:left">${feedbackText}</div>`, // Properly format for HTML display
    });
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
            <th>Feedback</th>
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
                    <button onClick={() => handleViewFeedback(proposal.rejectionFeedback)}>
                    View Feedback
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
