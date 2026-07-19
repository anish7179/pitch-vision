import React from 'react';
import { LogIn } from 'lucide-react';

const Login = () => {
  const handleGoogleLogin = () => {
    // Redirects to our backend route for Google OAuth
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel">
        <div className="login-header">
          <div className="logo-placeholder">
            <span className="logo-icon">⚽</span>
          </div>
          <h1>PitchVision</h1>
          <p>Enterprise Football Analytics Platform</p>
        </div>

        <button className="google-auth-btn" onClick={handleGoogleLogin}>
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google Logo"
            className="google-icon"
          />
          Sign in with Google
          <LogIn className="btn-icon" size={18} />
        </button>
      </div>

      <div className="ambient-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
    </div>
  );
};

export default Login;
