import React from 'react';
import { Link } from 'react-router-dom';
import './Error.css';

export default function Error() {
  return (
    <div className="error-page">
      <div className="error-content">
        <span className="error-code">404</span>
        <h1>Η σελίδα δεν βρέθηκε</h1>
        <p>Η διεύθυνση που ζητήσατε δεν υπάρχει ή μετακινήθηκε.</p>
        <Link to="/" className="error-home-link">Επιστροφή στην Αρχική</Link>
      </div>
    </div>
  );
}
