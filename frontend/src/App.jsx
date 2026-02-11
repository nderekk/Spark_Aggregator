import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/shared/Navbar';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import Home from './components/welcome_page/Home';
import CourseDetails from './pages/CourseDetails';
import Analytics from './pages/Analytics';
import Favorites from './pages/Favorites';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/courses/:id" element={<CourseDetails />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/favorites" element={<Favorites />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;