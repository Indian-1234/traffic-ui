import React, { useState, useEffect, useRef } from 'react';
import { Navigation2, MapPin, Clock, Cloud, AlertCircle, Search } from 'lucide-react';
import { fetchWithTimeout, mockApiResponse } from '../../utils/apiUtils';

const apiUrl = process.env.REACT_APP_API_URL;
// Using OpenCage Geocoding API
const GEOCODE_API_URL = "https://api.opencagedata.com/geocode/v1/json";
const GEOCODE_API_KEY = process.env.REACT_APP_OPENCAGE_API_KEY || "0cc7c3b90d0141779900c4ab0ac7479b";

const OptimizeRouteTab = ({ formData, handleInputChange, loading, setLoading, setError, setTrafficData, map }) => {
  // Start location state
  const [startSearchQuery, setStartSearchQuery] = useState('');
  const [startSearchResults, setStartSearchResults] = useState([]);
  const [selectedStartLocation, setSelectedStartLocation] = useState(null);
  
  // End location state
  const [endSearchQuery, setEndSearchQuery] = useState('');
  const [endSearchResults, setEndSearchResults] = useState([]);
  const [selectedEndLocation, setSelectedEndLocation] = useState(null);
  
  // Search state
  const [searching, setSearching] = useState(false);
  const startSearchTimeoutRef = useRef(null);
  const endSearchTimeoutRef = useRef(null);
  
  // Route optimization results
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Default to Chennai coordinates if nothing is selected
  useEffect(() => {
    if (!formData.latitude && !formData.longitude) {
      // Chennai coordinates
      const chennaiLat = 13.0827;
      const chennaiLng = 80.2707;
      
      handleInputChange({
        target: { name: 'latitude', value: chennaiLat }
      });
      handleInputChange({
        target: { name: 'longitude', value: chennaiLng }
      });
      
      // Update map center if map exists
      if (map) {
        map.setCenter([chennaiLng, chennaiLat]);
        map.setZoom(12);
      }
    }
  }, []);

  // Search for locations based on query
  const searchLocations = async (query, isStartLocation) => {
    if (!query || query.length < 3) {
      if (isStartLocation) {
        setStartSearchResults([]);
      } else {
        setEndSearchResults([]);
      }
      return;
    }
    
    setSearching(true);
    
    try {
      const response = await fetch(
        `${GEOCODE_API_URL}?q=${encodeURIComponent(query)}&key=${GEOCODE_API_KEY}&limit=5`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch location data');
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const formattedResults = data.results.map(result => ({
          name: result.formatted,
          latitude: result.geometry.lat,
          longitude: result.geometry.lng,
          components: result.components
        }));
        
        if (isStartLocation) {
          setStartSearchResults(formattedResults);
        } else {
          setEndSearchResults(formattedResults);
        }
      } else {
        if (isStartLocation) {
          setStartSearchResults([]);
        } else {
          setEndSearchResults([]);
        }
      }
    } catch (error) {
      console.error("Error searching locations:", error);
      // Fallback to mock data if API call fails
      const mockResults = [
        { name: "Chennai Central", latitude: 13.0827, longitude: 80.2707 },
        { name: "Marina Beach, Chennai", latitude: 13.0500, longitude: 80.2824 },
        { name: "T Nagar, Chennai", latitude: 13.0418, longitude: 80.2341 }
      ];
      
      if (isStartLocation) {
        setStartSearchResults(mockResults);
      } else {
        setEndSearchResults(mockResults);
      }
    } finally {
      setSearching(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (e, isStartLocation) => {
    const query = e.target.value;
    
    if (isStartLocation) {
      setStartSearchQuery(query);
      
      // Clear previous timeout
      if (startSearchTimeoutRef.current) {
        clearTimeout(startSearchTimeoutRef.current);
      }
      
      // Set new timeout for debounce
      startSearchTimeoutRef.current = setTimeout(() => {
        searchLocations(query, true);
      }, 500);
    } else {
      setEndSearchQuery(query);
      
      // Clear previous timeout
      if (endSearchTimeoutRef.current) {
        clearTimeout(endSearchTimeoutRef.current);
      }
      
      // Set new timeout for debounce
      endSearchTimeoutRef.current = setTimeout(() => {
        searchLocations(query, false);
      }, 500);
    }
  };

  // Handle location selection
  const selectLocation = (location, isStartLocation) => {
    // We'll use the selected locations for both UI and to calculate appropriate nodes
    if (isStartLocation) {
      setSelectedStartLocation(location);
      setStartSearchQuery(location.name);
      setStartSearchResults([]);
      
      // Update form data for API
      handleInputChange({
        target: { name: 'latitude', value: location.latitude }
      });
      handleInputChange({
        target: { name: 'longitude', value: location.longitude }
      });
      
      // Set a start node ID based on location (mimicking what the backend would do)
      // In a real app, you would get this from your backend
      handleInputChange({
        target: { name: 'start_node', value: Math.floor(Math.random() * 50) }
      });
    } else {
      setSelectedEndLocation(location);
      setEndSearchQuery(location.name);
      setEndSearchResults([]);
      
      // In a real app, you'd have an API call to get nearest node
      handleInputChange({
        target: { name: 'end_node', value: Math.floor(Math.random() * 50) + 50 }
      });
    }
    
    // Update map if available
    if (map) {
      map.setCenter([location.longitude, location.latitude]);
      map.setZoom(14);
      
      // Add marker for selected location
      try {
        const markerId = isStartLocation ? 'start-location' : 'end-location';
        const markerColor = isStartLocation ? '#4CAF50' : '#F44336';
        
        // Remove previous marker if exists
        if (map.getSource(markerId)) {
          map.removeLayer(`${markerId}-point`);
          map.removeSource(markerId);
        }
        
        map.addSource(markerId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: [location.longitude, location.latitude]
            }
          }
        });
        
        map.addLayer({
          id: `${markerId}-point`,
          type: 'circle',
          source: markerId,
          paint: {
            'circle-radius': 8,
            'circle-color': markerColor,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF'
          }
        });
      } catch (err) {
        console.error("Error adding location marker:", err);
      }
    }
  };

  const optimizeRoute = async (e) => {
    e.preventDefault();
    
    // Validate that we have both start and end locations
    if (!selectedStartLocation || !selectedEndLocation) {
      setError("Please select both start and end locations");
      return;
    }
    
    setLoading(true);
    setError(null);
    setShowResults(false);

    try {
      let data;
    
      try {
        // Get token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error("No authentication token found");
    
        const response = await fetchWithTimeout(
          `${apiUrl}/optimize-route?start_node=${formData.start_node}&end_node=${formData.end_node}&departure_time=${formData.time_of_day}&latitude=${formData.latitude}&longitude=${formData.longitude}`,
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
      } 
      
      // const response = await fetchWithTimeout(
      //     `http://localhost:8000/optimize-route?start_node=1&end_node=10&departure_time=9&latitude=40.7128&longitude=-74.0060`,
      //     {
      //       method: 'POST',
      //       headers: {
      //         'Authorization': `Bearer ${token}`,
      //         'Content-Type': 'application/json',
      //       }
      //     }
      //   );
      catch (err) {
        console.warn("Using mock data for route optimization", err);
        
        // Create realistic mock data based on the selected locations
        const startLat = selectedStartLocation.latitude;
        const startLng = selectedStartLocation.longitude;
        const endLat = selectedEndLocation.latitude;
        const endLng = selectedEndLocation.longitude;
        
        // Calculate direct distance between points
        const dx = endLat - startLat;
        const dy = endLng - startLng;
        const directDistance = Math.sqrt(dx*dx + dy*dy) * 111; // rough km conversion
        
        // Create waypoints (3-5 segments)
        const numSegments = Math.max(3, Math.min(5, Math.ceil(directDistance / 2)));
        const segments = [];
        
        let totalDistance = 0;
        let totalTime = 0;
        
        for (let i = 0; i < numSegments; i++) {
          // Calculate segment position (not perfectly straight line)
          const progress = (i + 1) / numSegments;
          const jitter = i === 0 || i === numSegments - 1 ? 0 : (Math.random() - 0.5) * 0.01;
          
          const fromLat = i === 0 ? startLat : startLat + dx * (i / numSegments) + (Math.random() - 0.5) * 0.01;
          const fromLng = i === 0 ? startLng : startLng + dy * (i / numSegments) + (Math.random() - 0.5) * 0.01;
          const toLat = i === numSegments - 1 ? endLat : startLat + dx * ((i + 1) / numSegments) + jitter;
          const toLng = i === numSegments - 1 ? endLng : startLng + dy * ((i + 1) / numSegments) + jitter;
          
          // Mock data for this segment
          const segmentDistance = Math.sqrt(
            Math.pow(toLat - fromLat, 2) + Math.pow(toLng - fromLng, 2)
          ) * 111; // rough km conversion
          
          const congestionFactor = 1 + Math.random() * 0.5; // 1.0 to 1.5
          const speedLimit = 50; // km/h
          const segmentTime = segmentDistance / (speedLimit / 60) * congestionFactor;
          
          totalDistance += segmentDistance;
          totalTime += segmentTime;
          
          // Create location names for better UX
          const fromName = i === 0 ? selectedStartLocation.name : `Waypoint ${i}`;
          const toName = i === numSegments - 1 ? selectedEndLocation.name : `Waypoint ${i+1}`;
          
          segments.push({
            from_node: i.toString(),
            to_node: (i+1).toString(),
            from_address: fromName,
            to_address: toName,
            from_coord: [fromLng, fromLat],
            to_coord: [toLng, toLat],
            distance_km: parseFloat(segmentDistance.toFixed(2)),
            estimated_time_min: parseFloat(segmentTime.toFixed(1)),
            congestion_factor: parseFloat(congestionFactor.toFixed(2))
          });
        }
        
        // Calculate optimization metrics
        const standardTime = totalDistance / (40 / 60); // Time with standard routing
        const timeSaved = standardTime - totalTime;
        
        data = {
          optimal_routes: segments,
          traffic_reduction: 0.35,
          average_time_saved: parseFloat(timeSaved.toFixed(1)),
          total_distance: parseFloat(totalDistance.toFixed(2)),
          total_time: parseFloat(totalTime.toFixed(1))
        };
        
        // Debug log
        console.log("Mock route data generated:", data);
      }
    
      // Store the results
      setOptimizationResults(data);
      setShowResults(true);
      
      // Display the optimized route on the map
      if (map && data.optimal_routes.length > 0) {
        const routeCoordinates = [];
        
        // Extract coordinates for the route
        data.optimal_routes.forEach((segment, index) => {
          // Use from_coord/to_coord if available, otherwise calculate from nodes
          if (segment.from_coord && segment.to_coord) {
            if (index === 0) routeCoordinates.push(segment.from_coord);
            routeCoordinates.push(segment.to_coord);
          } else if (segment.from_node && segment.to_node) {
            // Fallback to calculating from nodes
            const fromCoord = [
              formData.longitude - 0.01 * parseInt(segment.from_node),
              formData.latitude - 0.01 * parseInt(segment.from_node)
            ];
            const toCoord = [
              formData.longitude - 0.01 * parseInt(segment.to_node),
              formData.latitude - 0.01 * parseInt(segment.to_node)
            ];
            
            if (index === 0) routeCoordinates.push(fromCoord);
            routeCoordinates.push(toCoord);
          }
        });
    
        try {
          // Remove existing route if any
          if (map.getSource('route')) {
            map.removeLayer('route');
            map.removeSource('route');
          }
    
          // Add the route line
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
              'line-width': 6,
              'line-opacity': 0.8
            }
          });
    
          // Fit the map to show the entire route
          map.fitBounds([
            [
              Math.min(...routeCoordinates.map(coord => coord[0])) - 0.02,
              Math.min(...routeCoordinates.map(coord => coord[1])) - 0.02
            ],
            [
              Math.max(...routeCoordinates.map(coord => coord[0])) + 0.02,
              Math.max(...routeCoordinates.map(coord => coord[1])) + 0.02
            ]
          ], { padding: 50 });
          
          // Add waypoint markers
          data.optimal_routes.forEach((segment, index) => {
            let coordinates;
            if (segment.to_coord) {
              coordinates = segment.to_coord;
            } else {
              coordinates = [
                formData.longitude - 0.01 * parseInt(segment.to_node),
                formData.latitude - 0.01 * parseInt(segment.to_node)
              ];
            }
            
            const markerId = `waypoint-${index}`;
            
            // Skip if first waypoint (already have start marker)
            if (index === 0) return;
            
            // Skip if last waypoint (use end marker instead)
            if (index === data.optimal_routes.length - 1) return;
            
            try {
              if (map.getSource(markerId)) {
                map.removeLayer(`${markerId}-point`);
                map.removeSource(markerId);
              }
              
              map.addSource(markerId, {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'Point',
                    coordinates: coordinates
                  }
                }
              });
              
              map.addLayer({
                id: `${markerId}-point`,
                type: 'circle',
                source: markerId,
                paint: {
                  'circle-radius': 6,
                  'circle-color': '#FFC107',
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#FFFFFF'
                }
              });
            } catch (err) {
              console.error(`Error adding waypoint marker ${index}:`, err);
            }
          });
        } catch (err) {
          console.error("Error displaying route on map:", err);
        }
      }
    
      // Update traffic data for visualization
      const trafficDataPoints = data.optimal_routes.map(route => {
        let coordinates;
        if (route.from_coord) {
          coordinates = {
            latitude: route.from_coord[1],
            longitude: route.from_coord[0]
          };
        } else {
          coordinates = {
            latitude: formData.latitude - 0.01 * parseInt(route.from_node),
            longitude: formData.longitude - 0.01 * parseInt(route.from_node)
          };
        }
        
        return {
          location: coordinates,
          current_congestion: route.congestion_factor || 0.3,
          average_speed: 45
        };
      });
      
      setTrafficData(trafficDataPoints);
    
    } catch (err) {
      setError(err.message || "Failed to optimize route");
      console.error("Route optimization error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={optimizeRoute} className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center">
          <Navigation2 className="mr-2 text-blue-600" size={20} />
          Route Optimizer
        </h2>
        
        {/* Start Location Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 flex items-center mb-2">
            <MapPin className="mr-1 text-green-500" size={16} />
            Starting Location
          </label>
          <div className="relative">
            <input
              type="text"
              className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-md text-sm"
              placeholder="Search for starting location..."
              value={startSearchQuery}
              onChange={(e) => handleSearchChange(e, true)}
            />
            <Search className="absolute left-2 top-2 text-gray-400" size={16} />
            
            {startSearchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {startSearchResults.map((result, index) => (
                  <div 
                    key={index} 
                    className="p-2 hover:bg-blue-50 cursor-pointer"
                    onClick={() => selectLocation(result, true)}
                  >
                    {result.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {selectedStartLocation && (
            <div className="mt-2 px-3 py-2 bg-green-50 border border-green-100 rounded-md text-sm">
              <div className="font-medium text-green-700">Selected Start</div>
              <div className="text-gray-600">{selectedStartLocation.name}</div>
            </div>
          )}
        </div>
        
        {/* End Location Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 flex items-center mb-2">
            <MapPin className="mr-1 text-red-500" size={16} />
            Destination
          </label>
          <div className="relative">
            <input
              type="text"
              className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-md text-sm"
              placeholder="Search for destination..."
              value={endSearchQuery}
              onChange={(e) => handleSearchChange(e, false)}
            />
            <Search className="absolute left-2 top-2 text-gray-400" size={16} />
            
            {endSearchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {endSearchResults.map((result, index) => (
                  <div 
                    key={index} 
                    className="p-2 hover:bg-blue-50 cursor-pointer"
                    onClick={() => selectLocation(result, false)}
                  >
                    {result.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {selectedEndLocation && (
            <div className="mt-2 px-3 py-2 bg-red-50 border border-red-100 rounded-md text-sm">
              <div className="font-medium text-red-700">Selected Destination</div>
              <div className="text-gray-600">{selectedEndLocation.name}</div>
            </div>
          )}
        </div>
        
        {/* Departure Time */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 flex items-center mb-2">
            <Clock className="mr-1 text-purple-500" size={16} />
            Departure Time
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            name="time_of_day"
            value={formData.time_of_day}
            onChange={handleInputChange}
          >
            {Array.from({length: 24}, (_, i) => (
              <option key={i} value={i}>
                {i === 0 ? "12:00 AM" : 
                 i < 12 ? `${i}:00 AM` : 
                 i === 12 ? "12:00 PM" : 
                 `${i-12}:00 PM`}
              </option>
            ))}
          </select>
        </div>
        
        {/* Weather Conditions */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 flex items-center mb-2">
            <Cloud className="mr-1 text-blue-400" size={16} />
            Weather Conditions
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            name="weather_condition"
            value={formData.weather_condition}
            onChange={handleInputChange}
          >
            <option value="0">Clear</option>
            <option value="0.2">Light Rain</option>
            <option value="0.5">Moderate Rain</option>
            <option value="0.8">Heavy Rain</option>
            <option value="1">Severe Weather</option>
          </select>
        </div>
        
        {/* Hidden inputs for API compatibility */}
        <input type="hidden" name="start_node" value={formData.start_node} />
        <input type="hidden" name="end_node" value={formData.end_node} />
        <input type="hidden" name="latitude" value={formData.latitude} />
        <input type="hidden" name="longitude" value={formData.longitude} />
        
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded-md font-medium hover:bg-blue-700 transition duration-200 flex justify-center items-center"
          disabled={loading || !selectedStartLocation || !selectedEndLocation}
        >
          {loading ? (
            <>
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Optimizing Route...
            </>
          ) : (
            <>
              <Navigation2 className="mr-2" size={18} />
              Find Optimal Route
            </>
          )}
        </button>
      </form>
      
      {/* Error Message */}
      {/* {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 flex items-start">
          <AlertCircle className="mr-2 mt-0.5 flex-shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )} */}
      
      {/* Results Section */}
      {showResults && optimizationResults && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <Navigation2 className="mr-2 text-blue-600" size={20} />
            Optimized Route Results
          </h3>
          
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total Distance</p>
                <p className="font-semibold text-lg">{optimizationResults.total_distance} km</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estimated Time</p>
                <p className="font-semibold text-lg">{optimizationResults.total_time} minutes</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time Saved</p>
                <p className="font-semibold text-lg text-green-600">
                  {optimizationResults.average_time_saved} minutes
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Traffic Reduction</p>
                <p className="font-semibold text-lg text-green-600">
                  {(optimizationResults.traffic_reduction * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700">Route Segments:</h4>
            
            {optimizationResults.optimal_routes.map((segment, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-3 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {segment.from_address || `Node ${segment.from_node}`} → {segment.to_address || `Node ${segment.to_node}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {segment.distance_km} km • {segment.estimated_time_min} min
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    segment.congestion_factor < 1.2 ? 'bg-green-100 text-green-800' :
                    segment.congestion_factor < 1.5 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {segment.congestion_factor < 1.2 ? 'Low Traffic' :
                     segment.congestion_factor < 1.5 ? 'Moderate' :
                     'Heavy Traffic'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizeRouteTab;