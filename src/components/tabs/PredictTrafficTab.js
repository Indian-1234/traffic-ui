import React from 'react';
import { fetchWithTimeout, mockApiResponse } from '../../utils/apiUtils';

const PredictTrafficTab = ({ 
  formData, 
  handleInputChange, 
  loading, 
  setLoading, 
  setError, 
  setTrafficData, 
  map 
}) => {
  
  const predictTraffic = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let data;
      try {
        const response = await fetchWithTimeout('http://localhost:8000/predict', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
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
};

export default PredictTrafficTab;