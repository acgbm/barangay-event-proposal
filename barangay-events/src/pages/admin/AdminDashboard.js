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
        const rejected = weekProposals.filter((p) => p.status === "Rejected").length;

        dataPoints.push({
          period: weekLabel,
          "Approved": approved,
          "Pending": pending,
          "Cancelled": cancelled,
          "Rejected": rejected,
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
        const rejected = monthProposals.filter((p) => p.status === "Rejected").length;

        dataPoints.push({
          period: monthName,
          "Approved": approved,
          "Pending": pending,
          "Cancelled": cancelled,
          "Rejected": rejected,
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
        const rejected = yearProposals.filter((p) => p.status === "Rejected").length;

        dataPoints.push({
          period: year.toString(),
          "Approved": approved,
          "Pending": pending,
          "Cancelled": cancelled,
          "Rejected": rejected,
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
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rejectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
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
            
            {/* Cancelled Line */}
            <Line
              type="monotone"
              dataKey="Cancelled"
              stroke="#ef4444"
              strokeWidth={3.5}
              dot={{ fill: '#ef4444', strokeWidth: 3, r: 6, stroke: '#ffffff', filter: 'url(#shadow)' }}
              activeDot={{ r: 9, stroke: '#ef4444', strokeWidth: 3, fill: '#ffffff', strokeOpacity: 1 }}
              fill="url(#cancelledGradient)"
              name="Cancelled"
              animationDuration={1000}
              animationEasing="ease-out"
              connectNulls={false}
            />
            
            {/* Rejected Line */}
            <Line
              type="monotone"
              dataKey="Rejected"
              stroke="#6366f1"
              strokeWidth={3.5}
              dot={{ fill: '#6366f1', strokeWidth: 3, r: 6, stroke: '#ffffff', filter: 'url(#shadow)' }}
              activeDot={{ r: 9, stroke: '#6366f1', strokeWidth: 3, fill: '#ffffff', strokeOpacity: 1 }}
              fill="url(#rejectedGradient)"
              name="Rejected"
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
