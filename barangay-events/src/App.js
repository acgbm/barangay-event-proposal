import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageAccounts from "./pages/admin/ManageAccounts";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffProposal from "./pages/staff/StaffProposal";
import OfficialDashboard from "./pages/official/OfficialDashboard";
import ReviewProposal from "./pages/official/ReviewProposal";
import Layout from "./components/Layout"; // Sidebar wrapper

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />

          {/* Admin Pages */}
          <Route element={<Layout role="admin" />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/manage-accounts" element={<ManageAccounts />} />
          </Route>

          {/* Staff Pages */}
          <Route element={<Layout role="staff" />}>
            <Route path="/staff-dashboard" element={<StaffDashboard />} />
            <Route path="/staff-proposal" element={<StaffProposal />} />
          </Route>

          {/* Official Pages */}
          <Route element={<Layout role="official" />}>
            <Route path="/official-dashboard" element={<OfficialDashboard />} />
            <Route path="/review-proposals" element={<ReviewProposal />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
