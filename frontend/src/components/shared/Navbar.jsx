import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';
import logoImg from '../../assets/ceid.jpg'; 

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <nav className="dropbox-navbar">
      <div className="nav-left">
        <Link to="/" className="nav-logo-link">
          <img src={logoImg} alt="CEID Logo" className="ceid-logo" />
          <span className="brand-name">CEID Aggregator</span>
        </Link>
      </div>
      
      <div className="nav-right">
        {isAuthenticated ? (
          <>
            <Link to="/analytics" className="nav-link-login">
              Analytics
            </Link>
            <button onClick={handleLogout} className="nav-btn-signup nav-btn-logout">
              Αποσύνδεση
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="nav-link-login">Σύνδεση</Link>
            <Link to="/signup" className="nav-btn-signup">Εγγραφή</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;