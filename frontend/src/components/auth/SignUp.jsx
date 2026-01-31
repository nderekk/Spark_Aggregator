import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AuthStyles.css';

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password.length < 6) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting registration with:', formData); // Debug log
      
      // ✅ Χρησιμοποιούμε το σωστό endpoint: /users/signup
      const response = await axios.post('http://localhost:3000/users/signup', formData);
      
      console.log('Registration response:', response.data); // Debug log
      
      if (response.status === 201 || response.status === 200) {
        // Success! Redirect to login
        alert('Ο λογαριασμός δημιουργήθηκε με επιτυχία! Μπορείτε τώρα να συνδεθείτε.');
        navigate('/login');
      }
    } catch (error) {
      console.error("Registration Error:", error); // Debug log
      
      if (error.response) {
        // Το backend απάντησε με error status
        const errorMsg = error.response.data.message || error.response.data.error;
        
        if (error.response.status === 400) {
          if (errorMsg?.includes('already exists')) {
            setError('Αυτό το email χρησιμοποιείται ήδη. Δοκιμάστε άλλο.');
          } else {
            setError(errorMsg || 'Μη έγκυρα δεδομένα. Ελέγξτε τα πεδία.');
          }
        } else {
          setError(errorMsg || 'Σφάλμα κατά την εγγραφή');
        }
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
          <h2>Εγγραφή</h2>
          <p>Δημιουργήστε έναν δωρεάν λογαριασμό</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="auth-form">
          <div className="form-group">
            <label>Όνομα</label>
            <input 
              type="text" 
              placeholder="π.χ. Γιώργος" 
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              required 
              disabled={loading}
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label>Επώνυμο</label>
            <input 
              type="text" 
              placeholder="π.χ. Παπαδόπουλος" 
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              required 
              disabled={loading}
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required 
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Κωδικός Πρόσβασης</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required 
              disabled={loading}
              minLength={6}
            />
            <small style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Τουλάχιστον 6 χαρακτήρες
            </small>
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Δημιουργία...' : 'Δημιουργία Λογαριασμού'}
          </button>
        </form>

        <div className="auth-footer">
          Έχετε ήδη λογαριασμό; 
          <button className="auth-link" onClick={() => navigate('/login')}>
            Συνδεθείτε εδώ
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUp;