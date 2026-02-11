import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [allCourses, setAllCourses] = useState([]); //This is the inital courses that are fetched - fetching will happen only once
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    language: '',
    level: '',
    provider: '',
    category: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(21);
  const navigate = useNavigate();

    
  const totalPages = Math.ceil(courses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCourses = courses.slice(startIndex, endIndex);
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // 1. Check Authentication
  useEffect(() => {
    const userData = localStorage.getItem('user');
    
    if (userData) {
      setIsAuthenticated(true);
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setIsAuthenticated(false);
      }
    } else {
        setIsAuthenticated(false);
        setLoading(false);
    }
  }, []);

  // 2. NEW: Fetch courses automatically when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCourses();
    }
  }, [isAuthenticated]);

  // 3. Filter Logic (Runs automatically when Search, Filters, or Data changes)
  useEffect(() => {
    // If we haven't fetched data yet, do nothing
    if (allCourses.length === 0) return;

    let result = [...allCourses];

    // Filter by Search Term
    if (searchTerm) {
      result = result.filter(course => 
      (course.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description || "").toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by Language
    if (filters.language) {
      result = result.filter(course => 
      course.language && course.language.toLowerCase() === filters.language.toLowerCase()
      );
    }

    // Filter by Level
    if (filters.level) {
      result = result.filter(course => 
      course.level && course.level.toLowerCase() === filters.level.toLowerCase()
      );
    }

    // Filter by Source 
    if (filters.provider) {
      result = result.filter(course => 
      (course.provider && course.provider.toLowerCase() === filters.provider.toLowerCase()) ||
      (course.source && course.source.toLowerCase().includes(filters.provider.toLowerCase()))
    );
  }

    // Filter by Category
    if (filters.category) {
      result = result.filter(course => 
      course.category && course.category.toLowerCase() === filters.category.toLowerCase()
      );
  }

    setCourses(result);
    setCurrentPage(1);
  }, [searchTerm, filters, allCourses]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/courses', {
        withCredentials: true 
      });
      const data = Array.isArray(response.data) ? response.data : (response.data.courses || []);
      setCourses(data);
      setAllCourses(data);

    } catch (error) {
      console.error('Error fetching courses:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    // const raw_data = await fetchCourses(); 

    // //searching is filtering using the title
    // if (Array.isArray(raw_data)) {
    //   const filtered_data = raw_data.filter((course) => {
    //     const title = (course.title || "").toLowerCase();
    //     //const description = (course.description || "").toLowerCase();
    //     const search = searchTerm.toLowerCase();

    //     return title.includes(search);
    //     //return title.includes(search) || description.includes(search);
    //   });

    //   console.log('Filtered Data:', filtered_data);
    //   setCourses(filtered_data);
    // }
    
  };

  const handleFilterChange = (filterName, value) => {
    setFilters({
      ...filters,
      [filterName]: value
    });
  };

  const handleLogout = async () => {
    try {

      await axios.post('http://localhost:3000/users/signout', {}, { withCredentials: true });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {

      localStorage.removeItem('user');
      localStorage.removeItem('token'); 
      setIsAuthenticated(false);
      setUser(null);
      navigate('/login');
    }
  };

  const clearFilters = () => {
    setFilters({
      language: '',
      level: '',
      source: '',
      category: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
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

  // Βρίσκουμε τις μοναδικές τιμές από τα δεδομένα μας
  const uniqueLanguages = [...new Set(allCourses.map(c => c.language).filter(Boolean))];
  const uniqueLevels = [...new Set(allCourses.map(c => c.level).filter(Boolean))];
  const uniqueProviders = [...new Set(allCourses.map(c => c.provider || c.source).filter(Boolean))];
  const uniqueCategories = [...new Set(allCourses.map(c => c.category).filter(Boolean))];

  return (
    <div className="home-container">
      <div className="home-wrapper">
        {/* Header Section */}
        {/* Header Section */}
        <div className="page-header">
          <div className="header-content">
            <div className="header-welcome-row">
              <h1>Καλώς ήρθες, {user?.firstName}! 👋</h1>
              <button 
                onClick={() => navigate('/favorites')} 
                className="favorites-btn"
              >
              Αγαπημένα Μαθήματα
              </button>
            </div>
            <p className="header-subtitle">Εξερεύνησε μαθήματα από όλο τον κόσμο</p>
          </div>
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
              {/*<button type="submit" className="search-btn">
                Αναζήτηση
              </button>*/}
            </div>
          </form>

          {/* Filters */}
          <div className="filters-section">
            <div className="filter-group">
              <label>Γλώσσα</label>
              <select value={filters.language} onChange={(e) => handleFilterChange('language', e.target.value)}>
                <option value="">Όλες</option>
                {uniqueLanguages.map(lang => <option key={lang} value={lang}>{lang.toUpperCase()}</option>)}
              </select>
            </div>

            {/* Filter Level */}
            <div className="filter-group">
              <label>Επίπεδο</label>
              <select value={filters.level} onChange={(e) => handleFilterChange('level', e.target.value)}>
                <option value="">Όλα</option>
                {uniqueLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </div>

            {/* Filter Provider */}
            <div className="filter-group">
              <label>Πηγή</label>
              <select value={filters.provider} onChange={(e) => handleFilterChange('provider', e.target.value)}>
                <option value="">Όλες</option>
                {uniqueProviders.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Filter Category */}
            <div className="filter-group">
              <label>Κατηγορία</label>
              <select value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)}>
                <option value="">Όλες</option>
                {uniqueCategories.sort().map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
            <>
              <div className="courses-grid">
                {paginatedCourses.map((course) => (
                  <div key={course._id} className="course-card">
                    {/* TOP BADGE AREA */}
                    <div className="course-card-top">
                      <div className="badge-row">
                        <span className="badge badge-level">{course.level || 'General'}</span>
                        
                        {/* THE ML TOPIC LABEL */}
                        {course.cluster_label && (
                          <span className="badge badge-topic">
                            🏷️ {course.cluster_label}
                          </span>
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

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="pagination-container">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="pagination-btn"
                  >
                    «
                  </button>
                  
                  <div className="pagination-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Εμφάνιση όλων των σελίδων αν είναι λίγες, αλλιώς εμφάνιση με ...
                      if (totalPages <= 15) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                          >
                            {page}
                          </button>
                        );
                      } else {
                        const pagesToShow = 8; // Αριθμός σελίδων αριστερά και δεξιά από την τρέχουσα
                        const startPage = Math.max(1, currentPage - pagesToShow);
                        const endPage = Math.min(totalPages, currentPage + pagesToShow);
                        
                        if (
                          page === 1 ||
                          page === totalPages ||
                          (page >= startPage && page <= endPage)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                            >
                              {page}
                            </button>
                          );
                        } else if (page === startPage - 1 || page === endPage + 1) {
                          return <span key={page} className="pagination-dots">...</span>;
                        }
                        return null;
                      }
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="pagination-btn"
                  >
                    »
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;