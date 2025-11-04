import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import bgLogo from "../../assets/bg.png";
import bg2Logo from "../../assets/bg2.png";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [proposals, setProposals] = useState([]);
  const [staffCount, setStaffCount] = useState(0);
  const [statistics, setStatistics] = useState({
    upcoming: 0,
    pending: 0,
    cancelled: 0,
    rejected: 0,
    submittedThisMonth: 0,
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState("pdf");
  const [timePeriod, setTimePeriod] = useState("monthly"); // weekly, monthly, yearly

  useEffect(() => {
    fetchProposals();
    fetchUsers();
  }, []);

  const fetchProposals = async () => {
    try {
      const proposalsSnapshot = await getDocs(collection(db, "proposals"));
      const fetchedProposals = [];
    
      // Fetch user data for each proposal to populate `submittedBy` with full name
      for (const docSnap of proposalsSnapshot.docs) {
        const proposalData = docSnap.data();
        const createdAt = proposalData.createdAt?.toDate?.() || null;
    
        let fullName = "Unknown";  // Default value if fullName is not found
    
        if (proposalData.userId) {
          const userRef = doc(db, "users", proposalData.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            fullName = userSnap.data().fullName || "Unknown"; // Use fullName directly
          }
        }
    
        fetchedProposals.push({
          ...proposalData,
          id: docSnap.id,
          submittedBy: fullName,
          dateSubmitted: createdAt,
        });
      }
    
      setProposals(fetchedProposals);
      computeStatistics(fetchedProposals);
    } catch (err) {
      console.error("Error fetching proposals:", err);
    }
  };  

  const fetchUsers = async () => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
      const filteredUsers = snapshot.docs.filter(
        (doc) => {
          const role = doc.data().role?.toLowerCase();
          return role === "staff" || role === "official";
        }
      );
      setStaffCount(filteredUsers.length);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const computeStatistics = (data) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const upcoming = data.filter(
      (p) => p.status === "Approved" && new Date(p.date) > now
    ).length;
    const pending = data.filter((p) => p.status === "Pending").length;
    const cancelled = data.filter((p) => p.status === "Cancelled").length;
    const rejected = data.filter((p) => {
      const status = (p.status || "").toLowerCase();
      return status === "rejected" || status.includes("declined");
    }).length;
    const submittedThisMonth = data.filter((p) => {
      const date = new Date(p.dateSubmitted || p.date);
      return (
        date.getMonth() === currentMonth && date.getFullYear() === currentYear
      );
    }).length;

    setStatistics({
      upcoming,
      pending,
      cancelled,
      rejected,
      submittedThisMonth,
    });
  };


  // Helper to get filtered proposals by month/year
  const getFilteredProposals = () => {
    return proposals.filter((p) => {
      const date = new Date(p.dateSubmitted || p.date);
      return (
        date.getMonth() === Number(selectedMonth) &&
        date.getFullYear() === Number(selectedYear)
      );
    });
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
      // If it's already a base64 string or blob URL, use it directly
      if (typeof imageSrc === 'string' && (imageSrc.startsWith('data:') || imageSrc.startsWith('blob:'))) {
        img.src = imageSrc;
      } else {
        // For imported images, they should already be URLs from webpack
        img.src = imageSrc;
      }
    });
  };

  const normalizeStatusLabel = (status) => {
    if (!status) return "N/A";
    return status === "Rejected" ? "Declined" : status;
  };

  // Generate trend data for a specific period (weekly, monthly, yearly)
  const generateTrendDataFor = (period) => {
    const backup = timePeriod;
    // Temporarily compute using existing logic by branching on period
    const now = new Date();
    const dataPoints = [];
    if (period === "weekly") {
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + diff);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        const weekLabel = `${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
        const weekProposals = proposals.filter((p) => {
          const proposalDate = new Date(p.dateSubmitted || p.date);
          return proposalDate >= weekStart && proposalDate <= weekEnd;
        });
        const approved = weekProposals.filter((p) => p.status === "Approved").length;
        const pending = weekProposals.filter((p) => p.status === "Pending").length;
        const cancelled = weekProposals.filter((p) => p.status === "Cancelled").length;
        const declined = weekProposals.filter((p) => {
          const s = (p.status || "").toLowerCase();
          return s === "rejected" || s.includes("declined");
        }).length;
        dataPoints.push({ period: weekLabel, Approved: approved, Pending: pending, Cancelled: cancelled, Declined: declined, Total: weekProposals.length });
      }
    } else if (period === "monthly") {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        const monthProposals = proposals.filter((p) => {
          const proposalDate = new Date(p.dateSubmitted || p.date);
          return (
            proposalDate.getMonth() === date.getMonth() &&
            proposalDate.getFullYear() === date.getFullYear()
          );
        });
        const approved = monthProposals.filter((p) => p.status === "Approved").length;
        const pending = monthProposals.filter((p) => p.status === "Pending").length;
        const cancelled = monthProposals.filter((p) => p.status === "Cancelled").length;
        const declined = monthProposals.filter((p) => {
          const s = (p.status || "").toLowerCase();
          return s === "rejected" || s.includes("declined");
        }).length;
        dataPoints.push({ period: monthName, Approved: approved, Pending: pending, Cancelled: cancelled, Declined: declined, Total: monthProposals.length });
      }
    } else if (period === "yearly") {
      for (let i = 7; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const yearProposals = proposals.filter((p) => {
          const proposalDate = new Date(p.dateSubmitted || p.date);
          return proposalDate.getFullYear() === year;
        });
        const approved = yearProposals.filter((p) => p.status === "Approved").length;
        const pending = yearProposals.filter((p) => p.status === "Pending").length;
        const cancelled = yearProposals.filter((p) => p.status === "Cancelled").length;
        const declined = yearProposals.filter((p) => {
          const s = (p.status || "").toLowerCase();
          return s === "rejected" || s.includes("declined");
        }).length;
        dataPoints.push({ period: year.toString(), Approved: approved, Pending: pending, Cancelled: cancelled, Declined: declined, Total: yearProposals.length });
      }
    }
    return dataPoints;
  };

  const drawTrendChart = (doc, data, title, x, y, width, height) => {
    // Margins inside chart area - balanced for better centering
    const leftPad = 18; const rightPad = 18; const topPad = 20; const bottomPad = 38; // Increased for date labels
    const plotX = x + leftPad; const plotY = y + topPad;
    const plotW = width - leftPad - rightPad; const plotH = height - topPad - bottomPad;
    // Title
    doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text(title, x + width / 2, y + 10, { align: 'center' });
    // Axes & grid
    doc.setDrawColor(220);
    // Y grid lines (4 divisions)
    for (let i = 0; i <= 4; i++) {
      const gy = plotY + (i * (plotH / 4));
      doc.line(plotX, gy, plotX + plotW, gy);
    }
    // Axes
    doc.setDrawColor(200);
    doc.line(plotX, plotY, plotX, plotY + plotH);
    doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
    // Determine max value
    const seriesKeys = ["Approved", "Pending", "Cancelled", "Declined"];
    const maxVal = Math.max(1, ...data.flatMap(d => seriesKeys.map(k => d[k] || 0)));
    // Helper to map point
    const px = (i) => plotX + (i * (plotW / Math.max(1, data.length - 1)));
    const py = (v) => plotY + plotH - (v / maxVal) * plotH;
    // X-axis date labels
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    const labelY = plotY + plotH + 8;
    data.forEach((d, i) => {
      const x1 = px(i);
      const periodText = d.period || '';
      // Truncate long labels if needed
      const maxLabelWidth = plotW / data.length;
      let displayText = periodText;
      if (doc.getTextWidth(displayText) > maxLabelWidth - 2) {
        // Try to shorten the text
        while (doc.getTextWidth(displayText) > maxLabelWidth - 2 && displayText.length > 0) {
          displayText = displayText.substring(0, displayText.length - 1);
        }
        if (displayText.length < periodText.length) {
          displayText = displayText + '...';
        }
      }
      doc.text(displayText, x1, labelY, { align: 'center', angle: 0 });
    });
    const colorMap = {
      Approved: '#10b981',
      Pending: '#f59e0b',
      Cancelled: '#f97316',
      Declined: '#ef4444',
    };
    // Draw lines
    seriesKeys.forEach((key) => {
      doc.setDrawColor(colorMap[key]); doc.setLineWidth(1.8);
      data.forEach((d, i) => {
        const x1 = px(i);
        const y1 = py(d[key] || 0);
        if (i > 0) {
          const x0 = px(i - 1);
          const y0 = py(data[i - 1][key] || 0);
          doc.line(x0, y0, x1, y1);
        }
      });
      // Draw points and value labels
      data.forEach((d, i) => {
        const x1 = px(i);
        const y1 = py(d[key] || 0);
        doc.setFillColor(colorMap[key]);
        doc.circle(x1, y1, 1.8, 'F');
        // value label above point
        doc.setFontSize(8);
        doc.setTextColor(55);
        doc.text(String(d[key] || 0), x1, y1 - 3, { align: 'center' });
      });
    });
    // Legend (centered) - Always show Approved, Pending, Cancelled, Declined
    const legendItems = ["Approved", "Pending", "Cancelled", "Declined"];
    doc.setFontSize(8); doc.setFont(undefined, 'normal');
    // Calculate text widths for proper spacing
    const textWidths = legendItems.map(item => doc.getTextWidth(item));
    const maxTextWidth = Math.max(...textWidths);
    const legendItemWidth = maxTextWidth + 16; // 6px box + 2px gap + text width + 8px after
    const totalLegendWidth = legendItems.length * legendItemWidth;
    const legendX = x + (width - totalLegendWidth) / 2;
    const legendY = labelY + 6; // Position legend above date labels
    
    legendItems.forEach((k, idx) => {
      const lx = legendX + idx * legendItemWidth;
      doc.setFillColor(colorMap[k]); 
      doc.rect(lx, legendY - 3, 5, 5, 'F');
      doc.setTextColor(0,0,0); 
      doc.text(k, lx + 7, legendY + 1);
    });
  };

  const downloadReport = async () => {
    const filteredProposals = getFilteredProposals();
    const monthName = new Date(0, selectedMonth).toLocaleString('default', { month: 'long' });
    const reportTitle = `Proposals Report - ${monthName} ${selectedYear}`;

    if (reportType === "excel") {
      // Create header rows
      const headerRows = [
        ['BARANGAY EVENT HUB', '', '', '', '', ''],
        ['Barangay New Kababae', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        [reportTitle, '', '', '', '', ''],
        [`Generated on: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`, '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['Title', 'Status', 'Event Date', 'Submitted By', 'Date Submitted', 'Location'],
      ];

      // Create data rows
      const dataRows = filteredProposals.map((p) => [
        p.title || "N/A",
        normalizeStatusLabel(p.status),
        p.date ? new Date(p.date).toLocaleDateString() : "N/A",
        p.submittedBy || "N/A",
        p.dateSubmitted ? new Date(p.dateSubmitted).toLocaleDateString() : "N/A",
        p.location || "N/A",
      ]);

      // Combine all rows
      const allRows = [...headerRows, ...dataRows];
      
      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(allRows);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 30 }, // Title
        { wch: 15 }, // Status
        { wch: 15 }, // Event Date
        { wch: 20 }, // Submitted By
        { wch: 18 }, // Date Submitted
        { wch: 25 }, // Location
      ];

      // Merge header cells (rows 0-4, columns A-F)
      if (!worksheet['!merges']) worksheet['!merges'] = [];
      // Merge first row (BARANGAY EVENT HUB)
      worksheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } });
      // Merge second row (Barangay New Kababae)
      worksheet['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 5 } });
      // Merge report title row
      worksheet['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 5 } });
      // Merge generated date row
      worksheet['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 5 } });

      // Style header cells - Note: XLSX.js has limited styling support
      // Basic formatting can be applied, but advanced styling may require additional libraries
      const titleCell = worksheet['A1'];
      if (titleCell) {
        titleCell.s = {
          font: { bold: true, sz: 18 },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
      
      const subtitleCell = worksheet['A2'];
      if (subtitleCell) {
        subtitleCell.s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      const reportTitleCell = worksheet['A4'];
      if (reportTitleCell) {
        reportTitleCell.s = {
          font: { bold: true, sz: 12 },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      // Style column headers (row 6)
      ['A7', 'B7', 'C7', 'D7', 'E7', 'F7'].forEach(cell => {
        if (worksheet[cell]) {
          worksheet[cell].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "2563EB" } }
          };
        }
      });

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Proposals Report");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(file, `BEHUB_report_${selectedMonth + 1}_${selectedYear}.xlsx`);
    } else {
      try {
        // Load images
        const bgLogoData = await loadImageAsBase64(bgLogo);
        const bg2LogoData = await loadImageAsBase64(bg2Logo);

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
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
        
        doc.addImage(bg2LogoData.dataURL, 'PNG', bg2LogoX, logoY, bg2LogoWidth, bg2LogoSize);

        // Add title below bg2.png logo
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        const titleY = logoY + bg2LogoSize + 10;
        doc.text('BARANGAY EVENT HUB', pageWidth / 2, titleY, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'normal');
        doc.text('Barangay New Kababae', pageWidth / 2, titleY + 8, { align: 'center' });

        // Divider line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.5);
        const dividerY = titleY + 18;
        doc.line(15, dividerY, pageWidth - 15, dividerY);

        // Report title
        doc.setTextColor(0, 0, 0); // Black text
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        const reportTitleText = `PROPOSALS REPORT - ${monthName.toUpperCase()} ${selectedYear}`;
        doc.text(reportTitleText, pageWidth / 2, dividerY + 12, { align: 'center' });

        // Date generated
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        const generatedDate = `Generated on: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`;
        doc.text(generatedDate, pageWidth / 2, dividerY + 19, { align: 'center' });

        // Table data with time included
        const tableData = filteredProposals.map((p) => [
          p.title || "N/A",
          normalizeStatusLabel(p.status),
          p.date ? new Date(p.date).toLocaleString('en-US', { 
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : "N/A",
          p.submittedBy || "N/A",
          p.dateSubmitted ? new Date(p.dateSubmitted).toLocaleString('en-US', { 
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          }) : "N/A",
          p.location || "N/A",
        ]);

        // Use full width with minimal margins for table
        const tableStartY = dividerY + 28;
        const tableMargin = 10; // Minimal margin on each side for full width
        
        // Add table with professional styling - full width
        autoTable(doc, {
          head: [["Title", "Status", "Event Date & Time", "Submitted By", "Date Submitted & Time", "Location"]],
          body: tableData,
          startY: tableStartY,
          styles: { 
            fontSize: 8,
            cellPadding: 2.5,
            textColor: [0, 0, 0],
          },
          headStyles: { 
            fillColor: [37, 99, 235],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250],
          },
          columnStyles: {
            0: { cellWidth: 'auto' }, // Title - auto width
            1: { cellWidth: 'auto' }, // Status - auto width
            2: { cellWidth: 'auto' }, // Event Date & Time - auto width
            3: { cellWidth: 'auto' }, // Submitted By - auto width
            4: { cellWidth: 'auto' }, // Date Submitted & Time - auto width
            5: { cellWidth: 'auto' }, // Location - auto width
          },
          margin: { left: tableMargin, right: tableMargin },
          theme: 'striped',
          tableWidth: pageWidth - (tableMargin * 2),
        });

        // Add footer and watermark on each page
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          
          // Add bg.png watermark on every page (top-right corner)
          doc.addImage(bgLogoData.dataURL, 'PNG', watermarkX, watermarkY, bgLogoWidth, bgLogoSize);
          
          // Add footer text
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Page ${i} of ${pageCount} - Barangay Event HUB | Barangay New Kababae`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }

        // After table, add charts for Weekly, Monthly, Yearly
        let currentY = doc.lastAutoTable.finalY + 16;
        const chartW = pageWidth - 40; const chartH = 100; const chartX = (pageWidth - chartW) / 2 - 5;
        const weeklyData = generateTrendDataFor('weekly');
        const monthlyData = generateTrendDataFor('monthly');
        const yearlyData = generateTrendDataFor('yearly');
        drawTrendChart(doc, weeklyData, 'Weekly Trends (Approved, Pending, Cancelled, Declined)', chartX, currentY, chartW, chartH);
        currentY += chartH + 18;
        // New page if overflow
        if (currentY + chartH + 18 > pageHeight - 20) { doc.addPage(); currentY = 20; }
        drawTrendChart(doc, monthlyData, 'Monthly Trends (Approved, Pending, Cancelled, Declined)', chartX, currentY, chartW, chartH);
        currentY += chartH + 18;
        if (currentY + chartH + 18 > pageHeight - 20) { doc.addPage(); currentY = 20; }
        drawTrendChart(doc, yearlyData, 'Yearly Trends (Approved, Pending, Cancelled, Declined)', chartX, currentY, chartW, chartH);

        doc.save(`BEHUB_report_${selectedMonth + 1}_${selectedYear}.pdf`);
      } catch (error) {
        console.error("Error generating PDF:", error);
        // Fallback PDF without images
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Proposals Report (${Number(selectedMonth) + 1}/${selectedYear})`, 14, 16);

      const tableData = filteredProposals.map((p) => [
        p.title || "N/A",
        normalizeStatusLabel(p.status),
        p.date ? new Date(p.date).toLocaleDateString() : "N/A",
        p.submittedBy || "N/A",
        p.dateSubmitted ? new Date(p.dateSubmitted).toLocaleDateString() : "N/A",
        p.location || "N/A",
      ]);

      autoTable(doc, {
        head: [["Title", "Status", "Event Date", "Submitted By", "Date Submitted", "Location"]],
        body: tableData,
        startY: 22,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [74, 144, 226] },
      });

      // Simple charts in fallback too
      let currentY = 28 + tableData.length * 8;
      const pageW = doc.internal.pageSize.getWidth(); const pageH = doc.internal.pageSize.getHeight();
      if (currentY + 300 > pageH) currentY = pageH - 300;
      const chartW = pageW - 40; const chartH = 100; const chartX = (pageW - chartW) / 2 - 5;
      const weeklyData = generateTrendDataFor('weekly');
      const monthlyData = generateTrendDataFor('monthly');
      const yearlyData = generateTrendDataFor('yearly');
      drawTrendChart(doc, weeklyData, 'Weekly Trends (Approved, Pending, Cancelled, Declined)', chartX, currentY, chartW, chartH);
      currentY += chartH + 16;
      drawTrendChart(doc, monthlyData, 'Monthly Trends (Approved, Pending, Cancelled, Declined)', chartX, currentY, chartW, chartH);
      currentY += chartH + 16;
      drawTrendChart(doc, yearlyData, 'Yearly Trends (Approved, Pending, Cancelled, Declined)', chartX, currentY, chartW, chartH);
      doc.save(`proposals_report_${selectedMonth + 1}_${selectedYear}.pdf`);
      }
    }
  };

  // Generate time-series data based on selected time period
  const generateTrendData = () => {
    const dataPoints = [];
    const now = new Date();
    
    if (timePeriod === "weekly") {
      // Generate last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);
        
        // Adjust to start of week (Monday)
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setDate(weekStart.getDate() + diff);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        const weekLabel = `${weekStart.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
        
        const weekProposals = proposals.filter((p) => {
          const proposalDate = new Date(p.dateSubmitted || p.date);
          return proposalDate >= weekStart && proposalDate <= weekEnd;
        });

        const approved = weekProposals.filter((p) => p.status === "Approved").length;
        const pending = weekProposals.filter((p) => p.status === "Pending").length;
        const cancelled = weekProposals.filter((p) => p.status === "Cancelled").length;
        const rejected = weekProposals.filter((p) => {
          const s = (p.status || "").toLowerCase();
          return s === "rejected" || s.includes("declined");
        }).length;

        dataPoints.push({
          period: weekLabel,
          "Approved": approved,
          "Pending": pending,
          "Cancelled": cancelled,
          "Declined": rejected,
          "Total": weekProposals.length,
        });
      }
    } else if (timePeriod === "monthly") {
      // Generate last 12 months
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        const monthProposals = proposals.filter((p) => {
          const proposalDate = new Date(p.dateSubmitted || p.date);
          return (
            proposalDate.getMonth() === date.getMonth() &&
            proposalDate.getFullYear() === date.getFullYear()
          );
        });

        const approved = monthProposals.filter((p) => p.status === "Approved").length;
        const pending = monthProposals.filter((p) => p.status === "Pending").length;
        const cancelled = monthProposals.filter((p) => p.status === "Cancelled").length;
        const rejected = monthProposals.filter((p) => {
          const s = (p.status || "").toLowerCase();
          return s === "rejected" || s.includes("declined");
        }).length;

        dataPoints.push({
          period: monthName,
          "Approved": approved,
          "Pending": pending,
          "Cancelled": cancelled,
          "Declined": rejected,
          "Total": monthProposals.length,
        });
      }
    } else if (timePeriod === "yearly") {
      // Generate last 8 years
      for (let i = 7; i >= 0; i--) {
        const year = now.getFullYear() - i;
        
        const yearProposals = proposals.filter((p) => {
          const proposalDate = new Date(p.dateSubmitted || p.date);
          return proposalDate.getFullYear() === year;
        });

        const approved = yearProposals.filter((p) => p.status === "Approved").length;
        const pending = yearProposals.filter((p) => p.status === "Pending").length;
        const cancelled = yearProposals.filter((p) => p.status === "Cancelled").length;
        const rejected = yearProposals.filter((p) => {
          const s = (p.status || "").toLowerCase();
          return s === "rejected" || s.includes("declined");
        }).length;

        dataPoints.push({
          period: year.toString(),
          "Approved": approved,
          "Pending": pending,
          "Cancelled": cancelled,
          "Declined": rejected,
          "Total": yearProposals.length,
        });
      }
    }

    return dataPoints;
  };

  const chartData = generateTrendData();

  // Get chart title based on time period
  const getChartTitle = () => {
    switch (timePeriod) {
      case "weekly":
        return "Weekly Performance Analysis";
      case "monthly":
        return "Monthly Performance Analysis";
      case "yearly":
        return "Annual Performance Overview";
      default:
        return "Performance Analytics Dashboard";
    }
  };

  // Custom tooltip component with enhanced styling
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          minWidth: '200px'
        }}>
          <p style={{
            margin: '0 0 12px 0',
            fontWeight: 600,
            fontSize: '14px',
            color: '#111827',
            borderBottom: '1px solid #e5e7eb',
            paddingBottom: '8px'
          }}>
            {label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {payload.map((entry, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    backgroundColor: entry.color,
                    border: `2px solid ${entry.color}`,
                    boxShadow: `0 0 0 2px ${entry.color}20`
                  }} />
                  <span style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    fontWeight: 500
                  }}>
                    {entry.name}:
                  </span>
                </div>
                <span style={{
                  fontSize: '14px',
                  color: '#111827',
                  fontWeight: 600
                }}>
                  {entry.value}
                </span>
              </div>
            ))}
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{
                fontSize: '13px',
                color: '#374151',
                fontWeight: 600
              }}>
                Total:
              </span>
              <span style={{
                fontSize: '15px',
                color: '#111827',
                fontWeight: 700
              }}>
                {payload.reduce((sum, entry) => {
                  if (entry.name !== 'Total') return sum + (entry.value || 0);
                  return sum;
                }, 0)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="admin-dashboard">

      <div className="quick-stats">
        <div className="stat-card">
          <h3>Total Proposals</h3>
          <div className="stat-value">{proposals.length}</div>
        </div>
        <div className="stat-card">
          <h3>Upcoming Events</h3>
          <div className="stat-value">{statistics.upcoming}</div>
        </div>
        <div className="stat-card">
          <h3>Pending Events</h3>
          <div className="stat-value">{statistics.pending}</div>
        </div>
        <div className="stat-card">
          <h3>Cancelled Events</h3>
          <div className="stat-value">{statistics.cancelled}</div>
        </div>
        <div className="stat-card">
          <h3>Declined Events</h3>
          <div className="stat-value">{statistics.rejected}</div>
        </div>
        <div className="stat-card">
          <h3>Registered Staff/Officials</h3>
          <div className="stat-value">{staffCount}</div>
        </div>
        <div className="stat-card">
          <h3>Proposals This Month</h3>
          <div className="stat-value">{statistics.submittedThisMonth}</div>
        </div>
        <div className="report-generation-card stat-card">
          <h3>Report Generation</h3>
          <div className="report-btn-group" style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, justifyContent: 'center', alignItems: 'center' }}>
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="report-select"
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="report-select"
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                {(() => {
                  const years = [];
                  const currentYear = new Date().getFullYear();
                  for (let y = currentYear; y >= currentYear - 10; y--) years.push(y);
                  return years.map(y => <option key={y} value={y}>{y}</option>);
                })()}
              </select>
              <select
                value={reportType}
                onChange={e => setReportType(e.target.value)}
                className="report-select"
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
              </select>
            </div>
            <button 
              onClick={downloadReport} 
              className="report-btn modern-btn" 
              style={{ width: 'auto', alignSelf: 'center', padding: '4px 12px', fontSize: 13, borderRadius: 5, minWidth: 0 }}
            >
              <span role="img" aria-label="download" style={{ fontSize: 14 }}>⬇️</span> <span style={{ fontSize: 13 }}>Download</span>
            </button>
          </div>
        </div>
      </div>

      <div className="chart-section modern-chart">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: '20px', 
              fontWeight: 600, 
              color: '#111827',
              letterSpacing: '-0.02em'
            }}>
              {getChartTitle()}
            </h3>
            <p style={{ 
              margin: '4px 0 0 0', 
              fontSize: '13px', 
              color: '#6b7280',
              fontWeight: 400
            }}>
              Track proposal submissions and status trends over time
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            backgroundColor: '#f3f4f6', 
            padding: '4px', 
            borderRadius: '10px',
            border: '1px solid #e5e7eb'
          }}>
            {['weekly', 'monthly', 'yearly'].map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s ease',
                  backgroundColor: timePeriod === period ? '#2563eb' : 'transparent',
                  color: timePeriod === period ? '#ffffff' : '#6b7280',
                  boxShadow: timePeriod === period ? '0 2px 4px rgba(37, 99, 235, 0.2)' : 'none',
                  transform: timePeriod === period ? 'scale(1.02)' : 'scale(1)',
                }}
                onMouseEnter={(e) => {
                  if (timePeriod !== period) {
                    e.target.style.backgroundColor = '#e5e7eb';
                    e.target.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (timePeriod !== period) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#6b7280';
                  }
                }}
              >
                {period === 'weekly' ? 'Weekly' : period === 'monthly' ? 'Monthly' : 'Yearly'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={450}>
          <LineChart 
            data={chartData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <defs>
              <linearGradient id="approvedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cancelledGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="declinedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3"/>
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="#e5e7eb" 
              strokeOpacity={0.6}
              horizontal={true}
            />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500, fontFamily: 'inherit' }} 
              axisLine={{ stroke: '#d1d5db', strokeWidth: 1.5 }}
              tickLine={false}
              angle={timePeriod === 'yearly' ? 0 : -45}
              textAnchor={timePeriod === 'yearly' ? 'middle' : 'end'}
              height={timePeriod === 'yearly' ? 60 : 80}
              interval={timePeriod === 'weekly' ? 'preserveStartEnd' : 0}
              style={{ fontFamily: 'inherit' }}
            />
            <YAxis 
              allowDecimals={false} 
              tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 500, fontFamily: 'inherit' }} 
              axisLine={{ stroke: '#d1d5db', strokeWidth: 1.5 }}
              tickLine={{ stroke: '#d1d5db', strokeWidth: 1 }}
              width={55}
              style={{ fontFamily: 'inherit' }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5', strokeOpacity: 0.6 }}
              animationDuration={200}
              animationEasing="ease-out"
            />
            <Legend 
              wrapperStyle={{ paddingTop: '24px', paddingBottom: '8px' }}
              iconType="line"
              iconSize={18}
              align="center"
              formatter={(value) => (
                <span style={{ 
                  fontSize: '13px', 
                  color: '#374151', 
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  marginLeft: '8px'
                }}>
                  {value}
                </span>
              )}
              wrapperClass="chart-legend"
            />
            <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="3 3" />
            
            {/* Approved Line */}
            <Line
              type="monotone"
              dataKey="Approved"
              stroke="#10b981"
              strokeWidth={3.5}
              dot={{ fill: '#10b981', strokeWidth: 3, r: 6, stroke: '#ffffff', filter: 'url(#shadow)' }}
              activeDot={{ r: 9, stroke: '#10b981', strokeWidth: 3, fill: '#ffffff', strokeOpacity: 1 }}
              fill="url(#approvedGradient)"
              name="Approved"
              animationDuration={1000}
              animationEasing="ease-out"
              connectNulls={false}
            />
            
            {/* Pending Line */}
            <Line
              type="monotone"
              dataKey="Pending"
              stroke="#f59e0b"
              strokeWidth={3.5}
              dot={{ fill: '#f59e0b', strokeWidth: 3, r: 6, stroke: '#ffffff', filter: 'url(#shadow)' }}
              activeDot={{ r: 9, stroke: '#f59e0b', strokeWidth: 3, fill: '#ffffff', strokeOpacity: 1 }}
              fill="url(#pendingGradient)"
              name="Pending"
              animationDuration={1000}
              animationEasing="ease-out"
              connectNulls={false}
            />
            
            {/* Cancelled Line (orange) */}
            <Line
              type="monotone"
              dataKey="Cancelled"
              stroke="#f97316"
              strokeWidth={3.5}
              dot={{ fill: '#f97316', strokeWidth: 3, r: 6, stroke: '#ffffff', filter: 'url(#shadow)' }}
              activeDot={{ r: 9, stroke: '#f97316', strokeWidth: 3, fill: '#ffffff', strokeOpacity: 1 }}
              fill="url(#cancelledGradient)"
              name="Cancelled"
              animationDuration={1000}
              animationEasing="ease-out"
              connectNulls={false}
            />
            
            {/* Declined Line (red) */}
            <Line
              type="monotone"
              dataKey="Declined"
              stroke="#ef4444"
              strokeWidth={3.5}
              dot={{ fill: '#ef4444', strokeWidth: 3, r: 6, stroke: '#ffffff', filter: 'url(#shadow)' }}
              activeDot={{ r: 9, stroke: '#ef4444', strokeWidth: 3, fill: '#ffffff', strokeOpacity: 1 }}
              fill="url(#declinedGradient)"
              name="Declined"
              animationDuration={1000}
              animationEasing="ease-out"
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdminDashboard;
