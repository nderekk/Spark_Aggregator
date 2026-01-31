import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthStyles.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', { email }); // Debug log
      
      // ✅ Χρησιμοποιούμε το σωστό endpoint: /users/signin
      const response = await axios.post('http://localhost:3000/users/signin', { 
        email, 
        password 
      });
      
      console.log('Login response:', response.data); // Debug log
      
      // Αποθήκευση του JWT Token
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        
        // Αποθήκευση user info
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        
        console.log('Token saved successfully'); // Debug log
        navigate('/'); // Ανακατεύθυνση στην κεντρική σελίδα
      } else {
        setError('Δεν λήφθηκε token από τον server');
      }
    } catch (error) {
      console.error("Login Error:", error); // Debug log
      
      if (error.response) {
        // Το backend απάντησε με error status
        setError(error.response.data.message || 'Λάθος email ή κωδικός πρόσβασης');
      } else if (error.request) {
        // Το request έγινε αλλά δεν λήφθηκε απάντηση
        setError('Δεν μπορώ να επικοινωνήσω με τον server. Βεβαιωθείτε ότι τρέχει στο port 3000.');
      } else {
        // Κάτι άλλο πήγε στραβά
        setError('Προέκυψε σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Σύνδεση</h2>
          <p>Εισέλθετε στο λογαριασμό σας</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Διεύθυνση Email</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Κωδικός Πρόσβασης</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={loading}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Περιμένετε...' : 'Είσοδος'}
          </button>
        </form>

        <div className="auth-footer">
          Δεν έχετε λογαριασμό; 
          <button className="auth-link" onClick={() => navigate('/signup')}>
            Δημιουργήστε έναν τώρα
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;