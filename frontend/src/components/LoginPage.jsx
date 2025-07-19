import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  TextField, 
  Button, 
  Typography, 
  Alert,
  Stack
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

export default function LoginPage({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Create basic auth header
      const authHeader = 'Basic ' + btoa(`${credentials.username}:${credentials.password}`);
      
      // Test the credentials by making a request to a protected endpoint
      const response = await fetch('/api/v1/config', {
        headers: {
          'Authorization': authHeader
        }
      });

      if (response.ok) {
        // Store credentials in session storage
        sessionStorage.setItem('authHeader', authHeader);
        sessionStorage.setItem('username', credentials.username);
        console.log('🔍 LOGIN DEBUG - Login successful');
        console.log('🔍 LOGIN DEBUG - Stored authHeader:', authHeader);
        console.log('🔍 LOGIN DEBUG - Stored username:', credentials.username);
        onLogin(credentials.username);
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (e) => {
    setCredentials(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background elements */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, #00fff720 0%, transparent 70%)',
          animation: 'pulse 3s ease-in-out infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 0.3, transform: 'scale(1)' },
            '50%': { opacity: 0.6, transform: 'scale(1.1)' }
          }
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          right: '10%',
          width: 150,
          height: 150,
          background: 'radial-gradient(circle, #00fff715 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite reverse',
        }}
      />

      <Paper
        elevation={24}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          background: 'rgba(24, 24, 27, 0.95)',
          border: '2px solid #00fff7',
          borderRadius: 3,
          boxShadow: '0 0 40px #00fff740',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 1
        }}
      >
        <Stack spacing={3} alignItems="center">
          <LockIcon sx={{ fontSize: 48, color: '#00fff7' }} />
          
          <Typography 
            variant="h4" 
            sx={{ 
              color: '#00fff7', 
              fontFamily: 'Orbitron', 
              fontWeight: 700,
              textAlign: 'center'
            }}
          >
            Fund Load Adjudication
          </Typography>
          
          <Typography 
            variant="body2" 
            sx={{ 
              color: '#ccc', 
              textAlign: 'center',
              mb: 2
            }}
          >
            Enter your credentials to access the system
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Username"
                value={credentials.username}
                onChange={handleInputChange('username')}
                required
                inputProps={{ autoComplete: 'username' }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#00fff7' },
                    '&:hover fieldset': { borderColor: '#00fff7' },
                    '&.Mui-focused fieldset': { borderColor: '#00fff7' }
                  },
                  '& .MuiInputLabel-root': { color: '#00fff7' }
                }}
              />
              
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={credentials.password}
                onChange={handleInputChange('password')}
                required
                inputProps={{ autoComplete: 'current-password' }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: '#fff',
                    '& fieldset': { borderColor: '#00fff7' },
                    '&:hover fieldset': { borderColor: '#00fff7' },
                    '&.Mui-focused fieldset': { borderColor: '#00fff7' }
                  },
                  '& .MuiInputLabel-root': { color: '#00fff7' }
                }}
              />

              {error && (
                <Alert severity="error" sx={{ 
                  background: 'rgba(244, 67, 54, 0.1)', 
                  border: '1px solid #f44336',
                  color: '#f44336'
                }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  background: 'linear-gradient(90deg, #00fff7 0%, #009999 100%)',
                  color: '#18181b',
                  fontWeight: 700,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #00e6e6 0%, #008080 100%)',
                    boxShadow: '0 0 20px #00fff7'
                  },
                  '&:disabled': {
                    background: '#666',
                    color: '#999'
                  }
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Stack>
          </Box>

          <Typography 
            variant="caption" 
            sx={{ 
              color: '#666', 
              textAlign: 'center',
              mt: 2
            }}
          >
            Test Credentials: admin / password123
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
} 