import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/shared/Navbar';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Home from './components/welcome_page/Home';
import CourseDetails from './pages/CourseDetails';
import Analytics from './pages/Analytics';
import AdminDashboard from './pages/AdminDashboard'; 

const ProtectedRoute = ({ children, isAdminRequired }) => {
    const userString = localStorage.getItem('user');
    
    if (!userString) {
        console.log("Access Denied: No user found in localStorage");
        return <Navigate to="/login" />;
    }
    
    const user = JSON.parse(userString);
    console.log("Current User:", user.role);

    if (isAdminRequired && user.role?.toLowerCase() !== 'admin') {
        console.log("Access Denied: Admin role required");
        return <Navigate to="/" />;
    }

    return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/courses/:id" element={<CourseDetails />} />

          {/* Protected Admin Routes */}
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute isAdminRequired={false}>
                <Analytics />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute isAdminRequired={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />

          {/* Fallback για λάθος URLs */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;