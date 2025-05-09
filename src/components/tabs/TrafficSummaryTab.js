import React from 'react';
import { fetchWithTimeout, mockApiResponse } from '../../utils/apiUtils';

const TrafficSummaryTab = ({ 
  formData, 
  loading, 
  setLoading, 
  setError, 
  setTrafficData 
}) => {
  
  const getTrafficSummary = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      setLoading(true);
      setError('');
    
      let data;
      try {
        // Get Bearer token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error("No authentication token found");
    
        // Make authenticated API call
        const response = await fetchWithTimeout('http://localhost:8000/traffic-summary', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
    
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
    
        data = await response.json();
      } catch (err) {
        console.warn("Using mock data for traffic summary", err);
        data = mockApiResponse('traffic-summary');
      }
    
      // Display summary info (not markers)
      setTrafficData([{
        location: {
          latitude: formData.latitude,
          longitude: formData.longitude
        },
        current_congestion: data.average_congestion,
        average_speed: data.average_speed,
        total_vehicles_estimated: data.total_vehicles_estimated,
        network_status: data.network_status
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    
    
  };

  return (
    <form onSubmit={getTrafficSummary}>
      <p>Get a network-wide summary of traffic conditions.</p>
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Get Traffic Summary'}
      </button>
    </form>
  );
};

export default TrafficSummaryTab;