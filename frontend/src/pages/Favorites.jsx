import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../components/welcome_page/Home.css'; 

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
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
        const token = localStorage.getItem('token');
        const favorites = await axios.get('http://localhost:3000/courses/favorites', {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true 
        });

        const recommendations = await axios.get('http://localhost:3000/courses/personalised', {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true 
        });
        
        if (favorites.data && favorites.data.favoriteCourses) {
            setFavorites(favorites.data.favoriteCourses);
        }

        if (recommendations.data && recommendations.data.recommendations) {
            setRecommendations(recommendations.data.recommendations);
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

const CourseCard = ({ course, badgeColor }) => (
    <div key={course._id} className="course-card">
        <div className="course-card-top">
            <div className="badge-row">
                <span className="badge badge-level">{course.level || 'General'}</span>
                {course.cluster_label && (
                    <span className="badge badge-topic" style={{backgroundColor: badgeColor}}>
                        🏷️ {course.cluster_label}
                    </span>
                )}
            </div>
            <span className="course-source-tag">{course.source || 'Online'}</span>
        </div>
        <h3 className="course-title">{course.title}</h3>
        <p className="course-description">
            {course.description 
                ? (course.description.length > 100 ? course.description.substring(0, 100) + '...' : course.description) 
                : 'No description available'}
        </p>
        <div className="course-meta">
            <span className="meta-item">📚 {course.category || 'General'}</span>
            <span className="meta-item">🌍 {course.language || 'English'}</span>
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
  );

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
            <h1>Το Προφίλ μου</h1>
            <p className="header-subtitle">Οι επιλογές και οι προτάσεις μας για εσένα</p>
          </div>
        </div>

        <div className="courses-section">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Φόρτωση δεδομένων...</p>
            </div>
          ) : (
            <>
              {/* --- NEW SECTION: RECOMMENDED COURSES --- */}
              {recommendations.length > 0 && (
                <div className="section-block" style={{ marginBottom: '3rem' }}>
                    <h2 className="section-title" style={{ borderLeft: '5px solid #9c27b0', paddingLeft: '1rem', color: '#9c27b0' }}>
                        ✨ Προτεινόμενα για εσάς
                    </h2>
                    <p style={{ marginBottom: '1.5rem', color: '#666' }}>
                        Βασισμένα στα μαθήματα που έχετε ήδη προσθέσει στα αγαπημένα σας.
                    </p>
                    <div className="courses-grid">
                        {recommendations.map((course) => (
                            <CourseCard key={course._id} course={course} badgeColor="#e1bee7" />
                        ))}
                    </div>
                </div>
              )}

              {/* --- EXISTING SECTION: FAVORITES --- */}
              <div className="section-block">
                <h2 className="section-title" style={{ borderLeft: '5px solid #007bff', paddingLeft: '1rem' }}>
                    ❤️ Τα Αγαπημένα μου
                </h2>
                
                {favorites.length === 0 ? (
                    <div className="empty-state">
                    <p>😔 Δεν έχεις προσθέσει ακόμα αγαπημένα μαθήματα.</p>
                    <button onClick={() => navigate('/')} className="btn-primary">
                        Εξερεύνηση Μαθημάτων
                    </button>
                    </div>
                ) : (
                    <div className="courses-grid" style={{ marginTop: '1.5rem' }}>
                    {favorites.map((course) => (
                        <CourseCard key={course._id} course={course} badgeColor="#e3f2fd" />
                    ))}
                    </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Favorites;