import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from "sonner";
import { Settings } from 'lucide-react';

export default function ExtraTimeSettingsDialog({ isOpen, onClose, settings, onSave }) {
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleSave = () => {
        onSave(localSettings);
        toast.success("Settings have been saved.");
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        Extra Time Settings
                    </DialogTitle>
                    <DialogDescription>
                        Configure the parameters for automatic extra time calculation.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="dutyHours" className="text-sm font-medium">Duty Duration (hours)</label>
                        <Input
                            id="dutyHours"
                            type="number"
                            min="1"
                            max="24"
                            value={localSettings.dutyHours}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, dutyHours: Number(e.target.value) || 0 }))}
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500">Standard working hours per day.</p>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="breakMinutes" className="text-sm font-medium">Break Duration (minutes)</label>
                        <Input
                            id="breakMinutes"
                            type="number"
                            min="0"
                            max="480"
                            value={localSettings.breakMinutes}
                            onChange={(e) => setLocalSettings(prev => ({ ...prev, breakMinutes: Number(e.target.value) || 0 }))}
                            className="w-full"
                        />
                        <p className="text-xs text-gray-500">Break time that doesn't count towards extra time.</p>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Formula:</strong> Extra Time = Total Work Time - Break Time - Duty Time
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Settings</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}