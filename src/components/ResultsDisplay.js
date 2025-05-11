import React from 'react';

const ResultsDisplay = ({ loading, error, trafficData, activeTab }) => {
  // Get color based on congestion level
  const getCongestionColor = (congestion) => {
    if (congestion < 0.3) return '#4CAF50'; // Green
    if (congestion < 0.6) return '#FFC107'; // Yellow
    return '#F44336'; // Red
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!trafficData || trafficData.length === 0) {
    return null;
  }

  // Detect data structure format (route-based or location-based)
  const isRouteFormat = trafficData[0]?.route !== undefined;

  return (
    <div className="results">
      <h3>Traffic Data Results</h3>
      <table>
        <thead>
          <tr>
            {isRouteFormat ? (
              <th>Route</th>
            ) : (
              <th>Location</th>
            )}
            <th>Congestion</th>
            <th>Speed (km/h)</th>
            {activeTab === 'summary' && <th>Status</th>}
            {activeTab === 'summary' && <th>Vehicles</th>}
            {isRouteFormat && <th>Est. Time (min)</th>}
          </tr>
        </thead>
        <tbody>
          {trafficData.map((data, index) => {
            // Handle both data formats safely
            const congestion = data.current_congestion || 0;
            const speed = data.average_speed || 0;
            const vehicleCount = data.vehicle_count || data.total_vehicles_estimated || 0;
            
            return (
              <tr key={index}>
                {isRouteFormat ? (
                  // Route-based format (start to end)
                  <td>
                    {data.route?.start?.address || 'Unknown'} → {data.route?.end?.address || 'Unknown'}
                    <div className="route-distance">
                      <small>{data.route?.distance || '0'} km</small>
                    </div>
                  </td>
                ) : (
                  // Location-based format (coordinates)
                  <td>
                    {data.location?.latitude?.toFixed(4) || '0.0000'}, 
                    {data.location?.longitude?.toFixed(4) || '0.0000'}
                  </td>
                )}
                
                <td style={{ color: getCongestionColor(congestion) }}>
                  {(congestion * 100).toFixed(1)}%
                </td>
                
                <td>{speed ? speed.toFixed(1) : 'N/A'}</td>
                
                {activeTab === 'summary' && (
                  <td>{data.network_status || 'Normal'}</td>
                )}
                
                {activeTab === 'summary' && (
                  <td>{vehicleCount}</td>
                )}
                
                {isRouteFormat && (
                  <td>{data.estimated_travel_time || '0'}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {activeTab === 'optimize' && (
        <div className="route-info">
          <h4>Optimized Route</h4>
          <p>The optimized route is displayed on the map.</p>
        </div>
      )}

      {isRouteFormat && (
        <div className="prediction-details">
          <h4>Prediction Details</h4>
          <p>
            Prediction confidence: 
            {((trafficData[0]?.confidence || 0) * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultsDisplay;