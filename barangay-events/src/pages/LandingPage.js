import React from 'react';
import './LandingPage.css';
import logo from '../assets/bg.png';
import coverImg from '../assets/cover.png';
import photoImg from '../assets/photo.png';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();
  
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (

    <div className="landing-root">
      <header className="landing-header">
        <nav className="landing-nav">
          <img src={logo} alt="Barangay Logo" className="landing-logo" onClick={scrollToTop} />
          <div className="nav-links">
            <button className="nav-link" onClick={() => scrollToSection('about')}>About</button>
            <button className="nav-link" onClick={() => scrollToSection('features')}>Solutions</button>
          </div>
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
              <h1 className="hero-title">Barangay Event HUB</h1>
              <p className="hero-sub">Empowering barangay staff and officials with a smarter way to manage, review, and approve event proposals.</p>
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
                  <div className="card-title">Email Notifications</div>
                  <div className="card-sub">Receive instant email updates for approved proposals.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <section id="about" className="about">
        <div className="about-content">
          <div className="about-image">
            <img src={photoImg} alt="About BEHUB" />
          </div>
          <div className="about-text">
            <h2 className="about-title">About BEHUB</h2>
            <p className="about-description">
              BEHUB is a centralized web platform designed to streamline the barangay's event proposal process. It enables staff to efficiently submit event proposals while allowing officials to review, vote, and approve them with transparency and ease, all in one secure system.
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <h2 className="features-title">Digital Solutions for Barangay Events</h2>
        <div className="features-grid">
          <div className="feature-card">
            <i className="fas fa-file-invoice feature-icon"></i>
            <h3>Reduces Manual Paperwork</h3>
            <p>Eliminates the need for physical submission and approval forms.</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-clipboard-check feature-icon"></i>
            <h3>Proposal Tracking</h3>
            <p>Real-time updates and transparent tracking of event proposal status.</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-eye feature-icon"></i>
            <h3>Improves Transparency</h3>
            <p>Tracks proposal status and voting progress in real-time.</p>
          </div>
          <div className="feature-card">
            <i className="fas fa-tachometer-alt feature-icon"></i>
            <h3>Enhances Efficiency</h3>
            <p>Speeds up the proposal approval workflow between staff and officials.</p>
          </div>
        </div>
      </section>
      <footer className="apple-footer">
        <div className="apple-footer-content">
          <span>Contact: behub@gmail.com | 0992-659-1335</span>
          <span>&copy; {new Date().getFullYear()} Barangay Event HUB</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
