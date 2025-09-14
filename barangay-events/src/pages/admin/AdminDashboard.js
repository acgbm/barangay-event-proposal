import React, { useState, useEffect } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
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
    const rejected = data.filter((p) => p.status === "Rejected").length;
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

  const downloadReport = () => {
    const filteredProposals = getFilteredProposals();
    if (reportType === "excel") {
      const formattedData = filteredProposals.map((p) => ({
        Title: p.title || "N/A",
        Status: p.status || "N/A",
        "Event Date": p.date ? new Date(p.date).toLocaleDateString() : "N/A",
        "Submitted By": p.submittedBy || "N/A",
        "Date Submitted": p.dateSubmitted
          ? new Date(p.dateSubmitted).toLocaleDateString()
          : "N/A",
        Location: p.location || "N/A",
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Proposals Report");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(file, `proposals_report_${selectedMonth + 1}_${selectedYear}.xlsx`);
    } else {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(`Proposals Report (${Number(selectedMonth) + 1}/${selectedYear})`, 14, 16);

      const tableData = filteredProposals.map((p) => [
        p.title || "N/A",
        p.status || "N/A",
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

      doc.save(`proposals_report_${selectedMonth + 1}_${selectedYear}.pdf`);
    }
  };

  const chartData = [
    { name: "Upcoming", count: statistics.upcoming },
    { name: "Pending", count: statistics.pending },
    { name: "Cancelled", count: statistics.cancelled },
    { name: "Rejected", count: statistics.rejected },
  ];

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
          <h3>Rejected Events</h3>
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
        <h3>Proposal Trends</h3>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} barCategoryGap={30} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 14, fill: '#374151' }} axisLine={false} tickLine={false}
              onMouseMove={e => {
                if (e && e.activeLabel) {
                  document.body.style.cursor = 'pointer';
                }
              }}
              onMouseLeave={() => { document.body.style.cursor = 'default'; }}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 14, fill: '#374151' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, background: '#fff', border: '1px solid #e5e7eb', fontSize: 14 }} cursor={{ fill: '#e0edff', opacity: 0.2 }} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#2563eb">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <Bar dataKey="count" fill="url(#barGradient)" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AdminDashboard;
