import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Avatar from '../Avatar';
import { format, parseISO } from 'date-fns';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const clockInIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const clockOutIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapDisplay({ locations = [], showControls = false }) {
  const [center, setCenter] = useState([25.2048, 55.2708]); // Dubai default
  const [zoom, setZoom] = useState(12);

  useEffect(() => {
    if (locations.length > 0) {
      // Calculate center from all locations
      const avgLat = locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
      const avgLon = locations.reduce((sum, loc) => sum + loc.lon, 0) / locations.length;
      setCenter([avgLat, avgLon]);
      
      // Adjust zoom based on spread
      const latSpread = Math.max(...locations.map(l => l.lat)) - Math.min(...locations.map(l => l.lat));
      const lonSpread = Math.max(...locations.map(l => l.lon)) - Math.min(...locations.map(l => l.lon));
      const maxSpread = Math.max(latSpread, lonSpread);
      
      if (maxSpread < 0.01) setZoom(15);
      else if (maxSpread < 0.05) setZoom(13);
      else if (maxSpread < 0.1) setZoom(12);
      else setZoom(11);
    }
  }, [locations]);

  if (locations.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-lg">
        <p className="text-slate-500">No locations to display</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-lg"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {locations.map((loc, idx) => (
        <Marker
          key={idx}
          position={[loc.lat, loc.lon]}
          icon={loc.type === 'clock_in' ? clockInIcon : clockOutIcon}
        >
          <Popup>
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Avatar user={loc.user} size="sm" />
                <div>
                  <div className="font-semibold text-sm">
                    {loc.user?.nickname || loc.user?.first_name || 'Unknown'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {loc.type === 'clock_in' ? '🟢 Clock In' : '🔴 Clock Out'}
                  </div>
                </div>
              </div>
              {loc.time && (
                <div className="text-xs text-slate-600 mb-1">
                  <strong>Time:</strong> {format(parseISO(loc.time), 'MMM d, yyyy HH:mm')}
                </div>
              )}
              {loc.address && (
                <div className="text-xs text-slate-600">
                  <strong>Address:</strong> {loc.address}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}