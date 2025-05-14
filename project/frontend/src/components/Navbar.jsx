import { Link, useNavigate } from 'react-router-dom'
import { AppBar, Toolbar, Button, Typography, Box, Container } from '@mui/material'
import ThemeToggle from './ThemeToggle'
import { useAuth } from '../hooks/useAuth.jsx';

function Navbar() {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <AppBar position="fixed">
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    <Typography
                        variant="h6"
                        component={Link}
                        to="/"
                        sx={{
                            mr: 2,
                            fontWeight: 700,
                            color: 'white',
                            textDecoration: 'none',
                        }}
                    >
                        KFZ Abaci
                    </Typography>

                    <Box sx={{ flexGrow: 1 }} />

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button
                            component={Link}
                            to="/vehicles"
                            sx={{ color: 'white' }}
                        >
                            Fahrzeuge
                        </Button>
                        <Button
                            component={Link}
                            to="/sell"
                            sx={{ color: 'white' }}
                        >
                            Verkaufen
                        </Button>
                        <Button
                            component={Link}
                            to="/admin/login"
                            sx={{ color: 'white' }}
                        >
                            Admin
                        </Button>
                        {isAuthenticated() && user?.role === 'admin' && (
                            <Button
                                onClick={handleLogout}
                                sx={{ color: 'white', ml: 2 }}
                            >
                                Logout
                            </Button>
                        )}
                        <ThemeToggle />
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    )
}

export default Navbar