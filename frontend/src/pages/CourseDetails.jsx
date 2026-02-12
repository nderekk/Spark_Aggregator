import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import axios from 'axios';
import './CourseDetails.css';

const CourseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [similarCourses, setSimilarCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  const hasTracked = useRef(false);
  
  //Race Condition to write in report
  useEffect(() => {
    if (hasTracked.current) return;
    hasTracked.current = true;

    const trackVisit = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        await axios.post(
          `http://localhost:3000/courses/${id}/recentlyViewed`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error("Error updating recently viewed history", err);
      }
    };

  trackVisit();
}, [id]);

  useEffect(() => {
    fetchCourseDetails();
    fetchSimilarCourses();
    checkIfFavorite();
  }, [id]);

  const fetchCourseDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://localhost:3000/courses/${id}`);
      console.log(response.data.course)
      setCourse(response.data.course);
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilarCourses = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/courses/${id}/similar`);
      setSimilarCourses(response.data);
    } catch (error) {
      console.error('Error fetching similar courses:', error);
    }
  };

  const checkIfFavorite = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await axios.get(`http://localhost:3000/courses/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const found = res.data.favoriteCourses.some(fav => fav._id === id);
      setIsFavorite(found);
    } catch (err) {
      console.error("Could not fetch favorites", err);
    }
  };

  const toggleFavorite = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert("Συνδεθείτε για να αποθηκεύσετε το μάθημα");
      return;
    }

    try {
      if (isFavorite) {
        await axios.delete(`http://localhost:3000/courses/${id}/favorites`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(false);
      } else {
        await axios.post(`http://localhost:3000/courses/${id}/favorites`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Error toggling favorite status", err);
      alert("Προέκυψε σφάλμα κατά την ενημέρωση των αγαπημένων.");
    }
  };

  if (loading) {
    return (
      <div className="course-details-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Φόρτωση μαθήματος...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-details-container">
        <div className="error-state">
          <p>Το μάθημα δεν βρέθηκε</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Επιστροφή στην Αρχική
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-details-container">
      <div className="course-details-wrapper">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <button onClick={() => navigate('/')} className="breadcrumb-link">
            Αρχική
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{course.title}</span>
        </div>

        {/* Main Content */}
        <div className="course-content">
          {/* Left Column - Course Info */}
          <div className="course-main">
            <div className="course-header-section">
              <div className="course-badges">
                <span className="badge badge-level">{course.level}</span>
                <span className="badge badge-source">{course.source}</span>
                <span className="badge badge-language">{course.language}</span>
                <button 
                  className={`fav-button ${isFavorite ? 'is-fav' : ''}`} 
                  onClick={toggleFavorite}
                >
                  {isFavorite ? '❤' : '+'} 
                </button>
                {course.cluster_id && (
                  <span className="badge badge-cluster">🏷️ {course.cluster_label == [] ? "No Topic" : course.cluster_label}</span>
                )}
              </div>
    
              <div className="title-wrapper">
                <h1 className="course-main-title">{course.title}</h1>
              </div>

              <p className="course-subtitle">{course.description}</p>
              
              {course.instructor && (
                <div className="instructor-info">
                  <span className="instructor-label">Διδάσκων:</span>
                  <span className="instructor-name">{course.instructor}</span>
                </div>
              )}

              {course.rating && (
                <div className="rating-section">
                  <div className="stars">
                    {'⭐'.repeat(Math.floor(course.rating))}
                  </div>
                  <span className="rating-value">{course.rating}/5</span>
                  {course.enrolled && (
                    <span className="enrolled-count">
                      ({course.enrolled.toLocaleString()} φοιτητές)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Full Description */}
            <div className="course-section">
              <h2 className="section-title">Περιγραφή Μαθήματος</h2>
              <p className="section-content">{course.fullDescription || course.description}</p>
            </div>

            {/* Keywords */}
            {course.keywords && course.keywords.length > 0 && (
              <div className="course-section">
                <h2 className="section-title">Λέξεις-Κλειδιά</h2>
                <div className="keywords-list">
                  {course.keywords.map((keyword, index) => (
                    <span key={index} className="keyword-tag">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Course Details */}
            <div className="course-section">
              <h2 className="section-title">Λεπτομέρειες</h2>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Κατηγορία:</span>
                  <span className="detail-value">{course.category}</span>
                </div>
                {course.duration && (
                  <div className="detail-item">
                    <span className="detail-label">Διάρκεια:</span>
                    <span className="detail-value">{course.duration}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Τελευταία Ενημέρωση:</span>
                  <span className="detail-value">
                    {new Date(course.updatedAt).toLocaleDateString('el-GR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <a
                href={course.enrollUrl || course.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-enroll"
              >
                Εγγραφή στο Μάθημα
              </a>
              <a
                href={course.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-view-source"
              >
                Προβολή στην Πηγή
              </a>
            </div>
          </div>

          {/* Right Column - Similar Courses */}
          <div className="course-sidebar">
            <div className="sidebar-section">
              <h3 className="sidebar-title">Παρόμοια Μαθήματα</h3>
              <div className="similar-courses-list">
                {similarCourses.length > 0 ? (
                  similarCourses.map((similar) => {
                    const matchPercentage = similar.score ? Math.round((similar.score) * 100) : null;

                    return (
                      <div
                        key={similar._id}
                        className="similar-course-card"
                        onClick={() => navigate(`/courses/${similar._id}`)}
                      >
                        <div className="similar-course-header">
                          <span className="similar-level">{similar.level}</span>
                          {/* DISPLAY THE PERCENTAGE HERE */}
                          {matchPercentage && (
                            <span className="match-score">{matchPercentage}% Ταύτιση</span>
                          )}
                        </div>
                        <h4 className="similar-title">{similar.title}</h4>
                        <span className="similar-source">{similar.source}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="no-similar">Δεν βρέθηκαν παρόμοια μαθήματα</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;