import { Routes, Route } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useState, useMemo, useEffect, createContext } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import VehicleList from './pages/VehicleList';
import VehicleDetail from './pages/VehicleDetail';
import VerkaufenKFormu from './pages/VerkaufenKFormu';
import AdminLogin from './components/AdminLogin';  
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './hooks/useAuth.jsx';

export const ColorModeContext = createContext({ toggleColorMode: () => {} });

function App() {
  const [mode, setMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const colorMode = useMemo(() => ({
    toggleColorMode: () => {
      setMode((prev) => {
        localStorage.setItem('darkMode', JSON.stringify(!prev));
        return !prev;
      });
    },
  }), []);

  const theme = useMemo(() => createTheme({
    palette: {
      mode: mode ? 'dark' : 'light',
    },
  }), [mode]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (mode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [mode]);

  return (
    <AuthProvider>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route path="sell" element={<VerkaufenKFormu />} />
              <Route path="admin/login" element={<AdminLogin />} />
              <Route 
                path="admin/dashboard" 
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
            </Route>
          </Routes>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AuthProvider>
  );
}

export default App;