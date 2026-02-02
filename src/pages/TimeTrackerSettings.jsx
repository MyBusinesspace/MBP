import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Clock, Calendar } from 'lucide-react';
import { AppSettings } from '@/entities/all';
import { toast } from 'sonner';

export default function TimeTrackerSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    overtime_threshold_hours: 8,
    weekend_days: [0], // 0 = Sunday
    track_gps: true,
    require_photo_clock_out: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allSettings = await AppSettings.list();
      
      const overtimeThreshold = allSettings.find(s => s.setting_key === 'overtime_threshold_hours');
      const weekendDays = allSettings.find(s => s.setting_key === 'weekend_days');
      const trackGPS = allSettings.find(s => s.setting_key === 'track_gps');
      const requirePhoto = allSettings.find(s => s.setting_key === 'require_photo_clock_out');

      setSettings({
        overtime_threshold_hours: overtimeThreshold ? parseFloat(overtimeThreshold.setting_value) : 8,
        weekend_days: weekendDays ? JSON.parse(weekendDays.setting_value) : [0],
        track_gps: trackGPS ? trackGPS.setting_value === 'true' : true,
        require_photo_clock_out: requirePhoto ? requirePhoto.setting_value === 'true' : false
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allSettings = await AppSettings.list();

      // Save overtime threshold
      const overtimeSetting = allSettings.find(s => s.setting_key === 'overtime_threshold_hours');
      if (overtimeSetting) {
        await AppSettings.update(overtimeSetting.id, {
          setting_value: settings.overtime_threshold_hours.toString()
        });
      } else {
        await AppSettings.create({
          setting_key: 'overtime_threshold_hours',
          setting_value: settings.overtime_threshold_hours.toString(),
          setting_type: 'number',
          description: 'Number of hours before overtime starts'
        });
      }

      // Save weekend days
      const weekendSetting = allSettings.find(s => s.setting_key === 'weekend_days');
      if (weekendSetting) {
        await AppSettings.update(weekendSetting.id, {
          setting_value: JSON.stringify(settings.weekend_days)
        });
      } else {
        await AppSettings.create({
          setting_key: 'weekend_days',
          setting_value: JSON.stringify(settings.weekend_days),
          setting_type: 'string',
          description: 'Days of week that are considered weekend/off (0=Sunday, 6=Saturday)'
        });
      }

      // Save GPS tracking
      const gpsSetting = allSettings.find(s => s.setting_key === 'track_gps');
      if (gpsSetting) {
        await AppSettings.update(gpsSetting.id, {
          setting_value: settings.track_gps.toString()
        });
      } else {
        await AppSettings.create({
          setting_key: 'track_gps',
          setting_value: settings.track_gps.toString(),
          setting_type: 'boolean',
          description: 'Track GPS location on clock in/out'
        });
      }

      // Save photo requirement
      const photoSetting = allSettings.find(s => s.setting_key === 'require_photo_clock_out');
      if (photoSetting) {
        await AppSettings.update(photoSetting.id, {
          setting_value: settings.require_photo_clock_out.toString()
        });
      } else {
        await AppSettings.create({
          setting_key: 'require_photo_clock_out',
          setting_value: settings.require_photo_clock_out.toString(),
          setting_type: 'boolean',
          description: 'Require photo when clocking out'
        });
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleWeekendDay = (day) => {
    setSettings(prev => ({
      ...prev,
      weekend_days: prev.weekend_days.includes(day)
        ? prev.weekend_days.filter(d => d !== day)
        : [...prev.weekend_days, day]
    }));
  };

  const weekDays = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <p className="text-slate-600">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-white shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <Settings className="w-7 h-7 text-indigo-600" />
              Time Tracker Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Overtime Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Overtime Configuration</h3>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="overtime-threshold">
                  Overtime starts after (hours per day)
                </Label>
                <Input
                  id="overtime-threshold"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={settings.overtime_threshold_hours}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    overtime_threshold_hours: parseFloat(e.target.value) || 8
                  }))}
                  className="max-w-xs"
                />
                <p className="text-xs text-slate-500">
                  Any hours worked beyond this threshold will be counted as overtime
                </p>
              </div>
            </div>

            {/* Weekend/Off Days Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-slate-900">Weekend & Off Days</h3>
              </div>
              
              <div className="space-y-3">
                <Label>Select weekend days (days off)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {weekDays.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleWeekendDay(day.value)}
                      className={cn(
                        "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                        settings.weekend_days.includes(day.value)
                          ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      )}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  These days will be marked as days off in the timesheet. You can add specific holidays from the calendar.
                </p>
              </div>
            </div>

            {/* GPS and Photo Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Clock In/Out Settings</h3>
              
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label htmlFor="track-gps" className="text-base font-medium">
                    Track GPS Location
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Record location when employees clock in and out
                  </p>
                </div>
                <Switch
                  id="track-gps"
                  checked={settings.track_gps}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    track_gps: checked
                  }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <Label htmlFor="require-photo" className="text-base font-medium">
                    Require Photo on Clock Out
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Employees must take a photo when clocking out
                  </p>
                </div>
                <Switch
                  id="require-photo"
                  checked={settings.require_photo_clock_out}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    require_photo_clock_out: checked
                  }))}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}