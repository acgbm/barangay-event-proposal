import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig"; // Firebase Firestore
import { collection, query, getDocs, updateDoc, doc } from "firebase/firestore";
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

const AdminProposal = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const proposalsPerPage = 10;

  // Fetch proposals from Firestore
  const fetchProposals = async () => {
    setLoading(true);
    try {
      const proposalsQuery = query(collection(db, "proposals"));
      const querySnapshot = await getDocs(proposalsQuery);
      const proposalsList = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
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
  
    const { value: newDate } = await Swal.fire({
      title: "Reschedule Event",
      input: "date",
      inputLabel: "New Event Date",
      inputValue: proposal.date,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "You must provide a new date!";
        }
      },
      inputAttributes: {
        min: currentDate, // Disables selecting past dates
      },
    });
  
    if (newDate) {
      try {
        const proposalRef = doc(db, "proposals", proposal.id);
        await updateDoc(proposalRef, {
          date: newDate,
          status: "Rescheduled", // Update the status to "Rescheduled"
        });
  
        // Notify both staff and official side about the rescheduling
        Swal.fire({
          icon: "success",
          title: "Event Rescheduled",
          text: `The event "${proposal.title}" has been rescheduled to ${newDate}.`,
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

  // Determine the color of the status text
  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "#2ecc40"; // green
      case "Pending":
        return "#007bff"; // blue
      case "Rejected":
        return "#e74c3c"; // red
      case "Declined (Missed Deadline)":
        return "#ff9800"; // orange
      case "Cancelled":
        return "#888"; // gray
      case "Rescheduled":
        return "#6c63ff"; // purple/blue
      default:
        return "#22223b";
    }
  };

  // Pagination logic
  const indexOfLastProposal = currentPage * proposalsPerPage;
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage;
  const currentProposals = proposals.slice(indexOfFirstProposal, indexOfLastProposal);
  const totalPages = Math.ceil(proposals.length / proposalsPerPage);

  return (
    <div className="admin-proposal">
      <h2>Proposals</h2>
      {loading ? <p>Loading proposals...</p> : null}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProposals.map((proposal) => (
              <tr key={proposal.id}>
                <td>{proposal.title}</td>
                <td>{formatDate(proposal.date)}</td>
                <td>
                  <span className="status-badge" style={{ background: getStatusColor(proposal.status)+"22", color: getStatusColor(proposal.status) }}>
                    {proposal.status}
                  </span>
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
                    <span>No actions available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div className="admin-proposal-pagination">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="page-indicator">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default AdminProposal;
