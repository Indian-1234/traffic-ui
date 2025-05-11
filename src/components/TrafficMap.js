import React, { useEffect, useState, useRef } from 'react';
import tt from '@tomtom-international/web-sdk-maps';
import '@tomtom-international/web-sdk-maps/dist/maps.css';
import '../components/traffic/TrafficMap.css';
import { Menu, Bell, User, Settings, HelpCircle } from 'lucide-react';

// Import Tab Components
import PredictTrafficTab from './tabs/PredictTrafficTab';
import OptimizeRouteTab from './tabs/OptimizeRouteTab';
import LiveTrafficTab from './tabs/LiveTrafficTab';
import TrafficSummaryTab from './tabs/TrafficSummaryTab';
import ResultsDisplay from './ResultsDisplay';
import { updateMapMarkers } from './map/MapMarkers';

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

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setTrafficData([]);       // Clear traffic results
    setError(null);           // Clear any existing errors
    setLoading(false);        // Reset loading state
  };

  // Update map markers when traffic data changes
  useEffect(() => {
    if (!map || !trafficData.length) return;
    updateMapMarkers(map, trafficData);
  }, [map, trafficData]);

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

  const renderTabContent = () => {
    const tabProps = {
      formData: formData,
      handleInputChange: handleInputChange,
      loading: loading,
      setLoading: setLoading,
      setError: setError,
      setTrafficData: setTrafficData,
      map: map
    };

    switch (activeTab) {
      case 'predict':
        return <PredictTrafficTab {...tabProps} />;
      case 'optimize':
        return <OptimizeRouteTab {...tabProps} />;
      case 'live':
        return <LiveTrafficTab {...tabProps} />;
      case 'summary':
        return <TrafficSummaryTab {...tabProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="traffic-map-container">
      <div className="bg-blue-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              // onClick={toggleSidebar}
              className="p-2 rounded-full hover:bg-blue-600 transition-colors"
            >
              <Menu size={20} />
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 rounded-full hover:bg-blue-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-xs flex items-center justify-center">3</span>
            </button>
            <button className="p-2 rounded-full hover:bg-blue-600 transition-colors">
              <Settings size={20} />
            </button>
            <button className="p-2 rounded-full hover:bg-blue-600 transition-colors">
              <HelpCircle size={20} />
            </button>
            <div className="flex items-center space-x-2 border-l pl-4 border-blue-600">
              <div className="bg-blue-800 rounded-full p-1">
                <User size={20} />
              </div>
              <span className="text-sm font-medium">Admin</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* {apiKeyError && (
        <div className="api-key-error">
          <p>There was an error initializing the map. Please check your TomTom API key or internet connection.</p>
          <p>The application will continue to function with limited features.</p>
        </div>
      )} */}
      
      <div className="app-layout">
        <div className="map-container" ref={mapElement}></div>
        
        <div className="controls-container">
          <div className="tab-bar">
            <button 
              className={activeTab === 'predict' ? 'active' : ''}
              onClick={() => handleTabChange('predict')}
            >
              Predict Traffic
            </button>
            <button 
              className={activeTab === 'optimize' ? 'active' : ''}
              onClick={() => handleTabChange('optimize')} 
            >
              Optimize Route
            </button>
            <button 
              className={activeTab === 'live' ? 'active' : ''}
              onClick={() => handleTabChange('live')}
            >
              Live Traffic
            </button>
            <button 
              className={activeTab === 'summary' ? 'active' : ''}
              onClick={() => handleTabChange('summary')}
            >
              Traffic Summary
            </button>
          </div>
          
          <div className="tab-content">
            {renderTabContent()}
          </div>
          
          <ResultsDisplay 
            loading={loading}
            error={error}
            trafficData={trafficData}
            activeTab={activeTab}
          />
        </div>
      </div>
    </div>
  );
};

export default TrafficMap;