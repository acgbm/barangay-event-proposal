import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, addDoc, getDoc } from "firebase/firestore";

// Function to send desktop notifications
export const sendDesktopNotification = (notificationData) => {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notificationData.title, {
        body: notificationData.body,
        icon: notificationData.icon || '/barangay-logo.png',
        badge: '/barangay-logo.png',
        tag: notificationData.data?.proposalId || 'notification'
      });
      console.log('✅ Desktop notification sent:', notificationData.title);
    }
  } catch (error) {
    console.error('Error sending desktop notification:', error);
  }
};

// Function to save notification to Firestore (for mobile & persistent notifications)
export const saveNotificationToFirestore = async (userId, notificationData) => {
  try {
    const notificationsRef = collection(db, "users", userId, "notifications");
    
    await addDoc(notificationsRef, {
      title: notificationData.title,
      body: notificationData.body,
      icon: notificationData.icon || '/barangay-logo.png',
      data: notificationData.data || {},
      read: false,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    console.log(`✅ Notification saved to Firestore for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error saving notification to Firestore:', error);
    return false;
  }
};

// Function to send notifications to multiple users (both desktop + mobile)
export const sendNotificationsToUsers = async (userIds, notificationData) => {
  try {
    if (!userIds || userIds.length === 0) {
      console.log('No user IDs provided for notifications');
      return { success: false, message: "No valid user IDs" };
    }

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds)];

    console.log(`📢 Sending notifications to ${uniqueUserIds.length} user(s)...`);

    // Save notification to Firestore for ALL recipients (concurrently)
    const savePromises = uniqueUserIds.map(userId => 
      saveNotificationToFirestore(userId, notificationData)
    );

    const results = await Promise.all(savePromises);
    const savedCount = results.filter(r => r === true).length;

    // Also send desktop notification to current user
    sendDesktopNotification(notificationData);

    console.log(`📢 Notification saved for ${savedCount}/${uniqueUserIds.length} users`);
    return { success: true, message: `Notification sent to ${savedCount} user(s)` };
  } catch (error) {
    console.error("Error sending notifications:", error);
    return { success: false, message: error.message };
  }
};

// Function to send notification for new pending proposal
export const notifyNewPendingProposal = async (proposal, staffName) => {
  try {
    // Get all officials
    const officialsQuery = query(collection(db, "users"), where("role", "==", "official"));
    const officialsSnapshot = await getDocs(officialsQuery);
    
    if (officialsSnapshot.empty) {
      console.log('No officials found to notify');
      return { success: false, message: "No officials found" };
    }

    const officialIds = officialsSnapshot.docs.map(doc => doc.id);

    const notificationData = {
      title: "📝 New Event Proposal",
      body: `${staffName} submitted a new event: "${proposal.title}"`,
      icon: "/barangay-logo.png",
      data: {
        proposalId: proposal.id,
        type: "new_pending",
        submittedBy: staffName,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`📢 Notifying ${officialIds.length} officials about new proposal`);
    return sendNotificationsToUsers(officialIds, notificationData);
  } catch (error) {
    console.error("Error notifying officials about new proposal:", error);
    return { success: false, message: error.message };
  }
};

// Function to send notification for approved event
export const notifyApprovedEvent = async (proposal, recipientIds) => {
  const notificationData = {
    title: "Event Approved 🎉",
    body: `Your event "${proposal.title}" has been approved!`,
    icon: "/barangay-logo.png",
    data: {
      proposalId: proposal.id,
      type: "approved",
      timestamp: new Date().toISOString(),
    },
  };

  return sendNotificationsToUsers(recipientIds, notificationData);
};

// Function to send notification for declined event
export const notifyDeclinedEvent = async (proposal, recipientIds) => {
  const notificationData = {
    title: "Event Declined ❌",
    body: `Your event "${proposal.title}" has been declined.`,
    icon: "/barangay-logo.png",
    data: {
      proposalId: proposal.id,
      type: "declined",
      timestamp: new Date().toISOString(),
    },
  };

  return sendNotificationsToUsers(recipientIds, notificationData);
};

// Function to send notification for rescheduled event
export const notifyRescheduleEvent = async (proposal, newStartDate, newFinishDate, recipientIds) => {
  const notificationData = {
    title: "Event Rescheduled 📅",
    body: `"${proposal.title}" has been rescheduled to ${formatDateForNotification(newStartDate)}`,
    icon: "/barangay-logo.png",
    data: {
      proposalId: proposal.id,
      type: "rescheduled",
      newStartDate: newStartDate,
      newFinishDate: newFinishDate,
      timestamp: new Date().toISOString(),
    },
  };

  return sendNotificationsToUsers(recipientIds, notificationData);
};

// Function to send notification 1 day before event
export const notifyUpcomingEvent = async (proposal, recipientIds) => {
  const notificationData = {
    title: "Upcoming Event Tomorrow ⏰",
    body: `"${proposal.title}" is happening tomorrow at ${formatTimeForNotification(proposal.startTime)}!`,
    icon: "/barangay-logo.png",
    data: {
      proposalId: proposal.id,
      type: "upcoming",
      timestamp: new Date().toISOString(),
    },
  };

  return sendNotificationsToUsers(recipientIds, notificationData);
};

// Function to check for upcoming events and notify users (for scheduled tasks)
export const checkAndNotifyUpcomingEvents = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    console.log(`🔍 Checking for events on ${tomorrowStr}...`);

    // Query all approved proposals with startDate = tomorrow
    const q = query(
      collection(db, "proposals"),
      where("status", "==", "Approved"),
      where("startDate", "==", tomorrowStr)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`⚠️ No events found for tomorrow (${tomorrowStr})`);
      return { success: true, notified: 0 };
    }

    console.log(`✅ Found ${querySnapshot.size} event(s) for tomorrow`);

    let totalNotified = 0;

    // Send notifications for each upcoming event
    for (const docSnapshot of querySnapshot.docs) {
      const proposal = { id: docSnapshot.id, ...docSnapshot.data() };
      
      try {
        const recipientIds = proposal.userId ? [proposal.userId] : [];
        
        if (recipientIds.length > 0) {
          const result = await notifyUpcomingEvent(proposal, recipientIds);
          if (result.success) {
            totalNotified++;
            console.log(`✅ Notified for: ${proposal.title}`);
          }
        }
      } catch (error) {
        console.error(`Error notifying for ${proposal.title}:`, error);
      }
    }

    console.log(`✅ Total notifications sent: ${totalNotified}`);
    return { success: true, notified: totalNotified };
  } catch (error) {
    console.error("Error checking upcoming events:", error);
    return { success: false, message: error.message };
  }
};

// Function to get all notifications for current user
export const getUserNotifications = async (userId) => {
  try {
    const notificationsRef = collection(db, "users", userId, "notifications");
    const notificationsSnapshot = await getDocs(notificationsRef);
    
    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort by createdAt descending
    return notifications.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.() || new Date(0);
      const timeB = b.createdAt?.toDate?.() || new Date(0);
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

// Function to mark notification as read
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const notificationRef = doc(db, "users", userId, "notifications", notificationId);
    await setDoc(notificationRef, { read: true }, { merge: true });
    console.log(`✅ Notification marked as read`);
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
};

// Function to delete a notification
export const deleteNotification = async (userId, notificationId) => {
  try {
    const notificationRef = doc(db, "users", userId, "notifications", notificationId);
    await setDoc(notificationRef, { deleted: true }, { merge: true });
    console.log(`✅ Notification deleted`);
  } catch (error) {
    console.error("Error deleting notification:", error);
  }
};

// Helper function to format date for notification
const formatDateForNotification = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date)) return dateStr;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Helper function to format time for notification
const formatTimeForNotification = (timeString) => {
  if (!timeString) return "";
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Function to schedule upcoming event notifications (call this periodically or from Cloud Functions)
export const scheduleUpcomingEventNotifications = async () => {
  try {
    const result = await checkAndNotifyUpcomingEvents();
    return result;
  } catch (error) {
    console.error("Error scheduling notifications:", error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// MANUAL REMINDER FUNCTIONS
// ============================================================

// Function to send event reminder notification (manual trigger)
export const sendEventReminder = async (proposal, recipientIds) => {
  const notificationData = {
    title: "🔔 Event Reminder",
    body: `Reminder: "${proposal.title}" is scheduled for ${formatDateForNotification(proposal.startDate)} at ${formatTimeForNotification(proposal.startTime)}`,
    icon: "/barangay-logo.png",
    data: {
      proposalId: proposal.id,
      type: "reminder",
      eventDate: proposal.startDate,
      eventTime: proposal.startTime,
      timestamp: new Date().toISOString(),
    },
  };

  return sendNotificationsToUsers(recipientIds, notificationData);
};

// Function to send reminder to staff who submitted proposal
export const sendReminderToEventStaff = async (proposalId) => {
  try {
    const proposalRef = doc(db, "proposals", proposalId);
    const proposalSnapshot = await getDoc(proposalRef);
    
    if (!proposalSnapshot.exists()) {
      return { success: false, message: "Proposal not found" };
    }

    const proposal = { id: proposalId, ...proposalSnapshot.data() };
    const staffId = proposal.userId;

    if (!staffId) {
      return { success: false, message: "Staff member not found" };
    }

    const result = await sendEventReminder(proposal, [staffId]);
    
    // Also send email
    const emailResult = await sendEventReminderEmails(proposal, [staffId]);
    
    return { 
      success: result.success && emailResult.success, 
      message: `✅ Reminder sent to staff for: ${proposal.title}`,
      proposalTitle: proposal.title,
      notificationSent: result.success,
      emailSent: emailResult.success
    };
  } catch (error) {
    console.error("Error sending reminder to staff:", error);
    return { success: false, message: error.message };
  }
};

// Function to send reminder to all officials
export const sendReminderToOfficials = async (proposalId) => {
  try {
    const proposalRef = doc(db, "proposals", proposalId);
    const proposalSnapshot = await getDoc(proposalRef);
    
    if (!proposalSnapshot.exists()) {
      return { success: false, message: "Proposal not found" };
    }

    const proposal = { id: proposalId, ...proposalSnapshot.data() };

    // Get all officials
    const officialsQuery = query(collection(db, "users"), where("role", "==", "official"));
    const officialsSnapshot = await getDocs(officialsQuery);
    
    if (officialsSnapshot.empty) {
      return { success: false, message: "No officials found" };
    }

    const officialIds = officialsSnapshot.docs.map(doc => doc.id);
    
    console.log(`📤 Sending reminder to ${officialIds.length} officials`);
    const result = await sendEventReminder(proposal, officialIds);
    
    // Also send emails
    const emailResult = await sendEventReminderEmails(proposal, officialIds);
    
    return { 
      success: result.success && emailResult.success, 
      message: `✅ Reminder sent to ${officialIds.length} official(s)`,
      proposalTitle: proposal.title,
      notificationSent: result.success,
      emailSent: emailResult.success
    };
  } catch (error) {
    console.error("Error sending reminder to officials:", error);
    return { success: false, message: error.message };
  }
};

// Function to send reminder to all participants (staff + officials)
export const sendReminderToAllParticipants = async (proposalId) => {
  try {
    const proposalRef = doc(db, "proposals", proposalId);
    const proposalSnapshot = await getDoc(proposalRef);
    
    if (!proposalSnapshot.exists()) {
      return { success: false, message: "Proposal not found" };
    }

    const proposal = { id: proposalId, ...proposalSnapshot.data() };

    // Get all officials
    const officialIds = [];
    const officialsQuery = query(collection(db, "users"), where("role", "==", "official"));
    const officialsSnapshot = await getDocs(officialsQuery);
    
    officialsSnapshot.forEach(doc => officialIds.push(doc.id));
    
    // Add staff member
    if (proposal.userId && !officialIds.includes(proposal.userId)) {
      officialIds.push(proposal.userId);
    }

    if (officialIds.length === 0) {
      return { success: false, message: "No recipients found" };
    }

    console.log(`📤 Sending reminder to ${officialIds.length} participants`);
    const result = await sendEventReminder(proposal, officialIds);
    
    // Also send emails
    const emailResult = await sendEventReminderEmails(proposal, officialIds);
    
    return { 
      success: result.success && emailResult.success, 
      message: `✅ Reminder sent to ${officialIds.length} participant(s)`,
      proposalTitle: proposal.title,
      recipientCount: officialIds.length,
      notificationSent: result.success,
      emailSent: emailResult.success
    };
  } catch (error) {
    console.error("Error sending reminder to participants:", error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// PENDING PROPOSAL VOTE REMINDER FUNCTIONS
// ============================================================

// Function to send reminder to officials to vote on pending proposals
export const sendVoteReminderForPendingProposal = async (proposal) => {
  try {
    // Get all officials
    const officialsQuery = query(collection(db, "users"), where("role", "==", "official"));
    const officialsSnapshot = await getDocs(officialsQuery);
    
    if (officialsSnapshot.empty) {
      return { success: false, message: "No officials found" };
    }

    const officialIds = officialsSnapshot.docs.map(doc => doc.id);

    const notificationData = {
      title: "🗳️ Vote Needed - Pending Proposal",
      body: `"${proposal.title}" by ${proposal.submittedBy || "Staff"} is awaiting your vote`,
      icon: "/barangay-logo.png",
      data: {
        proposalId: proposal.id,
        type: "pending_vote_reminder",
        status: proposal.status,
        submittedBy: proposal.submittedBy,
        timestamp: new Date().toISOString(),
      },
    };

    console.log(`📤 Sending vote reminders to ${officialIds.length} officials for: ${proposal.title}`);
    const result = await sendNotificationsToUsers(officialIds, notificationData);
    
    // Also send emails
    const emailResult = await sendVoteReminderEmails(proposal);
    
    return { 
      success: result.success && emailResult.success, 
      message: `✅ Vote reminders sent to ${officialIds.length} official(s)`,
      proposalTitle: proposal.title,
      recipientCount: officialIds.length,
      notificationSent: result.success,
      emailSent: emailResult.success
    };
  } catch (error) {
    console.error("Error sending vote reminders:", error);
    return { success: false, message: error.message };
  }
};

// Function to send reminder to officials about a specific pending proposal ID
export const sendVoteReminderByProposalId = async (proposalId) => {
  try {
    const proposalRef = doc(db, "proposals", proposalId);
    const proposalSnapshot = await getDoc(proposalRef);
    
    if (!proposalSnapshot.exists()) {
      return { success: false, message: "Proposal not found" };
    }

    const proposal = { id: proposalId, ...proposalSnapshot.data() };

    if (proposal.status !== "Pending") {
      return { success: false, message: `Cannot send vote reminder for ${proposal.status} proposal` };
    }

    return sendVoteReminderForPendingProposal(proposal);
  } catch (error) {
    console.error("Error sending vote reminder by proposal ID:", error);
    return { success: false, message: error.message };
  }
};

// Function to send reminders for ALL pending proposals
export const sendVoteRemindersForAllPending = async () => {
  try {
    const pendingQuery = query(
      collection(db, "proposals"),
      where("status", "==", "Pending")
    );
    const pendingSnapshot = await getDocs(pendingQuery);

    if (pendingSnapshot.empty) {
      console.log("⚠️ No pending proposals found");
      return { success: true, message: "No pending proposals to remind about", remindersSent: 0 };
    }

    console.log(`🔍 Found ${pendingSnapshot.size} pending proposal(s)`);

    let remindersSent = 0;
    const results = [];

    for (const docSnapshot of pendingSnapshot.docs) {
      const proposal = { id: docSnapshot.id, ...docSnapshot.data() };
      
      try {
        const result = await sendVoteReminderForPendingProposal(proposal);
        if (result.success) {
          remindersSent++;
          results.push({
            proposalId: proposal.id,
            title: proposal.title,
            success: true
          });
        }
      } catch (error) {
        console.error(`Error sending reminder for ${proposal.title}:`, error);
        results.push({
          proposalId: proposal.id,
          title: proposal.title,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `✅ Vote reminders sent for ${remindersSent}/${pendingSnapshot.size} pending proposal(s)`,
      remindersSent,
      totalPending: pendingSnapshot.size,
      results
    };
  } catch (error) {
    console.error("Error sending vote reminders for all pending:", error);
    return { success: false, message: error.message };
  }
};

// ============================================================
// EMAIL NOTIFICATION FUNCTIONS
// ============================================================

// Function to send email to user
export const sendEmailNotification = async (userEmail, subject, htmlContent) => {
  try {
    // Save email request to Firestore for processing
    const emailRequestsRef = collection(db, "email_queue");
    
    const result = await addDoc(emailRequestsRef, {
      to: userEmail,
      subject: subject,
      htmlContent: htmlContent,
      status: "pending",
      createdAt: serverTimestamp(),
      sentAt: null,
      error: null,
    });

    console.log(`📧 Email queued for ${userEmail}: ${subject}`);
    return { success: true, message: "Email queued for sending" };
  } catch (error) {
    console.error("Error queuing email:", error);
    return { success: false, message: error.message };
  }
};

// Function to send event reminder emails
export const sendEventReminderEmails = async (proposal, recipientIds) => {
  try {
    const emailPromises = [];

    for (const userId of recipientIds) {
      // Get user email
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().email) {
        const userEmail = userSnap.data().email;
        const userName = userSnap.data().fullName || "User";

        const subject = `🎉 Event Reminder: ${proposal.title}`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Event Reminder</h2>
            <p>Hi ${userName},</p>
            <p>This is a reminder about the upcoming event:</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #667eea;">${proposal.title}</h3>
              <p><strong>Date:</strong> ${formatDateForNotification(proposal.startDate)}</p>
              <p><strong>Time:</strong> ${formatTimeForNotification(proposal.startTime)}</p>
              <p><strong>Description:</strong> ${proposal.description || "N/A"}</p>
            </div>

            <p>Please make sure you're prepared for this event.</p>
            
            <p>Best regards,<br>Barangay Events System</p>
          </div>
        `;

        emailPromises.push(sendEmailNotification(userEmail, subject, htmlContent));
      }
    }

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`📧 Reminder emails queued for ${successCount}/${recipientIds.length} recipients`);
    return { 
      success: true, 
      message: `Reminder emails queued for ${successCount} recipient(s)`,
      emailsSent: successCount 
    };
  } catch (error) {
    console.error("Error sending event reminder emails:", error);
    return { success: false, message: error.message };
  }
};

// Function to send vote reminder emails
export const sendVoteReminderEmails = async (proposal) => {
  try {
    // Get all officials
    const officialsQuery = query(collection(db, "users"), where("role", "==", "official"));
    const officialsSnapshot = await getDocs(officialsQuery);

    if (officialsSnapshot.empty) {
      return { success: false, message: "No officials found" };
    }

    const emailPromises = [];

    for (const officialDoc of officialsSnapshot.docs) {
      const official = officialDoc.data();
      if (official.email) {
        const subject = `🗳️ Action Required: Vote Needed on "${proposal.title}"`;
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Vote Required - Pending Proposal</h2>
            <p>Hi ${official.fullName || "Official"},</p>
            <p>A proposal requires your vote:</p>
            
            <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800;">
              <h3 style="margin-top: 0; color: #ff6f00;">${proposal.title}</h3>
              <p><strong>Submitted by:</strong> ${proposal.submittedBy || "Staff Member"}</p>
              <p><strong>Description:</strong> ${proposal.description || "N/A"}</p>
              <p><strong>Status:</strong> Pending Review</p>
            </div>

            <p style="color: #d32f2f; font-weight: bold;">⚠️ Please log in to the system and cast your vote on this proposal.</p>
            
            <p>Click below to view the proposal:</p>
            <p style="text-align: center;">
              <a href="${window.location.origin}" style="background-color: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Vote Now
              </a>
            </p>
            
            <p>Best regards,<br>Barangay Events System</p>
          </div>
        `;

        emailPromises.push(sendEmailNotification(official.email, subject, htmlContent));
      }
    }

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`📧 Vote reminder emails queued for ${successCount} officials`);
    return { 
      success: true, 
      message: `Vote reminder emails queued for ${successCount} official(s)`,
      emailsSent: successCount 
    };
  } catch (error) {
    console.error("Error sending vote reminder emails:", error);
    return { success: false, message: error.message };
  }
};
