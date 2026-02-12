import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/welcome_page/Home.css'; 

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:3000/courses/recentlyViewed', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // Note: The backend returns an array of objects: { courseId: {...}, viewedAt: Date }
        if (response.data) {
            setHistory(response.data);
        }

      } catch (error) {
        console.error('Error fetching history:', error);
        if (error.response && error.response.status === 401) {
            navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [navigate]);

  return (
    <div className="home-container">
      <div className="home-wrapper">
        <div className="page-header">
          <div className="header-content">
            <button 
                onClick={() => navigate('/')} 
                className="btn-secondary"
                style={{ marginBottom: '1rem' }}
            >
                ← Πίσω στην Αρχική
            </button>
            <h1>Ιστορικό Προβολών</h1>
            <p className="header-subtitle">Μαθήματα που είδατε πρόσφατα</p>
          </div>
        </div>

        <div className="courses-section">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Φόρτωση ιστορικού...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <p>🕒 Δεν έχετε δει κάποιο μάθημα ακόμα.</p>
              <button onClick={() => navigate('/')} className="btn-primary">
                Εξερεύνηση Μαθημάτων
              </button>
            </div>
          ) : (
            <div className="courses-grid">
              {history.map((item) => {
                // Destructure the course details from the sub-document
                const course = item.courseId;
                
                // Safety check in case a course was deleted but remains in history
                if (!course) return null;

                return (
                  <div key={item._id} className="course-card">
                     <div className="course-card-top">
                        <div className="badge-row">
                          <span className="badge badge-level">{course.level || 'General'}</span>
                        </div>
                        <span className="course-source-tag">
                           🕒 {new Date(item.viewedAt).toLocaleDateString('el-GR')}
                        </span>
                      </div>
                      <h3 className="course-title">{course.title}</h3>
                      <p className="course-description">{course.description}</p>
                      <div className="course-meta">
                        <span className="meta-item">📚 {course.category}</span>
                      </div>
                      <div className="course-footer">
                        <button
                          onClick={() => navigate(`/courses/${course._id}`)}
                          className="view-details-btn"
                        >
                          Προβολή ξανά
                        </button>
                      </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;