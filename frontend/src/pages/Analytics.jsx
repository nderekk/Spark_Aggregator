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
      const response = await axios.get('http://localhost:3000/analytics/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Mock data για development
      setStats({
        totalCourses: 15432,
        bySource: [
          { name: 'Coursera', count: 5234, percentage: 34 },
          { name: 'Udemy', count: 4521, percentage: 29 },
          { name: 'MIT OpenCourseWare', count: 3123, percentage: 20 },
          { name: 'edX', count: 2554, percentage: 17 }
        ],
        byLanguage: [
          { name: 'English', count: 8432, percentage: 55 },
          { name: 'Greek', count: 3211, percentage: 21 },
          { name: 'Spanish', count: 2145, percentage: 14 },
          { name: 'French', count: 1644, percentage: 10 }
        ],
        byLevel: [
          { name: 'Beginner', count: 6172, percentage: 40 },
          { name: 'Intermediate', count: 5544, percentage: 36 },
          { name: 'Advanced', count: 3716, percentage: 24 }
        ],
        byCategory: [
          { name: 'Computer Science', count: 4329, percentage: 28 },
          { name: 'Business', count: 3086, percentage: 20 },
          { name: 'Data Science', count: 2772, percentage: 18 },
          { name: 'Web Development', count: 2315, percentage: 15 },
          { name: 'Design', count: 1544, percentage: 10 },
          { name: 'Other', count: 1386, percentage: 9 }
        ],
        recentUpdates: 234,
        lastSync: '2024-01-30T10:30:00Z'
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
            <div className="stat-icon">🔄</div>
            <div className="stat-content">
              <h3>Πρόσφατες Ενημερώσεις</h3>
              <p className="stat-number">{stats.recentUpdates}</p>
            </div>
          </div>

          <div className="stat-card stat-card-info">
            <div className="stat-icon">🕒</div>
            <div className="stat-content">
              <h3>Τελευταίος Συγχρονισμός</h3>
              <p className="stat-text">
                {new Date(stats.lastSync).toLocaleString('el-GR')}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* By Source */}
          <div className="chart-card">
            <h2 className="chart-title">Μαθήματα ανά Πηγή</h2>
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
          </div>

          {/* By Language */}
          <div className="chart-card">
            <h2 className="chart-title">Μαθήματα ανά Γλώσσα</h2>
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
          </div>

          {/* By Level */}
          <div className="chart-card">
            <h2 className="chart-title">Μαθήματα ανά Επίπεδο</h2>
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
          </div>

          {/* By Category */}
          <div className="chart-card chart-card-wide">
            <h2 className="chart-title">Μαθήματα ανά Θεματική Κατηγορία</h2>
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
          </div>
        </div>

        {/* Info Section */}
        <div className="info-section">
          <div className="info-card">
            <h3>ℹ️ Σχετικά με τα Δεδομένα</h3>
            <p>
              Τα στατιστικά ενημερώνονται αυτόματα μετά από κάθε συγχρονισμό με τις 
              εξωτερικές πηγές. Τα δεδομένα επεξεργάζονται με Apache Spark για 
              γρήγορη και αποδοτική ανάλυση μεγάλων όγκων πληροφοριών.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;