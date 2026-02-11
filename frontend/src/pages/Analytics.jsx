import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Analytics.css';

const Analytics = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userString = localStorage.getItem('user');
    if (!userString) {
      navigate('/login');
      return;
    }
    
    fetchAnalytics();
  }, [navigate]);

  const handleSync = async () => {
  try {
    if (!window.confirm("Θέλετε να ξεκινήσετε το συγχρονισμό δεδομένων; Αυτό μπορεί να πάρει μερικά λεπτά.")) return;
    
    setLoading(true);
    const response = await axios.post('http://localhost:3000/courses/sync-courses', {}, {
      withCredentials: true 
    });
    
    alert(`Ο συγχρονισμός ολοκληρώθηκε! Προστέθηκαν ${response.data.added} νέα μαθήματα.`);
    fetchAnalytics(); 
  } catch (error) {
    console.error("Sync error:", error);
    alert("Σφάλμα κατά το συγχρονισμό.");
  } finally {
    setLoading(false);
  }
};

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3000/analytics/stats', {
        withCredentials: true 
      });
      setStats(response.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate('/');
      }
      setStats({
        totalCourses: 0,
        bySource: [],
        byLanguage: [],
        byLevel: [],
        byCategory: [],
        uniqueSources: 0,
        uniqueCategories: 0,
        uniqueLanguages: 0,
        topCategory: null,
        topSource: null,
        coursesWithDescription: 0,
        descriptionPercentage: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Φόρτωση αναλυτικών στοιχείων...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-wrapper">
        
        {/* ADMIN QUICK ACTIONS */}
        <div className="admin-quick-actions">
          {JSON.parse(localStorage.getItem('user'))?.role === 'admin' && (
            <button onClick={handleSync} className="action-btn sync">
                Διαχείριση Sync
            </button>
        )}
          <button onClick={fetchAnalytics} className="action-btn refresh">
            Ανανέωση Δεδομένων
          </button>
        </div>

        {/* Header */}
        <div className="analytics-header">
          <div>
            <h1>📊 Analytics Dashboard</h1>
            <p className="header-subtitle">
              Στατιστικά και αναλύσεις για τα μαθήματα του aggregator
            </p>
          </div>
          <button onClick={() => navigate('/')} className="back-btn">
            ← Επιστροφή
          </button>
        </div>

        {/* Overview Cards */}
        <div className="overview-section">
          <div className="stat-card stat-card-primary">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <h3>Σύνολο Μαθημάτων</h3>
              <p className="stat-number">{stats?.totalCourses?.toLocaleString() || 0}</p>
            </div>
          </div>

          <div className="stat-card stat-card-success">
            <div className="stat-icon">🌐</div>
            <div className="stat-content">
              <h3>Μοναδικές Πηγές</h3>
              <p className="stat-number">{stats.uniqueSources}</p>
            </div>
          </div>

          <div className="stat-card stat-card-info">
            <div className="stat-icon">📁</div>
            <div className="stat-content">
              <h3>Κατηγορίες</h3>
              <p className="stat-number">{stats.uniqueCategories}</p>
            </div>
          </div>

          <div className="stat-card stat-card-warning">
            <div className="stat-icon">🌍</div>
            <div className="stat-content">
              <h3>Γλώσσες</h3>
              <p className="stat-number">{stats.uniqueLanguages}</p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          <div className="chart-card">
            <h2 className="chart-title">📡 Μαθήματα ανά Πηγή</h2>
            {stats.bySource.length > 0 ? (
              <div className="chart-content">
                {stats.bySource.map((item, index) => (
                  <div key={index} className="chart-bar-item">
                    <div className="chart-bar-label">
                      <span className="label-name">{item.name}</span>
                      <span className="label-count">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="chart-bar-container">
                      <div className="chart-bar" style={{ width: `${item.percentage}%` }}>
                        <span className="bar-percentage">{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="chart-empty">Δεν υπάρχουν δεδομένα</div>}
          </div>

          <div className="chart-card">
            <h2 className="chart-title">🌍 Μαθήματα ανά Γλώσσα</h2>
            <div className="chart-content">
              {stats.byLanguage.map((item, index) => (
                <div key={index} className="chart-bar-item">
                  <div className="chart-bar-label">
                    <span className="label-name">{item.name}</span>
                    <span className="label-count">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="chart-bar-container">
                    <div className="chart-bar chart-bar-language" style={{ width: `${item.percentage}%` }}>
                      <span className="bar-percentage">{item.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Statistics & Health Table */}
        {stats.totalCourses > 0 && (
          <>
            <div className="additional-stats-section">
              <h2 className="section-title">📈 Επιπλέον Στατιστικά</h2>
              <div className="additional-stats-grid">
                <div className="additional-stat-card">
                  <div className="additional-stat-icon">📝</div>
                  <div className="additional-stat-info">
                    <h3>Μαθήματα με Περιγραφή</h3>
                    <p className="additional-stat-number">{stats.coursesWithDescription.toLocaleString()}</p>
                    <p className="additional-stat-percentage">{stats.descriptionPercentage}% του συνόλου</p>
                  </div>
                </div>

                <div className="additional-stat-card">
                  <div className="additional-stat-icon">📊</div>
                  <div className="additional-stat-info">
                    <h3>Μέσος Όρος / Κατηγορία</h3>
                    <p className="additional-stat-number">
                      {stats.uniqueCategories > 0 ? Math.round(stats.totalCourses / stats.uniqueCategories) : 0}
                    </p>
                    <p className="additional-stat-percentage">μαθήματα ανά κατηγορία</p>
                  </div>
                </div>

                <div className="additional-stat-card">
                  <div className="additional-stat-icon">🌐</div>
                  <div className="additional-stat-info">
                    <h3>Μέσος Όρος / Πηγή</h3>
                    <p className="additional-stat-number">
                      {stats.uniqueSources > 0 ? Math.round(stats.totalCourses / stats.uniqueSources) : 0}
                    </p>
                    <p className="additional-stat-percentage">μαθήματα ανά πηγή</p>
                  </div>
                </div>
              </div>
            </div>

            {/* DATA HEALTH TABLE */}
            <div className="data-health-section">
              <h2 className="section-title">🩺 Κατάσταση Connectors</h2>
              <div className="health-table-wrapper">
                <table className="health-table">
                  <thead>
                    <tr>
                      <th>Πηγή</th>
                      <th>Τελευταίο Sync</th>
                      <th>Πλήθος</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.bySource.map((source, idx) => (
                      <tr key={idx}>
                        <td><strong>{source.name.toUpperCase()}</strong></td>
                        <td>{new Date().toLocaleDateString()}</td>
                        <td>{source.count.toLocaleString()}</td>
                        <td>
                          <span className="status-indicator online">Online</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;