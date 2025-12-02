import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  sendEventReminder,
  sendReminderToEventStaff,
  sendReminderToOfficials,
  sendReminderToAllParticipants,
  sendVoteReminderByProposalId,
  sendVoteRemindersForAllPending,
} from "../services/notificationService";
import "./SendReminderModal.css";

const SendReminderModal = ({ isOpen, onClose }) => {
  const [reminderType, setReminderType] = useState("event"); // event or vote
  const [approvedProposals, setApprovedProposals] = useState([]);
  const [pendingProposals, setPendingProposals] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState("");
  const [recipientType, setRecipientType] = useState("all"); // all, staff, officials
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error
  const [loadingProposals, setLoadingProposals] = useState(true);

  // Fetch proposals on modal open
  useEffect(() => {
    if (isOpen) {
      fetchProposals();
    }
  }, [isOpen, reminderType]);

  const fetchProposals = async () => {
    try {
      setLoadingProposals(true);
      
      if (reminderType === "event") {
        // Fetch approved proposals for event reminders
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
      } else {
        // Fetch pending proposals for vote reminders
        const pendingQuery = query(
          collection(db, "proposals"),
          where("status", "==", "Pending")
        );
        const snapshot = await getDocs(pendingQuery);
        const proposals = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPendingProposals(proposals);
        if (proposals.length > 0) {
          setSelectedProposal(proposals[0].id);
        }
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
      setMessage("Please select a proposal");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      let result;

      if (reminderType === "event") {
        // Send event reminder
        if (recipientType === "all") {
          result = await sendReminderToAllParticipants(selectedProposal);
        } else if (recipientType === "staff") {
          result = await sendReminderToEventStaff(selectedProposal);
        } else if (recipientType === "officials") {
          result = await sendReminderToOfficials(selectedProposal);
        }
      } else {
        // Send vote reminder for pending proposals
        if (selectedProposal === "all-pending") {
          result = await sendVoteRemindersForAllPending();
        } else {
          result = await sendVoteReminderByProposalId(selectedProposal);
        }
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
    setReminderType("event");
    setMessage("");
    setMessageType("");
    onClose();
  };

  if (!isOpen) return null;

  const proposals = reminderType === "event" ? approvedProposals : pendingProposals;

  return (
    <div className="reminder-modal-overlay" onClick={handleClose}>
      <div className="reminder-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="reminder-modal-header">
          <h2>📧 Send Reminder</h2>
          <button className="reminder-modal-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="reminder-modal-body">
          {/* Reminder Type Selection */}
          <div className="reminder-form-group">
            <label>Reminder Type:</label>
            <div className="reminder-radio-group">
              <div className="reminder-radio-option">
                <input
                  type="radio"
                  id="event-reminder"
                  name="reminderType"
                  value="event"
                  checked={reminderType === "event"}
                  onChange={(e) => {
                    setReminderType(e.target.value);
                    setSelectedProposal("");
                  }}
                  disabled={loading}
                />
                <label htmlFor="event-reminder">🎉 Event Reminder (Approved events)</label>
              </div>
              <div className="reminder-radio-option">
                <input
                  type="radio"
                  id="vote-reminder"
                  name="reminderType"
                  value="vote"
                  checked={reminderType === "vote"}
                  onChange={(e) => {
                    setReminderType(e.target.value);
                    setSelectedProposal("");
                  }}
                  disabled={loading}
                />
                <label htmlFor="vote-reminder">🗳️ Vote Reminder (Pending proposals)</label>
              </div>
            </div>
          </div>

          {/* Proposals Selection */}
          <div className="reminder-form-group">
            <label htmlFor="proposal-select">
              {reminderType === "event" ? "Select Event:" : "Select Proposal:"}
            </label>
            {loadingProposals ? (
              <div className="reminder-loading">Loading proposals...</div>
            ) : proposals.length > 0 ? (
              <select
                id="proposal-select"
                value={selectedProposal}
                onChange={(e) => setSelectedProposal(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Choose a proposal --</option>
                {reminderType === "vote" && (
                  <option value="all-pending">🔔 All Pending Proposals</option>
                )}
                {proposals.map((proposal) => (
                  <option key={proposal.id} value={proposal.id}>
                    {proposal.title}
                    {reminderType === "event" && ` (${new Date(proposal.startDate).toLocaleDateString()})`}
                  </option>
                ))}
              </select>
            ) : (
              <div className="reminder-no-proposals">
                {reminderType === "event" ? "No approved events found" : "No pending proposals found"}
              </div>
            )}
          </div>

          {/* Recipient Type Selection - only for event reminders */}
          {reminderType === "event" && (
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
          )}

          {reminderType === "vote" && selectedProposal !== "all-pending" && (
            <div className="reminder-info">
              📢 Vote reminders will be sent to all officials
            </div>
          )}

          {reminderType === "vote" && selectedProposal === "all-pending" && (
            <div className="reminder-info">
              📢 Vote reminders will be sent to all officials for each pending proposal
            </div>
          )}

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
            disabled={loading || !selectedProposal || proposals.length === 0}
          >
            {loading ? "Sending..." : "Send Reminder"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendReminderModal;
