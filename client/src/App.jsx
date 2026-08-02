import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Leagues from './pages/Leagues';
import Teams from './pages/Teams';
import Players from './pages/Players';
import MatchDetail from './pages/MatchDetail';
import Matches from './pages/Matches';
import TeamDetail from './pages/TeamDetail';
import PlayerDetail from './pages/PlayerDetail';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { useSocket } from './hooks/useSocket';
export default function App() {
  // Initialize global socket connection
  useSocket();

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="relative min-h-screen w-full flex flex-col items-center font-sans bg-(--bg-primary)">
            
            {/* Navbar - Fixed at top */}
            <Navbar />

            {/* Central Content Pillar */}
            <div className="w-full grow flex flex-col items-center">
              <main className="w-full max-w-7xl min-h-screen flex flex-col transition-colors duration-300 pb-12 px-4 md:px-8">
                {/* The spacer pushing content below the navbar */}
                <div className="h-32 w-full shrink-0"></div>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/leagues" element={<Leagues />} />
                  <Route path="/teams" element={<Teams />} />
                  <Route path="/team/:id" element={<TeamDetail />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/player/:id" element={<PlayerDetail />} />
                  <Route path="/match/:id" element={<MatchDetail />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </main>
            </div>
            
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
