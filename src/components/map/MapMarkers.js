import tt from '@tomtom-international/web-sdk-maps';

// Get color based on congestion level
export const getCongestionColor = (congestion) => {
  if (congestion < 0.3) return '#4CAF50'; // Green
  if (congestion < 0.6) return '#FFC107'; // Yellow
  return '#F44336'; // Red
};

export const updateMapMarkers = (map, trafficData) => {
  try {
    // Clear existing markers
    const existingMarkers = document.getElementsByClassName('custom-marker');
    while (existingMarkers[0]) {
      existingMarkers[0].parentNode.removeChild(existingMarkers[0]);
    }

    // Add markers for each traffic data point
    trafficData.forEach(data => {
      const { location, current_congestion } = data;
      
      if (!location || typeof location.longitude === 'undefined' || typeof location.latitude === 'undefined') {
        console.error("Invalid location data:", data);
        return;
      }
      
      // Create marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'custom-marker';
      
      // Set color based on congestion level
      const congestionColor = getCongestionColor(current_congestion);
      markerElement.style.backgroundColor = congestionColor;
      
      // Add marker to map
      new tt.Marker({
        element: markerElement
      })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map);
    });
  } catch (err) {
    console.error("Error updating markers:", err);
  }
};