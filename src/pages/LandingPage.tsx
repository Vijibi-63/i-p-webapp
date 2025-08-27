import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-container" style={{ width: '100vw', minHeight: '100vh', margin: 0, background: '#fff', padding: 24 }}>
      <h1>RBS Invoice & Proposal Generator</h1>
      <div className="landing-actions">
        <button onClick={() => navigate('/new/invoice')}>Create Invoice</button>
        <button onClick={() => navigate('/new/proposal')}>Create Proposal</button>
      </div>
      <a href="/library">Open Library</a>
    </div>
  );
};

export default LandingPage;
