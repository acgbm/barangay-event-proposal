import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig"; // Firebase Firestore
import { collection, query, getDocs, updateDoc, doc, getDoc, addDoc, serverTimestamp, where } from "firebase/firestore";
import { supabase } from "../../firebaseConfig"; // Supabase Storage
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as pdfjsLib from "pdfjs-dist";
import bgLogo from "../../assets/bg.png";
import bg2Logo from "../../assets/bg2.png";
import "./AdminProposal.css"; // Ensure this file is styled
import { notifyApprovedEvent, notifyDeclinedEvent, notifyRescheduleEvent } from "../../services/notificationService";

// Set up PDF.js worker - dynamically load from node_modules
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ''}/pdf.worker.min.js`;
}

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

// Helper to format time
const formatTime = (timeString) => {
  if (!timeString) return "-";
  const [hours, minutes] = timeString.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

// Helper function to load image and convert to base64
const loadImageAsBase64 = (imageSrc) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        resolve({
          dataURL,
          width: img.width,
          height: img.height
        });
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      reject(error);
    };
    if (typeof imageSrc === 'string' && (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:'))) {
      img.src = imageSrc;
    } else {
      img.src = imageSrc;
    }
  });
};

// Helper function to get file type icon
const getFileTypeIcon = (extension) => {
  const ext = extension.toLowerCase();
  if (['doc', 'docx'].includes(ext)) return '📄';
  if (['xls', 'xlsx'].includes(ext)) return '📊';
  if (ext === 'pdf') return '📕';
  return '📎';
};

// Helper function to fetch file from URL and convert to base64
const fetchFileAsBase64 = async (fileUrl) => {
  try {
    const response = await fetch(fileUrl);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    throw error;
  }
};

// Helper function to convert PDF to images using canvas
const convertPdfToImages = async (pdfUrl) => {
  try {
    // Fetch the PDF as a blob first to avoid CORS issues
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.statusText}`);
    }
    const pdfBlob = await response.blob();
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    
    // Load the PDF from the array buffer
    const pdf = await pdfjsLib.getDocument({ data: pdfArrayBuffer }).promise;
    const images = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      const viewport = page.getViewport({ scale: 2 });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      images.push({
        dataURL: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      });
    }

    return images;
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    // Return null if PDF conversion fails
    return null;
  }
};

const AdminProposal = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const proposalsPerPage = 10;
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showVotesModal, setShowVotesModal] = useState(false);
  const [votesData, setVotesData] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleProposal, setRescheduleProposal] = useState(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    startDate: "",
    startTime: "",
    finishDate: "",
    finishTime: "",
  });
  
  // Search, filter, and sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all, pending, approved, cancelled, declined, rescheduled
  const [sortBy, setSortBy] = useState("date"); // date, title, status
  const [sortOrder, setSortOrder] = useState("desc"); // asc, desc
  
  // Attachment selection modal states
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [proposalForAttachmentReport, setProposalForAttachmentReport] = useState(null);
  const [selectedAttachments, setSelectedAttachments] = useState([]);

  // Fetch proposals from Firestore
  const fetchProposals = async () => {
    setLoading(true);
    try {
      const proposalsQuery = query(collection(db, "proposals"));
      const querySnapshot = await getDocs(proposalsQuery);
      const proposalsList = [];
      
      for (const docSnap of querySnapshot.docs) {
        const proposalData = docSnap.data();
        let fullName = "Unknown";
        
        if (proposalData.userId) {
          const userRef = doc(db, "users", proposalData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            fullName = userSnap.data().fullName;
          }
        }
        
        proposalsList.push({
          id: docSnap.id,
          ...proposalData,
          submitterName: fullName,
        });
      }
      
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

  // Handle opening reschedule modal
  const handleReschedule = (proposal) => {
    setRescheduleProposal(proposal);
    setRescheduleForm({
      startDate: proposal.startDate,
      startTime: proposal.startTime,
      finishDate: proposal.finishDate,
      finishTime: proposal.finishTime,
    });
    setShowRescheduleModal(true);
  };

  // Handle reschedule form input change
  const handleRescheduleFormChange = (e) => {
    const { name, value } = e.target;
    setRescheduleForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle reschedule submission
  const handleRescheduleSubmit = async () => {
    if (!rescheduleForm.startDate || !rescheduleForm.finishDate) {
      Swal.fire({
        icon: "warning",
        title: "Missing Information",
        text: "Please fill in both start and finish dates.",
      });
      return;
    }

    if (rescheduleForm.finishDate < rescheduleForm.startDate) {
      Swal.fire({
        icon: "warning",
        title: "Invalid Dates",
        text: "Finish date must be after start date.",
      });
      return;
    }

    try {
      const proposalRef = doc(db, "proposals", rescheduleProposal.id);
      await updateDoc(proposalRef, {
        startDate: rescheduleForm.startDate,
        startTime: rescheduleForm.startTime,
        finishDate: rescheduleForm.finishDate,
        finishTime: rescheduleForm.finishTime,
        status: "Pending",
        votes: {
          approve: [],
          reject: [],
        },
      });

      // Create notification for officials about the rescheduled proposal
      await addDoc(collection(db, "notifications"), {
        message: `Proposal "${rescheduleProposal.title}" has been rescheduled and requires re-voting.`,
        timestamp: serverTimestamp(),
        type: "Pending",
        status: "Pending",
        targetRole: "official",
        targetUserId: null,
        proposalId: rescheduleProposal.id,
        proposalTitle: rescheduleProposal.title || "",
      });

      // Send push notification about reschedule
      try {
        const officialsQuery = query(collection(db, "users"), where("role", "==", "official"));
        const officialsSnapshot = await getDocs(officialsQuery);
        const officialIds = [];
        officialsSnapshot.forEach(doc => officialIds.push(doc.id));
        
        // Add submitter to recipients
        const recipientIds = [rescheduleProposal.submitterId, ...officialIds];
        
        await notifyRescheduleEvent(rescheduleProposal, rescheduleForm.startDate, rescheduleForm.finishDate, recipientIds);
      } catch (notificationError) {
        console.error('Error sending reschedule notification:', notificationError);
      }

      Swal.fire({
        icon: "success",
        title: "Event Rescheduled",
        text: `The event "${rescheduleProposal.title}" has been successfully rescheduled and returned to pending status for re-voting.`,
      });

      setShowRescheduleModal(false);
      setRescheduleProposal(null);
      setRescheduleForm({
        startDate: "",
        startTime: "",
        finishDate: "",
        finishTime: "",
      });
      fetchProposals();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error Rescheduling Event",
        text: error.message,
      });
    }
  };

  // Handle close reschedule modal
  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setRescheduleProposal(null);
    setRescheduleForm({
      startDate: "",
      startTime: "",
      finishDate: "",
      finishTime: "",
    });
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

  // Handle marking event as completed
  const handleMarkComplete = async (proposal) => {
    Swal.fire({
      title: "Mark as Completed",
      text: `Mark event "${proposal.title}" as completed?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Mark Complete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const proposalRef = doc(db, "proposals", proposal.id);
          await updateDoc(proposalRef, {
            status: "Done",
            completedDate: new Date().toISOString().split("T")[0],
          });

          // Create notification for staff and officials about completion
          await addDoc(collection(db, "notifications"), {
            message: `Event "${proposal.title}" has been marked as completed.`,
            timestamp: serverTimestamp(),
            type: "Event Completed",
            status: "Done",
            targetRole: "all",
            proposalId: proposal.id,
            proposalTitle: proposal.title || "",
          });

          Swal.fire({
            icon: "success",
            title: "Event Completed",
            text: `"${proposal.title}" has been marked as completed and archived as a post-event.`,
          });

          fetchProposals();
        } catch (error) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: error.message,
          });
        }
      }
    });
  };

  const handleOpenAttachmentSelector = (proposal) => {
    setProposalForAttachmentReport(proposal);
    setSelectedAttachments([]);
    setShowAttachmentModal(true);
  };

  const handleAttachmentToggle = (attachmentIndex) => {
    setSelectedAttachments((prev) => {
      if (prev.includes(attachmentIndex)) {
        return prev.filter((idx) => idx !== attachmentIndex);
      } else {
        return [...prev, attachmentIndex];
      }
    });
  };

  const handleCloseAttachmentModal = () => {
    setShowAttachmentModal(false);
    setProposalForAttachmentReport(null);
    setSelectedAttachments([]);
  };

  const handleGenerateReportWithAttachments = async () => {
    if (proposalForAttachmentReport) {
      handleCloseAttachmentModal();
      await handleGenerateReport(proposalForAttachmentReport, selectedAttachments);
    }
  };

  // Handle report generation
  const handleGenerateReport = async (proposal, attachmentIndices = []) => {
    try {
      // Load images for the header
      const bgLogoData = await loadImageAsBase64(bgLogo);
      const bg2LogoData = await loadImageAsBase64(bg2Logo);

      const doc_pdf = new jsPDF();
      const pageWidth = doc_pdf.internal.pageSize.getWidth();
      const pageHeight = doc_pdf.internal.pageSize.getHeight();
      
      // Set up bg.png as watermark in top-right corner (4px)
      const bgLogoSize = 4; // Watermark size
      const bgLogoAspect = bgLogoData.width / bgLogoData.height;
      const bgLogoWidth = bgLogoSize * bgLogoAspect;
      const watermarkX = pageWidth - bgLogoWidth - 4; // 4px from right edge
      const watermarkY = 4; // 4px from top
      
      // Add bg2.png above title - centered
      const bg2LogoSize = 20; // bg2.png size
      const bg2LogoAspect = bg2LogoData.width / bg2LogoData.height;
      const bg2LogoWidth = bg2LogoSize * bg2LogoAspect;
      const logoY = 10;
      const bg2LogoX = (pageWidth - bg2LogoWidth) / 2; // Center bg2.png
      
      doc_pdf.addImage(bg2LogoData.dataURL, 'PNG', bg2LogoX, logoY, bg2LogoWidth, bg2LogoSize);

      // Add title below bg2.png logo
      doc_pdf.setTextColor(0, 0, 0); // Black text
      doc_pdf.setFontSize(20);
      doc_pdf.setFont(undefined, 'bold');
      const titleY = logoY + bg2LogoSize + 10;
      doc_pdf.text('BARANGAY EVENT HUB', pageWidth / 2, titleY, { align: 'center' });
      
      doc_pdf.setFontSize(14);
      doc_pdf.setFont(undefined, 'normal');
      doc_pdf.text('Barangay New Kababae', pageWidth / 2, titleY + 8, { align: 'center' });

      // Divider line
      doc_pdf.setDrawColor(200, 200, 200);
      doc_pdf.setLineWidth(0.5);
      const dividerY = titleY + 18;
      doc_pdf.line(15, dividerY, pageWidth - 15, dividerY);

      // Report title
      doc_pdf.setTextColor(0, 0, 0); // Black text
      doc_pdf.setFontSize(16);
      doc_pdf.setFont(undefined, 'bold');
      const reportTitleText = `EVENT REPORT - ${proposal.title?.toUpperCase() || 'N/A'}`;
      doc_pdf.text(reportTitleText, pageWidth / 2, dividerY + 12, { align: 'center' });

      // Date generated
      doc_pdf.setFontSize(10);
      doc_pdf.setFont(undefined, 'normal');
      doc_pdf.setTextColor(100, 100, 100);
      const generatedDate = `Generated on: ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
      doc_pdf.text(generatedDate, pageWidth / 2, dividerY + 19, { align: 'center' });

      // Event Details Table
      const eventDetails = [
        ["Description", proposal.description || "N/A"],
        ["Location", proposal.location || "N/A"],
        ["Start Date", formatDate(proposal.startDate)],
        ["Finish Date", formatDate(proposal.finishDate)],
        ["Start Time", formatTime(proposal.startTime)],
        ["Finish Time", formatTime(proposal.finishTime)],
        ["Status", proposal.status || "Pending"],
        ["Submitted By", proposal.submitterName || "Unknown"],
        ["Completed Date", proposal.completedDate ? formatDate(proposal.completedDate) : "N/A"],
      ];

      autoTable(doc_pdf, {
        startY: dividerY + 28,
        head: [["Field", "Details"]],
        body: eventDetails,
        styles: { 
          fontSize: 9,
          cellPadding: 2.5,
          textColor: [0, 0, 0],
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        theme: "striped",
        margin: { left: 15, right: 15 },
      });

      let yPosition = doc_pdf.lastAutoTable.finalY + 15;

      // Voting Information
      if (proposal.votes && (proposal.votes.approve?.length > 0 || proposal.votes.reject?.length > 0)) {
        doc_pdf.setFont(undefined, "bold");
        doc_pdf.setFontSize(12);
        doc_pdf.setTextColor(0, 0, 0);
        doc_pdf.text("Voting Summary", 15, yPosition);
        yPosition += 10;

        const votingData = [];

        // Fetch approved voters
        if (proposal.votes.approve && proposal.votes.approve.length > 0) {
          for (const userId of proposal.votes.approve) {
            try {
              const userRef = doc(db, "users", userId);
              const userSnap = await getDoc(userRef);
              const fullName = userSnap.exists() ? userSnap.data().fullName || "Unknown" : "Unknown";
              votingData.push([fullName, "Approved"]);
            } catch (error) {
              console.error("Error fetching user:", error);
              votingData.push(["Unknown", "Approved"]);
            }
          }
        }

        // Fetch rejected voters
        if (proposal.votes.reject && proposal.votes.reject.length > 0) {
          for (const userId of proposal.votes.reject) {
            try {
              const userRef = doc(db, "users", userId);
              const userSnap = await getDoc(userRef);
              const fullName = userSnap.exists() ? userSnap.data().fullName || "Unknown" : "Unknown";
              votingData.push([fullName, "Declined"]);
            } catch (error) {
              console.error("Error fetching user:", error);
              votingData.push(["Unknown", "Declined"]);
            }
          }
        }

        autoTable(doc_pdf, {
          startY: yPosition,
          head: [["Voter Name", "Vote"]],
          body: votingData,
          styles: { 
            fontSize: 9,
            cellPadding: 2.5,
            textColor: [0, 0, 0],
          },
          headStyles: {
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 10,
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
          columnStyles: {
            1: {
              halign: "center",
            },
          },
          theme: "striped",
          margin: { left: 15, right: 15 },
        });

        yPosition = doc_pdf.lastAutoTable.finalY + 15;
      }

      // Add footer and watermark on each page
      const pageCount = doc_pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc_pdf.setPage(i);
        
        // Add bg.png watermark on every page (top-right corner)
        doc_pdf.addImage(bgLogoData.dataURL, 'PNG', watermarkX, watermarkY, bgLogoWidth, bgLogoSize);
        
        // Add footer text
        doc_pdf.setFontSize(8);
        doc_pdf.setTextColor(150, 150, 150);
        doc_pdf.text(
          `Page ${i} of ${pageCount} - Barangay Event HUB | Barangay New Kababae`,
          pageWidth / 2,
          doc_pdf.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Add selected attachments on separate pages
      if (attachmentIndices.length > 0 && proposal.attachments && proposal.attachments.length > 0) {
        for (const attachmentIndex of attachmentIndices) {
          const attachment = proposal.attachments[attachmentIndex];
          if (attachment && attachment.url) {
            try {
              // Determine file type from attachment name or url
              const fileName = attachment.name || 'Document';
              const fileExtension = fileName.split('.').pop().toLowerCase();
              const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension);
              const isPdf = fileExtension === 'pdf';

              doc_pdf.addPage();
              const currentPageNum = doc_pdf.internal.getNumberOfPages();
              
              // Add header to attachment page
              doc_pdf.addImage(bg2LogoData.dataURL, 'PNG', bg2LogoX, logoY, bg2LogoWidth, bg2LogoSize);
              doc_pdf.setTextColor(0, 0, 0);
              doc_pdf.setFontSize(20);
              doc_pdf.setFont(undefined, 'bold');
              const attachHeaderTitleY = logoY + bg2LogoSize + 10;
              doc_pdf.text('BARANGAY EVENT HUB', pageWidth / 2, attachHeaderTitleY, { align: 'center' });
              
              doc_pdf.setFontSize(14);
              doc_pdf.setFont(undefined, 'normal');
              doc_pdf.text('Barangay New Kababae', pageWidth / 2, attachHeaderTitleY + 8, { align: 'center' });

              // Divider line
              doc_pdf.setDrawColor(200, 200, 200);
              doc_pdf.setLineWidth(0.5);
              const attachDividerY = attachHeaderTitleY + 18;
              doc_pdf.line(15, attachDividerY, pageWidth - 15, attachDividerY);

              // Attachment title
              doc_pdf.setTextColor(0, 0, 0);
              doc_pdf.setFontSize(12);
              doc_pdf.setFont(undefined, 'bold');
              doc_pdf.text(`Attachment: ${fileName}`, 15, attachDividerY + 12);

              let contentY = attachDividerY + 25;

              // Handle image files
              if (isImage) {
                try {
                  const imgData = await loadImageAsBase64(attachment.url);
                  const maxWidth = pageWidth - 30;
                  const maxHeight = pageHeight - contentY - 20;
                  
                  // Calculate aspect ratio
                  const imgAspectRatio = imgData.width / imgData.height;
                  let imgWidth = maxWidth;
                  let imgHeight = imgWidth / imgAspectRatio;
                  
                  if (imgHeight > maxHeight) {
                    imgHeight = maxHeight;
                    imgWidth = imgHeight * imgAspectRatio;
                  }
                  
                  // Center the image
                  const imgX = (pageWidth - imgWidth) / 2;
                  doc_pdf.addImage(imgData.dataURL, 'PNG', imgX, contentY, imgWidth, imgHeight);
                } catch (imgError) {
                  console.error(`Error embedding image ${fileName}:`, imgError);
                  doc_pdf.setFontSize(10);
                  doc_pdf.setTextColor(200, 0, 0);
                  doc_pdf.text('Unable to display image', 15, contentY);
                }
              } else if (isPdf) {
                // For PDF files, try to convert to images and embed
                try {
                  const pdfImages = await convertPdfToImages(attachment.url);
                  
                  if (pdfImages && pdfImages.length > 0) {
                    // Add each page of the PDF as a separate page in the report
                    for (let pageIdx = 0; pageIdx < pdfImages.length; pageIdx++) {
                      if (pageIdx > 0) {
                        doc_pdf.addPage();
                        // Re-add header for subsequent pages
                        doc_pdf.addImage(bg2LogoData.dataURL, 'PNG', bg2LogoX, logoY, bg2LogoWidth, bg2LogoSize);
                        doc_pdf.setTextColor(0, 0, 0);
                        doc_pdf.setFontSize(20);
                        doc_pdf.setFont(undefined, 'bold');
                        doc_pdf.text('BARANGAY EVENT HUB', pageWidth / 2, logoY + bg2LogoSize + 10, { align: 'center' });
                        doc_pdf.setFontSize(14);
                        doc_pdf.setFont(undefined, 'normal');
                        doc_pdf.text('Barangay New Kababae', pageWidth / 2, logoY + bg2LogoSize + 18, { align: 'center' });
                        contentY = logoY + bg2LogoSize + 28;
                      }
                      
                      const imgData = pdfImages[pageIdx];
                      const maxWidth = pageWidth - 30;
                      const maxHeight = pageHeight - contentY - 20;
                      
                      const imgAspectRatio = imgData.width / imgData.height;
                      let imgWidth = maxWidth;
                      let imgHeight = imgWidth / imgAspectRatio;
                      
                      if (imgHeight > maxHeight) {
                        imgHeight = maxHeight;
                        imgWidth = imgHeight * imgAspectRatio;
                      }
                      
                      const imgX = (pageWidth - imgWidth) / 2;
                      doc_pdf.addImage(imgData.dataURL, 'PNG', imgX, contentY, imgWidth, imgHeight);
                    }
                  } else {
                    // Fallback if PDF conversion returns null
                    doc_pdf.setFontSize(10);
                    doc_pdf.setTextColor(100, 100, 100);
                    doc_pdf.setFont(undefined, 'normal');
                    doc_pdf.text('📕 PDF Document: ' + fileName, 15, contentY);
                    contentY += 8;
                    doc_pdf.setFontSize(9);
                    doc_pdf.setTextColor(150, 150, 150);
                    doc_pdf.text('(PDF conversion not available - file is stored in attachments)', 15, contentY);
                  }
                } catch (pdfError) {
                  console.error(`Error converting PDF ${fileName}:`, pdfError);
                  doc_pdf.setFontSize(10);
                  doc_pdf.setTextColor(100, 100, 100);
                  doc_pdf.setFont(undefined, 'normal');
                  doc_pdf.text('📕 PDF Document: ' + fileName, 15, contentY);
                  contentY += 8;
                  doc_pdf.setFontSize(9);
                  doc_pdf.setTextColor(150, 150, 150);
                  doc_pdf.text('(Error converting PDF to images)', 15, contentY);
                  contentY += 6;
                  doc_pdf.setFontSize(8);
                  doc_pdf.text('The original PDF file remains in your attachments.', 15, contentY);
                }
              } else {
                // For other file types (doc, docx, xls, xlsx, etc.)
                doc_pdf.setFontSize(11);
                doc_pdf.setTextColor(100, 100, 100);
                doc_pdf.setFont(undefined, 'normal');
                const fileTypeIcon = getFileTypeIcon(fileExtension);
                doc_pdf.text(`${fileTypeIcon} Document: ${fileName}`, 15, contentY);
                contentY += 10;
                doc_pdf.setFontSize(9);
                doc_pdf.text(`File type: ${fileExtension.toUpperCase()}`, 15, contentY);
                contentY += 5;
                doc_pdf.text('This file type cannot be displayed in the report.', 15, contentY);
              }

              // Add watermark to attachment page
              doc_pdf.addImage(bgLogoData.dataURL, 'PNG', watermarkX, watermarkY, bgLogoWidth, bgLogoSize);
              
              // Add footer to attachment page
              doc_pdf.setFontSize(8);
              doc_pdf.setTextColor(150, 150, 150);
              doc_pdf.text(
                `Page ${currentPageNum} of ${doc_pdf.internal.getNumberOfPages()} - Barangay Event HUB | Barangay New Kababae`,
                pageWidth / 2,
                doc_pdf.internal.pageSize.getHeight() - 10,
                { align: 'center' }
              );
            } catch (error) {
              console.error(`Error adding attachment ${attachment.name}:`, error);
            }
          }
        }
      }

      // Download PDF
      doc_pdf.save(`Event_Report_${proposal.title?.replace(/\s+/g, "_")}.pdf`);

      Swal.fire({
        icon: "success",
        title: "Report Generated",
        text: `Report for "${proposal.title}" has been downloaded successfully.`,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      Swal.fire({
        icon: "error",
        title: "Error Generating Report",
        text: error.message,
      });
    }
  };

  // Handle file upload for report purposes with Supabase and support for multiple files
  const handleFileUpload = async (event, proposalId) => {
    const fileList = event.target.files;
    if (!fileList || fileList.length === 0) return;

    // Supported file types
    const supportedTypes = [
      "application/pdf", // PDF
      "application/msword", // DOC
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
      "application/vnd.ms-excel", // XLS
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
      "image/jpeg", // JPG
      "image/png", // PNG
    ];

    // Convert FileList to Array for filtering
    let filesToUpload = Array.from(fileList);

    // Validate file types
    const invalidFiles = filesToUpload.filter(f => !supportedTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      Swal.fire({
        icon: "warning",
        title: "Invalid File Type",
        text: `Only PDF, DOC, DOCX, XLS, XLSX, JPG, and PNG files are supported. ${invalidFiles.length} file(s) were skipped.`,
      });
      // Filter out invalid files
      filesToUpload = filesToUpload.filter(f => supportedTypes.includes(f.type));
      if (filesToUpload.length === 0) {
        event.target.value = "";
        return;
      }
    }

    try {
      Swal.fire({
        title: `Uploading ${filesToUpload.length} File(s)`,
        text: "Please wait while your files are being uploaded...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      const proposalRef = doc(db, "proposals", proposalId);
      const proposalSnap = await getDoc(proposalRef);
      const existingAttachments = proposalSnap.data()?.attachments || [];
      const newAttachments = [];

      // Upload each file
      for (let file of filesToUpload) {
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `proposals/admin/${proposalId}/${fileName}`;

        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
          .from("proposals")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (error) {
          throw new Error(`Upload Error for ${file.name}: ${error.message}`);
        }

        // Get the public URL of the uploaded file
        const { data: publicData } = supabase.storage
          .from("proposals")
          .getPublicUrl(filePath);

        newAttachments.push({
          name: file.name,
          url: publicData.publicUrl,
          uploadedAt: new Date().toISOString(),
          uploadedBy: "Admin",
          fileType: file.type,
          fileSize: file.size,
        });
      }

      // Update proposal with new attachments
      await updateDoc(proposalRef, {
        attachments: [...existingAttachments, ...newAttachments],
      });

      Swal.fire({
        icon: "success",
        title: "Files Uploaded",
        text: `${filesToUpload.length} file(s) have been uploaded successfully.`,
      });

      // Refresh the selected proposal while preserving all existing data
      setSelectedProposal(prevState => ({
        ...prevState,
        attachments: [...existingAttachments, ...newAttachments],
      }));

      // Refresh proposals list
      fetchProposals();
    } catch (error) {
      console.error("Error uploading files:", error);
      Swal.fire({
        icon: "error",
        title: "Upload Error",
        text: error.message || "Failed to upload files.",
      });
    }

    // Reset file input
    event.target.value = "";
  };

  // Handle removing attachment
  const handleRemoveAttachment = async (proposalId, attachmentUrl) => {
    Swal.fire({
      title: "Remove Attachment",
      text: "Are you sure you want to delete this attachment?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const proposalRef = doc(db, "proposals", proposalId);
          const proposalSnap = await getDoc(proposalRef);
          const currentAttachments = proposalSnap.data()?.attachments || [];

          // Filter out the attachment to remove
          const updatedAttachments = currentAttachments.filter(
            (att) => att.url !== attachmentUrl
          );

          // Update proposal
          await updateDoc(proposalRef, {
            attachments: updatedAttachments,
          });

          // Update state
          setSelectedProposal((prevState) => ({
            ...prevState,
            attachments: updatedAttachments,
          }));

          // Refresh proposals list
          fetchProposals();

          Swal.fire({
            icon: "success",
            title: "Attachment Removed",
            text: "Attachment has been deleted successfully.",
          });
        } catch (error) {
          console.error("Error removing attachment:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: error.message || "Failed to remove attachment.",
          });
        }
      }
    });
  };

  // Handle view details modal
  const handleViewDetails = (proposal) => {
    setSelectedProposal(proposal);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProposal(null);
  };

  const handleViewAttachment = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleViewVotes = async (proposal) => {
    try {
      // Fetch fullNames for approve votes
      let approveVoters = [];
      if (proposal.votes?.approve && proposal.votes.approve.length > 0) {
        approveVoters = await Promise.all(
          proposal.votes.approve.map(async (userId) => {
            try {
              const userRef = doc(db, "users", userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                return { userId, fullName: userSnap.data().fullName || "Unknown" };
              }
              return { userId, fullName: "Unknown" };
            } catch (error) {
              console.error("Error fetching user:", error);
              return { userId, fullName: "Unknown" };
            }
          })
        );
      }

      // Fetch fullNames for reject votes
      let rejectVoters = [];
      if (proposal.votes?.reject && proposal.votes.reject.length > 0) {
        rejectVoters = await Promise.all(
          proposal.votes.reject.map(async (userId) => {
            try {
              const userRef = doc(db, "users", userId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                return { userId, fullName: userSnap.data().fullName || "Unknown" };
              }
              return { userId, fullName: "Unknown" };
            } catch (error) {
              console.error("Error fetching user:", error);
              return { userId, fullName: "Unknown" };
            }
          })
        );
      }

      // Set votes data with fullNames
      setVotesData({
        ...proposal,
        approveVoters,
        rejectVoters,
      });
      setShowVotesModal(true);
    } catch (error) {
      console.error("Error viewing votes:", error);
      setVotesData(proposal);
      setShowVotesModal(true);
    }
  };

  const handleCloseVotesModal = () => {
    setShowVotesModal(false);
    setVotesData(null);
  };

  // Search function
  const searchProposals = (proposalsList, query) => {
    if (!query.trim()) return proposalsList;
    
    const searchTerm = query.toLowerCase();
    return proposalsList.filter((proposal) => {
      const title = (proposal.title || "").toLowerCase();
      const location = (proposal.location || "").toLowerCase();
      const submitter = (proposal.submitterName || "").toLowerCase();
      const description = (proposal.description || "").toLowerCase();
      
      return title.includes(searchTerm) || 
             location.includes(searchTerm) || 
             submitter.includes(searchTerm) ||
             description.includes(searchTerm);
    });
  };

  // Sort function
  const sortProposals = (proposalsList, sortField, order) => {
    const sorted = [...proposalsList].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortField) {
        case "title":
          aValue = (a.title || "").toLowerCase();
          bValue = (b.title || "").toLowerCase();
          break;
        case "status":
          aValue = (a.status || "").toLowerCase();
          bValue = (b.status || "").toLowerCase();
          break;
        case "date":
          aValue = new Date(a.startDate || 0).getTime();
          bValue = new Date(b.startDate || 0).getTime();
          break;
        default:
          return 0;
      }
      
      if (typeof aValue === "string") {
        return order === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return order === "asc" ? aValue - bValue : bValue - aValue;
      }
    });
    
    return sorted;
  };

  // Determine the color of the status text
  const getStatusColor = (status) => {
    switch (status) {
      case "Approved":
        return "#2ecc40"; // green
      case "Pending":
        return "#f59e0b"; // yellow
      case "Rejected":
        return "#e74c3c"; // red (shown as Declined)
      case "Declined (Missed Deadline)":
        return "#e74c3c"; // red
      case "Cancelled":
        return "#888"; // gray
      case "Rescheduled":
        return "#6c63ff"; // purple/blue
      case "Done":
        return "#2563eb"; // blue
      default:
        return "#22223b";
    }
  };

  // Filter and process proposals
  const baseFilteredProposals = statusFilter === "all"
    ? proposals
    : proposals.filter((p) => {
        const status = (p.status || "").toLowerCase();
        if (statusFilter === "declined") {
          return status.includes("declined") || status.includes("missed deadline");
        }
        return status === statusFilter.toLowerCase();
      });

  const searchedProposals = searchProposals(baseFilteredProposals, searchQuery);
  const sortedProposals = sortProposals(searchedProposals, sortBy, sortOrder);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(sortedProposals.length / proposalsPerPage);
  const indexOfLastProposal = currentPage * proposalsPerPage;
  const indexOfFirstProposal = indexOfLastProposal - proposalsPerPage;
  const currentProposals = sortedProposals.slice(indexOfFirstProposal, indexOfLastProposal);

  return (
    <div className="admin-proposal">
      <h2>Proposals</h2>
      {loading ? <p>Loading proposals...</p> : null}
      
      {/* Search, Filter, and Sort Controls */}
      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by title, location, or submitter..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-sort-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rescheduled">Rescheduled</option>
            <option value="declined">Declined</option>
            <option value="cancelled">Cancelled</option>
            <option value="declined">Declined</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
            <option value="status">Sort by Status</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="sort-order-btn"
            title={sortOrder === "asc" ? "Sort Descending" : "Sort Ascending"}
          >
            {sortOrder === "asc" ? "↓" : "↑"}
          </button>
        </div>
      </div>

      {sortedProposals.length > 0 && (
        <div className="results-count">
          Showing {currentProposals.length} of {sortedProposals.length} proposal{sortedProposals.length !== 1 ? 's' : ''}
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Status</th>
              <th>Votes</th>
              <th>View Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProposals.map((proposal) => (
              <tr key={proposal.id}>
                <td>{proposal.title}</td>
                <td>{formatDate(proposal.startDate)} - {formatDate(proposal.finishDate)}</td>
                <td>
                  <span className="status-badge" style={{ background: getStatusColor(proposal.status)+"22", color: getStatusColor(proposal.status) }}>
                    {proposal.status === "Rejected" ? "Declined" : (proposal.status || "Pending")}
                  </span>
                </td>
                <td className="votes-cell">
                  {proposal.votes && (proposal.votes.approve?.length > 0 || proposal.votes.reject?.length > 0) ? (
                    <button className="votes-button" onClick={() => handleViewVotes(proposal)}>
                      👍 {proposal.votes.approve?.length ?? 0} | 👎 {proposal.votes.reject?.length ?? 0}
                    </button>
                  ) : (
                    <span className="no-votes-text">No votes yet</span>
                  )}
                </td>
                <td className="view-details-cell">
                  <button className="viewDetailsButton" onClick={() => handleViewDetails(proposal)}>View Details</button>
                </td>
                <td className={
                  proposal.status === "Approved"
                    ? "action-buttons"
                    : "no-actions-cell"
                }>
                  {proposal.status === "Approved" && (
                    <>
                      <button className="rescheduleButton" onClick={() => handleReschedule(proposal)}>Reschedule</button>
                      <button className="cancelButton" onClick={() => handleCancel(proposal)}>Cancel</button>
                    </>
                  )}
                  {(proposal.status === "Cancelled" || proposal.status === "Rejected" || proposal.status === "Pending" || proposal.status === "Declined (Missed Deadline)" || proposal.status === "Rescheduled" || proposal.status === "Done") && (
                    <span className="no-actions-text">No actions available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination Controls */}
      <div className="pagination-container">
        <button
          className="pagination-button"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span className="pagination-info">
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="pagination-button"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          Next
        </button>
      </div>

      {/* Modal for Viewing Proposal Details */}
      {showModal && selectedProposal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <h2>{selectedProposal.title}</h2>
                <span className="modal-status-badge" style={{ background: getStatusColor(selectedProposal.status)+"22", color: getStatusColor(selectedProposal.status) }}>
                  {selectedProposal.status === "Rejected" ? "Declined" : (selectedProposal.status || "Pending")}
                </span>
              </div>
              <button className="modal-close-btn" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* Primary Details Section */}
              <div className="modal-section">
                <h3 className="section-title">Event Details</h3>
                <div className="modal-details-grid">
                  <div className="modal-detail-item">
                    <span className="detail-label">Description</span>
                    <span className="detail-value full-width-text">{selectedProposal.description || "No description provided"}</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{selectedProposal.location || "-"}</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="detail-label">Start</span>
                    <span className="detail-value">{formatDate(selectedProposal.startDate)}, {formatTime(selectedProposal.startTime)}</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="detail-label">End</span>
                    <span className="detail-value">{formatDate(selectedProposal.finishDate)}, {formatTime(selectedProposal.finishTime)}</span>
                  </div>
                  <div className="modal-detail-item">
                    <span className="detail-label">Submitted By</span>
                    <span className="detail-value">{selectedProposal.submitterName || "Unknown"}</span>
                  </div>
                </div>
              </div>

              {/* Additional Notes Section */}
              {selectedProposal.note && (
                <div className="modal-section">
                  <h3 className="section-title">Notes</h3>
                  <div className="note-box">
                    {selectedProposal.note}
                  </div>
                </div>
              )}

              {/* Attachments Section */}
              {(selectedProposal.fileURL || (selectedProposal.attachments && selectedProposal.attachments.length > 0)) && (
                <div className="modal-section">
                  <h3 className="section-title">Attachments</h3>
                  <div className="attachments-container">
                    {selectedProposal.fileURL && (
                      <div className="attachment-item">
                        <span className="attachment-label">📄 Main Attachment</span>
                        <div className="attachment-actions">
                          <button
                            className="btn-view-attachment"
                            onClick={() => handleViewAttachment(selectedProposal.fileURL)}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    )}
                    {selectedProposal.attachments && selectedProposal.attachments.length > 0 && (
                      <>
                        {selectedProposal.attachments.map((attachment, index) => (
                          <div key={index} className="attachment-item">
                            <span className="attachment-label">📎 {attachment.name || `Attachment ${index + 1}`}</span>
                            <div className="attachment-actions">
                              <button
                                className="btn-view-attachment"
                                onClick={() => handleViewAttachment(attachment.url)}
                              >
                                View
                              </button>
                              <button
                                className="btn-remove-attachment"
                                onClick={() => handleRemoveAttachment(selectedProposal.id, attachment.url)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Cancellation Reason Section */}
              {selectedProposal.cancellationReason && (
                <div className="modal-section">
                  <h3 className="section-title warning">Cancellation Reason</h3>
                  <div className="cancellation-box">
                    {selectedProposal.cancellationReason}
                  </div>
                </div>
              )}

              {/* Voting Section */}
              {selectedProposal.votes && (selectedProposal.votes.approve?.length > 0 || selectedProposal.votes.reject?.length > 0) && (
                <div className="modal-section">
                  <h3 className="section-title">Voting Summary</h3>
                  <div className="votes-container">
                    <div className="vote-card approve">
                      <span className="vote-label">Approvals</span>
                      <span className="vote-number">{selectedProposal.votes?.approve?.length ?? 0}</span>
                    </div>
                    <div className="vote-card reject">
                      <span className="vote-label">Rejections</span>
                      <span className="vote-number">{selectedProposal.votes?.reject?.length ?? 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <div className="footer-content">
                <div className="action-buttons-row">
                  <button className="btn-generate-report" onClick={() => handleOpenAttachmentSelector(selectedProposal)}>
                    📊 Generate Report
                  </button>
                  <label htmlFor="attachment-upload" className="btn-attach-file">
                    📎 Add Attachment
                  </label>
                  <input
                    id="attachment-upload"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    className="file-input-hidden"
                    onChange={(e) => handleFileUpload(e, selectedProposal.id)}
                  />
                </div>
                {selectedProposal.status === "Approved" && (
                  <button className="btn-mark-complete" onClick={() => handleMarkComplete(selectedProposal)}>
                    ✓ Mark as Completed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Viewing Votes Details */}
      {showVotesModal && votesData && (
        <div className="modal-overlay" onClick={handleCloseVotesModal}>
          <div className="modal-content votes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Votes - {votesData.title}</h2>
              <button className="modal-close-btn" onClick={handleCloseVotesModal}>
                ×
              </button>
            </div>
            <div className="modal-body votes-modal-body">
              <div className="votes-table-wrapper">
                <table className="votes-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Vote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {votesData.approveVoters && votesData.approveVoters.map((voter) => (
                      <tr key={`approve-${voter.userId}`} className="vote-row approve-row">
                        <td className="voter-name-cell">{voter.fullName}</td>
                        <td className="vote-badge-cell">
                          <span className="vote-badge approve-badge">✓ Approved</span>
                        </td>
                      </tr>
                    ))}
                    {votesData.rejectVoters && votesData.rejectVoters.map((voter) => (
                      <tr key={`reject-${voter.userId}`} className="vote-row reject-row">
                        <td className="voter-name-cell">{voter.fullName}</td>
                        <td className="vote-badge-cell">
                          <span className="vote-badge reject-badge">✕ Declined</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!votesData.approveVoters || votesData.approveVoters.length === 0) && 
                 (!votesData.rejectVoters || votesData.rejectVoters.length === 0) && (
                  <div className="no-votes-message">
                    <p>No votes recorded yet for this proposal.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Rescheduling Event */}
      {showRescheduleModal && rescheduleProposal && (
        <div className="modal-overlay" onClick={handleCloseRescheduleModal}>
          <div className="modal-content reschedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reschedule Event: {rescheduleProposal.title}</h2>
              <button className="modal-close-btn" onClick={handleCloseRescheduleModal}>
                ×
              </button>
            </div>
            <div className="modal-body reschedule-modal-body">
              <div className="form-section">
                <h3>Start Date & Time</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={rescheduleForm.startDate}
                      onChange={handleRescheduleFormChange}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      value={rescheduleForm.startTime}
                      onChange={handleRescheduleFormChange}
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Finish Date & Time</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Finish Date</label>
                    <input
                      type="date"
                      name="finishDate"
                      value={rescheduleForm.finishDate}
                      onChange={handleRescheduleFormChange}
                      min={rescheduleForm.startDate || new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div className="form-group">
                    <label>Finish Time</label>
                    <input
                      type="time"
                      name="finishTime"
                      value={rescheduleForm.finishTime}
                      onChange={handleRescheduleFormChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseRescheduleModal}>
                Cancel
              </button>
              <button className="btn-submit" onClick={handleRescheduleSubmit}>
                Reschedule Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Selecting Attachments to Include in Report */}
      {showAttachmentModal && proposalForAttachmentReport && (
        <div className="modal-overlay" onClick={handleCloseAttachmentModal}>
          <div className="modal-content attachment-selection-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Select Attachments for Report</h2>
              <button className="modal-close-btn" onClick={handleCloseAttachmentModal}>
                ×
              </button>
            </div>
            <div className="modal-body attachment-selection-body">
              {proposalForAttachmentReport.attachments && proposalForAttachmentReport.attachments.length > 0 ? (
                <div className="attachments-checklist">
                  <p className="info-text">Select one or more attachments to include in the report (each will appear on a separate page):</p>
                  {proposalForAttachmentReport.attachments.map((attachment, index) => (
                    <div key={index} className="attachment-checkbox-item">
                      <input
                        type="checkbox"
                        id={`attachment-${index}`}
                        checked={selectedAttachments.includes(index)}
                        onChange={() => handleAttachmentToggle(index)}
                      />
                      <label htmlFor={`attachment-${index}`}>
                        <span className="attachment-name">{attachment.name || `Attachment ${index + 1}`}</span>
                        <span className="attachment-meta">
                          {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(2)} KB` : ''} - {attachment.uploadedAt ? new Date(attachment.uploadedAt).toLocaleDateString() : ''}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-attachments-message">
                  <p>No attachments available for this proposal.</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseAttachmentModal}>
                Cancel
              </button>
              <button 
                className="btn-generate-with-attachments" 
                onClick={handleGenerateReportWithAttachments}
                disabled={proposalForAttachmentReport.attachments?.length === 0}
              >
                📊 Generate Report {selectedAttachments.length > 0 ? `(${selectedAttachments.length} attachment${selectedAttachments.length > 1 ? 's' : ''})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProposal;
