import React from 'react';
import { fetchWithTimeout, mockApiResponse } from '../../utils/apiUtils';

const OptimizeRouteTab = ({ 
  formData, 
  handleInputChange, 
  loading, 
  setLoading, 
  setError, 
  setTrafficData, 
  map 
}) => {
  
  const optimizeRoute = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      setLoading(true);
      setError('');
    
      let data;
    
      try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error("No authentication token found");
    
        const response = await fetchWithTimeout(
          `http://localhost:8000/optimize-route?start_node=${formData.start_node}&end_node=${formData.end_node}&departure_time=${formData.time_of_day}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            }
          }
        );
    
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
    
        data = await response.json();
      } catch (err) {
        console.warn("Using mock data for route optimization", err);
        data = mockApiResponse('optimize-route');
      }
    
      // Display the optimized route on the map
      if (map && data.optimal_routes.length > 0) {
        const routeCoordinates = [];
    
        data.optimal_routes.forEach(segment => {
          if (segment.from_node && segment.to_node) {
            const fromCoord = [
              formData.longitude - 0.01 * parseInt(segment.from_node),
              formData.latitude - 0.01 * parseInt(segment.from_node)
            ];
            const toCoord = [
              formData.longitude - 0.01 * parseInt(segment.to_node),
              formData.latitude - 0.01 * parseInt(segment.to_node)
            ];
    
            routeCoordinates.push(fromCoord);
            routeCoordinates.push(toCoord);
          }
        });
    
        try {
          if (map.getSource('route')) {
            map.removeLayer('route');
            map.removeSource('route');
          }
    
          map.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routeCoordinates
              }
            }
          });
    
          map.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#0078FF',
              'line-width': 8
            }
          });
    
          map.fitBounds([
            [
              Math.min(...routeCoordinates.map(coord => coord[0])) - 0.05,
              Math.min(...routeCoordinates.map(coord => coord[1])) - 0.05
            ],
            [
              Math.max(...routeCoordinates.map(coord => coord[0])) + 0.05,
              Math.max(...routeCoordinates.map(coord => coord[1])) + 0.05
            ]
          ], { padding: 50 });
        } catch (err) {
          console.error("Error displaying route on map:", err);
        }
      }
    
      setTrafficData(data.optimal_routes.map(route => ({
        location: {
          latitude: formData.latitude - 0.01 * parseInt(route.from_node),
          longitude: formData.longitude - 0.01 * parseInt(route.from_node)
        },
        current_congestion: route.congestion || 0.3,
        average_speed: 45
      })));
    
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    
  };

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
};

export default OptimizeRouteTab;