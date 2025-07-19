import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';

import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import OutputIcon from '@mui/icons-material/Outbox';
import Avatar from '@mui/material/Avatar';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';

const drawerWidth = 220;

const navItems = [
  { label: 'Home', icon: <DashboardIcon />, path: '/home' },
  { label: 'Outputs', icon: <OutputIcon />, path: '/outputs' },
  { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

export default function DashboardLayout({ children, onLogout, username }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <Box sx={{ background: '#0d0d0d', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar>
        <Typography variant="h6" noWrap sx={{ color: '#00fff7', fontFamily: 'Orbitron' }}>
          Adjudicator
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: '#00fff7', opacity: 0.2 }} />
      <List sx={{ flex: 1 }}>
        {navItems.map((item) => (
          <ListItem
            key={item.label}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            sx={{
              color: location.pathname === item.path ? '#00fff7' : '#e0e0e0',
              background: location.pathname === item.path ? 'rgba(0,255,247,0.08)' : 'none',
              borderLeft: location.pathname === item.path ? '4px solid #00fff7' : '4px solid transparent',
              transition: 'all 0.2s',
              cursor: 'pointer',
              '&:hover': {
                background: 'rgba(0,255,247,0.12)',
                color: '#00fff7',
              },
            }}
          >
            <ListItemIcon sx={{ color: location.pathname === item.path ? '#00fff7' : '#e0e0e0' }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
      <Box sx={{ mb: 2 }}>
        <Divider sx={{ borderColor: '#00fff7', opacity: 0.2 }} />
        <ListItem onClick={onLogout} sx={{ color: '#ff1744', mt: 1, cursor: 'pointer' }}>
          <ListItemIcon sx={{ color: '#ff1744' }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </Box>
    </Box>
  );

  // Page title based on route
  const pageTitle = navItems.find(item => location.pathname.startsWith(item.path))?.label || 'Dashboard';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#0d0d0d' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'rgba(13,13,13,0.85)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 0 16px #00fff7',
        }}
        elevation={6}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h5" noWrap sx={{ color: '#00fff7', fontFamily: 'Orbitron', fontWeight: 700, flex: 1 }}>
            {pageTitle}
          </Typography>
          <Tooltip title="Toggle light/dark mode">
            <Switch checked color="primary" sx={{ mr: 2 }} disabled />
          </Tooltip>
          <Avatar sx={{ bgcolor: '#00fff7', color: '#0d0d0d', fontWeight: 700 }}>
            {username ? username.charAt(0).toUpperCase() : 'U'}
          </Avatar>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="sidebar navigation"
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, background: '#0d0d0d' },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, background: '#0d0d0d' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 4 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          background: '#0d0d0d',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
} 