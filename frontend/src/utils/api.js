// Utility for making authenticated API calls
export const apiCall = async (url, options = {}) => {
  // For development, don't require authentication
  const authHeader = null; // sessionStorage.getItem('authHeader');
  
  // Temporary debugging for save operations
  if (url.includes('/outputs') && options.method === 'POST') {
    console.log('🔍 SAVE DEBUG - Starting save operation');
    console.log('🔍 SAVE DEBUG - Auth header present:', !!authHeader);
    console.log('🔍 SAVE DEBUG - Session storage authHeader:', sessionStorage.getItem('authHeader'));
    console.log('🔍 SAVE DEBUG - Session storage username:', sessionStorage.getItem('username'));
  }
  
  // Don't set Content-Type for FormData - let browser handle it
  const isFormData = options.body instanceof FormData;
  
  const defaultOptions = {
    headers: {
      ...(authHeader && { 'Authorization': authHeader }),
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers
    }
  };

  // Temporary debugging for config operations
  if (url.includes('/config') && options.method === 'POST') {
    console.log('🔍 CONFIG SAVE DEBUG - Starting config save operation');
    console.log('🔍 CONFIG SAVE DEBUG - Auth header present:', !!authHeader);
    console.log('🔍 CONFIG SAVE DEBUG - Session storage authHeader:', sessionStorage.getItem('authHeader'));
    console.log('🔍 CONFIG SAVE DEBUG - Session storage username:', sessionStorage.getItem('username'));
    console.log('🔍 CONFIG SAVE DEBUG - Full headers being sent:', defaultOptions.headers);
    console.log('🔍 CONFIG SAVE DEBUG - Request body:', options.body);
  }
  
  // Temporary debugging for GET operations
  if (url.includes('/outputs') && (!options.method || options.method === 'GET')) {
    console.log('🔍 FETCH DEBUG - Starting GET operation');
    console.log('🔍 FETCH DEBUG - Auth header present:', !!authHeader);
    console.log('🔍 FETCH DEBUG - Session storage authHeader:', sessionStorage.getItem('authHeader'));
  }

  console.log('🔍 API CALL DEBUG - About to make fetch request');
  console.log('🔍 API CALL DEBUG - URL:', url);
  console.log('🔍 API CALL DEBUG - Options:', { ...defaultOptions, ...options });
  
  let response;
  try {
    response = await fetch(url, { ...defaultOptions, ...options });
    console.log('🔍 API CALL DEBUG - Fetch completed successfully');
  } catch (error) {
    console.log('🔍 API CALL DEBUG - Fetch failed with error:', error);
    throw error;
  }
  
  // Temporary debugging for save operations
  if (url.includes('/outputs') && options.method === 'POST') {
    console.log('🔍 SAVE DEBUG - Response status:', response.status);
    console.log('🔍 SAVE DEBUG - Response ok:', response.ok);
  }
  
  // Temporary debugging for config operations
  if (url.includes('/config') && options.method === 'POST') {
    console.log('🔍 CONFIG SAVE DEBUG - Response status:', response.status);
    console.log('🔍 CONFIG SAVE DEBUG - Response ok:', response.ok);
    console.log('🔍 CONFIG SAVE DEBUG - Response headers:', response.headers);
    if (!response.ok) {
      // Clone response to read text without consuming it
      const responseClone = response.clone();
      console.log('🔍 CONFIG SAVE DEBUG - Response text:', await responseClone.text());
    }
  }
  
  // Temporary debugging for GET operations
  if (url.includes('/outputs') && (!options.method || options.method === 'GET')) {
    console.log('🔍 FETCH DEBUG - Response status:', response.status);
    console.log('🔍 FETCH DEBUG - Response ok:', response.ok);
  }
  
  if (response.status === 401) {
    console.log('🔍 SAVE DEBUG - 401 Unauthorized detected!');
    console.log('🔍 SAVE DEBUG - Clearing session storage...');
    // Unauthorized - clear session storage
    sessionStorage.removeItem('authHeader');
    sessionStorage.removeItem('username');
    console.log('🔍 SAVE DEBUG - Session cleared, dispatching logout event');
    // Dispatch custom event to notify App component
    window.dispatchEvent(new CustomEvent('sessionCleared'));
    throw new Error('Authentication required');
  }
  
  return response;
}; 