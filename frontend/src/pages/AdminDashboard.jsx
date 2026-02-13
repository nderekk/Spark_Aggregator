import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [syncLogs, setSyncLogs] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [availableSources, setAvailableSources] = useState([]);
    const [isSparkRunning, setIsSparkRunning] = useState(false);
    const [isClusterRunning, setIsClusterRunning] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData || userData.role !== 'admin') {
            navigate('/'); 
            return;
        }

        const fetchSources = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const response = await axios.get('http://localhost:3000/courses/sources', { 
                    headers: {Authorization: `Bearer ${token}`},
                    withCredentials: true });
                if (response.data.sources) {
                    setAvailableSources(response.data.sources);
                }
            } catch (error) {
                console.error("Αποτυχία φόρτωσης πηγών:", error);
            }
        };
        fetchSources();
    }, [navigate]);

    // Λειτουργία Harvesting (Section 4.1 της εργασίας)
    const handleSync = async (source) => {
        if (!window.confirm(`Έναρξη ETL process για: ${source.toUpperCase()};`)) return;
        setIsSyncing(true);
        const token = localStorage.getItem('token');
        try {
            const response = await axios.get(`http://localhost:3000/courses/sync/${source}`, { 
                headers: {
                    Authorization: `Bearer ${token}`
                },
                withCredentials: true 
            });
            addLog(source, 'Success', `Συγχρονίστηκαν ${response.data.count} μαθήματα`);
        } catch (error) {
            if (error.response?.status === 401) navigate('/login');
            addLog(source, 'Error', error.response?.data?.message || 'Αποτυχία connector');
        } finally {
            setIsSyncing(false);
        }
    };

    // Λειτουργία Spark ML Trigger (Section 4.4 της εργασίας)
    const handleSparkJob = async (option, optionName) => {
        setIsSparkRunning(true);
        const token = localStorage.getItem('token');
        try {
            // Εδώ καλείς το Spark endpoint σου με το συγκεκριμένο option
            await axios.post(`http://localhost:3000/analytics/run-spark/${option}`, {}, { 
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true });
            addLog('SPARK-ML', 'Success', `Σενάριο ${optionName} ολοκληρώθηκε`);
        } catch (error) {
            addLog('SPARK-ML', 'Error', `Αποτυχία σενάριου ${optionName}`);
        } finally {
            setIsSparkRunning(false);
        }
    };
    // Λειτουργία Clustering Trigger (LDA Topic Modeling)
    const handleClusterJob = async () => {
        if (!window.confirm('Έναρξη Clustering Job (LDA - Topic Modeling);')) return;
        setIsClusterRunning(true);
        const token = localStorage.getItem('token');
        try {
            await axios.post('http://localhost:3000/analytics/run-cluster', {}, { 
                headers: { Authorization: `Bearer ${token}` },
                withCredentials: true });
            addLog('CLUSTERING', 'Success', 'Clustering και Topic Modeling ολοκληρώθηκε');
        } catch (error) {
            addLog('CLUSTERING', 'Error', 'Αποτυχία σύνδεσης με Clustering Job');
        } finally {
            setIsClusterRunning(false);
        }
    };
    const addLog = (source, status, message) => {
        const newLog = { id: Date.now(), source, time: new Date().toLocaleTimeString(), status, message };
        setSyncLogs(prev => [newLog, ...prev]);
    };

    return (
        <div className="admin-container">
            <header className="admin-header">
                <div className="header-main">
                    <h1>Admin Control Center</h1>
                    <div className="admin-nav">
                        <button onClick={() => navigate('/')} className="nav-btn">Home</button>                        
                    </div>
                </div>
            </header>

            <div className="admin-grid">
                {/* SECTION 1: HARVESTING (ETL) */}
                <div className="admin-card">
                    <h2>📥 Data Harvesting (API Connectors)</h2>
                    <p>Συλλογή δεδομένων από εξωτερικά repositories.</p>
                    <div className="button-group">
                        {availableSources.map(source => (
                            <button 
                                key={source} 
                                onClick={() => handleSync(source)} 
                                disabled={isSyncing}
                                className="sync-btn"
                            >
                                {isSyncing ? 'Syncing...' : `Harvest ${source.toUpperCase()}`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* SECTION 2: SPARK ML OPS */}
                <div className="admin-card spark-card">
                    <h2>Apache Spark ML Engine</h2>
                    <p>Εκτέλεση Large-scale επεξεργασίας για Recommendations.</p>
                    <div className="spark-buttons-grid">
                        <button 
                            onClick={() => handleSparkJob('0', 'Exact TF-IDF')} 
                            disabled={isSparkRunning}
                            className="spark-btn"
                            title="Ground Truth - Ακριβές Cosine Similarity"
                        >
                            {isSparkRunning ? 'Processing...' : '🎯 Exact TF-IDF'}
                        </button>
                        <button 
                            onClick={() => handleSparkJob('1', 'Fast LSH')} 
                            disabled={isSparkRunning}
                            className="spark-btn"
                            title="MinHash LSH - Γρήγορη προσέγγιση"
                        >
                            {isSparkRunning ? 'Processing...' : '⚡ Fast LSH'}
                        </button>
                        <button 
                            onClick={() => handleSparkJob('2', 'Thematic LDA')} 
                            disabled={isSparkRunning}
                            className="spark-btn"
                            title="LDA + BRP LSH - Θεματικές συστάσεις"
                        >
                            {isSparkRunning ? 'Processing...' : '📚 Thematic LDA'}
                        </button>
                        <button 
                            onClick={() => handleSparkJob('3', 'Hybrid')} 
                            disabled={isSparkRunning}
                            className="spark-btn"
                            title="Hybrid - Συνδυασμός όλων των μεθόδων"
                        >
                            {isSparkRunning ? 'Processing...' : '🔀 Hybrid'}
                        </button>
                    </div>
                </div>

                {/* SECTION 2B: CLUSTERING OPS */}
                <div className="admin-card cluster-card">
                    <h2>📊 Course Clustering (LDA)</h2>
                    <p>Ομαδοποίηση μαθημάτων σε θεματικές ομάδες με LDA Topic Modeling.</p>
                    <button 
                        onClick={handleClusterJob} 
                        disabled={isClusterRunning}
                        className="cluster-btn"
                    >
                        {isClusterRunning ? 'Clustering...' : 'Run Clustering Job'}
                    </button>
                </div>
            </div>

            {/* SECTION 3: LOGS */}
            <div className="monitoring-section">
                <h2>System Activity Log</h2>
                <div className="log-table-container">
                    <table className="log-table">
                        <thead>
                            <tr><th>Source</th><th>Time</th><th>Status</th><th>Message</th></tr>
                        </thead>
                        <tbody>
                            {syncLogs.map(log => (
                                <tr key={log.id} className={`row-${log.status.toLowerCase()}`}>
                                    <td><strong>{log.source}</strong></td>
                                    <td>{log.time}</td>
                                    <td><span className={`status-badge ${log.status.toLowerCase()}`}>{log.status}</span></td>
                                    <td>{log.message}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;