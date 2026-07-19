import React, { useEffect, useState } from 'react';
import apiClient from '../api/axios';
import { Activity, Clock, LogOut } from 'lucide-react';

const Dashboard = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLiveMatches = async () => {
      try {
        const response = await apiClient.get('/football/live');
        if (response.data.success) {
          setMatches(response.data.data.matches);
        }
      } catch (err) {
        // Handle 401 Unauthorized by redirecting to login
        if (err.response && err.response.status === 401) {
          window.location.href = '/login';
        } else {
          setError('Failed to fetch live matches. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLiveMatches();
    // Set up polling every 60 seconds for live updates
    const intervalId = setInterval(fetchLiveMatches, 60000);
    return () => clearInterval(intervalId);
  }, []);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header glass-panel">
        <div className="brand">
          <span className="brand-logo">⚽</span>
          <h2>PitchVision Live</h2>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </header>

      <main className="dashboard-main">
        <div className="section-title">
          <h3>
            <Activity className="icon-pulse" size={20} /> Active Matches
          </h3>
          <div className="live-badge">LIVE</div>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading live match data...</p>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

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
