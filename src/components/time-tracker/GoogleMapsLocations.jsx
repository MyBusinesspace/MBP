import React, { useState, useEffect } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';

export default function GoogleMapsLocations({ locations }) {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = React.useRef(null);
  const googleMapRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const polylinesRef = React.useRef([]);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const response = await base44.functions.invoke('getGoogleMapsKey');
        setApiKey(response.data.apiKey);
        setError(null);
      } catch (error) {
        console.error('❌ [Maps] Failed to load Google Maps API key:', error);
        // ✅ IMPROVED: Mostrar error más amigable
        setError('Maps unavailable - API key not configured');
        setLoading(false);
      }
    };

    loadApiKey();
  }, []);

  useEffect(() => {
    if (!apiKey) return;

    const scriptId = 'google-maps-script';
    
    if (document.getElementById(scriptId)) {
      setLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setLoading(false);
      setError(null);
    };
    
    script.onerror = () => {
      setError('Failed to load Google Maps');
      setLoading(false);
    };

    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (loading || error || !mapRef.current || !window.google || locations.length === 0) return;

    // Clear existing markers and polylines
    markersRef.current.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null);
      } else if (marker.onRemove) {
        marker.onRemove();
      }
    });
    markersRef.current = [];

    polylinesRef.current.forEach(polyline => {
      if (polyline.setMap) {
        polyline.setMap(null);
      }
    });
    polylinesRef.current = [];

    const validLocations = locations.filter(loc => {
      const lat = loc.lat;
      const lng = loc.lng || loc.lon;
      return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
    });

    if (validLocations.length === 0) {
      setError('No valid location data');
      return;
    }

    const avgLat = validLocations.reduce((sum, loc) => sum + loc.lat, 0) / validLocations.length;
    const avgLng = validLocations.reduce((sum, loc) => sum + (loc.lng || loc.lon), 0) / validLocations.length;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: avgLat, lng: avgLng },
      zoom: 12,
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });

    googleMapRef.current = map;

    const bounds = new window.google.maps.LatLngBounds();

    // ✅ NEW: Group locations by user for creating routes
    const locationsByUser = {};
    
    validLocations.forEach(location => {
      const userId = location.user?.id || 'unknown';
      if (!locationsByUser[userId]) {
        locationsByUser[userId] = {
          user: location.user,
          points: []
        };
      }
      locationsByUser[userId].points.push(location);
    });

    // ✅ NEW: Create polylines for each user's route
    Object.values(locationsByUser).forEach(({ user, points }) => {
      // Sort points by time to create correct route
      const sortedPoints = points
        .filter(p => p.type !== 'current') // Exclude current location from route
        .sort((a, b) => {
          const timeA = a.time ? new Date(a.time).getTime() : 0;
          const timeB = b.time ? new Date(b.time).getTime() : 0;
          return timeA - timeB;
        });

      if (sortedPoints.length > 1) {
        // Determine color based on first point type (clock_in = green, etc.)
        let routeColor = '#3b82f6'; // blue default
        const hasClockIn = sortedPoints.some(p => p.type === 'clock_in');
        const hasClockOut = sortedPoints.some(p => p.type === 'clock_out');
        
        if (hasClockIn && !hasClockOut) {
          routeColor = '#10b981'; // green - still active
        } else if (hasClockOut) {
          routeColor = '#6b7280'; // gray - completed
        }

        const path = sortedPoints.map(p => ({
          lat: p.lat,
          lng: p.lng || p.lon
        }));

        // Create dashed polyline (intermittent line)
        const polyline = new window.google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: routeColor,
          strokeOpacity: 0.8,
          strokeWeight: 3,
          icons: [{
            icon: {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              scale: 3
            },
            offset: '0',
            repeat: '15px' // Creates dashed effect
          }]
        });

        polyline.setMap(map);
        polylinesRef.current.push(polyline);
      }
    });

    // Create markers based on grouped locations
    Object.values(locationsByUser).forEach(({ user, points }) => {
      // Sort points by time
      const sortedPoints = points.sort((a, b) => {
        const timeA = a.time ? new Date(a.time).getTime() : 0;
        const timeB = b.time ? new Date(b.time).getTime() : 0;
        return timeA - timeB;
      });

      // Iterate points and decide which to render as markers
      sortedPoints.forEach((location, index) => {
        const isLastPoint = index === sortedPoints.length - 1;
        
        // Only show markers for:
        // 1. Clock In (Start)
        // 2. Clock Out (End)
        // 3. Current Location (Live)
        // 4. Tracking point IF it is the LAST point (meaning current live location for active user)
        
        const shouldShowMarker = 
          location.type === 'clock_in' || 
          location.type === 'clock_out' || 
          location.type === 'current' || 
          (location.type === 'tracking' && isLastPoint);

        if (!shouldShowMarker) return;

        const lat = location.lat;
        const lng = location.lng || location.lon;
        const position = { lat, lng };
        
        const avatarUrl = location.user?.avatar_url;
        const userName = location.user?.nickname || location.user?.first_name || 'User';
        
        // Format time
        const timeStr = location.time ? format(parseISO(location.time), 'HH:mm') : '';
        
        // Determine border color based on type
        let borderColor = '#3b82f6'; // blue default
        let borderWidth = '2px';
        
        if (location.type === 'clock_in') {
          borderColor = '#10b981'; // green
          borderWidth = '3px';
        } else if (location.type === 'clock_out') {
          borderColor = '#ef4444'; // red
          borderWidth = '3px';
        } else if (location.type === 'current' || location.type === 'tracking') {
          borderColor = '#3b82f6'; // blue (Active)
          borderWidth = '3px';
        }
        
        if (avatarUrl) {
          const markerDiv = document.createElement('div');
          markerDiv.style.position = 'relative';
          markerDiv.style.display = 'flex';
          markerDiv.style.alignItems = 'center';
          markerDiv.style.gap = '4px';
          
          // Avatar container
          const avatarContainer = document.createElement('div');
          avatarContainer.style.position = 'relative';
          avatarContainer.style.width = '40px';
          avatarContainer.style.height = '40px';
          
          const img = document.createElement('img');
          img.src = avatarUrl;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.borderRadius = '50%';
          img.style.objectFit = 'cover';
          img.style.border = `${borderWidth} solid ${borderColor}`;
          img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          avatarContainer.appendChild(img);
          
          markerDiv.appendChild(avatarContainer);
          
          // Time label next to avatar
          if (timeStr) {
            const timeLabel = document.createElement('div');
            timeLabel.textContent = timeStr;
            timeLabel.style.backgroundColor = 'white';
            timeLabel.style.padding = '2px 6px';
            timeLabel.style.borderRadius = '4px';
            timeLabel.style.fontSize = '11px';
            timeLabel.style.fontWeight = '600';
            timeLabel.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
            timeLabel.style.whiteSpace = 'nowrap';
            markerDiv.appendChild(timeLabel);
          }
          
          class CustomOverlay extends window.google.maps.OverlayView {
            constructor(position, content, infoContent) {
              super();
              this.position = position;
              this.content = content;
              this.infoContent = infoContent;
            }
            
            onAdd() {
              this.div = document.createElement('div');
              this.div.style.position = 'absolute';
              this.div.style.cursor = 'pointer';
              this.div.appendChild(this.content);
              
              const panes = this.getPanes();
              panes.overlayMouseTarget.appendChild(this.div);
              
              const infoWindow = new window.google.maps.InfoWindow({
                content: this.infoContent
              });
              
              this.div.addEventListener('click', () => {
                infoWindow.open(map);
                infoWindow.setPosition(this.position);
              });
            }
            
            draw() {
              const projection = this.getProjection();
              const point = projection.fromLatLngToDivPixel(this.position);
              if (point) {
                this.div.style.left = (point.x - (this.div.offsetWidth / 2)) + 'px';
                this.div.style.top = (point.y - (this.div.offsetHeight / 2)) + 'px';
              }
            }
            
            onRemove() {
              if (this.div) {
                this.div.parentNode.removeChild(this.div);
                this.div = null;
              }
            }
          }

          const infoContent = `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 4px;">
                ${userName}
              </div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
                ${location.type === 'clock_in' ? '🟢 Clock In' : location.type === 'clock_out' ? '🔴 Clock Out' : '🔵 Active Location'}
              </div>
              <div style="font-size: 11px; color: #64748b;">
                ${location.time ? format(parseISO(location.time), 'MMM d, yyyy HH:mm') : '-'}
              </div>
              ${location.address ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${location.address}</div>` : ''}
            </div>
          `;
          
          const overlay = new CustomOverlay(
            new window.google.maps.LatLng(lat, lng),
            markerDiv,
            infoContent
          );
          overlay.setMap(map);
          markersRef.current.push(overlay);
        } else {
          // Fallback: colored circle if no avatar
          let markerIcon;
          if (location.type === 'clock_in') {
            markerIcon = {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#059669',
              strokeWeight: 2,
              scale: 10
            };
          } else if (location.type === 'clock_out') {
            markerIcon = {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#dc2626',
              strokeWeight: 2,
              scale: 10
            };
          } else {
            markerIcon = {
              path: window.google.maps.SymbolPath.CIRCLE,
              fillColor: '#3b82f6',
              fillOpacity: 0.6,
              strokeColor: '#2563eb',
              strokeWeight: 1,
              scale: 6
            };
          }

          const marker = new window.google.maps.Marker({
            position,
            map,
            icon: markerIcon,
            title: userName
          });
          markersRef.current.push(marker);

          const infoContent = `
            <div style="padding: 8px;">
              <div style="font-weight: 600; margin-bottom: 4px;">
                ${userName}
              </div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
                ${location.type === 'clock_in' ? '🟢 Clock In' : location.type === 'clock_out' ? '🔴 Clock Out' : '🔵 Active Location'}
              </div>
              <div style="font-size: 11px; color: #64748b;">
                ${location.time ? format(parseISO(location.time), 'MMM d, yyyy HH:mm') : '-'}
              </div>
              ${location.address ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">${location.address}</div>` : ''}
            </div>
          `;

          const infoWindow = new window.google.maps.InfoWindow({
            content: infoContent
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        }

        bounds.extend(position);
      });
    });

    if (validLocations.length > 1) {
      map.fitBounds(bounds);
    } else if (validLocations.length === 1) {
      map.setCenter(new window.google.maps.LatLng(validLocations[0].lat, validLocations[0].lng || validLocations[0].lon));
      map.setZoom(16);
    }

    return () => {
      markersRef.current.forEach(marker => {
        if (marker.setMap) {
          marker.setMap(null);
        } else if (marker.onRemove) {
          marker.onRemove();
        }
      });
      polylinesRef.current.forEach(polyline => {
        if (polyline.setMap) {
          polyline.setMap(null);
        }
      });
      if (googleMapRef.current) {
        googleMapRef.current = null;
      }
    };
  }, [loading, error, locations]);

  if (error) {
    return (
      <div className="h-[500px] bg-slate-50 flex items-center justify-center border-t">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <div className="text-slate-600 text-sm font-medium">{error}</div>
          <div className="text-slate-400 text-xs mt-2">
            GPS locations are still being tracked
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-[500px] bg-slate-100 flex items-center justify-center border-t">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
          <div className="text-slate-600 text-sm">Loading map...</div>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-[500px] w-full rounded-lg" />;
}