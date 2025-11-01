import React from 'react';
import './LandingPage.css';
import logo from '../assets/bg.png';
import coverImg from '../assets/cover.png';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  return (

    <div className="landing-root">
      <header className="landing-header">
        <nav className="landing-nav">
          <img src={logo} alt="Barangay Logo" className="landing-logo" />
          <div className="nav-actions">
            <button className="btn ghost" onClick={() => navigate('/login')}>Log in</button>
          </div>
        </nav>
      </header>

      <main className="landing-main">
        {/* Stripe-like hero: left content + right visual */}
        <section className="hero">
          <div className="hero-bg-wrap">
            <img src={coverImg} alt="cover" className="hero-bg-img" />
          </div>
          <div className="hero-inner">
            <div className="hero-left">
              <h1 className="hero-title">Barangay Event HUB — plan, propose, and manage with confidence</h1>
              <p className="hero-sub">Fast approvals, transparent tracking, and community collaboration — all in one place.</p>

              {/* CTAs removed per request */}

              <div className="hero-trust">
                <span className="trust-text">Trusted by community leaders</span>
                <div className="trust-logos">
                  <div className="trust-logo">Barangay A</div>
                  <div className="trust-logo">Barangay B</div>
                  <div className="trust-logo">Municipal</div>
                </div>
              </div>
            </div>

            <div className="hero-right" aria-hidden>
              <div className="visual">
                <div className="visual-blob" />
                <div className="card card-a">
                  <div className="card-title">Event Proposal</div>
                  <div className="card-sub">Submit proposals and attach attachments</div>
                </div>
                <div className="card card-b">
                  <div className="card-title">Real-time Status</div>
                  <div className="card-sub">Track approval progress live</div>
                </div>
                <div className="card card-c">
                  <div className="card-title">Engage</div>
                  <div className="card-sub">Share updates with residents</div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <section className="features">
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
