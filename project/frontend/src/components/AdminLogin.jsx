import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    try {
      const success = await login(username, password);
      
      if (success) {
        navigate('/admin/dashboard');
      } else {
        setError('Ungültige Zugangsdaten');
      }
    } catch (err) {
      console.error('Fehler beim Login:', err);
      setError('Serverfehler. Bitte versuchen Sie es später erneut.');
    }
  };

  return (
    <Box sx={{ maxWidth: 400, margin: 'auto', mt: 8, p: 3, border: '1px solid #ccc', borderRadius: 2, boxShadow: 3 }}>
      <Typography variant="h5" gutterBottom>
        Admin Login
      </Typography>
      <TextField
        fullWidth
        label="Benutzername"
        variant="outlined"
        margin="normal"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <TextField
        fullWidth
        label="Passwort"
        variant="outlined"
        margin="normal"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}
      <Button
        fullWidth
        variant="contained"
        color="primary"
        onClick={handleLogin}
      >
        Login
      </Button>
    </Box>
  );
}

export default AdminLogin;
