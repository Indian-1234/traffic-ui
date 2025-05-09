// Helper function for API requests
export const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  };
  
  // Mock API response for testing when backend is not available
  export const mockApiResponse = (endpoint) => {
    switch (endpoint) {
      case 'predict':
        return {
          prediction: Math.random() * 0.8 + 0.1,
          recommended_speed: Math.floor(Math.random() * 40) + 30
        };
      case 'optimize-route':
        return {
          optimal_routes: [
            { from_node: 0, to_node: 1, congestion: 0.3 },
            { from_node: 1, to_node: 9, congestion: 0.5 }
          ]
        };
      case 'live-data':
        return Array(5).fill().map((_, i) => ({
          location: {
            latitude: 40.7128 + (Math.random() - 0.5) * 0.05,
            longitude: -74.0060 + (Math.random() - 0.5) * 0.05
          },
          current_congestion: Math.random(),
          average_speed: Math.floor(Math.random() * 40) + 30,
          vehicle_count: Math.floor(Math.random() * 200) + 50
        }));
      case 'traffic-summary':
        return {
          average_congestion: 0.45,
          average_speed: 35.2,
          total_vehicles_estimated: 3450,
          network_status: 'Moderate'
        };
      default:
        return {};
    }
  };