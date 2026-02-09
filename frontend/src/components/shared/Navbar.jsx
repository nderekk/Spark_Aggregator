import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';
import logoImg from '../../assets/ceid.jpg'; 
import axios from 'axios';

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    setIsAuthenticated(!!token || !!user);
  }, [location]);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:3000/users/signout', {}, { withCredentials: true });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      navigate('/login');
    }
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