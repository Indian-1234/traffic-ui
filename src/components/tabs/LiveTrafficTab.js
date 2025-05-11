import React, { useState, useEffect, useCallback } from 'react';
import { fetchWithTimeout, mockApiResponse } from '../../utils/apiUtils';
import { MapPin, Compass, Search, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';

const GEOCODE_API_URL = "https://api.opencagedata.com/geocode/v1/json";
const GEOCODE_API_KEY = process.env.REACT_APP_OPENCAGE_API_KEY || "0cc7c3b90d0141779900c4ab0ac7479b";

const LiveTrafficTab = ({
  formData,
  handleInputChange,
  loading,
  setLoading,
  setError,
  setTrafficData,
  map
}) => {
  const [permissionMode, setPermissionMode] = useState(null);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(true);
  const [geocodeSearch, setGeocodeSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [trafficSummary, setTrafficSummary] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
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

  const searchLocation = useCallback(async () => {
    if (!geocodeSearch.trim()) return;
    
    setSearchLoading(true);
    setShowSearchResults(true);

    try {
      const response = await fetch(
        `${GEOCODE_API_URL}?q=${encodeURIComponent(geocodeSearch)}&key=${GEOCODE_API_KEY}&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding failed');
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
        setError('No locations found');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setError('Failed to search location. Please try again.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [geocodeSearch, setError]);

  const selectSearchResult = (result) => {
    const { lat, lng } = result.geometry;
    const locationName = result.formatted.split(',')[0];
    
    handleInputChange({
      target: { name: 'latitude', value: lat }
    });
    handleInputChange({
      target: { name: 'longitude', value: lng }
    });
    handleInputChange({
      target: { name: 'area', value: locationName.toLowerCase() }
    });
    
    setShowSearchResults(false);
    setGeocodeSearch('');
    
    // Center map on selected location
    if (map) {
      map.setCenter([lng, lat]);
      map.setZoom(13);
    }
  };

  const requestLocationPermission = async () => {
    try {
      setLoading(true);
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });
      
      // Auto-fill the form with current location
      handleInputChange({
        target: { name: 'latitude', value: position.coords.latitude }
      });
      handleInputChange({
        target: { name: 'longitude', value: position.coords.longitude }
      });
      
      // Reverse geocode to get location name
      try {
        const response = await fetch(
          `${GEOCODE_API_URL}?q=${position.coords.latitude}+${position.coords.longitude}&key=${GEOCODE_API_KEY}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            const locationName = data.results[0].components.suburb || 
                               data.results[0].components.neighbourhood || 
                               data.results[0].components.town || 
                               'current location';
            
            handleInputChange({
              target: { name: 'area', value: locationName.toLowerCase() }
            });
          }
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error);
      }
      
      setShowPermissionPrompt(false);
      setPermissionMode('auto');
      
      // Center map on current location
      if (map) {
        map.setCenter([position.coords.longitude, position.coords.latitude]);
        map.setZoom(13);
      }
      
      // Automatically fetch traffic data after getting location
      getLiveTrafficData(null, true);
    } catch (error) {
      console.error('Location permission error:', error);
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
      // Retrieve token
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error("No authentication token found");
  
      // Build API URL
      const apiUrl = `${process.env.REACT_APP_API_URL}/live-data?area=${formData.area}&radius=${formData.radius}&lat=${formData.latitude}&lon=${formData.longitude}`;
  
      let data;
      try {
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
      
      setTrafficData(data);
      
      // Center map on requested location
      if (map) {
        map.setCenter([formData.longitude, formData.latitude]);
        map.setZoom(13);
      }
      
      // Generate traffic summary
      generateTrafficSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateTrafficSummary = (data) => {
    if (!data || data.length === 0) return;
    
    const totalNodes = data.length;
    let totalCongestion = 0;
    let totalVehicles = 0;
    let congestionLevels = {
      high: 0,
      medium: 0,
      low: 0
    };
    
    data.forEach(node => {
      totalCongestion += node.current_congestion;
      totalVehicles += node.vehicle_count;
      
      if (node.current_congestion > 0.7) {
        congestionLevels.high++;
      } else if (node.current_congestion > 0.4) {
        congestionLevels.medium++;
      } else {
        congestionLevels.low++;
      }
    });
    
    const avgCongestion = totalCongestion / totalNodes;
    
    setTrafficSummary({
      avgCongestion,
      totalVehicles,
      congestionLevels
    });
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
    
    // Center map on Chennai
    if (map) {
      map.setCenter([chennaiDefaults.longitude, chennaiDefaults.latitude]);
      map.setZoom(13);
    }
  };
  
  const getCongestionColor = (level) => {
    if (level > 0.7) return 'bg-red-500';
    if (level > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getCongestionText = (level) => {
    if (level > 0.7) return 'Heavy';
    if (level > 0.4) return 'Moderate';
    return 'Light';
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // Helper to render form inputs
  const renderFormInputs = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
          <div className="relative">
            <select 
              name="area" 
              value={formData.area} 
              onChange={handleInputChange}
              className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="sholinganallur">Sholinganallur</option>
              <option value="omr">OMR</option>
              <option value="adyar">Adyar</option>
              <option value="tambaram">Tambaram</option>
              <option value="tNagar">T Nagar</option>
              <option value="annaUniversity">Anna University</option>
              <option value="airport">Airport</option>
              <option value="guindy">Guindy</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </div>
          </div>
        </div>
        <div className="w-full md:w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
          <input
            type="number"
            name="radius"
            value={formData.radius}
            onChange={handleInputChange}
            min="0.5"
            max="10"
            step="0.5"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">Search Location</label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={geocodeSearch}
            onChange={(e) => setGeocodeSearch(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
            placeholder="Enter a location name..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          <Search className="absolute left-3 h-4 w-4 text-gray-400" />
          <button 
            type="button"
            onClick={searchLocation}
            disabled={searchLoading}
            className="absolute right-2 p-1 text-blue-500 hover:text-blue-700 focus:outline-none"
          >
            {searchLoading ? 
              <RefreshCw className="h-4 w-4 animate-spin" /> : 
              <Compass className="h-4 w-4" />
            }
          </button>
        </div>
        
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-y-auto">
            {searchResults.map((result, index) => (
              <div
                key={index}
                onClick={() => selectSearchResult(result)}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
              >
                {result.formatted}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
          <input
            type="number"
            name="latitude"
            value={formData.latitude}
            onChange={handleInputChange}
            step="0.0001"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div className="w-full md:w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
          <input
            type="number"
            name="longitude"
            value={formData.longitude}
            onChange={handleInputChange}
            step="0.0001"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        <button 
          type="submit" 
          disabled={loading} 
          className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              Get Live Traffic
            </>
          )}
        </button>
        
        <button 
          type="button" 
          onClick={resetToChennaiDefaults} 
          className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <MapPin className="h-4 w-4 mr-2" />
          Reset to Chennai
        </button>
        
        {permissionMode === 'auto' && (
          <button 
            type="button" 
            onClick={chooseManualEntry} 
            className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Compass className="h-4 w-4 mr-2" />
            Manual Entry
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {showPermissionPrompt ? (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Location Permission</h3>
          <p className="text-sm text-gray-600 mb-4">Would you like to use your current location or Chennai defaults?</p>
          <div className="flex flex-wrap gap-2">
            <button 
              type="button" 
              onClick={requestLocationPermission}
              disabled={loading}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Getting Location...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4 mr-2" />
                  Use My Location
                </>
              )}
            </button>
            <button 
              type="button" 
              onClick={chooseManualEntry}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Compass className="h-4 w-4 mr-2" />
              Use Chennai Defaults
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={getLiveTrafficData} className="bg-white p-4 rounded-lg shadow-md">
          {renderFormInputs()}
        </form>
      )}

      {trafficSummary && (
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-900">Traffic Summary</h3>
            <button 
              onClick={toggleDropdown}
              className="text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <ChevronDown className={`h-5 w-5 transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {showDropdown && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Average Congestion:</span>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full mr-2 ${getCongestionColor(trafficSummary.avgCongestion)}`}></div>
                  <span className="text-sm font-medium">
                    {getCongestionText(trafficSummary.avgCongestion)} 
                    ({Math.round(trafficSummary.avgCongestion * 100)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Total Vehicles:</span>
                <span className="text-sm font-medium">{trafficSummary.totalVehicles}</span>
              </div>
              
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="flex h-2.5 rounded-full">
                    <div 
                      className="bg-red-500 h-2.5 rounded-l-full" 
                      style={{ width: `${(trafficSummary.congestionLevels.high / 10) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-yellow-500 h-2.5" 
                      style={{ width: `${(trafficSummary.congestionLevels.medium / 10) * 100}%` }}
                    ></div>
                    <div 
                      className="bg-green-500 h-2.5 rounded-r-full" 
                      style={{ width: `${(trafficSummary.congestionLevels.low / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-red-500">{trafficSummary.congestionLevels.high} heavy</span>
                  <span className="text-yellow-500">{trafficSummary.congestionLevels.medium} moderate</span>
                  <span className="text-green-500">{trafficSummary.congestionLevels.low} light</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {loading && !trafficSummary && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm">
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 text-blue-500 mr-3 animate-spin" />
            <p className="text-sm text-blue-700">Fetching live traffic data...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTrafficTab;