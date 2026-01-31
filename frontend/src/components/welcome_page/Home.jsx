import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    language: '',
    level: '',
    source: '',
    category: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Έλεγχος authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setIsAuthenticated(true);
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }

    // Φόρτωση μαθημάτων
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/courses', {
        params: {
          search: searchTerm,
          ...filters
        }
      });
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Mock data για development
      setCourses([
        {
          _id: '1',
          title: 'Introduction to Machine Learning',
          description: 'Learn the basics of ML with Python and scikit-learn',
          category: 'Computer Science',
          language: 'English',
          level: 'beginner',
          source: 'Coursera',
          sourceUrl: 'https://coursera.org/ml-intro',
          updatedAt: '2024-01-15'
        },
        {
          _id: '2',
          title: 'Advanced React Development',
          description: 'Master React hooks, context, and performance optimization',
          category: 'Web Development',
          language: 'English',
          level: 'advanced',
          source: 'Udemy',
          sourceUrl: 'https://udemy.com/react-advanced',
          updatedAt: '2024-01-20'
        },
        {
          _id: '3',
          title: 'Data Structures and Algorithms',
          description: 'Complete guide to DSA with practical examples',
          category: 'Computer Science',
          language: 'Greek',
          level: 'intermediate',
          source: 'MIT OpenCourseWare',
          sourceUrl: 'https://ocw.mit.edu/dsa',
          updatedAt: '2024-01-10'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  const clearFilters = () => {
    setFilters({
      language: '',
      level: '',
      source: '',
      category: ''
    });
    setSearchTerm('');
  };

  if (!isAuthenticated) {
    return (
      <div className="home-container">
        <div className="home-content">
          <div className="hero-section">
            <h1>🎓 CEID Course Aggregator</h1>
            <p className="hero-subtitle">
              Ανακαλύψτε χιλιάδες μαθήματα από τις κορυφαίες πλατφόρμες εκπαίδευσης
            </p>
            <div className="cta-section">
              <p className="cta-description">
                Συνδεθείτε για να έχετε πρόσβαση σε προσωποποιημένες προτάσεις μαθημάτων
              </p>
              <div className="cta-buttons">
                <button onClick={() => navigate('/login')} className="btn-primary">
                  Σύνδεση
                </button>
                <button onClick={() => navigate('/signup')} className="btn-secondary">
                  Εγγραφή
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="home-wrapper">
        {/* Header Section */}
        <div className="page-header">
          <div className="header-content">
            <h1>Καλώς ήρθες, {user?.firstName}! 👋</h1>
            <p className="header-subtitle">Εξερεύνησε μαθήματα από όλο τον κόσμο</p>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Αποσύνδεση
          </button>
        </div>

        {/* Search Section */}
        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-wrapper">
              <input
                type="text"
                placeholder="🔍 Αναζήτηση μαθημάτων..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn">
                Αναζήτηση
              </button>
            </div>
          </form>

          {/* Filters */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Γλώσσα</label>
              <select
                value={filters.language}
                onChange={(e) => handleFilterChange('language', e.target.value)}
              >
                <option value="">Όλες</option>
                <option value="Greek">Ελληνικά</option>
                <option value="English">Αγγλικά</option>
                <option value="Spanish">Ισπανικά</option>
                <option value="French">Γαλλικά</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Επίπεδο</label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
              >
                <option value="">Όλα</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Πηγή</label>
              <select
                value={filters.source}
                onChange={(e) => handleFilterChange('source', e.target.value)}
              >
                <option value="">Όλες</option>
                <option value="Coursera">Coursera</option>
                <option value="Udemy">Udemy</option>
                <option value="MIT OpenCourseWare">MIT OCW</option>
                <option value="edX">edX</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Κατηγορία</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">Όλες</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Web Development">Web Development</option>
                <option value="Data Science">Data Science</option>
                <option value="Business">Business</option>
              </select>
            </div>

            <button onClick={clearFilters} className="clear-filters-btn">
              Καθαρισμός Φίλτρων
            </button>
          </div>
        </div>

        {/* Courses List */}
        <div className="courses-section">
          <div className="section-header">
            <h2>Διαθέσιμα Μαθήματα ({courses.length})</h2>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Φόρτωση μαθημάτων...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <p>😔 Δεν βρέθηκαν μαθήματα</p>
              <button onClick={clearFilters} className="btn-secondary">
                Καθαρισμός φίλτρων
              </button>
            </div>
          ) : (
            <div className="courses-grid">
              {courses.map((course) => (
                <div key={course._id} className="course-card">
                  <div className="course-header">
                    <span className="course-level">{course.level}</span>
                    <span className="course-source">{course.source}</span>
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

export default Home;