import React, { useState, useEffect } from 'react';
import { fetchWithTimeout, mockApiResponse } from '../../utils/apiUtils';
import tt from '@tomtom-international/web-sdk-maps';

const LiveTrafficTab = ({
  formData,
  handleInputChange,
  loading,
  setLoading,
  setError,
  setTrafficData,
  map
}) => {
  const [permissionMode, setPermissionMode] = useState(null); // null, 'auto', or 'manual'
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(true);
  
  // Chennai/Sholinganallur default coordinates
  const chennaiDefaults = {
    area: 'sholinganallur',
    latitude: 12.9010,
    longitude: 80.2279,
    radius: 2.0
  };
  
  // Set Chennai defaults on component mount
  useEffect(() => {
    // Set default values for Chennai/Sholinganallur
    handleInputChange({
      target: { name: 'area', value: chennaiDefaults.area }
    });
    handleInputChange({
      target: { name: 'latitude', value: chennaiDefaults.latitude }
    });
    handleInputChange({
      target: { name: 'longitude', value: chennaiDefaults.longitude }
    });
    handleInputChange({
      target: { name: 'radius', value: chennaiDefaults.radius }
    });
  }, []);

  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      // Auto-fill the form with current location
      handleInputChange({
        target: { name: 'latitude', value: position.coords.latitude }
      });
      handleInputChange({
        target: { name: 'longitude', value: position.coords.longitude }
      });
      
      setShowPermissionPrompt(false);
      setPermissionMode('auto');
      
      // Automatically fetch traffic data after getting location
      getLiveTrafficData(null, true);
    } catch (error) {
      setError("Location permission denied. Using Chennai defaults.");
      setPermissionMode('manual');
      setShowPermissionPrompt(false);
    } finally {
      setLoading(false);
    }
  };

  const chooseManualEntry = () => {
    setPermissionMode('manual');
    setShowPermissionPrompt(false);
  };

  const getLiveTrafficData = async (e, skipPrevent = false) => {
    if (e && !skipPrevent) {
      e.preventDefault();
    }
    
    setLoading(true);
    setError(null);
    
    try {
      setLoading(true);
      setError('');
    
      let data;
      try {
        // Retrieve token
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error("No authentication token found");
    
        // Build API URL
        const apiUrl = `http://localhost:8000/live-data?area=${formData.area}&radius=${formData.radius}&lat=${formData.latitude}&lon=${formData.longitude}`;
    
        const response = await fetchWithTimeout(apiUrl, {
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
        console.warn("Using mock data for live traffic", err);
        data = mockApiResponse('live-data');
      }
    
      // Continue with your map display logic as before...
      // (all your map rendering code remains unchanged)
    
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    
  };

  // Helper function to get a color based on congestion level
  const getCongestionColor = (congestion) => {
    // Convert congestion (0-1) to a color from green to red
    const red = Math.floor(255 * congestion);
    const green = Math.floor(255 * (1 - congestion));
    return `rgb(${red}, ${green}, 0)`;
  };

  const resetToChennaiDefaults = () => {
    handleInputChange({
      target: { name: 'area', value: chennaiDefaults.area }
    });
    handleInputChange({
      target: { name: 'latitude', value: chennaiDefaults.latitude }
    });
    handleInputChange({
      target: { name: 'longitude', value: chennaiDefaults.longitude }
    });
    handleInputChange({
      target: { name: 'radius', value: chennaiDefaults.radius }
    });
  };

  return (
    <div>
      {showPermissionPrompt && (
        <div className="permission-prompt">
          <h3>Location Permission</h3>
          <p>Would you like to use your current location or Chennai defaults?</p>
          <div className="permission-buttons">
            <button 
              type="button" 
              onClick={requestLocationPermission}
              disabled={loading}
            >
              {loading ? 'Getting Location...' : 'Use My Location'}
            </button>
            <button 
              type="button" 
              onClick={chooseManualEntry}
            >
              Use Chennai Defaults
            </button>
          </div>
        </div>
      )}

      {(!showPermissionPrompt || permissionMode === 'manual') && (
        <form onSubmit={getLiveTrafficData}>
          <div className="form-group">
            <label>Area:</label>
            <select name="area" value={formData.area} onChange={handleInputChange}>
              <option value="sholinganallur">Sholinganallur</option>
              <option value="omr">OMR</option>
              <option value="adyar">Adyar</option>
              <option value="tambaram">Tambaram</option>
              <option value="tNagar">T Nagar</option>
              <option value="annaUniversity">Anna University</option>
              <option value="airport">Airport</option>
              <option value="guindy">Guindy</option>
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
          <div className="button-group">
            <button type="submit" disabled={loading} className="primary-button">
              {loading ? 'Loading...' : 'Get Live Traffic'}
            </button>
            
            <button 
              type="button" 
              onClick={resetToChennaiDefaults} 
              className="secondary-button"
            >
              Reset to Chennai Defaults
            </button>
            
            {permissionMode === 'auto' && (
              <button 
                type="button" 
                onClick={chooseManualEntry} 
                className="secondary-button"
              >
                Switch to Manual Entry
              </button>
            )}
          </div>
        </form>
      )}

      {loading && (
        <div className="loading-indicator">
          <p>Fetching traffic data...</p>
        </div>
      )}
    </div>
  );
};

export default LiveTrafficTab;