import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function LocationPickerMap({ 
  isOpen, 
  onClose, 
  onLocationSelect, 
  initialLocation,
  isInsidePanel = false,
  disabled = false
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const placesService = useRef(null);
  const geocoder = useRef(null);

  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(initialLocation);
  const [address, setAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadGoogleMaps = async () => {
    if (window.google) {
      setApiKeyLoaded(true);
      return;
    }
    if (window.__GOOGLE_MAPS_LOADING__) return;

    try {
      window.__GOOGLE_MAPS_LOADING__ = true;
      const response = await base44.functions.invoke('getGoogleMapsKey');
      const { apiKey } = response.data;
      if (!apiKey) throw new Error('No API key received');
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setApiKeyLoaded(true);
        window.__GOOGLE_MAPS_LOADING__ = false;
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading Google Maps:', error);
      window.__GOOGLE_MAPS_LOADING__ = false;
    }
  };

  useEffect(() => {
    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (!apiKeyLoaded || !mapRef.current) return;

    const center = initialLocation || { lat: 25.2048, lng: 55.2708 };
    const map = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: initialLocation ? 15 : 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    mapInstance.current = map;
    placesService.current = new window.google.maps.places.PlacesService(map);
    geocoder.current = new window.google.maps.Geocoder();

    if (initialLocation) {
      placeMarkerAndPanTo(initialLocation, map);
    }

    map.addListener('click', (e) => {
        if(disabled) return;
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        placeMarkerAndPanTo(newPos, map);
    });

  }, [apiKeyLoaded, disabled]);

  const placeMarkerAndPanTo = (latLng, map) => {
    if (markerInstance.current) {
      markerInstance.current.setMap(null);
    }
    const marker = new window.google.maps.Marker({
      position: latLng,
      map: map,
      draggable: !disabled,
    });
    marker.addListener('dragend', (e) => {
        const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setSelectedLocation(newPos);
        reverseGeocode(newPos);
    });
    markerInstance.current = marker;
    map.panTo(latLng);
    setSelectedLocation(latLng);
    reverseGeocode(latLng);
  };
  
  const reverseGeocode = (latLng) => {
      geocoder.current.geocode({ location: latLng }, (results, status) => {
          if (status === 'OK' && results[0]) {
              setAddress(results[0].formatted_address);
          } else {
              setAddress('Address not found');
          }
      });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery || !placesService.current) return;

    placesService.current.textSearch({ query: searchQuery }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results[0]) {
        const location = results[0].geometry.location;
        const newPos = { lat: location.lat(), lng: location.lng() };
        placeMarkerAndPanTo(newPos, mapInstance.current);
        mapInstance.current.setZoom(15);
      } else {
        alert('Location not found');
      }
    });
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect({
        ...selectedLocation,
        address: address,
        name: searchQuery || address
      });
    }
  };

  const MapComponent = (
    <div className={cn("w-full h-full flex flex-col", isInsidePanel ? "bg-white" : "bg-gray-100")}>
      {!apiKeyLoaded ? (
        <div className="flex-grow flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {!isInsidePanel && (
            <div className="p-4 border-b bg-white">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={disabled}
                />
                <Button type="submit" disabled={disabled}><Search className="w-4 h-4 mr-2"/> Search</Button>
              </form>
            </div>
          )}
          <div ref={mapRef} className="flex-grow" />
          {!isInsidePanel && (
            <div className="p-4 border-t bg-white">
                <Label>Selected Address</Label>
                <p className="text-sm text-gray-700 min-h-[20px]">{address || 'Click on the map to select a location'}</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isInsidePanel) {
    return (
        <div className="w-full h-full flex flex-col">
            <div className="p-2 border-b bg-white">
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Search location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={disabled}
                  className="h-8"
                />
                <Button type="submit" disabled={disabled} size="sm"><Search className="w-4 h-4"/></Button>
              </form>
            </div>
            <div className="flex-grow relative">
                {MapComponent}
                {selectedLocation && !disabled && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                        <Button onClick={handleConfirm} size="sm" className="bg-green-600 hover:bg-green-700 shadow-lg">
                            <MapPin className="w-4 h-4 mr-2" />
                            Confirm Location
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Select Project Location</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
            {MapComponent}
        </div>
        <DialogFooter className="p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedLocation || disabled}>
            <MapPin className="w-4 h-4 mr-2" />
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}