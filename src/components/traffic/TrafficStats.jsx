import React, { useEffect, useRef } from 'react';
import tt from '@tomtom-international/web-sdk-maps';
import '@tomtom-international/web-sdk-maps/dist/maps.css';

const TrafficMap = () => {
  const mapElement = useRef();
  const map = useRef(null);

  useEffect(() => {
    map.current = tt.map({
      key: "IV7dQDp5vey54vgGvRlIDmn7qazKzAaN", // Your TomTom API key
      container: mapElement.current,
      center: [80.2270, 12.8996], // Sholinganallur, Chennai
      zoom: 13,
    });
  

    map.current.addControl(new tt.NavigationControl());
    map.current.addControl(new tt.FullscreenControl());

    // Sample markers for testing
    const sampleMarkers = [
      { lon: -122.4194, lat: 37.7749, label: 'Marker 1' },
      { lon: -122.4294, lat: 37.7849, label: 'Marker 2' },
      { lon: -122.4394, lat: 37.7949, label: 'Marker 3' },
    ];

    sampleMarkers.forEach((marker) => {
      new tt.Marker().setLngLat([marker.lon, marker.lat]).addTo(map.current);
    });

    return () => {
      map.current.remove();
    };
  }, []);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg">
      <div ref={mapElement} className="w-full h-full" />
    </div>
  );
};

export default TrafficMap;
