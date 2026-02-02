import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Hash, AlertCircle, Users, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'sonner';


import { generateEmployeeNumber } from '@/functions/generateEmployeeNumber';

export default function EmployeeNumbersTab({ allUsers, onSuccess }) {
  const [generating, setGenerating] = useState(false);

  const getUsersWithNumbers = () => {
    return (allUsers || []).filter(u => u.employee_number && !u.archived && !u.is_ghost);
  };

  const getUsersWithoutNumbers = () => {
    return (allUsers || []).filter(u => !u.employee_number && !u.archived && !u.is_ghost);
  };

  const handleGenerateNumbers = async () => {
    if (!window.confirm('This will regenerate employee numbers for all users based on seniority (employment_start_date). Numbers will be 001, 002, 003... Continue?')) {
      return;
    }

    setGenerating(true);
    try {
      const result = await generateEmployeeNumber({});
      
      if (result.data.success) {
        toast.success(result.data.message || `Generated employee numbers for ${result.data.updated_count} users`);
        if (onSuccess) onSuccess();
      } else {
        throw new Error(result.data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error generating employee numbers:', error);
      toast.error('Failed to generate employee numbers: ' + (error.message || 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const usersWithNumbers = getUsersWithNumbers();
  const usersWithoutNumbers = getUsersWithoutNumbers();
  const totalActiveUsers = (allUsers || []).filter(u => !u.archived && !u.is_ghost).length;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Automatic Employee Numbers</h3>
        <p className="text-sm text-slate-600">
          Employee numbers are automatically assigned based on seniority (employment_start_date).
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-slate-600" />
            <span className="text-xs text-slate-600 font-medium">Total Users</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalActiveUsers}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-xs text-green-600 font-medium">With Numbers</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{usersWithNumbers.length}</p>
        </div>

        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span className="text-xs text-amber-600 font-medium">Without Numbers</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">{usersWithoutNumbers.length}</p>
        </div>
      </div>

      {/* Configuration Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-2">How It Works</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Automatic numbering by seniority:</strong> Numbers are assigned based on employment_start_date (oldest = 001)</li>
              <li>• <strong>Format:</strong> 001, 002, 003... (sequential, 3 digits)</li>
              <li>• <strong>Retired numbers:</strong> If an employee leaves, their number is never reassigned</li>
              <li>• Archived or ghost users are excluded from numbering</li>
              <li>• Users without employment_start_date will be skipped</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button 
          onClick={handleGenerateNumbers}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Hash className="w-4 h-4 mr-2" />
              Generate Numbers
            </>
          )}
        </Button>
      </div>

      {/* Example Preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-slate-900 mb-2">Example:</h4>
        <div className="space-y-1 text-xs text-slate-600">
          <p>• Employee joined Jan 1, 2020 → <span className="font-mono font-bold">001</span></p>
          <p>• Employee joined Mar 15, 2020 → <span className="font-mono font-bold">002</span></p>
          <p>• Employee joined Dec 1, 2021 → <span className="font-mono font-bold">003</span></p>
          <p className="text-amber-600 mt-2">⚠️ If employee #002 leaves, number 002 is retired and never reassigned</p>
        </div>
      </div>
    </div>
  );
}