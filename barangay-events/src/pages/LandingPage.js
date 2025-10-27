import React from 'react';
import './LandingPage.css';
import logo from '../assets/bg.png';
import coverImg from '../assets/cover.png';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  return (

    <div className="apple-landing">
      <header className="apple-header">
        <nav className="apple-nav">
          <img src={logo} alt="Barangay Logo" className="apple-logo" />
          <button className="apple-login-btn" onClick={() => navigate('/login')}>Login</button>
        </nav>
      </header>
      <main className="apple-main">
        <div className="apple-hero-container">
          <div className="apple-hero-image">
            <img src={coverImg} alt="Barangay Cover" className="cover-image" />
          </div>
          <section className="apple-hero">
            <h1 className="apple-headline">Barangay Event HUB</h1>
            <p className="apple-subheadline">A new way to plan, propose, and manage barangay events. Simple. Secure. Beautiful.</p>
            <button className="apple-cta-btn" onClick={() => navigate('/login')}>Get Started</button>
          </section>
        </div>
      </main>

      <section className="apple-features">
        <h2 className="features-title">Digital Solutions for Barangay Events</h2>
        <div className="features-grid">
          <div className="feature-card">
            <i className="fas fa-calendar-alt feature-icon"></i>
            <h3>Smart Event Planning</h3>
            <p>Streamlined process for organizing and managing community events with ease.</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-tasks feature-icon"></i>
            <h3>Proposal Tracking</h3>
            <p>Real-time updates and transparent tracking of event proposal status.</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-users feature-icon"></i>
            <h3>Community Engagement</h3>
            <p>Connect with residents and stakeholders in your barangay effectively.</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-shield-alt feature-icon"></i>
            <h3>Secure Platform</h3>
            <p>Advanced security measures to protect your event data and information.</p>
          </div>
        </div>
      </section>
      <footer className="apple-footer">
        <div className="apple-footer-content">
          <span>Contact: barangay@email.com | 0912-345-6789</span>
          <span>&copy; {new Date().getFullYear()} Barangay Event Proposal System</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
