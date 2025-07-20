import React, { useState, useEffect } from 'react';
import { Typography, Box, Button, Paper, Grid, Snackbar, Alert, Stack, Chip, Avatar, Select, MenuItem, Pagination, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Collapse, IconButton, Tooltip, TextField, InputAdornment } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ApiIcon from '@mui/icons-material/Api';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import JSZip from 'jszip';

import { apiCall } from '../utils/api';


const getCurrentUser = () => ({ name: 'U. Aharoni', avatar: 'UA', ip: '192.168.1.100', location: 'Tel Aviv, IL' });
const getNow = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localTime = new Date(now.getTime() - (offset * 60 * 1000));
  return localTime.toISOString();
};
function getScoreColor(score) {
  const r = Math.round(255 - (score * 2.55));
  const g = Math.round(score * 2.55);
  return `rgb(${r},${g},64)`;
}

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  
  // Handle different date formats
  let normalizedDateStr = dateStr;
  
  // If it's missing timezone info, assume UTC
  if (dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+')) {
    normalizedDateStr = dateStr + 'Z';
  }
  
  try {
    const d = new Date(normalizedDateStr);
    
    // Check if the date is valid
    if (isNaN(d.getTime())) {
      console.warn('Invalid date format:', dateStr);
      return dateStr; // Return original string if parsing fails
    }
    
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.warn('Error formatting date:', dateStr, error);
    return dateStr; // Return original string if formatting fails
  }
}

function getReasonDetails(reason, auditDetails, row, config) {
  const baseDetails = {
    label: reason,
    color: '#ff1744',
    description: null
  };

  // Get rules_evaluated from audit details
  const rulesEvaluated = auditDetails?.rules_evaluated || {};

  // Use current configuration or fall back to defaults
  const currentLimits = {
    DAILY_LIMIT: config?.daily_limit || '5000.00',
    WEEKLY_LIMIT: config?.weekly_limit || '20000.00',
    DAILY_LOAD_COUNT: config?.daily_load_count || 3,
    PRIME_ID_DAILY_LIMIT: config?.prime_id_daily_limit || '9999.00',
    PRIME_ID_DAILY_COUNT: config?.prime_id_daily_count || 1
  };

  // Helper function to format currency amounts
  const formatCurrency = (amount) => {
    if (!amount || amount === '0' || amount === '0.00') return '$0';
    const num = parseFloat(amount);
    if (isNaN(num)) return `$${amount}`;
    return num.toLocaleString('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  switch (reason) {
    case 'CUSTOMER_ID_TOO_SHORT':
    case 'TRANSACTION_ID_TOO_SHORT':
    case 'CUSTOMER_ANOMALY_DETECTED':
    case 'DUPLICATE_TRANSACTION_ID':
      // Handle anomaly rule results
      const anomalyRule = rulesEvaluated.anomaly;
      let anomalyReason = 'Suspicious pattern detected';
      
      if (anomalyRule && anomalyRule.details) {
        if (anomalyRule.details.customer_id_length !== undefined) {
          anomalyReason = `Customer ID length (${anomalyRule.details.customer_id_length}) is below minimum (${anomalyRule.details.minimum_length})`;
        } else if (anomalyRule.details.transaction_id_length !== undefined) {
          anomalyReason = `Transaction ID length (${anomalyRule.details.transaction_id_length}) is below minimum (${anomalyRule.details.minimum_length})`;
        } else if (anomalyRule.details.customer_transaction_count !== undefined) {
          anomalyReason = `Customer has too many transactions (${anomalyRule.details.customer_transaction_count}) - threshold exceeded`;
        } else if (anomalyRule.details.transaction_id_count !== undefined) {
          anomalyReason = `Duplicate transaction ID detected (used ${anomalyRule.details.transaction_id_count} times)`;
        }
      }
      
      return {
        label: 'Anomaly Detected',
        color: '#ff1744',
        description: anomalyReason
      };
    case 'DAILY_LIMIT_EXCEEDED':
      const dailyLimit = rulesEvaluated.daily_limit;
      return {
        label: 'Daily Limit Exceeded',
        color: '#ff9800',
        description: dailyLimit && dailyLimit.details ? 
          `Current daily total: ${formatCurrency(dailyLimit.details.current_daily_total)}, Attempted: ${formatCurrency(dailyLimit.details.attempted)}, Limit: ${formatCurrency(currentLimits.DAILY_LIMIT)}` : 
          'Daily spending limit exceeded'
      };
    case 'WEEKLY_LIMIT_EXCEEDED':
      const weeklyLimit = rulesEvaluated.weekly_limit;
      return {
        label: 'Weekly Limit Exceeded',
        color: '#ff9800',
        description: weeklyLimit && weeklyLimit.details ? 
          `7-day rolling total: ${formatCurrency(weeklyLimit.details.rolling_7d_total)}, Attempted: ${formatCurrency(weeklyLimit.details.attempted)}, Limit: ${formatCurrency(currentLimits.WEEKLY_LIMIT)}` : 
          'Weekly spending limit exceeded'
      };
    case 'DAILY_COUNT_EXCEEDED':
      const dailyCount = rulesEvaluated.daily_count;
      return {
        label: 'Load Count Exceeded',
        color: '#ff9800',
        description: dailyCount && dailyCount.details ? 
          `Current daily loads: ${dailyCount.details.current_daily_count || '0'}, Limit: ${currentLimits.DAILY_LOAD_COUNT}` : 
          'Maximum daily load count exceeded'
      };
    case 'PRIME_ID_DAILY_LIMIT_EXCEEDED':
      const primeLimit = rulesEvaluated.prime_id;
      return {
        label: 'Prime ID Limit Exceeded',
        color: '#ff9800',
        description: primeLimit && primeLimit.details ? 
          `Prime ID daily total: ${formatCurrency(primeLimit.details.prime_id_daily_total)}, Attempted: ${formatCurrency(primeLimit.details.attempted)}, Limit: ${formatCurrency(currentLimits.PRIME_ID_DAILY_LIMIT)}` : 
          'Prime ID daily limit exceeded'
      };
    case 'PRIME_ID_DAILY_COUNT_EXCEEDED':
      const primeCount = rulesEvaluated.prime_id;
      return {
        label: 'Prime ID Count Exceeded',
        color: '#ff9800',
        description: primeCount && primeCount.details ? 
          `Prime ID daily loads: ${primeCount.details.prime_id_daily_count || '0'}, Limit: ${currentLimits.PRIME_ID_DAILY_COUNT}` : 
          'Prime ID daily load count exceeded'
      };
    case 'INVALID_ID_FORMAT':
      return {
        label: 'Invalid ID Format',
        color: '#ff1744',
        description: `ID: ${row.id}, Customer ID: ${row.customer_id} - format validation failed`
      };
    case 'MALFORMED_AMOUNT':
      return {
        label: 'Malformed Amount',
        color: '#ff1744',
        description: `Amount: ${row.load_amount || row.amount} - invalid format or negative value`
      };
    case 'MALFORMED_TIME':
      return {
        label: 'Malformed Time',
        color: '#ff1744',
        description: `Time: ${row.time} - invalid timestamp format`
      };
    default:
      return baseDetails;
  }
}

export default function OutputsPage({ density = 'comfortable' }) {
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState(null);
  const [outputRows, setOutputRows] = useState([]); // current processed
  const [savedOutputs, setSavedOutputs] = useState([]); // fetched from backend
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [outputDownloadUrl, setOutputDownloadUrl] = useState(null);
  const [auditDownloadUrl, setAuditDownloadUrl] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [config, setConfig] = useState(null);
  const [configLastRefreshed, setConfigLastRefreshed] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionsPerPage, setTransactionsPerPage] = useState(10);

  // Fetch configuration from backend and return it
  const fetchConfigAndReturn = async () => {
    try {
      const res = await apiCall('/api/v1/config');
      if (!res.ok) throw new Error('Failed to fetch config');
      const data = await res.json();
      
      // Handle nested config structure
      const newConfig = data.success && data.config ? data.config : data;
      setConfig(newConfig);
      setConfigLastRefreshed(new Date().toLocaleTimeString());
      return newConfig;
    } catch (e) {
      console.error('Failed to fetch configuration:', e);
      // Use defaults if config fetch fails
      const defaultConfig = {
        MIN_ID_LENGTH: 5,
        MAX_ID_LENGTH: 20,
        MIN_CUSTOMER_ID_LENGTH: 3,
        MAX_CUSTOMER_ID_LENGTH: 15
      };
      setConfig(defaultConfig);
      return defaultConfig;
    }
  };

  // Fetch configuration from backend
  const fetchConfig = async (showNotification = false) => {
    const newConfig = await fetchConfigAndReturn();
    if (showNotification) {
      console.log('🔍 CONFIG - Configuration refreshed:', newConfig);
    }
  };

  // Fetch events from backend
  const fetchEvents = async () => {
    try {
      console.log('🔍 FETCH EVENTS - Starting fetch...');
      console.log('🔍 FETCH EVENTS - Session storage authHeader:', sessionStorage.getItem('authHeader'));
      
      const res = await apiCall('/api/v1/outputs'); // Always call without query params
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      
      console.log('🔍 FETCH EVENTS - Success, got data:', data.length || 0, 'events');
      // The backend returns the data directly, not wrapped in an 'outputs' property
      setSavedOutputs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('🔍 FETCH EVENTS - Error:', e.message);
      setError('Failed to fetch events from backend.');
      // Set empty array on error to prevent slice issues
      setSavedOutputs([]);
    }
  };
  
  // Reset transaction page when expanded event changes or search term changes
  useEffect(() => {
    setTransactionPage(1);
  }, [expandedEventId, searchTerm]);

  useEffect(() => {
    fetchConfigAndReturn();
    fetchEvents();
    // Reduce polling frequency to every 30 seconds to reduce server load
    const interval = setInterval(fetchEvents, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, []);

  const [filePreview, setFilePreview] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    // Create preview for CSV files
    if (selectedFile && selectedFile.name.toLowerCase().endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const csvContent = event.target.result;
        const lines = csvContent.split('\n').slice(0, 6); // Show first 5 data rows + header
        setFilePreview(lines.join('\n'));
      };
      reader.readAsText(selectedFile);
    } else {
      setFilePreview(null);
    }
  };



  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setSuccess(false);
    setOutputDownloadUrl(null);
    setAuditDownloadUrl(null);
    try {
      // Refresh configuration before processing to ensure we have the latest settings
      console.log('🔍 PROCESS - Refreshing configuration before processing...');
      const latestConfig = await fetchConfigAndReturn();
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Log the current configuration being used
      console.log('🔍 PROCESS - Using configuration:', latestConfig);
      console.log('🔍 PROCESS - Key values:');
      console.log('  - Daily limit:', latestConfig.daily_limit);
      console.log('  - Weekly limit:', latestConfig.weekly_limit);
      console.log('  - Daily load count:', latestConfig.daily_load_count);
      console.log('  - Monday multiplier:', latestConfig.monday_multiplier);
      console.log('  - Prime ID daily limit:', latestConfig.prime_id_daily_limit);
      console.log('  - Prime ID daily count:', latestConfig.prime_id_daily_count);
      
      const res = await apiCall('/api/v1/process', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to process file');
      const blob = await res.blob();
      const zip = await JSZip.loadAsync(blob);
      const outputTxt = await zip.file('output.txt').async('string');
      const auditTxt = await zip.file('audit.txt').async('string');
      // Create download links
      setOutputDownloadUrl(URL.createObjectURL(new Blob([outputTxt], { type: 'text/plain' })));
      setAuditDownloadUrl(URL.createObjectURL(new Blob([auditTxt], { type: 'text/plain' })));
      // Parse audit.txt as JSONL
      const auditRows = auditTxt.split('\n').filter(Boolean).map(line => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);
      
      // Debug logging to check audit data structure
      console.log('Parsed audit rows:', auditRows);
      console.log('Sample audit row:', auditRows[0]);
      console.log('Audit fields in first row:', auditRows[0] ? Object.keys(auditRows[0]) : 'No rows');
      
      setOutputRows(auditRows);
      setSuccess(true);
      
      // Log the processing results for debugging
      const acceptedCount = auditRows.filter(r => r.accepted).length;
      const totalCount = auditRows.length;
      console.log(`🔍 PROCESS - Results: ${acceptedCount}/${totalCount} accepted (${Math.round((acceptedCount/totalCount)*100)}%)`);
      console.log('🔍 PROCESS - This shows the NEW processing results with updated configuration');
      
    } catch (e) {
      setError('Processing failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    console.log('🔍 OUTPUTS SAVE - Save button clicked');
    console.log('🔍 OUTPUTS SAVE - Output rows length:', outputRows.length);
    console.log('🔍 OUTPUTS SAVE - Session storage authHeader:', sessionStorage.getItem('authHeader'));
    console.log('🔍 OUTPUTS SAVE - Session storage username:', sessionStorage.getItem('username'));
    
    const total = outputRows.length;
    const accepted = outputRows.filter(r => r.accepted).length;
    const anomalies = outputRows.filter(r => !r.accepted).length;
    const score = total === 0 ? 0 : Math.round((accepted / total) * 100);
    const user = getCurrentUser();
    const date = getNow();
    
    // Debug logging to check what data is being saved
    console.log('Output rows before saving:', outputRows);
    console.log('Sample output row structure:', outputRows[0]);
    
    // Transform outputRows to include proper audit data structure
    const transformedOutputs = outputRows.map(row => {
      // Extract audit information from rules_evaluated
      const audit = {
        effective_amount: row.effective_amount,
        is_monday: row.is_monday,
        is_prime_id: row.rules_evaluated?.prime_id?.details?.is_prime_id || false,
        prime_id_rule: row.rules_evaluated?.prime_id?.passed === false,
        daily_count_rule: row.rules_evaluated?.daily_count?.passed === false,
        daily_limit_rule: row.rules_evaluated?.daily_limit?.passed === false,
        weekly_limit_rule: row.rules_evaluated?.weekly_limit?.passed === false,
        rules_evaluated: row.rules_evaluated
      };

      // Extract reasons for rejection
      const reasons = [];
      if (row.rules_evaluated) {
        Object.entries(row.rules_evaluated).forEach(([ruleName, ruleResult]) => {
          if (!ruleResult.passed && ruleResult.reason) {
            reasons.push(ruleResult.reason);
          }
        });
      }

      return {
        id: row.id,
        customer_id: row.customer_id,
        load_amount: row.original_amount,
        time: row.time || null,
        accepted: row.accepted,
        audit: audit,
        reasons: reasons.length > 0 ? reasons : null
      };
    });

    const event = {
      date,
      user: user.name,
      avatar: user.avatar,
      location: user.location,
      ip: user.ip,
      score,
      outputs: transformedOutputs,
      total,
      accepted,
      anomalies,
      source: 'manual',
    };
    
    // Debug logging to check final event structure
    console.log('Final event structure:', event);
    console.log('Sample output in event:', event.outputs[0]);
    
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('/api/v1/outputs', {
        method: 'POST',
        body: JSON.stringify(event),
      });
      const resText = await res.text();
      if (!res.ok) {
        console.error('POST /outputs failed:', res.status, resText);
        setError(`Failed to save event to backend. Status: ${res.status}. Response: ${resText}`);
        return;
      }
      setSuccess(true);
      setOutputRows([]);
      setShowForm(false);
      setFile(null);
      
      // Refresh the historical data to show the newly saved results
      console.log('🔍 SAVE - Refreshing historical data to show new results...');
      await fetchEvents();
    } catch (e) {
      setError('Failed to save event to backend: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = () => {
    setOutputRows([]);
    setShowForm(false);
    setFile(null);
  };

  const handleCopyAuditDetails = async (auditDetails) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(auditDetails, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy audit details:', err);
    }
  };

  // Pagination logic for event cards
  const safeSavedOutputs = Array.isArray(savedOutputs) ? savedOutputs : [];
  const paginatedEvents = safeSavedOutputs.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const totalPages = Math.ceil(safeSavedOutputs.length / rowsPerPage);

  return (
    <Box>
      <Typography variant="h4" sx={{ color: '#00fff7', mb: 2, fontFamily: 'Orbitron', fontWeight: 700 }}>
        Processing Outputs
      </Typography>
      <Typography variant="body2" sx={{ color: '#888', mb: 4, fontStyle: 'italic' }}>
        New processing results use current configuration settings. Historical saved data shows results from when it was processed (may use different settings).
        <br />
        <span style={{ color: '#00e676' }}>To see the effect of configuration changes, process a new file!</span>
      </Typography>
      <Stack direction="row" spacing={2} mb={2}>
        {!showForm && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ background: 'linear-gradient(90deg, #00fff7 60%, #009999 100%)', color: '#18181b', fontWeight: 700, borderRadius: 2, boxShadow: '0 0 8px #00fff7', '&:hover': { boxShadow: '0 0 16px #00fff7' } }}
            onClick={() => setShowForm(true)}
          >
            Create new
          </Button>
        )}
      </Stack>
      {showForm && (
        <Paper elevation={6} sx={{ p: 3, mb: 4, background: '#18181b', border: '2px solid #00fff7', borderRadius: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8} md={6}>
              <Box>
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<UploadFileIcon />}
                  sx={{ color: '#00fff7', borderColor: '#00fff7', fontWeight: 600, borderRadius: 2, '&:hover': { borderColor: '#00fff7', background: 'rgba(0,255,255,0.05)' } }}
                  fullWidth
                >
                  {file ? file.name : 'Upload file'}
                  <input type="file" accept=".csv,.txt,.jsonl" hidden onChange={handleFileChange} />
                </Button>
                <Typography variant="caption" sx={{ color: '#888', mt: 0.5, display: 'block', textAlign: 'center' }}>
                  Supports: CSV, JSONL, TXT
                </Typography>
                <Typography variant="caption" sx={{ color: '#00fff7', mt: 1, display: 'block', textAlign: 'center', fontStyle: 'italic' }}>
                  Processing will use current configuration from Settings page
                </Typography>
                {filePreview && (
                  <Box sx={{ mt: 2, p: 2, background: '#222', borderRadius: 2, border: '1px solid #00fff7' }}>
                    <Typography variant="subtitle2" sx={{ color: '#00fff7', mb: 1, fontWeight: 700 }}>
                      CSV Preview (First 5 rows)
                    </Typography>
                    <pre style={{ 
                      color: '#fff', 
                      fontSize: '0.8rem', 
                      margin: 0, 
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                      background: '#18181b',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #333'
                    }}>
                      {filePreview}
                    </pre>
                  </Box>
                )}
              </Box>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <Stack spacing={2}>
                {/* Configuration indicator */}
                <Box sx={{ p: 2, background: '#222', borderRadius: 2, border: '1px solid #00fff7' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#00fff7', fontWeight: 700, display: 'block' }}>
                      Current Configuration:
                    </Typography>
                    <Tooltip title="Refresh configuration from Settings">
                      <IconButton 
                        size="small" 
                        onClick={() => fetchConfig(true)}
                        sx={{ color: '#00fff7', p: 0.5 }}
                      >
                        <RefreshIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#fff', display: 'block' }}>
                    Daily: ${config.daily_limit || '5000.00'} | Weekly: ${config.weekly_limit || '20000.00'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#fff', display: 'block' }}>
                    Loads: {config.daily_load_count || 3}/day | Monday: {config.monday_multiplier || 2}x
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#fff', display: 'block' }}>
                    Prime ID: ${config.prime_id_daily_limit || '9999.00'} | Count: {config.prime_id_daily_count || 1}
                  </Typography>
                  {configLastRefreshed && (
                    <Typography variant="caption" sx={{ color: '#888', display: 'block', mt: 1, fontStyle: 'italic' }}>
                      Last refreshed: {configLastRefreshed}
                    </Typography>
                  )}
                </Box>
                
                <Button
                  variant="contained"
                  color="primary"
                  sx={{ fontWeight: 700, borderRadius: 2, boxShadow: '0 0 8px #00fff7', '&:hover': { boxShadow: '0 0 16px #00fff7' } }}
                  onClick={handleProcess}
                  disabled={!file || loading}
                  fullWidth
                >
                  {loading ? 'Processing with latest config...' : 'Process'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
          {outputRows.length > 0 && (
            <Box mt={3}>
              <Paper elevation={4} sx={{ p: 3, background: '#222', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#00fff7', fontWeight: 700 }}>NEW Processing Summary</Typography>
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" color="error" onClick={handleDiscard} sx={{ fontWeight: 700, borderRadius: 2 }}>Discard</Button>
                    <Button variant="contained" color="primary" onClick={handleSave} sx={{ fontWeight: 700, borderRadius: 2 }}>Save</Button>
                  </Stack>
                </Box>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, background: '#18181b', borderRadius: 2, border: '2px solid #00fff7' }}>
                      <Typography variant="h4" sx={{ color: '#00fff7', fontWeight: 900 }}>
                        {outputRows.length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                        Total Transactions
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, background: '#18181b', borderRadius: 2, border: '2px solid #00e676' }}>
                      <Typography variant="h4" sx={{ color: '#00e676', fontWeight: 900 }}>
                        {outputRows.filter(r => r.accepted).length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                        Accepted
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, background: '#18181b', borderRadius: 2, border: '2px solid #ff1744' }}>
                      <Typography variant="h4" sx={{ color: '#ff1744', fontWeight: 900 }}>
                        {outputRows.filter(r => !r.accepted).length}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                        Anomalies
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Box sx={{ textAlign: 'center', p: 2, background: '#18181b', borderRadius: 2, border: '2px solid #ff9800' }}>
                      <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 900 }}>
                        {Math.round((outputRows.filter(r => r.accepted).length / outputRows.length) * 100)}%
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                        Success Rate
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 2, p: 2, background: '#18181b', borderRadius: 2, border: '1px solid #00e676' }}>
                  <Typography variant="caption" sx={{ color: '#00e676', fontWeight: 700, display: 'block', mb: 1 }}>
                    Using Current Configuration:
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#fff', display: 'block' }}>
                    Daily: ${config?.daily_limit || '5000.00'} | Weekly: ${config?.weekly_limit || '20000.00'} | Loads: {config?.daily_load_count || 3}/day
                  </Typography>
                </Box>
                
                <Box sx={{ mt: 3, p: 2, background: '#18181b', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#00fff7', mb: 1, fontWeight: 700 }}>
                    NEW Processing Results (First 5 items)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#00e676', mb: 2, display: 'block', fontStyle: 'italic' }}>
                    These results use the current configuration settings
                  </Typography>
                  <Stack spacing={1}>
                    {outputRows.slice(0, 5).map((row, i) => (
                      <Stack key={row.id + '-' + i} direction="row" spacing={2} alignItems="center" sx={{ p: 1, borderRadius: 2, background: '#222' }}>
                        <Typography sx={{ minWidth: 80, color: '#00fff7', fontWeight: 700, fontSize: '0.9rem' }}>{row.id}</Typography>
                        <Typography sx={{ minWidth: 100, color: '#fff', fontSize: '0.9rem' }}>{row.customer_id}</Typography>
                        <Typography sx={{ minWidth: 80, color: '#fff', fontSize: '0.9rem' }}>${row.load_amount || row.amount || '0.00'}</Typography>
                        {row.accepted ? 
                          <CheckCircleIcon sx={{ color: '#00e676', fontSize: 20 }} /> : 
                          <CancelIcon sx={{ color: '#ff1744', fontSize: 20 }} />
                        }
                      </Stack>
                    ))}
                    {outputRows.length > 5 && (
                      <Typography variant="body2" sx={{ color: '#ccc', fontStyle: 'italic', textAlign: 'center', mt: 1 }}>
                        ... and {outputRows.length - 5} more items
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Paper>
            </Box>
          )}
        </Paper>
      )}
      {/* Above the audit table, render download links if available */}
      {outputDownloadUrl && (
        <Box mb={2}>
          <a href={outputDownloadUrl} download="output.txt" style={{ color: '#00fff7', marginRight: 16 }}>Download output.txt</a>
          <a href={auditDownloadUrl} download="audit.txt" style={{ color: '#00fff7' }}>Download audit.txt</a>
        </Box>
      )}

      
      {/* Persistent saved outputs list as card strips with pagination */}
      {safeSavedOutputs.length > 0 ? (
        <Box>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            <Typography variant="h6" sx={{ color: '#00fff7', fontFamily: 'Orbitron', fontWeight: 700 }}>
              Historical Saved Events
            </Typography>

            <Box flex={1} />
            <Tooltip title="Refresh historical data">
              <IconButton onClick={fetchEvents} sx={{ color: '#00fff7' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Typography sx={{ color: '#00fff7', fontWeight: 600 }}>Rows per page:</Typography>
            <Select
              value={rowsPerPage}
              onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
              size="small"
              sx={{ color: '#00fff7', borderColor: '#00fff7', minWidth: 80, background: '#18181b', '& .MuiSelect-icon': { color: '#00fff7' } }}
            >
              {[5, 10, 25, 50].map(opt => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </Select>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, val) => setPage(val)}
              color="primary"
              sx={{ '& .MuiPaginationItem-root': { color: '#00fff7' } }}
            />
          </Stack>
          <Stack spacing={2}>
            {paginatedEvents.map((event, i) => (
              <Box key={event.id || event._uuid}>
                <Paper elevation={6} sx={{ p: 2, borderRadius: 4, background: '#18181b', display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 0 12px #00fff7cc', cursor: 'pointer' }}
                  onClick={() => setExpandedEventId(expandedEventId === event.id ? null : event.id)}>
                  <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1 }}>
                    <Chip
                      icon={event.source === 'api' ? <ApiIcon sx={{ color: '#fff' }} /> : <TouchAppIcon sx={{ color: '#fff' }} />}
                      label={event.source === 'api' ? 'API' : 'Manual'}
                      sx={{ bgcolor: event.source === 'api' ? '#009999' : '#00fff7', color: '#18181b', fontWeight: 700, fontSize: 14, minWidth: 80 }}
                    />
                    <Typography sx={{ color: '#fff', minWidth: 140 }}>{formatEventDate(event.date)}</Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>{event.avatar}</Avatar>
                      <span style={{ color: '#fff' }}>{event.user}</span>
                    </Stack>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <LocationOnIcon sx={{ color: '#00fff7', fontSize: 18 }} />
                      <span style={{ color: '#fff' }}>{event.location}</span>
                    </Stack>
                    {(() => {
                      const outputs = event.outputs || [];
                      const total = outputs.length;
                      const accepted = outputs.filter(row => row.accepted === true).length;
                      const score = total > 0 ? Math.round((accepted / total) * 100) : 0;
                      
                      return (
                        <Chip
                          label={score + '%'}
                          sx={{ fontWeight: 700, color: '#fff', background: getScoreColor(score), minWidth: 60, fontSize: 16 }}
                        />
                      );
                    })()}
                    {(() => {
                      const outputs = event.outputs || [];
                      const total = outputs.length;
                      const accepted = outputs.filter(row => row.accepted === true).length;
                      const anomalies = outputs.filter(row => {
                        const auditDetails = row.audit || {};
                        const rulesEvaluated = auditDetails.rules_evaluated || {};
                        return Object.entries(rulesEvaluated).some(([ruleName, ruleResult]) => {
                          if (ruleName === 'anomaly' && ruleResult && !ruleResult.passed) {
                            return true;
                          }
                          return false;
                        });
                      }).length;
                      
                      return (
                        <>
                          <Chip label={`Loads: ${total}`} sx={{ bgcolor: '#222', color: '#00fff7', fontWeight: 700, fontSize: 14 }} />
                          <Chip label={`Accepted: ${accepted}`} sx={{ bgcolor: '#222', color: '#00e676', fontWeight: 700, fontSize: 14 }} />
                          <Chip label={`Anomalies: ${anomalies}`} sx={{ bgcolor: '#222', color: '#ff1744', fontWeight: 700, fontSize: 14 }} />
                        </>
                      );
                    })()}
                  </Stack>
                  <IconButton size="small" sx={{ color: '#00fff7' }}>
                    {expandedEventId === event.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Paper>
                                <Collapse in={expandedEventId === event.id} timeout="auto" unmountOnExit>
                  <Box sx={{ p: 2, background: '#222', borderRadius: 2, mt: 1 }}>
                    {/* Audit Data Summary */}
                    {(event.outputs || []).length > 0 && (
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ color: '#00fff7', mb: 1, fontWeight: 700 }}>Audit Data Summary</Typography>
                        {(() => {
                          const outputs = event.outputs || [];
                          const hasAuditData = outputs.filter(row => row.audit && Object.keys(row.audit).length > 0).length;
                          const hasReasonsData = outputs.filter(row => {
                            const auditDetails = row.audit || {};
                            const rulesEvaluated = auditDetails.rules_evaluated || {};
                            // Check if any rule failed (has a reason)
                            return Object.values(rulesEvaluated).some(ruleResult => 
                              ruleResult && !ruleResult.passed && ruleResult.reason
                            );
                          }).length;
                          
                          return (
                            <Stack direction="row" spacing={2} sx={{ fontSize: '0.9rem' }}>
                              <Chip 
                                label={`${hasAuditData}/${outputs.length} Audited`} 
                                color={hasAuditData === outputs.length ? 'success' : 'warning'}
                                size="small"
                              />
                              <Chip 
                                label={`${hasReasonsData}/${outputs.length} Flagged`} 
                                color={hasReasonsData > 0 ? 'error' : 'success'}
                                size="small"
                              />
                            </Stack>
                          );
                        })()}
                      </Box>
                    )}
                    
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: '#00fff7', fontWeight: 700 }}>Audit Data</Typography>
                      <TextField
                        size="small"
                        placeholder="Search by ID or Customer ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        sx={{
                          maxWidth: 300,
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            '& fieldset': {
                              borderColor: '#00fff7',
                            },
                            '&:hover fieldset': {
                              borderColor: '#00fff7',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#00fff7',
                            },
                          },
                          '& .MuiInputBase-input': {
                            color: '#fff',
                          },
                          '& .MuiInputLabel-root': {
                            color: '#00fff7',
                          },
                        }}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon sx={{ color: '#00fff7' }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                    <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                      <Table size="small" sx={{ background: '#18181b', color: '#fff', minWidth: 800 }}>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: '#00fff7' }}>ID</TableCell>
                            <TableCell sx={{ color: '#00fff7' }}>Customer ID</TableCell>
                            <TableCell sx={{ color: '#00fff7' }}>Amount</TableCell>
                            <TableCell sx={{ color: '#00fff7' }}>Date</TableCell>
                            <TableCell sx={{ color: '#00fff7' }}>Accepted</TableCell>
                            <TableCell sx={{ color: '#00fff7' }}>Rules Violated</TableCell>
                            <TableCell sx={{ color: '#00fff7' }}>Audit Details</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(() => {
                            // Filter outputs based on search term
                            const filteredOutputs = (event.outputs || [])
                              .filter(row => {
                                if (!searchTerm) return true;
                                const searchLower = searchTerm.toLowerCase();
                                return (
                                  (row.id && row.id.toString().toLowerCase().includes(searchLower)) ||
                                  (row.customer_id && row.customer_id.toString().toLowerCase().includes(searchLower))
                                );
                              });
                            
                            // Calculate pagination
                            const startIndex = (transactionPage - 1) * transactionsPerPage;
                            const endIndex = startIndex + transactionsPerPage;
                            const paginatedOutputs = filteredOutputs.slice(startIndex, endIndex);
                            
                            return paginatedOutputs;
                          })()
                            .map((row, idx) => {
                            const auditDetails = row.audit || {};
                            const rulesEvaluated = auditDetails.rules_evaluated || {};
                            
                            // Extract reasons from rules_evaluated
                            const reasons = [];
                            Object.entries(rulesEvaluated).forEach(([ruleName, ruleResult]) => {
                              if (ruleResult && !ruleResult.passed && ruleResult.reason) {
                                reasons.push(ruleResult.reason);
                              }
                            });
                            
                            const isAnomaly = reasons.some(reason => 
                              reason === 'CUSTOMER_ID_TOO_SHORT' || 
                              reason === 'TRANSACTION_ID_TOO_SHORT' || 
                              reason === 'CUSTOMER_ANOMALY_DETECTED' || 
                              reason === 'DUPLICATE_TRANSACTION_ID'
                            );
                            const effectiveAmount = auditDetails.effective_amount || row.load_amount || row.amount || '-';
                            // Format amount with commas for display
                            const formatAmount = (amount) => {
                              if (amount === '-' || !amount) return '-';
                              // Remove any existing $ sign and parse
                              const cleanAmount = amount.toString().replace(/^\$/, '');
                              const num = parseFloat(cleanAmount);
                              if (isNaN(num)) return amount;
                              return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                            };
                            


                            const isPrimeId = auditDetails.is_prime_id ? 'Yes' : 'No';
                            
                            // Handle missing audit data gracefully
                            const hasAuditData = row.audit && Object.keys(row.audit).length > 0;
                            
                            return (
                              <TableRow 
                                key={row.id || idx} 
                                sx={{
                                  transition: 'all 0.3s ease-in-out',
                                  '&:hover': {
                                    background: 'rgba(0,255,247,0.1)',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 0 20px 4px #00fff7, 0 4px 8px rgba(0,0,0,0.3)',
                                    '& .MuiTableCell-root': {
                                      color: '#fff',
                                      fontWeight: 600
                                    }
                                  }
                                }}
                              >
                                <TableCell sx={{ color: '#fff' }}>{row.id}</TableCell>
                                <TableCell sx={{ color: '#fff' }}>{row.customer_id}</TableCell>
                                <TableCell sx={{ color: '#fff' }}>
                                  ${formatAmount(effectiveAmount)}
                                  {auditDetails.is_monday && <Chip size="small" label="Monday" sx={{ ml: 1, bgcolor: '#ff9800', color: '#fff', fontSize: '0.7rem' }} />}
                                </TableCell>
                                <TableCell sx={{ color: '#fff' }}>
                                  {formatEventDate(row.time)}
                                </TableCell>
                                <TableCell sx={{ color: row.accepted ? '#00e676' : '#ff1744', fontWeight: 700 }}>
                                  {row.accepted ? 'Yes' : 'No'}
                                  {isAnomaly && <WarningAmberIcon sx={{ color: '#ff1744', fontSize: 18, ml: 1, verticalAlign: 'middle' }} />}

                                </TableCell>
                                <TableCell sx={{ color: '#fff' }}>
                                  {reasons.length > 0
                                    ? reasons.map((r, i) => {
                                        // Use current config for display, but note that historical data may have been processed with different settings
                                        const reasonDetails = getReasonDetails(r, auditDetails, row, config);
                                        return (
                                          <Box key={i} sx={{ mb: 0.5 }}>
                                            <Chip 
                                              label={reasonDetails.label}
                                              size="small"
                                              sx={{ 
                                                bgcolor: reasonDetails.color,
                                                color: '#fff',
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                                mb: 0.5
                                              }}
                                            />
                                            {reasonDetails.description && (
                                              <Typography sx={{ fontSize: '0.7rem', color: '#ccc', ml: 1 }}>
                                                {reasonDetails.description}

                                              </Typography>
                                            )}
                                          </Box>
                                        );
                                      })
                                    : '-'}
                                </TableCell>
                                <TableCell sx={{ color: '#fff', maxWidth: 200 }}>
                                  {hasAuditData ? (
                                    <Box sx={{ fontSize: '0.8rem' }}>
                                      {auditDetails.is_prime_id && (
                                        <div>Prime ID: {isPrimeId}</div>
                                      )}
                                      {auditDetails.prime_id_rule && (
                                        <div>Prime Rules: Active</div>
                                      )}
                                      {/* Only show rule status fields if transaction is not accepted */}
                                      {!row.accepted && (
                                        <>
                                          {auditDetails.daily_count_rule && (
                                            <div>Daily Count: Active</div>
                                          )}
                                          {auditDetails.daily_limit_rule && (
                                            <div>Daily Limit: Active</div>
                                          )}
                                          {auditDetails.weekly_limit_rule && (
                                            <div>Weekly Limit: Active</div>
                                          )}
                                        </>
                                      )}
                                      {!auditDetails.is_prime_id && !auditDetails.daily_count_rule && !auditDetails.daily_limit_rule && !auditDetails.weekly_limit_rule && '-'}
                                      
                                      <Tooltip title="Copy full audit details to clipboard" arrow>
                                        <IconButton
                                          size="small"
                                          onClick={() => handleCopyAuditDetails(auditDetails)}
                                          sx={{ 
                                            color: '#00fff7', 
                                            mt: 1,
                                            '&:hover': { 
                                              background: 'rgba(0,255,247,0.1)',
                                              transform: 'scale(1.1)'
                                            }
                                          }}
                                        >
                                          <ContentCopyIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  ) : (
                                    <Box sx={{ fontSize: '0.8rem', color: '#ff9800' }}>
                                      <div>⚠️ No audit data available</div>
                                      <div>This event was processed before audit logging was implemented</div>
                                    </Box>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                      
                    {/* Add pagination for transactions table */}
                    {(() => {
                      const filteredOutputs = (event.outputs || [])
                        .filter(row => {
                          if (!searchTerm) return true;
                          const searchLower = searchTerm.toLowerCase();
                          return (
                            (row.id && row.id.toString().toLowerCase().includes(searchLower)) ||
                            (row.customer_id && row.customer_id.toString().toLowerCase().includes(searchLower))
                          );
                        });
                        
                      const totalTransactions = filteredOutputs.length;
                      const totalPages = Math.ceil(totalTransactions / transactionsPerPage);
                        
                      return totalTransactions > 0 ? (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 1 }}>
                          <Typography variant="body2" sx={{ color: '#ccc' }}>
                            Showing {Math.min(transactionsPerPage, totalTransactions)} of {totalTransactions} transactions
                          </Typography>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Typography sx={{ color: '#00fff7', fontWeight: 600 }}>Rows per page:</Typography>
                            <Select
                              value={transactionsPerPage}
                              onChange={e => { 
                                setTransactionsPerPage(Number(e.target.value)); 
                                setTransactionPage(1); 
                              }}
                              size="small"
                              sx={{ color: '#00fff7', borderColor: '#00fff7', minWidth: 80, background: '#18181b', '& .MuiSelect-icon': { color: '#00fff7' } }}
                            >
                              {[5, 10, 25, 50].map(opt => (
                                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                              ))}
                            </Select>
                            <Pagination
                              count={totalPages}
                              page={transactionPage}
                              onChange={(_, val) => setTransactionPage(val)}
                              color="primary"
                              size="small"
                              sx={{ '& .MuiPaginationItem-root': { color: '#00fff7' } }}
                            />
                          </Stack>
                        </Box>
                      ) : null;
                    })()}
                  </Box>
                </Collapse>
              </Box>
            ))}
          </Stack>
          {totalPages > 1 && (
            <Stack direction="row" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => setPage(val)}
                color="primary"
                sx={{ '& .MuiPaginationItem-root': { color: '#00fff7' } }}
              />
            </Stack>
          )}
        </Box>
      ) : (
        <Box sx={{ textAlign: 'center', p: 4, background: '#222', borderRadius: 2, border: '1px solid #00fff7' }}>
          <Typography variant="h6" sx={{ color: '#00fff7', mb: 2 }}>
            No Processed Outputs Found
          </Typography>
          <Typography sx={{ color: '#fff', mb: 2 }}>
            Process a file to see results here, or check if the backend is running and accessible.
          </Typography>
          <Button 
            variant="outlined" 
            onClick={fetchEvents}
            sx={{ color: '#00fff7', borderColor: '#00fff7' }}
          >
            Refresh Data
          </Button>
        </Box>
      )}
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError('')} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
      </Snackbar>
      <Snackbar open={success} autoHideDuration={2000} onClose={() => setSuccess(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" sx={{ width: '100%' }}>Processing complete!</Alert>
      </Snackbar>
      <Snackbar open={copySuccess} autoHideDuration={2000} onClose={() => setCopySuccess(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="success" sx={{ width: '100%' }}>Audit details copied to clipboard!</Alert>
      </Snackbar>
    </Box>
  );
} 