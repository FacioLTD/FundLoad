/**
 * Debug Alerts Utility
 * Provides debugging alerts and logging for UI issues and requests
 */

class DebugAlerts {
  constructor() {
    this.enabled = process.env.NODE_ENV === 'development';
    this.alertHistory = [];
  }

  /**
   * Log a debug message with optional alert
   */
  log(message, showAlert = false, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, level };
    
    this.alertHistory.push(logEntry);
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
    
    if (showAlert && this.enabled) {
      this.showAlert(message, level);
    }
  }

  /**
   * Show a browser alert for debugging
   */
  showAlert(message, level = 'info') {
    if (!this.enabled) return;
    
    const alertElement = document.createElement('div');
    alertElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${this.getBackgroundColor(level)};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 400px;
      font-family: monospace;
      font-size: 14px;
      animation: slideIn 0.3s ease-out;
    `;
    
    alertElement.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${level.toUpperCase()}</div>
      <div>${message}</div>
    `;
    
    document.body.appendChild(alertElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (alertElement.parentNode) {
        alertElement.parentNode.removeChild(alertElement);
      }
    }, 5000);
  }

  /**
   * Get background color based on alert level
   */
  getBackgroundColor(level) {
    switch (level) {
      case 'error': return '#ff1744';
      case 'warning': return '#ff9800';
      case 'success': return '#00e676';
      case 'info': 
      default: return '#00fff7';
    }
  }

  /**
   * Log API request for debugging
   */
  logRequest(url, method, data = null) {
    this.log(`API Request: ${method} ${url}`, false, 'info');
    if (data) {
      this.log(`Request Data: ${JSON.stringify(data, null, 2)}`, false, 'info');
    }
  }

  /**
   * Log API response for debugging
   */
  logResponse(url, status, data = null) {
    const level = status >= 400 ? 'error' : 'success';
    this.log(`API Response: ${status} ${url}`, false, level);
    if (data) {
      this.log(`Response Data: ${JSON.stringify(data, null, 2)}`, false, level);
    }
  }

  /**
   * Log UI state changes
   */
  logUIState(component, state, showAlert = false) {
    this.log(`UI State Change: ${component}`, showAlert, 'info');
    this.log(`State: ${JSON.stringify(state, null, 2)}`, false, 'info');
  }

  /**
   * Log anomaly detection
   */
  logAnomaly(row, reason) {
    this.log(`Anomaly Detected: ID=${row.id}, Customer=${row.customer_id}, Reason=${reason}`, false, 'warning');
  }

  /**
   * Log limit violations
   */
  logLimitViolation(limitType, current, attempted, limit) {
    this.log(`Limit Violation: ${limitType} - Current: ${current}, Attempted: ${attempted}, Limit: ${limit}`, true, 'error');
  }

  /**
   * Get alert history
   */
  getHistory() {
    return this.alertHistory;
  }

  /**
   * Clear alert history
   */
  clearHistory() {
    this.alertHistory = [];
  }

  /**
   * Enable/disable debug alerts
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// Create singleton instance
const debugAlerts = new DebugAlerts();

// Add CSS animation for alerts
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);
}

// Debug utility for outputs page data structure issues
export const debugOutputsData = (data, source = 'unknown') => {
  console.log(`🔍 DEBUG OUTPUTS [${source}] - Data type:`, typeof data);
  console.log(`🔍 DEBUG OUTPUTS [${source}] - Is array:`, Array.isArray(data));
  console.log(`🔍 DEBUG OUTPUTS [${source}] - Data length:`, data?.length || 'N/A');
  console.log(`🔍 DEBUG OUTPUTS [${source}] - Full data:`, data);
  
  if (Array.isArray(data) && data.length > 0) {
    console.log(`🔍 DEBUG OUTPUTS [${source}] - First item:`, data[0]);
    console.log(`🔍 DEBUG OUTPUTS [${source}] - First item keys:`, Object.keys(data[0]));
    
    // Check if outputs property exists
    if (data[0].outputs) {
      console.log(`🔍 DEBUG OUTPUTS [${source}] - First item has outputs:`, data[0].outputs);
      console.log(`🔍 DEBUG OUTPUTS [${source}] - Outputs length:`, data[0].outputs?.length);
      if (data[0].outputs && data[0].outputs.length > 0) {
        console.log(`🔍 DEBUG OUTPUTS [${source}] - First output:`, data[0].outputs[0]);
      }
    }
  }
  
  // Show alert for debugging
  const message = `Data from ${source}:
Type: ${typeof data}
Is Array: ${Array.isArray(data)}
Length: ${data?.length || 'N/A'}
${Array.isArray(data) && data.length > 0 ? `First item keys: ${Object.keys(data[0]).join(', ')}` : 'No data'}`;
  
  alert(message);
};

export const debugEventStructure = (event) => {
  console.log('🔍 DEBUG EVENT - Full event structure:', event);
  console.log('🔍 DEBUG EVENT - Event outputs:', event.outputs);
  console.log('🔍 DEBUG EVENT - Outputs length:', event.outputs?.length);
  
  if (event.outputs && event.outputs.length > 0) {
    console.log('🔍 DEBUG EVENT - First output:', event.outputs[0]);
    console.log('🔍 DEBUG EVENT - First output keys:', Object.keys(event.outputs[0]));
  }
};

export default debugAlerts; 