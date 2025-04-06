import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig"; // Firebase Firestore
import { collection, query, getDocs, updateDoc, doc } from "firebase/firestore";
import Swal from "sweetalert2";
import "./AdminProposal.css"; // Ensure this file is styled

const AdminProposal = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);

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
        return "green";
      case "Pending":
        return "black"; // Blue color for pending events
      case "Rejected":
        return "red";
      case "Declined (Missed Deadline)":
        return "orange";
      case "Cancelled":
        return "gray";
      case "Rescheduled":
        return "blue"; // Blue color for rescheduled events
      default:
        return "black";
    }
  };

  return (
    <div className="admin-proposal">
      <h2>Manage Proposals</h2>
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
            {proposals.map((proposal) => (
              <tr key={proposal.id}>
                <td>{proposal.title}</td>
                <td>{proposal.date}</td>
                <td style={{ color: getStatusColor(proposal.status) }}>
                  {proposal.status}
                </td>
                <td className="action-buttons">
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
                    <span>No actions available</span> // Display text for cancelled, rejected, or declined proposals
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProposal;
