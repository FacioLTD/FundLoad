import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import HomePage from './pages/HomePage';
import OutputsPage from './pages/OutputsPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './components/LoginPage';
import '@fontsource/inter';
import '@fontsource/ibm-plex-sans';
import '@fontsource/space-grotesk';
import './index.css';

const colorPalette = {
  primary: '#00FFFF',
  primaryDark: '#009999',
  accent: '#00CFFF',
  background: '#121212',
  surface: '#1E1E1E',
};

const futuristicTheme = (density = 'comfortable') => createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: colorPalette.background,
      paper: colorPalette.surface,
    },
    primary: {
      main: colorPalette.primary,
      dark: colorPalette.primaryDark,
    },
    secondary: {
      main: colorPalette.accent,
    },
    text: {
      primary: '#e0e0e0',
      secondary: colorPalette.primary,
    },
    error: {
      main: '#ff1744',
    },
    warning: {
      main: '#ffea00',
    },
    info: {
      main: '#00b0ff',
    },
    success: {
      main: '#00e676',
    },
  },
  typography: {
    fontFamily: 'Inter, IBM Plex Sans, Space Grotesk, Roboto, monospace',
    fontWeightBold: 700,
    h1: { color: colorPalette.primary },
    h2: { color: colorPalette.primary },
    h3: { color: colorPalette.primary },
    h4: { color: colorPalette.primary },
    h5: { color: colorPalette.primary },
    h6: { color: colorPalette.primary },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: colorPalette.surface,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: 8,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          color: colorPalette.primary,
        },
        input: {
          color: colorPalette.primary,
        },
      },
    },
  },
  spacing: density === 'compact' ? 4 : 8,
});

export default function App() {
  const [density, setDensity] = useState('comfortable');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Check if user is already authenticated
    const authHeader = sessionStorage.getItem('authHeader');
    const storedUsername = sessionStorage.getItem('username');
    
    console.log('🔍 APP AUTH CHECK - Auth header present:', !!authHeader);
    console.log('🔍 APP AUTH CHECK - Username present:', !!storedUsername);
    console.log('🔍 APP AUTH CHECK - Auth header value:', authHeader);
    console.log('🔍 APP AUTH CHECK - Username value:', storedUsername);
    
    if (authHeader && storedUsername) {
      console.log('🔍 APP AUTH CHECK - Setting authenticated to true');
      setIsAuthenticated(true);
      setUsername(storedUsername);
    } else {
      // Auto-authenticate for development (no backend auth required)
      console.log('🔍 APP AUTH CHECK - Auto-authenticating for development');
      const defaultAuthHeader = 'Basic ' + btoa('admin:admin');
      sessionStorage.setItem('authHeader', defaultAuthHeader);
      sessionStorage.setItem('username', 'admin');
      setIsAuthenticated(true);
      setUsername('admin');
    }
  }, []);

  // Listen for session cleared event (when api.js clears session due to 401)
  useEffect(() => {
    const handleSessionCleared = () => {
      console.log('🔍 APP SESSION CLEARED - Received sessionCleared event');
      setIsAuthenticated(false);
      setUsername('');
    };

    window.addEventListener('sessionCleared', handleSessionCleared);
    return () => window.removeEventListener('sessionCleared', handleSessionCleared);
  }, []);

  const handleLogin = (user) => {
    setIsAuthenticated(true);
    setUsername(user);
  };

  const handleLogout = () => {
    console.log('🔍 APP LOGOUT - handleLogout called');
    console.log('🔍 APP LOGOUT - Clearing session storage');
    sessionStorage.removeItem('authHeader');
    sessionStorage.removeItem('username');
    setIsAuthenticated(false);
    setUsername('');
    console.log('🔍 APP LOGOUT - Logout complete');
  };

  console.log('🔍 APP RENDER - isAuthenticated:', isAuthenticated);
  console.log('🔍 APP RENDER - username:', username);
  
  if (!isAuthenticated) {
    console.log('🔍 APP RENDER - Redirecting to login page');
    return (
      <ThemeProvider theme={futuristicTheme(density)}>
        <CssBaseline />
        <LoginPage onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={futuristicTheme(density)}>
      <CssBaseline />
      <Router>
        <DashboardLayout density={density} setDensity={setDensity} onLogout={handleLogout} username={username}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage density={density} />} />
            <Route path="/outputs" element={<OutputsPage density={density} />} />
            <Route path="/settings" element={<SettingsPage density={density} setDensity={setDensity} />} />
          </Routes>
        </DashboardLayout>
      </Router>
    </ThemeProvider>
  );
}
