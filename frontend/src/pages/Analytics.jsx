import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Analytics.css';

const Analytics = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/analytics/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
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
              <p className="stat-number">{stats.totalCourses.toLocaleString()}</p>
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

          {stats.topCategory && (
            <div className="stat-card stat-card-accent">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <h3>Κορυφαία Κατηγορία</h3>
                <p className="stat-text">{stats.topCategory.name}</p>
                <p className="stat-subtext">{stats.topCategory.count.toLocaleString()} μαθήματα</p>
              </div>
            </div>
          )}

          {stats.topSource && (
            <div className="stat-card stat-card-accent2">
              <div className="stat-icon">🏆</div>
              <div className="stat-content">
                <h3>Κορυφαία Πηγή</h3>
                <p className="stat-text">{stats.topSource.name}</p>
                <p className="stat-subtext">{stats.topSource.count.toLocaleString()} μαθήματα</p>
              </div>
            </div>
          )}
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* By Source */}
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
                      <div
                        className="chart-bar"
                        style={{ width: `${item.percentage}%` }}
                      >
                        <span className="bar-percentage">{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-empty">Δεν υπάρχουν δεδομένα</div>
            )}
          </div>

          {/* By Language */}
          <div className="chart-card">
            <h2 className="chart-title">🌍 Μαθήματα ανά Γλώσσα</h2>
            {stats.byLanguage.length > 0 ? (
              <div className="chart-content">
                {stats.byLanguage.map((item, index) => (
                  <div key={index} className="chart-bar-item">
                    <div className="chart-bar-label">
                      <span className="label-name">{item.name}</span>
                      <span className="label-count">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="chart-bar-container">
                      <div
                        className="chart-bar chart-bar-language"
                        style={{ width: `${item.percentage}%` }}
                      >
                        <span className="bar-percentage">{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-empty">Δεν υπάρχουν δεδομένα</div>
            )}
          </div>

          {/* By Level */}
          <div className="chart-card">
            <h2 className="chart-title">📊 Μαθήματα ανά Επίπεδο</h2>
            {stats.byLevel.length > 0 ? (
              <div className="chart-content">
                {stats.byLevel.map((item, index) => (
                  <div key={index} className="chart-bar-item">
                    <div className="chart-bar-label">
                      <span className="label-name">{item.name}</span>
                      <span className="label-count">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="chart-bar-container">
                      <div
                        className="chart-bar chart-bar-level"
                        style={{ width: `${item.percentage}%` }}
                      >
                        <span className="bar-percentage">{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-empty">Δεν υπάρχουν δεδομένα</div>
            )}
          </div>
          {/* By Category */}
          <div className="chart-card">
            <h2 className="chart-title">📁 Μαθήματα ανά Θεματική Κατηγορία</h2>
            {stats.byCategory.length > 0 ? (
              <div className="chart-content">
                {stats.byCategory.map((item, index) => (
                  <div key={index} className="chart-bar-item">
                    <div className="chart-bar-label">
                      <span className="label-name">{item.name}</span>
                      <span className="label-count">{item.count.toLocaleString()}</span>
                    </div>
                    <div className="chart-bar-container">
                      <div
                        className="chart-bar chart-bar-category"
                        style={{ width: `${item.percentage}%` }}
                      >
                        <span className="bar-percentage">{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="chart-empty">Δεν υπάρχουν δεδομένα</div>
            )}
          </div>
        </div>

        {/* Additional Statistics */}
        {stats.totalCourses > 0 && (
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
                  <h3>Μέσος Όρος ανά Κατηγορία</h3>
                  <p className="additional-stat-number">
                    {stats.uniqueCategories > 0 
                      ? Math.round(stats.totalCourses / stats.uniqueCategories) 
                      : 0}
                  </p>
                  <p className="additional-stat-percentage">μαθήματα ανά κατηγορία</p>
                </div>
              </div>

              <div className="additional-stat-card">
                <div className="additional-stat-icon">🌐</div>
                <div className="additional-stat-info">
                  <h3>Μέσος Όρος ανά Πηγή</h3>
                  <p className="additional-stat-number">
                    {stats.uniqueSources > 0 
                      ? Math.round(stats.totalCourses / stats.uniqueSources) 
                      : 0}
                  </p>
                  <p className="additional-stat-percentage">μαθήματα ανά πηγή</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default Analytics;