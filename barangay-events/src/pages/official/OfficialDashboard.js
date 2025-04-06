import React, { useState, useEffect } from "react";
import { db, auth } from "../../firebaseConfig";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import Swal from "sweetalert2";
import "./OfficialDashboard.css";

const OfficialDashboard = () => {
  const [proposals, setProposals] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userId, setUserId] = useState(null);
  const [statistics, setStatistics] = useState({
    upcoming: 0,
    pending: 0,
    cancelled: 0,
    rejected: 0,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
        fetchProposals();
      }
    });

    return () => unsubscribe();
  }, []);

  // ✅ Fetch Proposals and Check for Notifications
  const fetchProposals = async () => {
    try {
      const proposalsSnapshot = await getDocs(collection(db, "proposals"));
      const allProposals = proposalsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      setProposals(allProposals);
      checkForNotifications(allProposals);
      updateStatistics(allProposals);
    } catch (error) {
      console.error("Error fetching proposals:", error.message);
    }
  };

  // ✅ Check for Notifications on New Proposals
  const checkForNotifications = (allProposals) => {
    const newNotifications = allProposals.filter(
      (proposal) =>
        (proposal.status === "Approved" ||
          proposal.status === "Rejected" ||
          proposal.status === "Rescheduled" ||
          proposal.status === "Cancelled") &&
        !proposal.notified
    );

    if (newNotifications.length > 0) {
      setNotifications(newNotifications);
      newNotifications.forEach((proposal) => showNotification(proposal));
    }
  };

  // ✅ Show Notifications for Proposal Status Updates
  const showNotification = async (proposal) => {
    let icon = "";
    let title = "";
    let text = "";

    // Set notification details based on proposal status
    switch (proposal.status) {
      case "Approved":
        icon = "success";
        title = "Proposal Approved!";
        text = `The event proposal "${proposal.title}" has been approved.`;
        break;
      case "Rejected":
        icon = "error";
        title = "Proposal Rejected!";
        text = `The event proposal "${proposal.title}" has been rejected.`;
        break;
      case "Cancelled":
        icon = "error";
        title = "Event Cancelled!";
        text = `The event "${proposal.title}" has been cancelled.`;
        break;
      case "Rescheduled":
        icon = "info";
        title = "Event Rescheduled!";
        text = `The event "${proposal.title}" has been rescheduled.`;
        break;
      default:
        return;
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

  // ✅ Update Statistics for Proposals
  const updateStatistics = (allProposals) => {
    const upcoming = allProposals.filter(
      (proposal) => proposal.status === "Approved" && new Date(proposal.date) > new Date()
    ).length;
    const pending = allProposals.filter((proposal) => proposal.status === "Pending").length;
    const cancelled = allProposals.filter((proposal) => proposal.status === "Cancelled").length;
    const rejected = allProposals.filter((proposal) => proposal.status === "Rejected").length;

    setStatistics({
      upcoming,
      pending,
      cancelled,
      rejected,
    });
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  return (
    <div className="official-dashboard">
      <h2>Official Dashboard</h2>

      <div className="statistics">
        <div className="stat-item">
          <h3>Upcoming Proposals</h3>
          <p>{statistics.upcoming}</p>
        </div>
        <div className="stat-item">
          <h3>Pending Proposals</h3>
          <p>{statistics.pending}</p>
        </div>
        <div className="stat-item">
          <h3>Cancelled Proposals</h3>
          <p>{statistics.cancelled}</p>
        </div>
        <div className="stat-item">
          <h3>Rejected Proposals</h3>
          <p>{statistics.rejected}</p>
        </div>
      </div>

      <div className="notifications">
        <h3>Recent Notifications</h3>
        {notifications.length > 0 ? (
          notifications.map((notification, index) => (
            <div key={index} className="notification-item">
              <h4>{notification.title}</h4>
              <p>{notification.text}</p>
            </div>
          ))
        ) : (
          <p>No new notifications.</p>
        )}
      </div>

      <div className="proposals-table">
        <h3>All Proposals</h3>
        <table>
          <thead>
            <tr>
              <th>Event Title</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {proposals.length > 0 ? (
              proposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td>{proposal.title}</td>
                  <td>{proposal.status}</td>
                  <td>{new Date(proposal.date).toLocaleDateString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">No proposals found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OfficialDashboard;
