import React, { useState, useEffect } from 'react';
import { apiCall } from '../utils/api';
import { 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  TextField, 
  Button, 
  Switch, 
  FormControlLabel,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Alert,
  Snackbar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security as SecurityIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Star as StarIcon,
  Api as ApiIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon,
  Webhook as WebhookIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const defaultConfig = {
  // Backend configuration fields (must match server.py)
  daily_limit: "5000.00",
  weekly_limit: "20000.00",
  daily_load_count: 3,
  prime_id_daily_limit: "9999.00",
  prime_id_daily_count: 1,  // Government regulation: only 1 transaction per day for prime IDs
  monday_multiplier: 2,
  // Frontend-only settings
  ENABLE_ANOMALY_DETECTION: true,
  ENABLE_PRIME_ID_RULES: true,
  ENABLE_MONDAY_MULTIPLIER: true,
  // Anomaly detection settings
  min_transaction_id_length: 3,
  max_transaction_id_length: 20,
  min_customer_id_length: 3,
  max_customer_id_length: 15,
  SUSPICIOUS_ID_PATTERNS: ["0+", "1+", "0{2,}\\d+"],
  SUSPICIOUS_CUSTOMER_PATTERNS: ["0{2,}\\d+"],
  // API settings
  API_BASE_URL: "",
  API_TIMEOUT: 30000,
  ENABLE_WEBHOOKS: false,
  WEBHOOK_URL: "",
  WEBHOOK_SECRET: "",
  API_RATE_LIMIT: 100,
  API_VERSION: "v1"
};

export default function SettingsPage({ density = 'comfortable' }) {
  const [config, setConfig] = useState(defaultConfig);
  const [savedConfig, setSavedConfig] = useState(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  // Load configuration on component mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  useEffect(() => {
    // Check for changes
    setHasChanges(JSON.stringify(config) !== JSON.stringify(savedConfig));
  }, [config, savedConfig]);

  const loadConfiguration = async () => {
    try {
      console.log('🔍 SETTINGS LOAD - Loading configuration...');
      const response = await apiCall('/api/v1/config');
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 SETTINGS LOAD - Backend data:', data);
        
        // Merge backend config with frontend defaults
        // Backend returns config wrapped in success/config structure
        const backendConfig = data.success && data.config ? data.config : data;
        const mergedConfig = {
          ...defaultConfig,
          ...backendConfig
        };
        console.log('🔍 SETTINGS LOAD - Merged config:', mergedConfig);
        setConfig(mergedConfig);
        setSavedConfig(mergedConfig);
      } else {
        console.log('🔍 SETTINGS LOAD - Response not ok:', response.status);
        // Use defaults if backend fails
        setConfig(defaultConfig);
        setSavedConfig(defaultConfig);
      }
    } catch (err) {
      console.error('🔍 SETTINGS LOAD - Failed to load configuration:', err);
      setError('Failed to load configuration from server');
      // Use defaults on error
      setConfig(defaultConfig);
      setSavedConfig(defaultConfig);
    }
  };

  const handleConfigChange = (key, value) => {
    // Don't process the value immediately - let the user type
    // Only convert to number when saving or when the field loses focus
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    console.log('🔍 SETTINGS SAVE - Starting save operation');
    console.log('🔍 SETTINGS SAVE - Config:', config);
    console.log('🔍 SETTINGS SAVE - Has changes:', hasChanges);
    console.log('🔍 SETTINGS SAVE - Loading:', loading);
    
    setLoading(true);
    setError('');
    
    try {
      // Only send backend-expected fields with proper type conversion
      const backendConfig = {
        daily_limit: config.daily_limit,
        weekly_limit: config.weekly_limit,
        daily_load_count: parseInt(config.daily_load_count) || 3,
        prime_id_daily_limit: config.prime_id_daily_limit,
        prime_id_daily_count: parseInt(config.prime_id_daily_count) || 1,
        monday_multiplier: parseInt(config.monday_multiplier) || 2,
        min_customer_id_length: parseInt(config.min_customer_id_length) || 3,
        min_transaction_id_length: parseInt(config.min_transaction_id_length) || 3
      };
      
      const response = await apiCall('/api/v1/config', {
        method: 'POST',
        body: JSON.stringify(backendConfig),
      });
      
      console.log('🔍 SETTINGS SAVE RESPONSE - Response received');
      console.log('🔍 SETTINGS SAVE RESPONSE - Response ok:', response.ok);
      console.log('🔍 SETTINGS SAVE RESPONSE - Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 SETTINGS SAVE RESPONSE - Response data:', data);
        if (data.success) {
          // Update config with the returned configuration to ensure consistency
          const updatedConfig = {
            ...config,
            ...data.config
          };
          setConfig(updatedConfig);
          setSavedConfig(updatedConfig);
          setSuccess(true);
        } else {
          console.log('🔍 SETTINGS SAVE RESPONSE - Data success is false');
          setError('Failed to save configuration');
        }
      } else {
        console.log('🔍 SETTINGS SAVE RESPONSE - Response not ok');
        const errorText = await response.text();
        console.log('🔍 SETTINGS SAVE RESPONSE - Error response text:', errorText);
        setError('Failed to save configuration');
      }
    } catch (err) {
      console.log('🔍 SETTINGS SAVE ERROR - Caught error:', err);
      console.log('🔍 SETTINGS SAVE ERROR - Error message:', err.message);
      setError('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setConfig(savedConfig);
  };

  const handleRefresh = async () => {
    try {
      const response = await apiCall('/api/v1/config/reset', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadConfiguration();
          setSuccess(true);
        } else {
          setError('Failed to reset configuration');
        }
      } else {
        setError('Failed to reset configuration');
      }
    } catch (err) {
      setError('Failed to reset configuration');
    }
  };

  const handleCopyEndpoint = async (endpoint) => {
    try {
      const fullUrl = `${config.API_BASE_URL}${endpoint}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopySuccess(`Endpoint copied: ${fullUrl}`);
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (err) {
      setError('Failed to copy endpoint to clipboard');
    }
  };

  const getServiceEndpoints = () => {
    const baseUrl = config.API_BASE_URL;
    return [
      {
        name: 'Process File',
        endpoint: '/api/v1/process',
        method: 'POST',
        description: 'Upload and process input.txt file',
        color: '#00e676'
      },
      {
        name: 'Get Outputs',
        endpoint: '/api/v1/outputs',
        method: 'GET',
        description: 'Retrieve processed outputs',
        color: '#00b0ff'
      },
      {
        name: 'Dashboard Stats',
        endpoint: '/api/v1/dashboard-stats',
        method: 'GET',
        description: 'Get dashboard statistics',
        color: '#ff9800'
      },

      {
        name: 'Configuration',
        endpoint: '/api/v1/config',
        method: 'GET/POST',
        description: 'Get or update configuration',
        color: '#9c27b0'
      },
      {
        name: 'Health Check',
        endpoint: '/health',
        method: 'GET',
        description: 'API health status',
        color: '#4caf50'
      }
    ];
  };

  const ConfigCard = ({ title, icon, children, color = '#00fff7' }) => (
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
      <CardHeader
        avatar={icon}
        title={title}
        sx={{ 
          color: color,
          '& .MuiCardHeader-title': { 
            fontFamily: 'Orbitron', 
            fontWeight: 700 
          }
        }}
      />
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#00fff7', fontFamily: 'Orbitron', fontWeight: 700 }}>
          <SettingsIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Configuration Settings
        </Typography>
        <Stack direction="row" spacing={2}>
          <Tooltip title="Reset to defaults">
            <IconButton onClick={handleRefresh} sx={{ color: '#00fff7' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            onClick={handleReset}
            disabled={!hasChanges}
            sx={{ 
              color: '#00fff7', 
              borderColor: '#00fff7',
              '&:disabled': {
                color: '#666',
                borderColor: '#666'
              }
            }}
          >
            Reset Changes
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasChanges || loading}
            sx={{ 
              background: 'linear-gradient(90deg, #00fff7 60%, #009999 100%)',
              color: '#18181b',
              fontWeight: 700,
              '&:hover': { boxShadow: '0 0 16px #00fff7' },
              '&:disabled': {
                background: '#666',
                color: '#999',
                boxShadow: 'none'
              }
            }}
          >
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* Daily Limits */}
        <Grid item xs={12} md={6}>
          <ConfigCard title="Daily Limits" icon={<ScheduleIcon />} color="#00e676">
            <Stack spacing={2}>
              <TextField
                label="Daily Spending Limit ($)"
                type="number"
                value={config.daily_limit}
                onChange={(e) => handleConfigChange('daily_limit', e.target.value)}
                helperText="Maximum $5,000 per customer per day (assignment default)"
                fullWidth
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    color: '#fff',
                    '& fieldset': { borderColor: '#00e676' },
                    '&:hover fieldset': { borderColor: '#00e676' },
                    '&.Mui-focused fieldset': { borderColor: '#00e676' }
                  },
                  '& .MuiInputLabel-root': { color: '#00e676' },
                  '& .MuiFormHelperText-root': { color: '#00e676' }
                }}
              />
              <TextField
                label="Daily Load Count"
                type="number"
                value={config.daily_load_count || ''}
                onChange={(e) => handleConfigChange('daily_load_count', e.target.value)}
                helperText="Maximum 3 load attempts per customer per day (assignment default)"
                fullWidth
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    color: '#fff',
                    '& fieldset': { borderColor: '#00e676' },
                    '&:hover fieldset': { borderColor: '#00e676' },
                    '&.Mui-focused fieldset': { borderColor: '#00e676' }
                  },
                  '& .MuiInputLabel-root': { color: '#00e676' },
                  '& .MuiFormHelperText-root': { color: '#00e676' }
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={`$${config.daily_limit}`} color="success" />
                <Chip label={`${config.daily_load_count} loads/day`} color="success" />
              </Box>
            </Stack>
          </ConfigCard>
        </Grid>

        {/* Weekly Limits */}
        <Grid item xs={12} md={6}>
          <ConfigCard title="Weekly Limits" icon={<MoneyIcon />} color="#00b0ff">
            <Stack spacing={2}>
              <TextField
                label="Weekly Spending Limit ($)"
                type="number"
                value={config.weekly_limit}
                onChange={(e) => handleConfigChange('weekly_limit', e.target.value)}
                helperText="Maximum $20,000 per customer per week (assignment default)"
                fullWidth
                sx={{ 
                  '& .MuiOutlinedInput-root': { 
                    color: '#fff',
                    '& fieldset': { borderColor: '#00b0ff' },
                    '&:hover fieldset': { borderColor: '#00b0ff' },
                    '&.Mui-focused fieldset': { borderColor: '#00b0ff' }
                  },
                  '& .MuiInputLabel-root': { color: '#00b0ff' },
                  '& .MuiFormHelperText-root': { color: '#00b0ff' }
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label={`$${config.weekly_limit}`} color="info" />
                <Chip label="7-day rolling" color="info" variant="outlined" />
              </Box>
            </Stack>
          </ConfigCard>
        </Grid>

        {/* Prime ID Rules */}
        <Grid item xs={12} md={6}>
          <ConfigCard title="Prime ID Rules" icon={<StarIcon />} color="#ff9800">
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.ENABLE_PRIME_ID_RULES}
                    onChange={(e) => handleConfigChange('ENABLE_PRIME_ID_RULES', e.target.checked)}
                    sx={{ 
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#ff9800' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ff9800' }
                    }}
                  />
                }
                label="Enable Prime ID Rules"
                sx={{ color: '#fff' }}
              />
              {config.ENABLE_PRIME_ID_RULES && (
                <>
                  <TextField
                    label="Prime ID Daily Limit ($)"
                    type="number"
                    value={config.prime_id_daily_limit}
                    onChange={(e) => handleConfigChange('prime_id_daily_limit', e.target.value)}
                    helperText="Maximum $9,999 per day for prime number IDs (government regulation)"
                    fullWidth
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        color: '#fff',
                        '& fieldset': { borderColor: '#ff9800' },
                        '&:hover fieldset': { borderColor: '#ff9800' },
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root': { color: '#ff9800' },
                      '& .MuiFormHelperText-root': { color: '#ff9800' }
                    }}
                  />
                  <TextField
                    label="Prime ID Daily Count"
                    type="number"
                    value={config.prime_id_daily_count || ''}
                    onChange={(e) => handleConfigChange('prime_id_daily_count', e.target.value)}
                    helperText="Only 1 transaction per day for prime number IDs (government regulation)"
                    fullWidth
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        color: '#fff',
                        '& fieldset': { borderColor: '#ff9800' },
                        '&:hover fieldset': { borderColor: '#ff9800' },
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root': { color: '#ff9800' },
                      '& .MuiFormHelperText-root': { color: '#ff9800' }
                    }}
                  />
                </>
              )}
            </Stack>
          </ConfigCard>
        </Grid>

        {/* Monday Multiplier */}
        <Grid item xs={12} md={6}>
          <ConfigCard title="Monday Multiplier" icon={<ScheduleIcon />} color="#e91e63">
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.ENABLE_MONDAY_MULTIPLIER}
                    onChange={(e) => handleConfigChange('ENABLE_MONDAY_MULTIPLIER', e.target.checked)}
                    sx={{ 
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#e91e63' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#e91e63' }
                    }}
                  />
                }
                label="Enable Monday Multiplier"
                sx={{ color: '#fff' }}
              />
              {config.ENABLE_MONDAY_MULTIPLIER && (
                <>
                  <TextField
                    label="Monday Multiplier"
                    type="number"
                    value={config.monday_multiplier || ''}
                    onChange={(e) => handleConfigChange('monday_multiplier', e.target.value)}
                    helperText="Monday transactions count as 2x their value (regulator requirement)"
                    fullWidth
                    sx={{ 
                      '& .MuiOutlinedInput-root': { 
                        color: '#fff',
                        '& fieldset': { borderColor: '#e91e63' },
                        '&:hover fieldset': { borderColor: '#e91e63' },
                        '&.Mui-focused fieldset': { borderColor: '#e91e63' }
                      },
                      '& .MuiInputLabel-root': { color: '#e91e63' },
                      '& .MuiFormHelperText-root': { color: '#e91e63' }
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={`${config.monday_multiplier}x multiplier`} color="secondary" />
                    <Chip label="Mondays only" color="secondary" variant="outlined" />
                  </Box>
                </>
              )}
            </Stack>
          </ConfigCard>
        </Grid>

        {/* Security Settings */}
        <Grid item xs={12}>
          <ConfigCard title="Security & Detection" icon={<SecurityIcon />} color="#ff1744">
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.ENABLE_ANOMALY_DETECTION}
                    onChange={(e) => handleConfigChange('ENABLE_ANOMALY_DETECTION', e.target.checked)}
                    sx={{ 
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#ff1744' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ff1744' }
                    }}
                  />
                }
                label="Enable Anomaly Detection"
                sx={{ color: '#fff' }}
              />
              {config.ENABLE_ANOMALY_DETECTION && (
                <>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ color: '#ff1744', mb: 1, fontWeight: 700 }}>
                        ID Validation Rules
                      </Typography>
                      <Stack spacing={2}>
                        <TextField
                          label="Minimum Transaction ID Length"
                          type="number"
                          value={config.min_transaction_id_length || ''}
                          onChange={(e) => handleConfigChange('min_transaction_id_length', e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              color: '#fff',
                              '& fieldset': { borderColor: '#ff1744' },
                              '&:hover fieldset': { borderColor: '#ff1744' },
                              '&.Mui-focused fieldset': { borderColor: '#ff1744' }
                            },
                            '& .MuiInputLabel-root': { color: '#ff1744' }
                          }}
                        />
                        <TextField
                          label="Maximum Transaction ID Length"
                          type="number"
                          value={config.max_transaction_id_length || ''}
                          onChange={(e) => handleConfigChange('max_transaction_id_length', e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              color: '#fff',
                              '& fieldset': { borderColor: '#ff1744' },
                              '&:hover fieldset': { borderColor: '#ff1744' },
                              '&.Mui-focused fieldset': { borderColor: '#ff1744' }
                            },
                            '& .MuiInputLabel-root': { color: '#ff1744' }
                          }}
                        />
                      </Stack>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle2" sx={{ color: '#ff1744', mb: 1, fontWeight: 700 }}>
                        Customer ID Validation Rules
                      </Typography>
                      <Stack spacing={2}>
                        <TextField
                          label="Minimum Customer ID Length"
                          type="number"
                          value={config.min_customer_id_length || ''}
                          onChange={(e) => handleConfigChange('min_customer_id_length', e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              color: '#fff',
                              '& fieldset': { borderColor: '#ff1744' },
                              '&:hover fieldset': { borderColor: '#ff1744' },
                              '&.Mui-focused fieldset': { borderColor: '#ff1744' }
                            },
                            '& .MuiInputLabel-root': { color: '#ff1744' }
                          }}
                        />
                        <TextField
                          label="Maximum Customer ID Length"
                          type="number"
                          value={config.max_customer_id_length || ''}
                          onChange={(e) => handleConfigChange('max_customer_id_length', e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              color: '#fff',
                              '& fieldset': { borderColor: '#ff1744' },
                              '&:hover fieldset': { borderColor: '#ff1744' },
                              '&.Mui-focused fieldset': { borderColor: '#ff1744' }
                            },
                            '& .MuiInputLabel-root': { color: '#ff1744' }
                          }}
                        />
                      </Stack>
                    </Grid>
                  </Grid>
                  <Alert severity="info" sx={{ background: 'rgba(255,23,68,0.1)', border: '1px solid #ff1744' }}>
                    <InfoIcon sx={{ mr: 1 }} />
                    <Typography variant="subtitle2" sx={{ color: '#ff1744', fontWeight: 700, mb: 1 }}>
                      Anomaly Detection Assumptions:
                    </Typography>
                    <ul style={{ margin: '8px 0 0 20px', color: '#fff' }}>
                      <li><strong>Transaction ID Length:</strong> {config.min_transaction_id_length}-{config.max_transaction_id_length} characters</li>
                      <li><strong>Customer ID Length:</strong> {config.min_customer_id_length}-{config.max_customer_id_length} characters</li>
                      <li><strong>Suspicious Patterns:</strong> All-zeros, all-ones, leading zeros</li>
                      <li><strong>Invalid Formats:</strong> Non-numeric IDs, malformed amounts, invalid timestamps</li>
                    </ul>
                  </Alert>
                </>
              )}
            </Stack>
          </ConfigCard>
        </Grid>

        {/* API Settings */}
        <Grid item xs={12}>
          <ConfigCard title="API Configuration" icon={<ApiIcon />} color="#9c27b0">
            <Stack spacing={3}>
              {/* Basic API Configuration */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#9c27b0', mb: 2, fontWeight: 700 }}>
                  Basic API Configuration
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="API Base URL"
                      value={config.API_BASE_URL}
                      onChange={(e) => handleConfigChange('API_BASE_URL', e.target.value)}
                      fullWidth
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          color: '#fff',
                          '& fieldset': { borderColor: '#9c27b0' },
                          '&:hover fieldset': { borderColor: '#9c27b0' },
                          '&.Mui-focused fieldset': { borderColor: '#9c27b0' }
                        },
                        '& .MuiInputLabel-root': { color: '#9c27b0' }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="API Timeout (ms)"
                      type="number"
                      value={config.API_TIMEOUT || ''}
                      onChange={(e) => handleConfigChange('API_TIMEOUT', e.target.value)}
                      fullWidth
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          color: '#fff',
                          '& fieldset': { borderColor: '#9c27b0' },
                          '&:hover fieldset': { borderColor: '#9c27b0' },
                          '&.Mui-focused fieldset': { borderColor: '#9c27b0' }
                        },
                        '& .MuiInputLabel-root': { color: '#9c27b0' }
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      label="Rate Limit (req/min)"
                      type="number"
                      value={config.API_RATE_LIMIT || ''}
                      onChange={(e) => handleConfigChange('API_RATE_LIMIT', e.target.value)}
                      fullWidth
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          color: '#fff',
                          '& fieldset': { borderColor: '#9c27b0' },
                          '&:hover fieldset': { borderColor: '#9c27b0' },
                          '&.Mui-focused fieldset': { borderColor: '#9c27b0' }
                        },
                        '& .MuiInputLabel-root': { color: '#9c27b0' }
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* Webhook Configuration */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#9c27b0', mb: 2, fontWeight: 700 }}>
                  Webhook Configuration
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.ENABLE_WEBHOOKS}
                      onChange={(e) => handleConfigChange('ENABLE_WEBHOOKS', e.target.checked)}
                      sx={{ 
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#9c27b0' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#9c27b0' }
                      }}
                    />
                  }
                  label="Enable Webhooks"
                  sx={{ color: '#fff', mb: 2 }}
                />
                {config.ENABLE_WEBHOOKS && (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Webhook URL"
                        value={config.WEBHOOK_URL}
                        onChange={(e) => handleConfigChange('WEBHOOK_URL', e.target.value)}
                        fullWidth
                        placeholder="https://your-webhook-endpoint.com/webhook"
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            color: '#fff',
                            '& fieldset': { borderColor: '#9c27b0' },
                            '&:hover fieldset': { borderColor: '#9c27b0' },
                            '&.Mui-focused fieldset': { borderColor: '#9c27b0' }
                          },
                          '& .MuiInputLabel-root': { color: '#9c27b0' }
                        }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Webhook Secret"
                        type="password"
                        value={config.WEBHOOK_SECRET}
                        onChange={(e) => handleConfigChange('WEBHOOK_SECRET', e.target.value)}
                        fullWidth
                        placeholder="Your webhook secret key"
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            color: '#fff',
                            '& fieldset': { borderColor: '#9c27b0' },
                            '&:hover fieldset': { borderColor: '#9c27b0' },
                            '&.Mui-focused fieldset': { borderColor: '#9c27b0' }
                          },
                          '& .MuiInputLabel-root': { color: '#9c27b0' }
                        }}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>

              {/* Service Endpoints */}
              <Box>
                <Typography variant="subtitle2" sx={{ color: '#9c27b0', mb: 2, fontWeight: 700 }}>
                  Service Endpoints
                </Typography>
                <Grid container spacing={2}>
                  {getServiceEndpoints().map((endpoint, index) => (
                    <Grid item xs={12} md={6} lg={4} key={index}>
                      <Paper sx={{ 
                        p: 2, 
                        background: '#222', 
                        border: `1px solid ${endpoint.color}`,
                        borderRadius: 2
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ color: endpoint.color, fontWeight: 700 }}>
                            {endpoint.name}
                          </Typography>
                          <Chip 
                            label={endpoint.method} 
                            size="small" 
                            sx={{ 
                              bgcolor: endpoint.color, 
                              color: '#fff', 
                              fontSize: '0.7rem',
                              fontWeight: 700
                            }} 
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: '#ccc', mb: 1, fontSize: '0.8rem' }}>
                          {endpoint.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" sx={{ color: '#fff', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            {endpoint.endpoint}
                          </Typography>
                          <Tooltip title="Copy endpoint URL">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyEndpoint(endpoint.endpoint)}
                              sx={{ 
                                color: endpoint.color,
                                '&:hover': { 
                                  background: `${endpoint.color}20`,
                                  transform: 'scale(1.1)'
                                }
                              }}
                            >
                              <CopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Box>

              {/* API Information */}
              <Alert severity="info" sx={{ background: 'rgba(156,39,176,0.1)', border: '1px solid #9c27b0' }}>
                <InfoIcon sx={{ mr: 1, color: '#9c27b0' }} />
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#9c27b0', fontWeight: 700, mb: 1 }}>
                    API Information:
                  </Typography>
                  <ul style={{ margin: '8px 0 0 20px', color: '#fff' }}>
                    <li><strong>Base URL:</strong> {config.API_BASE_URL}</li>
                    <li><strong>Version:</strong> {config.API_VERSION}</li>
                    <li><strong>Timeout:</strong> {config.API_TIMEOUT}ms</li>
                    <li><strong>Rate Limit:</strong> {config.API_RATE_LIMIT} requests/minute</li>
                    <li><strong>Webhooks:</strong> {config.ENABLE_WEBHOOKS ? 'Enabled' : 'Disabled'}</li>
                    {config.ENABLE_WEBHOOKS && (
                      <li><strong>Webhook URL:</strong> {config.WEBHOOK_URL || 'Not configured'}</li>
                    )}
                  </ul>
                </Box>
              </Alert>
            </Stack>
          </ConfigCard>
        </Grid>
      </Grid>

      {/* Configuration Summary */}
      <Paper sx={{ mt: 4, p: 3, background: '#18181b', border: '2px solid #00fff7', borderRadius: 3 }}>
        <Typography variant="h6" sx={{ color: '#00fff7', mb: 2, fontFamily: 'Orbitron', fontWeight: 700 }}>
          Configuration Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, background: 'rgba(0,230,118,0.1)', borderRadius: 2 }}>
              <Typography variant="h4" sx={{ color: '#00e676', fontWeight: 700 }}>${config.DAILY_LIMIT}</Typography>
              <Typography variant="body2" sx={{ color: '#ccc' }}>Daily Limit</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, background: 'rgba(0,176,255,0.1)', borderRadius: 2 }}>
              <Typography variant="h4" sx={{ color: '#00b0ff', fontWeight: 700 }}>${config.WEEKLY_LIMIT}</Typography>
              <Typography variant="body2" sx={{ color: '#ccc' }}>Weekly Limit</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, background: 'rgba(255,152,0,0.1)', borderRadius: 2 }}>
              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700 }}>${config.PRIME_ID_DAILY_LIMIT}</Typography>
              <Typography variant="body2" sx={{ color: '#ccc' }}>Prime ID Limit</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, background: 'rgba(233,30,99,0.1)', borderRadius: 2 }}>
              <Typography variant="h4" sx={{ color: '#e91e63', fontWeight: 700 }}>{config.MONDAY_MULTIPLIER}x</Typography>
              <Typography variant="body2" sx={{ color: '#ccc' }}>Monday Multiplier</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}>
        <Alert severity="success" sx={{ width: '100%' }}>
          Configuration saved successfully!
        </Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')}>
        <Alert severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      <Snackbar open={!!copySuccess} autoHideDuration={3000} onClose={() => setCopySuccess('')}>
        <Alert severity="success" sx={{ width: '100%' }}>
          {copySuccess}
        </Alert>
      </Snackbar>
    </Box>
  );
} 