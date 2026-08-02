import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import { Activity, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { logout, user } = useAuth();

  useEffect(() => {
    const fetchLiveMatches = async () => {
      try {
        const response = await apiClient.get('/football/live');
        if (response.data.success) {
          setMatches(response.data.data.matches);
        }
      } catch (err) {
        setError('Failed to fetch live matches. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchLiveMatches();
    // Set up polling every 60 seconds for live updates
    const intervalId = setInterval(fetchLiveMatches, 60000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header glass-panel">
        <div className="brand">
          <span className="brand-logo">⚽</span>
          <h2>PitchVision Live</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user && <span style={{ color: 'var(--text-muted)' }}>{user.name}</span>}
          <button className="logout-btn" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="section-title">
          <div className="glass-panel" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px' }}>
            <h3>
              <Activity className="icon-pulse" size={20} /> Active Matches
            </h3>
            <div className="live-badge">LIVE</div>
          </div>
        </div>

        {loading && (
          <div className="loading-state glass-panel">
            <div className="spinner"></div>
            <p>Syncing live match data...</p>
          </div>
        )}

        {error && <div className="error-banner glass-panel">{error}</div>}

        {!loading && !error && matches.length === 0 && (
          <div className="empty-state glass-panel">
            <span className="empty-icon">🏟️</span>
            <h4>No Live Matches</h4>
            <p>There are no football matches currently being played.</p>
          </div>
        )}

        {!loading && !error && matches.length > 0 && (
          <div className="matches-grid">
            {matches.map((match) => (
              <div key={match.matchId} className="match-card glass-panel">
                <div className="match-card-header">
                  <span className="league-name">{match.league.name}</span>
                  <div className="match-status">
                    <Clock size={14} />
                    <span>{match.status.elapsed}'</span>
                  </div>
                </div>

                <div className="match-score-section">
                  {/* Home Team */}
                  <div className="team home-team">
                    <img src={match.teams.home.logo} alt={match.teams.home.name} className="team-logo" />
                    <span className="team-name">{match.teams.home.name}</span>
                  </div>

                  {/* Score */}
                  <div className="score-display">
                    <span className="score-number">{match.goals.home ?? '-'}</span>
                    <span className="score-divider">:</span>
                    <span className="score-number">{match.goals.away ?? '-'}</span>
                  </div>

                  {/* Away Team */}
                  <div className="team away-team">
                    <img src={match.teams.away.logo} alt={match.teams.away.name} className="team-logo" />
                    <span className="team-name">{match.teams.away.name}</span>
                  </div>
                </div>

                <div className="match-card-footer">
                  <div className="stadium-info">
                    {match.venue ? `${match.venue.name}, ${match.venue.city}` : 'TBD'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
