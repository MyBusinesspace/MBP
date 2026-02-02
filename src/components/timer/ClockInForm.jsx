import React, { useState } from 'react';
import { useData } from '../DataProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StickFigureAnimation from '../StickFigureAnimation';

export default function ClockInForm({ onClockIn, activeEntry = null }) {
  const { projects, currentUser } = useData();
  const [newEntry, setNewEntry] = useState({ 
    employee_id: currentUser?.id || '',
    project_id: '', 
    task: '' 
  });
  const [isClockingIn, setIsClockingIn] = useState(false);

  const handleSubmit = async () => {
    if (activeEntry) {
      alert("❌ Ya hay una sesión de trabajo activa. Termínala antes de comenzar una nueva.");
      return;
    }

    if (!newEntry.project_id) {
      alert("❌ Por favor selecciona un proyecto.");
      return;
    }

    setIsClockingIn(true);
    try {
      const entryWithCurrentUser = {
        ...newEntry,
        employee_id: currentUser.id
      };
      
      await onClockIn(entryWithCurrentUser);
      
      // Reset form after successful clock in
      setNewEntry({
        employee_id: currentUser.id,
        project_id: '',
        task: ''
      });
    } catch (error) {
      console.error("Clock in failed:", error);
      alert("❌ Error al hacer clock in. Por favor intenta de nuevo.");
    } finally {
      setIsClockingIn(false);
    }
  };

  const canSubmit = newEntry.project_id && !activeEntry && !isClockingIn;

  if (activeEntry) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 text-orange-700">
            <AlertTriangle className="w-6 h-6" />
            <span className="font-medium">
              Ya hay una sesión de trabajo activa. Complétala antes de comenzar una nueva.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableProjects = (projects || []).filter(p => 
    p.status === 'on going' || p.status === 'pending'
  );

  return (
    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-green-600" />
            <span>Start Your Work Day</span>
            <StickFigureAnimation 
              size={40}
              isActive={isClockingIn}
              animationType="walking"
              color="#16a34a"
            />
          </div>
        </CardTitle>
        <p className="text-sm text-gray-600">Select your project and begin tracking time</p>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Project</label>
            <select
              value={newEntry.project_id}
              onChange={(e) => setNewEntry({ ...newEntry, project_id: e.target.value })}
              className="w-full h-11 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
            >
              <option value="">Select Project</option>
              {availableProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === 'pending' ? '(Pending)' : ''}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Task Description</label>
            <Input 
              placeholder="What will you work on?" 
              value={newEntry.task} 
              onChange={(e) => setNewEntry({ ...newEntry, task: e.target.value })} 
              className="h-11"
            />
          </div>
          
          <Button 
            onClick={handleSubmit} 
            size="lg" 
            disabled={!canSubmit}
            className={`h-11 px-6 shadow-lg hover:shadow-xl transition-all duration-200 ${
              canSubmit 
                ? 'bg-green-600 hover:bg-green-700 text-white font-semibold'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isClockingIn ? (
              <>
                <Clock className="w-5 h-5 mr-2 animate-spin" />
                Clocking In...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Clock In
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}