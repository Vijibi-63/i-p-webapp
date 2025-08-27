import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-container" style={{ width: '100vw', minHeight: '100vh', margin: 0, background: '#fff', padding: 24 }}>
      <h1>RBS Invoice & Proposal Generator</h1>
      <div className="landing-actions" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 12 }}>
        <button onClick={() => navigate('/new/invoice')}>Create Invoice</button>
        <button onClick={() => navigate('/new/proposal')}>Create Proposal</button>
      </div>
      <div style={{ marginTop: 24 }}>
        <button
          onClick={() => navigate('/library')}
          title="Open Library"
          style={{
            background: '#eaf4ff',
            color: '#0b5cab',
            boxShadow: 'none',
            border: '1px solid #cfe4ff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span aria-hidden>📚</span>
          <span>Open Library</span>
        </button>
      </div>
    </div>
  );
};

export default LandingPage;
