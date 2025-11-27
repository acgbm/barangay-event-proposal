import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  sendEventReminder,
  sendReminderToEventStaff,
  sendReminderToOfficials,
  sendReminderToAllParticipants,
} from "../services/notificationService";
import "./SendReminderModal.css";

const SendReminderModal = ({ isOpen, onClose }) => {
  const [approvedProposals, setApprovedProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState("");
  const [recipientType, setRecipientType] = useState("all"); // all, staff, officials
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error
  const [loadingProposals, setLoadingProposals] = useState(true);

  // Fetch approved proposals on modal open
  useEffect(() => {
    if (isOpen) {
      fetchApprovedProposals();
    }
  }, [isOpen]);

  const fetchApprovedProposals = async () => {
    try {
      setLoadingProposals(true);
      const proposalsQuery = query(
        collection(db, "proposals"),
        where("status", "==", "Approved")
      );
      const snapshot = await getDocs(proposalsQuery);
      const proposals = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setApprovedProposals(proposals);
      if (proposals.length > 0) {
        setSelectedProposal(proposals[0].id);
      }
    } catch (error) {
      console.error("Error fetching proposals:", error);
      setMessage("Error loading proposals");
      setMessageType("error");
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleSendReminder = async () => {
    if (!selectedProposal) {
      setMessage("Please select an event");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const proposal = approvedProposals.find((p) => p.id === selectedProposal);
      let result;

      if (recipientType === "all") {
        result = await sendReminderToAllParticipants(selectedProposal);
      } else if (recipientType === "staff") {
        result = await sendReminderToEventStaff(selectedProposal);
      } else if (recipientType === "officials") {
        result = await sendReminderToOfficials(selectedProposal);
      }

      if (result.success) {
        setMessage(result.message);
        setMessageType("success");
        setTimeout(() => {
          setMessage("");
          handleClose();
        }, 2000);
      } else {
        setMessage(result.message || "Failed to send reminder");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Error sending reminder:", error);
      setMessage("Error sending reminder");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedProposal("");
    setRecipientType("all");
    setMessage("");
    setMessageType("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="reminder-modal-overlay" onClick={handleClose}>
      <div className="reminder-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="reminder-modal-header">
          <h2>Send Event Reminder</h2>
          <button className="reminder-modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="reminder-modal-body">
          {/* Proposals Selection */}
          <div className="reminder-form-group">
            <label htmlFor="proposal-select">Select Event:</label>
            {loadingProposals ? (
              <div className="reminder-loading">Loading events...</div>
            ) : approvedProposals.length > 0 ? (
              <select
                id="proposal-select"
                value={selectedProposal}
                onChange={(e) => setSelectedProposal(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Choose an event --</option>
                {approvedProposals.map((proposal) => (
                  <option key={proposal.id} value={proposal.id}>
                    {proposal.title} ({new Date(proposal.startDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            ) : (
              <div className="reminder-no-proposals">No approved events found</div>
            )}
          </div>

          {/* Recipient Type Selection */}
          <div className="reminder-form-group">
            <label>Send reminder to:</label>
            <div className="reminder-radio-group">
              <div className="reminder-radio-option">
                <input
                  type="radio"
                  id="all"
                  name="recipientType"
                  value="all"
                  checked={recipientType === "all"}
                  onChange={(e) => setRecipientType(e.target.value)}
                  disabled={loading}
                />
                <label htmlFor="all">All Participants (Staff & Officials)</label>
              </div>
              <div className="reminder-radio-option">
                <input
                  type="radio"
                  id="staff"
                  name="recipientType"
                  value="staff"
                  checked={recipientType === "staff"}
                  onChange={(e) => setRecipientType(e.target.value)}
                  disabled={loading}
                />
                <label htmlFor="staff">Staff Only</label>
              </div>
              <div className="reminder-radio-option">
                <input
                  type="radio"
                  id="officials"
                  name="recipientType"
                  value="officials"
                  checked={recipientType === "officials"}
                  onChange={(e) => setRecipientType(e.target.value)}
                  disabled={loading}
                />
                <label htmlFor="officials">Officials Only</label>
              </div>
            </div>
          </div>

          {/* Message Display */}
          {message && (
            <div className={`reminder-message reminder-message-${messageType}`}>
              {messageType === "success" ? "✓ " : "✗ "}
              {message}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="reminder-modal-footer">
          <button
            className="reminder-btn-cancel"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="reminder-btn-send"
            onClick={handleSendReminder}
            disabled={loading || !selectedProposal || approvedProposals.length === 0}
          >
            {loading ? "Sending..." : "Send Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendReminderModal;
