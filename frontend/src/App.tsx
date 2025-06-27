import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { MeetingPage } from './components/MeetingPage';
import './styles/global.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/meeting/:id" element={<MeetingPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;