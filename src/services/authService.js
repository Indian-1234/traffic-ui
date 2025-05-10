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
      'Authorization': token ? `Bearer ${token}` : '',
    };
  },

  // Login user
  login: async (username, password) => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${apiUrl1}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    // Store actual access_token from response OR use fallback if not present
    const token = data.access_token || '7861872bsmJJKONJJOE'; // fallback for testing
    localStorage.setItem('authToken', token);

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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Registration failed');
    }

    // Optional: store token if returned
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
