import React, { useState } from 'react';
import { fetchWithTimeout, mockApiResponse } from '../../utils/apiUtils';

const TrafficSummaryTab = ({
  formData,
  handleInputChange,
  loading,
  setLoading,
  setError,
  setTrafficData
}) => {
  const [refreshInterval, setRefreshInterval] = useState(0); // 0 means no auto-refresh
  const [summaryData, setSummaryData] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const apiUrl = `${process.env.REACT_APP_API_URL}/traffic-summary`;
  
  // Set up auto-refresh
  React.useEffect(() => {
    let intervalId = null;
    
    if (refreshInterval > 0) {
      intervalId = setInterval(() => {
        getTrafficSummary(null, true);
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [refreshInterval]);

  const getTrafficSummary = async (e, isAutoRefresh = false) => {
    if (e) e.preventDefault();
    if (!isAutoRefresh) setLoading(true);
    setError(null);

    try {
      // Get Bearer token from localStorage
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error("No authentication token found");
      
      let data;
      try {
        // Make authenticated API call
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
        console.warn("Using mock data for traffic summary", err);
        data = mockApiResponse('traffic-summary');
      }
      
      // Store full summary data
      setSummaryData(data);
      
      // Display summary info (not markers)
      setTrafficData([{
        location: {
          latitude: formData.latitude,
          longitude: formData.longitude
        },
        current_congestion: data.average_congestion,
        average_speed: data.average_speed,
        total_vehicles_estimated: data.total_vehicles_estimated,
        network_status: data.network_status,
        timestamp: data.timestamp,
        congestion_hotspots: data.congestion_hotspots,
        network_density: data.network_density,
        spectral_radius: data.spectral_radius
      }]);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!isAutoRefresh) setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'clear': return 'bg-green-100 text-green-800';
      case 'normal': return 'bg-yellow-100 text-yellow-800';
      case 'congested': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCongestionColor = (value) => {
    if (value < 0.3) return 'text-green-500';
    if (value < 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Traffic Network Summary</h2>
        <p className="text-gray-600 mb-4">
          Get a comprehensive overview of current traffic conditions across the entire network.
        </p>
        
        <form onSubmit={getTrafficSummary} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Map Center (Latitude)
              </label>
              <input
                type="number"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.0001"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Map Center (Longitude)
              </label>
              <input
                type="number"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.0001"
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </button>
            <div className="space-x-4">
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="0">No Auto-Refresh</option>
                <option value="10">Refresh every 10s</option>
                <option value="30">Refresh every 30s</option>
                <option value="60">Refresh every 1m</option>
                <option value="300">Refresh every 5m</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Get Traffic Summary'}
              </button>
            </div>
          </div>
          
          {showAdvanced && (
            <div className="p-4 border border-gray-200 rounded-md bg-gray-50 mt-4">
              <h3 className="font-medium text-sm mb-2">Advanced Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Type
                  </label>
                  <select
                    name="area"
                    value={formData.area}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="downtown">Downtown</option>
                    <option value="suburban">Suburban</option>
                    <option value="residential">Residential</option>
                    <option value="industrial">Industrial</option>
                    <option value="highway">Highway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weather Condition (0-1)
                  </label>
                  <input
                    type="range"
                    name="weather_condition"
                    min="0"
                    max="1"
                    step="0.1"
                    value={formData.weather_condition}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Clear (0)</span>
                    <span>Severe (1)</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {summaryData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Network Status</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(summaryData.network_status)}`}>
              {summaryData.network_status.toUpperCase()}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500">Average Congestion</p>
              <p className={`text-2xl font-bold ${getCongestionColor(summaryData.average_congestion)}`}>
                {(summaryData.average_congestion * 100).toFixed(1)}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500">Average Speed</p>
              <p className="text-2xl font-bold">
                {summaryData.average_speed.toFixed(1)} mph
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500">Total Vehicles</p>
              <p className="text-2xl font-bold">
                {summaryData.total_vehicles_estimated.toLocaleString()}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-500">Congestion Hotspots</p>
              <p className="text-2xl font-bold">
                {summaryData.congestion_hotspots}
              </p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Technical Network Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Network Density</p>
                <p className="text-lg font-medium">{summaryData.network_density.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Spectral Radius</p>
                <p className="text-lg font-medium">{summaryData.spectral_radius.toFixed(4)}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            Last updated: {new Date(summaryData.timestamp).toLocaleString()}
            {refreshInterval > 0 && (
              <span> · Auto-refreshing every {refreshInterval} seconds</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrafficSummaryTab;