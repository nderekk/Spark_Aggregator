import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/welcome_page/Home.css'; 

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:3000/courses/favorites', {
            withCredentials: true 
        });
        
        if (response.data && response.data.favoriteCourses) {
            setFavorites(response.data.favoriteCourses);
        }

      } catch (error) {
        console.error('Error fetching favorites:', error);
        if (error.response && error.response.status === 401) {
            navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
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
            <h1>Τα Αγαπημένα μου </h1>
            <p className="header-subtitle">Τα μαθήματα που έχεις ξεχωρίσει</p>
          </div>
        </div>

        <div className="courses-section">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Φόρτωση αγαπημένων...</p>
            </div>
          ) : favorites.length === 0 ? (
            <div className="empty-state">
              <p>😔 Δεν έχεις προσθέσει ακόμα αγαπημένα μαθήματα.</p>
              <button onClick={() => navigate('/')} className="btn-primary">
                Εξερεύνηση Μαθημάτων
              </button>
            </div>
          ) : (
            <div className="courses-grid">
              {favorites.map((course) => (
                <div key={course._id} className="course-card">
                   <div className="course-card-top">
                      <div className="badge-row">
                        <span className="badge badge-level">{course.level || 'General'}</span>
                        {course.cluster_label && (
                          <span className="badge badge-topic">🏷️ {course.cluster_label}</span>
                        )}
                      </div>
                      <span className="course-source-tag">{course.source || 'Online'}</span>
                    </div>
                    <h3 className="course-title">{course.title}</h3>
                    <p className="course-description">{course.description}</p>
                    <div className="course-meta">
                      <span className="meta-item">📚 {course.category}</span>
                      <span className="meta-item">🌍 {course.language}</span>
                    </div>
                    <div className="course-footer">
                      <button
                        onClick={() => navigate(`/courses/${course._id}`)}
                        className="view-details-btn"
                      >
                        Λεπτομέρειες
                      </button>
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Favorites;