import React, { useEffect, useState, useRef } from 'react';
import tt from '@tomtom-international/web-sdk-maps';
import '@tomtom-international/web-sdk-maps/dist/maps.css';
import './TrafficMap.css';
import axios from 'axios';

const TrafficMap = () => {
  const mapElement = useRef(null);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [trafficData, setTrafficData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
    vehicle_count: 100,
    weather_condition: 0.2,
    time_of_day: 12,
    day_of_week: new Date().getDay(),
    start_node: 0,
    end_node: 9,
    area: 'downtown',
    radius: 2.0
  });

  const [activeTab, setActiveTab] = useState('predict');
  const [apiKeyError, setApiKeyError] = useState(false);

  // Initialize the map
  useEffect(() => {
    const apiKey = 'IV7dQDp5vey54vgGvRlIDmn7qazKzAaN'; // Replace with your valid API key
    
    try {
      const mapInstance = tt.map({
        key: apiKey,
        container: mapElement.current,
        center: [formData.longitude, formData.latitude],
        zoom: 12,
        // style: 'tomtom://vector/1/basic-main'
      });

      mapRef.current = mapInstance;
      setMap(mapInstance);

      // Add traffic flow layer
      mapInstance.on('load', () => {
        try {
          mapInstance.addTier(tt.TrafficFlowTilesTier({
            key: apiKey,
            style: 'relative'
          }));
        } catch (err) {
          console.error("Failed to add traffic flow layer:", err);
          setApiKeyError(true);
        }
      });

      // Add error handling for map load failures
      mapInstance.on('error', (e) => {
        console.error("Map error:", e);
        setApiKeyError(true);
      });

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
        }
      };
    } catch (err) {
      console.error("Failed to initialize map:", err);
      setApiKeyError(true);
      return () => {};
    }
  }, []);

  // Update map markers when traffic data changes
  useEffect(() => {
    if (!map || !trafficData.length) return;

    try {
      // Clear existing markers
      const existingMarkers = document.getElementsByClassName('custom-marker');
      while (existingMarkers[0]) {
        existingMarkers[0].parentNode.removeChild(existingMarkers[0]);
      }

      // Add markers for each traffic data point
      trafficData.forEach(data => {
        const { location, current_congestion } = data;
        
        if (!location || typeof location.longitude === 'undefined' || typeof location.latitude === 'undefined') {
          console.error("Invalid location data:", data);
          return;
        }
        
        // Create marker element
        const markerElement = document.createElement('div');
        markerElement.className = 'custom-marker';
        
        // Set color based on congestion level
        const congestionColor = getCongestionColor(current_congestion);
        markerElement.style.backgroundColor = congestionColor;
        
        // Add marker to map
        new tt.Marker({
          element: markerElement
        })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map);
      });
    } catch (err) {
      console.error("Error updating markers:", err);
    }
  }, [map, trafficData]);

  // Get color based on congestion level
  const getCongestionColor = (congestion) => {
    if (congestion < 0.3) return '#4CAF50'; // Green
    if (congestion < 0.6) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'radius' || name === 'weather_condition' ? parseFloat(value) : 
              name === 'vehicle_count' || name === 'time_of_day' || name === 'day_of_week' || 
              name === 'start_node' || name === 'end_node' ? parseInt(value, 10) : value
    }));
  };

  // Helper function for API requests
  const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
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
  const mockApiResponse = (endpoint) => {
    switch (endpoint) {
      case 'predict':
        return {
          prediction: Math.random() * 0.8 + 0.1,
          recommended_speed: Math.floor(Math.random() * 40) + 30
        };
      case 'optimize-route':
        return {
          optimal_routes: [
            { from_node: formData.start_node, to_node: formData.start_node + 1, congestion: 0.3 },
            { from_node: formData.start_node + 1, to_node: formData.end_node, congestion: 0.5 }
          ]
        };
      case 'live-data':
        return Array(5).fill().map((_, i) => ({
          location: {
            latitude: formData.latitude + (Math.random() - 0.5) * 0.05,
            longitude: formData.longitude + (Math.random() - 0.5) * 0.05
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

  // Predict traffic
  const predictTraffic = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let data;
      try {
        // Retrieve the token from localStorage
        const token = localStorage.getItem('authToken');
        alert(token)
        const response = await fetchWithTimeout('http://localhost:8000/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Add the Authorization header with the Bearer token
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            latitude: formData.latitude,
            longitude: formData.longitude,
            vehicle_count: formData.vehicle_count,
            weather_condition: formData.weather_condition,
            time_of_day: formData.time_of_day,
            day_of_week: formData.day_of_week
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        data = await response.json();
      } catch (err) {
        console.warn("Using mock data for prediction", err);
        data = mockApiResponse('predict');
      }

      setTrafficData([{
        location: {
          latitude: formData.latitude,
          longitude: formData.longitude
        },
        current_congestion: data.prediction,
        average_speed: data.recommended_speed,
        vehicle_count: formData.vehicle_count
      }]);

      // Center map on prediction location
      if (map) {
        map.flyTo({
          center: [formData.longitude, formData.latitude],
          zoom: 14
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Optimize route
  const optimizeRoute = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      setLoading(true);
      setError('');
      
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      
      // Ensure token exists
      if (!token) throw new Error("No authentication token found");
      
      // Make API call using Axios with proper authorization header
      const response = await axios.post(
        `http://localhost:8000/optimize-route?start_node=${formData.start_node}&end_node=${formData.end_node}&departure_time=${formData.time_of_day}`,
        {}, // Empty body
        {
          params: {
            start_node: formData.start_node,
            end_node: formData.end_node,
            departure_time: formData.time_of_day,
          },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      
      return response.data;
    } catch (error) {
      // Better error handling
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Server error:", error.response.status, error.response.data);
        throw new Error(`Server error: ${error.response.data.detail || error.response.statusText}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error("Network error:", error.request);
        throw new Error("Network error: No response received from server");
      } else {
        // Something happened in setting up the request
        console.error("Request setup error:", error.message);
        throw new Error(`Request error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
    
    
  }

  // Get live traffic data
  const getLiveTrafficData = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null); 

    try {
      let data;
      try {
        const response = await fetchWithTimeout(`http://localhost:8000/live-data?area=${formData.area}&radius=${formData.radius}&lat=${formData.latitude}&lon=${formData.longitude}`);

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        data = await response.json();
      } catch (err) {
        console.warn("Using mock data for live traffic", err);
        data = mockApiResponse('live-data');
      }
      
      setTrafficData(data);

      // Center map to show all traffic data points
      if (map && data.length > 0) {
        try {
          const bounds = new tt.LngLatBounds();
          
          data.forEach(point => {
            bounds.extend([point.location.longitude, point.location.latitude]);
          });
          
          map.fitBounds(bounds, { padding: 50 });
        } catch (err) {
          console.error("Error fitting map to bounds:", err);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get traffic summary
  const getTrafficSummary = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let data;
      try {
        const response = await fetchWithTimeout('http://localhost:8000/traffic-summary');

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        data = await response.json();
      } catch (err) {
        console.warn("Using mock data for traffic summary", err);
        data = mockApiResponse('traffic-summary');
      }
      
      // For traffic summary, we don't set map markers but display the data
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'predict':
        return (
          <form onSubmit={predictTraffic}>
            <div className="form-group">
              <label>Latitude:</label>
              <input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                step="0.0001"
              />
            </div>
            <div className="form-group">
            <label>Longitude:</label>
              <input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                step="0.0001"
              />
            </div>
            <div className="form-group">
              <label>Vehicle Count:</label>
              <input
                type="number"
                name="vehicle_count"
                value={formData.vehicle_count}
                onChange={handleInputChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Weather Condition (0-1):</label>
              <input
                type="number"
                name="weather_condition"
                value={formData.weather_condition}
                onChange={handleInputChange}
                min="0"
                max="1"
                step="0.1"
              />
            </div>
            <div className="form-group">
              <label>Time of Day (0-23):</label>
              <input
                type="number"
                name="time_of_day"
                value={formData.time_of_day}
                onChange={handleInputChange}
                min="0"
                max="23"
              />
            </div>
            <div className="form-group">
              <label>Day of Week (0-6):</label>
              <input
                type="number"
                name="day_of_week"
                value={formData.day_of_week}
                onChange={handleInputChange}
                min="0"
                max="6"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Predict Traffic'}
            </button>
          </form>
        );
      case 'optimize':
        return (
          <form onSubmit={optimizeRoute}>
            <div className="form-group">
              <label>Start Node:</label>
              <input
                type="number"
                name="start_node"
                value={formData.start_node}
                onChange={handleInputChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>End Node:</label>
              <input
                type="number"
                name="end_node"
                value={formData.end_node}
                onChange={handleInputChange}
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Departure Time (0-23):</label>
              <input
                type="number"
                name="time_of_day"
                value={formData.time_of_day}
                onChange={handleInputChange}
                min="0"
                max="23"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Optimize Route'}
            </button>
          </form>
        );
      case 'live':
        return (
          <form onSubmit={getLiveTrafficData}>
            <div className="form-group">
              <label>Area:</label>
              <select name="area" value={formData.area} onChange={handleInputChange}>
                <option value="downtown">Downtown</option>
                <option value="uptown">Uptown</option>
                <option value="midtown">Midtown</option>
                <option value="airport">Airport</option>
              </select>
            </div>
            <div className="form-group">
              <label>Radius (km):</label>
              <input
                type="number"
                name="radius"
                value={formData.radius}
                onChange={handleInputChange}
                min="0.5"
                max="10"
                step="0.5"
              />
            </div>
            <div className="form-group">
              <label>Custom Latitude:</label>
              <input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                step="0.0001"
              />
            </div>
            <div className="form-group">
              <label>Custom Longitude:</label>
              <input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                step="0.0001"
              />
            </div>
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Get Live Traffic'}
            </button>
          </form>
        );
      case 'summary':
        return (
          <form onSubmit={getTrafficSummary}>
            <p>Get a network-wide summary of traffic conditions.</p>
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Get Traffic Summary'}
            </button>
          </form>
        );
      default:
        return null;
    }
  };

  // Render results
  const renderResults = () => {
    if (loading) {
      return <div className="loading">Loading...</div>;
    }

    if (error) {
      return <div className="error">Error: {error}</div>;
    }

    if (trafficData.length === 0) {
      return null;
    }

    return (
      <div className="results">
        <h3>Traffic Data Results</h3>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th>Congestion</th>
              <th>Speed (km/h)</th>
              {activeTab === 'summary' && <th>Status</th>}
              {activeTab === 'summary' && <th>Vehicles</th>}
            </tr>
          </thead>
          <tbody>
            {trafficData.map((data, index) => (
              <tr key={index}>
                <td>{data.location.latitude.toFixed(4)}, {data.location.longitude.toFixed(4)}</td>
                <td style={{ color: getCongestionColor(data.current_congestion) }}>
                  {(data.current_congestion * 100).toFixed(1)}%
                </td>
                <td>{data.average_speed ? data.average_speed.toFixed(1) : 'N/A'}</td>
                {activeTab === 'summary' && <td>{data.network_status}</td>}
                {activeTab === 'summary' && <td>{data.total_vehicles_estimated}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        {activeTab === 'optimize' && (
          <div className="route-info">
            <h4>Optimized Route</h4>
            <p>The optimized route is displayed on the map.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="traffic-map-container">
      <h1>Quantum Traffic Optimization</h1>
      
      {apiKeyError && (
        <div className="api-key-error">
          <p>There was an error initializing the map. Please check your TomTom API key or internet connection.</p>
          <p>The application will continue to function with limited features.</p>
        </div>
      )}
      
      <div className="app-layout">
        <div className="map-container" ref={mapElement}></div>
        
        <div className="controls-container">
          <div className="tab-bar">
            <button 
              className={activeTab === 'predict' ? 'active' : ''}
              onClick={() => setActiveTab('predict')}
            >
              Predict Traffic
            </button>
            <button 
              className={activeTab === 'optimize' ? 'active' : ''}
              onClick={() => setActiveTab('optimize')}
            >
              Optimize Route
            </button>
            <button 
              className={activeTab === 'live' ? 'active' : ''}
              onClick={() => setActiveTab('live')}
            >
              Live Traffic
            </button>
            <button 
              className={activeTab === 'summary' ? 'active' : ''}
              onClick={() => setActiveTab('summary')}
            >
              Traffic Summary
            </button>
          </div>
          
          <div className="tab-content">
            {renderTabContent()}
          </div>
          
          {renderResults()}
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;