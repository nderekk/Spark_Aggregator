import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [syncLogs, setSyncLogs] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [availableSources, setAvailableSources] = useState([]);
    const [isSparkRunning, setIsSparkRunning] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!userData || userData.role !== 'admin') {
            navigate('/'); 
            return;
        }

        const fetchSources = async () => {
            try {
                const response = await axios.get('http://localhost:3000/courses/sources', { withCredentials: true });
                setAvailableSources(response.data.sources);
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
        try {
            const response = await axios.get(`http://localhost:3000/courses/sync/${source}`, { withCredentials: true });
            addLog(source, 'Success', `Συγχρονίστηκαν ${response.data.count} μαθήματα`);
        } catch (error) {
            addLog(source, 'Error', error.response?.data?.message || 'Αποτυχία connector');
        } finally {
            setIsSyncing(false);
        }
    };

    // Λειτουργία Spark ML Trigger (Section 4.4 της εργασίας)
    const handleSparkJob = async () => {
        setIsSparkRunning(true);
        try {
            // Εδώ καλείς το Spark endpoint σου
            await axios.post('http://localhost:3000/analytics/run-spark', {}, { withCredentials: true });
            alert("Το Spark Job ξεκίνησε! Υπολογισμός Cosine Similarity σε εξέλιξη...");
            addLog('SPARK-ML', 'Success', 'Επαναϋπολογισμός recommendations ολοκληρώθηκε');
        } catch (error) {
            addLog('SPARK-ML', 'Error', 'Αποτυχία σύνδεσης με Spark Cluster');
        } finally {
            setIsSparkRunning(false);
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
                    <button 
                        onClick={handleSparkJob} 
                        disabled={isSparkRunning}
                        className="spark-btn"
                    >
                        {isSparkRunning ? 'Processing...' : 'Run Similarity Job (TF-IDF)'}
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