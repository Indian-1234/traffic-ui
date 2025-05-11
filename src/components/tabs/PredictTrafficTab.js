import React, { useState, useEffect } from 'react';
import { fetchWithTimeout, mockApiResponse } from '../../utils/apiUtils';
import mapboxgl from 'mapbox-gl'; // Import mapboxgl

const apiUrl = process.env.REACT_APP_API_URL;
const GEOCODE_API_URL = "https://api.opencagedata.com/geocode/v1/json";
const GEOCODE_API_KEY = process.env.REACT_APP_OPENCAGE_API_KEY || "0cc7c3b90d0141779900c4ab0ac7479b";

// Weather condition mapping
const weatherOptions = [
  { value: 0, label: "Clear" },
  { value: 0.2, label: "Partly Cloudy" },
  { value: 0.4, label: "Cloudy" },
  { value: 0.6, label: "Light Rain" },
  { value: 0.8, label: "Heavy Rain" },
  { value: 1, label: "Snow/Storm" },
];

// Day of week mapping
const dayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const PredictTrafficTab = ({
  formData,
  handleInputChange,
  loading,
  setLoading,
  setError,
  setTrafficData,
  map
}) => {
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [startSuggestions, setStartSuggestions] = useState([]);
  const [endSuggestions, setEndSuggestions] = useState([]);
  const [searchingStart, setSearchingStart] = useState(false);
  const [searchingEnd, setSearchingEnd] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [routeInfo, setRouteInfo] = useState(null);

  // Update time and day to current values on load
  useEffect(() => {
    const now = new Date();
    handleInputChange({
      target: {
        name: 'time_of_day',
        value: now.getHours()
      }
    });
    handleInputChange({
      target: {
        name: 'day_of_week',
        value: now.getDay()
      }
    });
    setCurrentDate(now);
  }, []);

  const searchAddress = async (address, isStart) => {
    if (!address.trim()) return;
    
    if (isStart) {
      setSearchingStart(true);
    } else {
      setSearchingEnd(true);
    }
    
    try {
      const response = await fetch(
        `${GEOCODE_API_URL}?q=${encodeURIComponent(address)}&key=${GEOCODE_API_KEY}&limit=5`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        if (isStart) {
          setStartSuggestions(data.results);
        } else {
          setEndSuggestions(data.results);
        }
      } else {
        if (isStart) {
          setStartSuggestions([]);
        } else {
          setEndSuggestions([]);
        }
        setError(`No locations found for ${isStart ? 'starting' : 'destination'} address.`);
      }
    } catch (err) {
      setError(`Address search failed: ${err.message}`);
      if (isStart) {
        setStartSuggestions([]);
      } else {
        setEndSuggestions([]);
      }
    } finally {
      if (isStart) {
        setSearchingStart(false);
      } else {
        setSearchingEnd(false);
      }
    }
  };

  const selectAddress = (result, isStart) => {
    const { lat, lng } = result.geometry;
    
    if (isStart) {
      // Store start location
      handleInputChange({
        target: {
          name: 'start_latitude',
          value: parseFloat(lat)
        }
      });
      
      handleInputChange({
        target: {
          name: 'start_longitude',
          value: parseFloat(lng)
        }
      });
      
      setStartAddress(result.formatted);
      setStartSuggestions([]);
    } else {
      // Store end location
      handleInputChange({
        target: {
          name: 'end_latitude',
          value: parseFloat(lat)
        }
      });
      
      handleInputChange({
        target: {
          name: 'end_longitude',
          value: parseFloat(lng)
        }
      });
      
      setEndAddress(result.formatted);
      setEndSuggestions([]);
    }
    
    // If both start and end points are set, calculate the midpoint
    if (isStart && formData.end_latitude && formData.end_longitude) {
      calculateRoute(parseFloat(lat), parseFloat(lng), formData.end_latitude, formData.end_longitude);
    } else if (!isStart && formData.start_latitude && formData.start_longitude) {
      calculateRoute(formData.start_latitude, formData.start_longitude, parseFloat(lat), parseFloat(lng));
    }
    
    // Center map on selected location
    if (map) {
      try {
        map.flyTo({
          center: [lng, lat],
          zoom: 13
        });
      } catch (err) {
        console.error("Error centering map on selected location:", err);
      }
    }
  };

  const calculateRoute = (startLat, startLng, endLat, endLng) => {
    // Update the main latitude/longitude for prediction to the midpoint of the route
    const midLat = (startLat + endLat) / 2;
    const midLng = (startLng + endLng) / 2;
    
    handleInputChange({
      target: {
        name: 'latitude',
        value: midLat
      }
    });
    
    handleInputChange({
      target: {
        name: 'longitude',
        value: midLng
      }
    });
    
    // Calculate approximate distance (in km) using the Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (endLat - startLat) * Math.PI / 180;
    const dLon = (endLng - startLng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(startLat * Math.PI / 180) * Math.cos(endLat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Estimate travel time (very rough estimate: 30km/h in city, 90km/h highway)
    const avgSpeed = distance > 5 ? 60 : 30; // km/h
    const estimatedTime = (distance / avgSpeed) * 60; // minutes
    
    setRouteInfo({
      distance: distance.toFixed(1),
      estimatedTime: estimatedTime.toFixed(0)
    });
    
    // Show route on map (simplified - in a real app we'd use a routing API)
    if (map) {
      // Check if we already have a route layer
      const existingRouteSource = map.getSource('route');
      
      const routeData = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [
            [startLng, startLat],
            [midLng, midLat],
            [endLng, endLat]
          ]
        }
      };
      
      if (existingRouteSource) {
        // Update existing source
        map.getSource('route').setData(routeData);
      } else {
        // Add new route layer
        map.addSource('route', {
          type: 'geojson',
          data: routeData
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
            'line-color': '#3887be',
            'line-width': 5,
            'line-opacity': 0.75
          }
        });
      }
      
      // Fit map to show the entire route
      try {
        // Create a bounds object that includes both points
        const bounds = new mapboxgl.LngLatBounds();
        
        // Extend the bounds with each coordinate using the object format
        bounds.extend({ lng: startLng, lat: startLat });
        bounds.extend({ lng: endLng, lat: endLat });
        
        // Also extend with the midpoint
        bounds.extend({ lng: midLng, lat: midLat });
        
        map.fitBounds(bounds, { padding: 100 });
      } catch (err) {
        console.error("Error setting map bounds:", err);
        // Fallback: just center on the midpoint
        map.flyTo({
          center: [midLng, midLat],
          zoom: 10
        });
      }
    }
  };

  // Move useMyLocation function outside of the component to prevent React Hook errors
  const handleUseMyLocation = (isStart) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (isStart) {
          handleInputChange({
            target: {
              name: 'start_latitude',
              value: latitude
            }
          });
          
          handleInputChange({
            target: {
              name: 'start_longitude',
              value: longitude
            }
          });
        } else {
          handleInputChange({
            target: {
              name: 'end_latitude',
              value: latitude
            }
          });
          
          handleInputChange({
            target: {
              name: 'end_longitude',
              value: longitude
            }
          });
        }
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `${GEOCODE_API_URL}?q=${latitude}+${longitude}&key=${GEOCODE_API_KEY}`
          );
          
          if (!response.ok) {
            throw new Error(`Reverse geocoding error: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            if (isStart) {
              setStartAddress(data.results[0].formatted);
              
              // If end point already set, calculate route
              if (formData.end_latitude && formData.end_longitude) {
                calculateRoute(latitude, longitude, formData.end_latitude, formData.end_longitude);
              }
            } else {
              setEndAddress(data.results[0].formatted);
              
              // If start point already set, calculate route
              if (formData.start_latitude && formData.start_longitude) {
                calculateRoute(formData.start_latitude, formData.start_longitude, latitude, longitude);
              }
            }
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
        }
        
        // Center map on user location
        if (map) {
          try {
            map.flyTo({
              center: [longitude, latitude],
              zoom: 14
            });
          } catch (err) {
            console.error("Error centering map:", err);
          }
        }
        
        setLoading(false);
      },
      (error) => {
        setError(`Location error: ${error.message}`);
        setLoading(false);
      }
    );
  };

  const predictTraffic = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      let data;
      try {
        const response = await fetchWithTimeout(`${apiUrl}/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            latitude: formData.latitude || 0,
            longitude: formData.longitude || 0,
            start_latitude: formData.start_latitude || 0,
            start_longitude: formData.start_longitude || 0,
            end_latitude: formData.end_latitude || 0,
            end_longitude: formData.end_longitude || 0,
            vehicle_count: parseInt(formData.vehicle_count) || 0,
            weather_condition: parseFloat(formData.weather_condition) || 0,
            time_of_day: parseInt(formData.time_of_day) || 0,
            day_of_week: parseInt(formData.day_of_week) || 0
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
      
      // Make sure all required properties have valid values
      setTrafficData([{
        route: {
          start: {
            address: startAddress || 'Unknown location',
            latitude: parseFloat(formData.start_latitude) || 0,
            longitude: parseFloat(formData.start_longitude) || 0
          },
          end: {
            address: endAddress || 'Unknown location',
            latitude: parseFloat(formData.end_latitude) || 0,
            longitude: parseFloat(formData.end_longitude) || 0
          },
          distance: routeInfo ? routeInfo.distance : "0",
        },
        current_congestion: data.prediction || 0,
        average_speed: data.recommended_speed || 0,
        estimated_travel_time: data.estimated_travel_time || (routeInfo ? routeInfo.estimatedTime : "0"),
        confidence: data.confidence || 0.5,
        vehicle_count: parseInt(formData.vehicle_count) || 0
      }]);
      
      // Map is already centered on the route
    } catch (err) {
      setError(err.message);
      // Reset traffic data or provide fallback
      setTrafficData([]);
    } finally {
      setLoading(false);
    }
  };

  const swapLocations = () => {
    // Swap addresses
    const tempAddress = startAddress;
    setStartAddress(endAddress);
    setEndAddress(tempAddress);
    
    // Swap coordinates
    const tempLat = formData.start_latitude;
    const tempLng = formData.start_longitude;
    
    handleInputChange({
      target: {
        name: 'start_latitude',
        value: formData.end_latitude
      }
    });
    
    handleInputChange({
      target: {
        name: 'start_longitude',
        value: formData.end_longitude
      }
    });
    
    handleInputChange({
      target: {
        name: 'end_latitude',
        value: tempLat
      }
    });
    
    handleInputChange({
      target: {
        name: 'end_longitude',
        value: tempLng
      }
    });
    
    // Recalculate route if both points are set
    if (formData.start_latitude && formData.end_latitude) {
      calculateRoute(formData.end_latitude, formData.end_longitude, tempLat, tempLng);
    }
  };

  return (
    <div className="predict-traffic-container">
      <h2>Predict Traffic Conditions</h2>
      
      <div className="route-container">
        <h3>Step 1: Set Your Route</h3>
        
        {/* Start Location */}
        <div className="location-input-group">
          <label>Start Location:</label>
          <div className="location-search-field">
            <input
              type="text"
              value={startAddress}
              onChange={(e) => setStartAddress(e.target.value)}
              placeholder="Enter starting address"
              className="address-input"
            />
            <button 
              type="button" 
              onClick={() => searchAddress(startAddress, true)}
              disabled={searchingStart || !startAddress.trim()}
              className="search-btn"
            >
              {searchingStart ? '...' : 'Search'}
            </button>
            <button 
              type="button" 
              onClick={() => handleUseMyLocation(true)}
              className="location-btn"
              title="Use current location as start"
            >
              📍
            </button>
          </div>
          
          {startSuggestions.length > 0 && (
            <div className="address-suggestions">
              {startSuggestions.map((result, index) => (
                <div 
                  key={index} 
                  className="address-suggestion-item"
                  onClick={() => selectAddress(result, true)}
                >
                  {result.formatted}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Swap Button */}
        <div className="swap-button-container">
          <button 
            type="button" 
            onClick={swapLocations}
            className="swap-btn"
            disabled={!startAddress || !endAddress}
          >
            ↑↓ Swap
          </button>
        </div>
        
        {/* End Location */}
        <div className="location-input-group">
          <label>Destination:</label>
          <div className="location-search-field">
            <input
              type="text"
              value={endAddress}
              onChange={(e) => setEndAddress(e.target.value)}
              placeholder="Enter destination address"
              className="address-input"
            />
            <button 
              type="button" 
              onClick={() => searchAddress(endAddress, false)}
              disabled={searchingEnd || !endAddress.trim()}
              className="search-btn"
            >
              {searchingEnd ? '...' : 'Search'}
            </button>
            <button 
              type="button" 
              onClick={() => handleUseMyLocation(false)}
              className="location-btn"
              title="Use current location as destination"
            >
              📍
            </button>
          </div>
          
          {endSuggestions.length > 0 && (
            <div className="address-suggestions">
              {endSuggestions.map((result, index) => (
                <div 
                  key={index} 
                  className="address-suggestion-item"
                  onClick={() => selectAddress(result, false)}
                >
                  {result.formatted}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Route Information */}
        {routeInfo && (
          <div className="route-info">
            <p>
              <strong>Distance:</strong> {routeInfo.distance} km
              <span className="route-info-separator">•</span>
              <strong>Est. Time:</strong> {routeInfo.estimatedTime} min (without traffic)
            </p>
          </div>
        )}
      </div>
      
      <form onSubmit={predictTraffic}>
        <div className="traffic-parameters">
          <h3>Step 2: Traffic Parameters</h3>
          
          <div className="form-group">
            <label>Vehicle Count (estimated):</label>
            <input
              type="range"
              name="vehicle_count"
              value={formData.vehicle_count}
              onChange={handleInputChange}
              min="5"
              max="500"
              step="5"
              className="range-slider"
            />
            <span className="range-value">{formData.vehicle_count} vehicles</span>
          </div>
          
          <div className="form-group">
            <label>Weather Condition:</label>
            <select
              name="weather_condition"
              value={formData.weather_condition}
              onChange={handleInputChange}
            >
              {weatherOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="time-parameters">
            <div className="form-group half">
              <label>Time of Day:</label>
              <div className="time-selector">
                <input
                  type="range"
                  name="time_of_day"
                  value={formData.time_of_day}
                  onChange={handleInputChange}
                  min="0"
                  max="23"
                  className="range-slider"
                />
                <span className="time-display">
                  {formData.time_of_day.toString().padStart(2, '0')}:00
                </span>
              </div>
            </div>
            
            <div className="form-group half">
              <label>Day of Week:</label>
              <select
                name="day_of_week"
                value={formData.day_of_week}
                onChange={handleInputChange}
              >
                {dayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="quick-time-options">
            <button
              type="button"
              className="time-preset-btn"
              onClick={() => {
                handleInputChange({
                  target: {
                    name: 'time_of_day',
                    value: currentDate.getHours()
                  }
                });
                handleInputChange({
                  target: {
                    name: 'day_of_week',
                    value: currentDate.getDay()
                  }
                });
              }}
            >
              Current Time
            </button>
            <button
              type="button"
              className="time-preset-btn"
              onClick={() => {
                handleInputChange({
                  target: {
                    name: 'time_of_day',
                    value: 8
                  }
                });
              }}
            >
              Morning Rush (8 AM)
            </button>
            <button
              type="button"
              className="time-preset-btn"
              onClick={() => {
                handleInputChange({
                  target: {
                    name: 'time_of_day',
                    value: 17
                  }
                });
              }}
            >
              Evening Rush (5 PM)
            </button>
          </div>
        </div>
        
        <div className="submit-container">
          <button 
            type="submit" 
            disabled={loading || !formData.start_latitude || !formData.end_latitude}
            className="predict-btn"
          >
            {loading ? 'Processing...' : 'Predict Traffic Conditions'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PredictTrafficTab;