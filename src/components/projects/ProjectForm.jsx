
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { forwardGeocode } from '@/functions/forwardGeocode';
import { reverseGeocode } from '@/functions/reverseGeocode';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const statusOptions = ["on going", "pending", "closed"];

function LocationPicker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position === null ? null : <Marker position={position}></Marker>;
}

export default function ProjectForm({ isOpen, onClose, onSave, project, customers }) {
  const [formData, setFormData] = useState({
    name: '', 
    customer_id: '', 
    status: 'on going', 
    location_name: '',
    address: ''
  });
  const [position, setPosition] = useState(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        customer_id: project.customer_id === null ? '' : project.customer_id, // Ensure customer_id is a string or empty string for Select component
        status: project.status || 'on going',
        location_name: project.location_name || '',
        address: project.address || ''
      });
      if (project.latitude && project.longitude) {
        setPosition({ lat: project.latitude, lng: project.longitude });
      } else {
        setPosition(null);
      }
    } else {
      // Reset for new project
      setFormData({ 
        name: '', 
        customer_id: '', // Reset to empty string for no client
        status: 'on going', 
        location_name: '',
        address: '' 
      });
      setPosition(null);
    }
  }, [project, isOpen]);

  const handleAddressBlur = useCallback(async () => {
    if (formData.address && formData.address.length > 3) {
      setIsGeocoding(true);
      try {
        const { data } = await forwardGeocode({ address: formData.address });
        if (data.latitude && data.longitude) {
          setPosition({ lat: data.latitude, lng: data.longitude });
        }
      } catch (error) {
        console.error("Forward geocoding failed:", error);
      } finally {
        setIsGeocoding(false);
      }
    }
  }, [formData.address]);
  
  const setPositionAndAddress = useCallback(async (latlng) => {
      setPosition(latlng);
      setIsGeocoding(true);
      try {
        const { data } = await reverseGeocode({ latitude: latlng.lat, longitude: latlng.lng });
        if(data.address) {
            setFormData(prev => ({...prev, address: data.address}));
        }
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
      } finally {
        setIsGeocoding(false);
      }
  }, []);

  const handleSave = () => {
    const finalData = {
      ...formData,
      // Convert empty string customer_id back to null if no client is selected
      customer_id: formData.customer_id === '' ? null : formData.customer_id,
      latitude: position ? position.lat : null,
      longitude: position ? position.lng : null,
    };
    onSave(finalData);
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{project ? 'Edit Project' : 'Add New Project'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" value={formData.name} onChange={handleInputChange} />
            </div>
            <div>
              <Label htmlFor="customer_id">Client</Label> {/* Changed from Customer */}
              <Select 
                value={formData.customer_id || ''} // Ensure Select component gets a string
                onValueChange={(val) => handleSelectChange('customer_id', val === '' ? null : val)} // Convert empty string to null if "No Client" is selected
              >
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger> {/* Changed placeholder */}
                <SelectContent>
                  <SelectItem value={null}>No Client</SelectItem> {/* Added "No Client" option */}
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location_name">Location Name</Label>
              <Input 
                id="location_name" 
                value={formData.location_name} 
                onChange={handleInputChange}
                placeholder="e.g. North Area Dubai, Downtown District"
              />
              <p className="text-xs text-gray-500 mt-1">Descriptive location name for easy identification</p>
            </div>
             <div>
              <Label htmlFor="address">Full Address (for geocoding)</Label>
              <Input id="address" value={formData.address} onChange={handleInputChange} onBlur={handleAddressBlur} />
              {isGeocoding && <p className="text-xs text-blue-500 mt-1">Searching location...</p>}
              <p className="text-xs text-gray-500 mt-1">Enter full address to auto-locate on map</p>
            </div>
          </div>
          <div className="h-96 md:h-auto rounded-lg overflow-hidden border">
             <MapContainer center={position || [40.416775, -3.703790]} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationPicker position={position} setPosition={setPositionAndAddress} />
            </MapContainer>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
