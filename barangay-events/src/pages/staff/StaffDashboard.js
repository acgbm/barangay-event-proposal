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

  const handleViewFeedback = (feedback) => {
    // Ensure feedback is an array, or default to an empty array
    const feedbackArray = Array.isArray(feedback) ? feedback : [feedback];
  
    if (!feedbackArray.length || feedbackArray[0] === "" || feedbackArray[0] === undefined) {
      Swal.fire({
        icon: "info",
        title: "No Feedback",
        text: "No feedback has been provided by officials.",
      });
      return;
    }
  
    const feedbackList = feedbackArray
      .map((fb, index) => `<p>${index + 1}. ${fb}</p>`)
      .join("");
  
    Swal.fire({
      title: "Rejected Feedback",
      html: feedbackList,
      icon: "warning",
      confirmButtonText: "Close",
      confirmButtonColor: "#d33",
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
                    <button
                      className="feedback-btn"
                      onClick={() => handleViewFeedback(proposal.rejectionFeedback || [])}
                    >
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
