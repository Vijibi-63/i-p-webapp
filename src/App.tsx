import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LibraryPage from './pages/LibraryPage';
import EditorPage from './pages/EditorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/edit/:type/:id" element={<EditorPage />} />
        <Route path="/new/:type" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
