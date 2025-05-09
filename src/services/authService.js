// src/services/authService.js
const apiUrl1 = process.env.REACT_APP_API_URL;

const authService = {
    // Check if user is logged in
    isAuthenticated: () => {
      return localStorage.getItem('authToken') !== null;
    },
    
    // Get the auth token
    getToken: () => {
      return localStorage.getItem('authToken');
    },
    
    // Get auth headers for API requests
    getAuthHeaders: () => {
      const token = localStorage.getItem('authToken');
      return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      };
    },
    
    // Login user - CORRECTED to use form-urlencoded format
    login: async (username, password) => {
      // Create form data as expected by OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetch(`${apiUrl1}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const data = await response.json();
      // Store the access_token from the response
      localStorage.setItem('authToken', data.access_token);
      return data;
    },
    
    // Register user
    register: async (userData) => {
      const response = await fetch(`${apiUrl1}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      
      const data = await response.json();
      // If your register endpoint also returns a token
      if (data.access_token) {
        localStorage.setItem('authToken', data.access_token);
      }
      return data;
    },
    
    // Logout user
    logout: () => {
      localStorage.removeItem('authToken');
    },
  };
  
  export default authService;