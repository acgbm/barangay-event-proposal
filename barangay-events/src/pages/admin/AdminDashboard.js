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

  const downloadExcel = () => {
    const formattedData = proposals.map((p) => ({
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
    saveAs(file, "proposals_report.xlsx");
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Proposals Report", 14, 16);

    const tableData = proposals.map((p) => [
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

    doc.save("proposals_report.pdf");
  };

  const chartData = [
    { name: "Upcoming", count: statistics.upcoming },
    { name: "Pending", count: statistics.pending },
    { name: "Cancelled", count: statistics.cancelled },
    { name: "Rejected", count: statistics.rejected },
  ];

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>

      <div className="statistics">
        <div className="stat-item">
          <h3>Upcoming Events</h3>
          <p>{statistics.upcoming}</p>
        </div>
        <div className="stat-item">
          <h3>Pending Events</h3>
          <p>{statistics.pending}</p>
        </div>
        <div className="stat-item">
          <h3>Cancelled Events</h3>
          <p>{statistics.cancelled}</p>
        </div>
        <div className="stat-item">
          <h3>Rejected Events</h3>
          <p>{statistics.rejected}</p>
        </div>
        <div className="stat-item">
          <h3>Registered Staff/Officials</h3>
          <p>{staffCount}</p>
        </div>
        <div className="stat-item">
          <h3>Proposals This Month</h3>
          <p>{statistics.submittedThisMonth}</p>
        </div>
      </div>

      <div className="chart-section">
        <h3>Proposal Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#4a90e2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="report-generation">
        <h3>Report Generation</h3>
        <button onClick={downloadPDF} className="report-btn">
          📄 Download PDF
        </button>
        <button onClick={downloadExcel} className="report-btn">
          📊 Download Excel
        </button>
      </div>
    </div>
  );
};

export default AdminDashboard;
