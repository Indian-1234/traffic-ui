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

export default ResultsDisplay;