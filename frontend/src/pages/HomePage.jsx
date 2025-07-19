import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Card, 
  CardContent, 
  Chip, 
  LinearProgress,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  DataUsage as DataUsageIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import debugAlerts from '../utils/debugAlerts';
import { apiCall } from '../utils/api';

// Simple sparkline component
const Sparkline = ({ data, color = '#00fff7', height = 30 }) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width="100%" height={height} style={{ display: 'block' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
};

// Violation breakdown component
const ViolationBreakdown = ({ violations }) => {
  if (!violations || Object.keys(violations).length === 0) {
    return (
      <Typography variant="body2" sx={{ color: '#ccc', fontStyle: 'italic' }}>
        No violations recorded
      </Typography>
    );
  }

  const sortedViolations = Object.entries(violations)
    .sort(([,a], [,b]) => b.percentage - a.percentage);

  return (
    <Stack spacing={1}>
      {sortedViolations.map(([violation, data]) => (
        <Box key={violation}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500 }}>
              {violation.replace(/_/g, ' ')}
            </Typography>
            <Typography variant="body2" sx={{ color: '#00fff7', fontWeight: 700 }}>
              {data.percentage}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={data.percentage} 
            sx={{ 
              height: 6, 
              borderRadius: 3,
              backgroundColor: 'rgba(0,255,247,0.2)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#00fff7',
                borderRadius: 3
              }
            }} 
          />
          <Typography variant="caption" sx={{ color: '#ccc' }}>
            {data.count} violations
          </Typography>
        </Box>
      ))}
    </Stack>
  );
};

export default function HomePage() {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      debugAlerts.logRequest('/dashboard-stats', 'GET');
      
              const response = await apiCall('/api/v1/dashboard-stats');
      const data = await response.json();
      
      debugAlerts.logResponse('/dashboard-stats', response.status, data);
      
      if (response.ok) {
        setStats(data.stats || data); // Handle both {success, stats} and direct stats format
        debugAlerts.log('Dashboard stats loaded successfully', false, 'success');
      } else {
        throw new Error(`HTTP ${response.status}: ${data.detail || 'Failed to fetch dashboard stats'}`);
      }
    } catch (err) {
      debugAlerts.log(`Error fetching dashboard stats: ${err.message}`, true, 'error');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getMetricValue = (key) => {
    if (loading) return <CircularProgress size={24} sx={{ color: '#00fff7' }} />;
    if (error) return 'Error';
    return stats[key] !== undefined ? stats[key] : 0;
  };

  const StatCard = ({ title, value, subtitle, icon, color = '#00fff7', trend = null, sparkline = null }) => (
    <Card sx={{ 
      background: '#18181b', 
      border: `2px solid ${color}`, 
      borderRadius: 3,
      boxShadow: `0 0 20px ${color}40`,
      transition: 'all 0.3s ease',
      '&:hover': {
        boxShadow: `0 0 30px ${color}60`,
        transform: 'translateY(-2px)'
      }
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ color: color, fontFamily: 'Orbitron', fontWeight: 700 }}>
            {title}
          </Typography>
          {icon}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="h3" sx={{ color: color, fontWeight: 900 }}>
            {loading ? <CircularProgress size={32} sx={{ color }} /> : value}
          </Typography>
          {trend !== null && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trend > 0 ? (
                <TrendingUpIcon sx={{ color: '#00e676', fontSize: 20 }} />
              ) : trend < 0 ? (
                <TrendingDownIcon sx={{ color: '#ff1744', fontSize: 20 }} />
              ) : null}
              <Typography variant="body2" sx={{ 
                color: trend > 0 ? '#00e676' : trend < 0 ? '#ff1744' : '#ccc',
                fontWeight: 700
              }}>
                {trend > 0 ? '+' : ''}{trend}%
              </Typography>
            </Box>
          )}
        </Box>
        
        {subtitle && (
          <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
            {subtitle}
          </Typography>
        )}
        
        {sparkline && (
          <Box sx={{ mt: 1 }}>
            <Sparkline data={sparkline} color={color} />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderUnifiedDashboard = () => {
    return (
      <Grid container spacing={3}>
        {/* Row 1: Most Critical Metrics */}
        
        {/* Total Processed Loads - Primary metric */}
        <Grid item xs={12} md={3}>
          <StatCard
            title="Total Processed Loads"
            value={getMetricValue('total_processed_loads')}
            subtitle="All time processed transactions"
            icon={<DataUsageIcon sx={{ color: '#00fff7' }} />}
            color="#00fff7"
          />
        </Grid>

        {/* Acceptance Rate - Critical business metric */}
        <Grid item xs={12} md={3}>
          <StatCard
            title="Acceptance Rate"
            value={`${getMetricValue('acceptance_rate')}%`}
            subtitle="Successfully processed transactions"
            icon={<CheckCircleIcon sx={{ color: '#00e676' }} />}
            color="#00e676"
          />
        </Grid>

        {/* Anomaly Rate - Critical security metric */}
        <Grid item xs={12} md={3}>
          <StatCard
            title="Anomaly Rate"
            value={`${getMetricValue('anomaly_rate')}%`}
            subtitle="Suspicious transactions detected"
            icon={<WarningIcon sx={{ color: '#ff1744' }} />}
            color="#ff1744"
          />
        </Grid>

        {/* Rule Violations Count - Important compliance metric */}
        <Grid item xs={12} md={3}>
          <StatCard
            title="Rule Violations"
            value={getMetricValue('rule_violations_count')}
            subtitle="Total compliance violations"
            icon={<SecurityIcon sx={{ color: '#ff9800' }} />}
            color="#ff9800"
          />
        </Grid>

        {/* Row 2: Advanced Analytics */}
        {/* Violation Breakdown - High importance */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            background: '#18181b', 
            border: '2px solid #ff1744', 
            borderRadius: 3,
            boxShadow: '0 0 20px #ff174440'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <WarningIcon sx={{ color: '#ff1744', mr: 1 }} />
                <Typography variant="h6" sx={{ color: '#ff1744', fontFamily: 'Orbitron', fontWeight: 700 }}>
                  Violation Breakdown (by Type)
                </Typography>
              </Box>
              <ViolationBreakdown violations={stats.violation_breakdown || {}} />
            </CardContent>
          </Card>
        </Grid>

        {/* Anomaly Trend - High importance with trend */}
        <Grid item xs={12} md={6}>
          <StatCard
            title="Anomaly Trend (Last 7 Days)"
            value={`${stats.anomaly_trend?.current_rate || 0}%`}
            subtitle={`${(stats.anomaly_trend?.trend || 0) > 0 ? '+' : ''}${stats.anomaly_trend?.trend || 0}% from last week`}
            icon={<TrendingUpIcon sx={{ color: '#ff9800' }} />}
            color="#ff9800"
            trend={stats.anomaly_trend?.trend || 0}
            sparkline={stats.anomaly_trend?.sparkline || []}
          />
        </Grid>

        {/* Row 3: Operational Metrics */}
        
        {/* Average Daily Loads - Operational metric */}
        <Grid item xs={12} md={3}>
          <StatCard
            title="Average Daily Loads"
            value={getMetricValue('average_daily_loads')}
            subtitle="Last 30 days average"
            icon={<ScheduleIcon sx={{ color: '#00b0ff' }} />}
            color="#00b0ff"
          />
        </Grid>

        {/* Auto vs Manual Resolution - Operational efficiency */}
        <Grid item xs={12} md={3}>
          <StatCard
            title="Auto-Resolution Rate"
            value={`${stats.resolution_rate?.auto_percentage || 0}%`}
            subtitle={`${stats.resolution_rate?.auto || 0} auto, ${stats.resolution_rate?.manual || 0} manual`}
            icon={<CheckCircleIcon sx={{ color: '#00e676' }} />}
            color="#00e676"
          />
        </Grid>

        {/* Data Quality Score - Quality metric */}
        <Grid item xs={12} md={3}>
          <StatCard
            title="Data Quality Score"
            value={`${stats.data_quality_score || 0}%`}
            subtitle="Valid submissions rate"
            icon={<DataUsageIcon sx={{ color: '#00e676' }} />}
            color="#00e676"
          />
        </Grid>

        {/* High-Risk Customers - Security metric */}
        <Grid item xs={12} md={3}>
          <StatCard
            title="High-Risk Customers"
            value={stats.high_risk_customers || 0}
            subtitle="Flagged this week"
            icon={<SecurityIcon sx={{ color: '#ff1744' }} />}
            color="#ff1744"
          />
        </Grid>

        {/* Row 4: Additional Insights */}
        {/* Most Triggered Rule - Compliance insight */}
        <Grid item xs={12} md={4}>
          <StatCard
            title="Most Triggered Rule"
            value={(stats.most_triggered_rule || 'None').replace(/_/g, ' ')}
            subtitle="Most frequently violated rule"
            icon={<WarningIcon sx={{ color: '#ff1744' }} />}
            color="#ff1744"
          />
        </Grid>

        {/* Time to Resolution - Performance metric */}
        <Grid item xs={12} md={4}>
          <StatCard
            title="Avg Time to Resolution"
            value={`${stats.avg_resolution_time || 0}s`}
            subtitle="Average processing time"
            icon={<ScheduleIcon sx={{ color: '#00b0ff' }} />}
            color="#00b0ff"
          />
        </Grid>

        {/* Customer Distribution - Business insight */}
        <Grid item xs={12} md={4}>
          <StatCard
            title="Customer Load Distribution"
            value={`${stats.customer_distribution?.top_10_percentage || 0}%`}
            subtitle={`${stats.customer_distribution?.total_customers || 0} total customers`}
            icon={<PeopleIcon sx={{ color: '#e91e63' }} />}
            color="#e91e63"
          />
        </Grid>

        {/* Summary Insights */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, background: '#18181b', border: '2px solid #00fff7', borderRadius: 3 }}>
            <Typography variant="h6" sx={{ color: '#00fff7', mb: 2, fontFamily: 'Orbitron', fontWeight: 700 }}>
              <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Key Insights
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, background: 'rgba(255,23,68,0.1)', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ color: '#ff1744', fontWeight: 700 }}>
                    {stats.anomaly_trend?.current_rate || 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ccc' }}>Current Anomaly Rate</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, background: 'rgba(0,230,118,0.1)', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ color: '#00e676', fontWeight: 700 }}>
                    {stats.resolution_rate?.auto_percentage || 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ccc' }}>Auto-Resolution Rate</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ textAlign: 'center', p: 2, background: 'rgba(0,176,255,0.1)', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ color: '#00b0ff', fontWeight: 700 }}>
                    {stats.data_quality_score || 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ccc' }}>Data Quality Score</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress size={60} sx={{ color: '#00fff7' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00fff7', fontFamily: 'Orbitron', fontWeight: 700 }}>
          <DashboardIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Fund Load Adjudication Dashboard
        </Typography>
        <Tooltip title="Refresh stats">
          <IconButton onClick={fetchStats} sx={{ color: '#00fff7' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
      
      {error && (
        <Typography variant="body1" sx={{ color: '#ff1744', mb: 2, fontFamily: 'Orbitron' }}>
          Error loading dashboard: {error}
        </Typography>
      )}
      
      {renderUnifiedDashboard()}
    </Box>
  );
} 