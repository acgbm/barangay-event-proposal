import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageAccounts from "./pages/admin/ManageAccounts";
import AdminProposal from "./pages/admin/AdminProposal";
import VerifyEmail from "./pages/VerifyEmail";
import StaffDashboard from "./pages/staff/StaffDashboard";
import StaffProposal from "./pages/staff/StaffProposal";
import Events from "./pages/staff/Events"; 
import StaffAccount from "./pages/staff/StaffAccount"; // Assuming you have a StaffAccount component
import OfficialDashboard from "./pages/official/OfficialDashboard";
import OfficialEvents from "./pages/official/OfficialEvents";
import ReviewProposal from "./pages/official/ReviewProposal";
import OfficialAccount from "./pages/official/OfficialAccount"; // Assuming you have a OfficialAccount component
import Layout from "./components/Layout"; // Sidebar wrapper

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Admin Pages */}
          <Route element={<Layout role="admin" />}>
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/manage-accounts" element={<ManageAccounts />} />
            <Route path="/admin-proposals" element={<AdminProposal />} />
          </Route>

          {/* Staff Pages */}
          <Route element={<Layout role="staff" />}>
            <Route path="/staff-dashboard" element={<StaffDashboard />} />
            <Route path="/staff-proposal" element={<StaffProposal />} />
            <Route path="/events" element={<Events />} />
            <Route path="/staff-account" element={<StaffAccount />} />
          </Route>

          {/* Official Pages */}
          <Route element={<Layout role="official" />}>
            <Route path="/official-dashboard" element={<OfficialDashboard />} />
            <Route path="/review-proposals" element={<ReviewProposal />} />
            <Route path="/official-events" element={<OfficialEvents />} />
            <Route path="/official-account" element={<OfficialAccount />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
