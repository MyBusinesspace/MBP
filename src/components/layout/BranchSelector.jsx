import React, { useState, useEffect } from 'react';
import { useData } from '../DataProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Check } from 'lucide-react';

export default function BranchSelector({ selectedBranchId, onBranchChange }) {
  const { branches, currentUser } = useData();
  const [localSelectedBranch, setLocalSelectedBranch] = useState(selectedBranchId || 'all');

  useEffect(() => {
    setLocalSelectedBranch(selectedBranchId || 'all');
  }, [selectedBranchId]);

  const handleChange = (value) => {
    setLocalSelectedBranch(value);
    onBranchChange(value);
  };

  // Si el usuario no es admin y tiene branch_id, solo mostrar su branch
  const availableBranches = currentUser?.role === 'admin' 
    ? branches 
    : branches.filter(b => b.id === currentUser?.branch_id);

  // Si no hay branches, no mostrar el selector
  if (!branches || branches.length === 0) {
    return null;
  }

  // Obtener la branch seleccionada para mostrar su logo
  const selectedBranch = localSelectedBranch === 'all' 
    ? null 
    : branches.find(b => b.id === localSelectedBranch);

  return (
    <Select value={localSelectedBranch} onValueChange={handleChange}>
      <SelectTrigger className="w-full h-auto bg-white border-slate-200 hover:bg-slate-50">
        <SelectValue>
          <div className="flex items-center gap-3 py-1">
            {selectedBranch?.logo_url ? (
              <img 
                src={selectedBranch.logo_url} 
                alt={selectedBranch.name}
                className="w-8 h-8 object-contain rounded"
              />
            ) : (
              <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>
            )}
            <div className="flex-1 text-left">
              <div className="font-medium text-sm">
                {selectedBranch ? selectedBranch.name : 'Select Company'}
              </div>
              <div className="text-xs text-slate-500">
                {selectedBranch?.location || 'Business Management'}
              </div>
            </div>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {currentUser?.role === 'admin' && (
          <SelectItem value="all">
            <div className="flex items-center gap-2 py-1">
              <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>
              <span className="font-medium">All Branches</span>
              {localSelectedBranch === 'all' && (
                <Check className="w-4 h-4 ml-auto text-blue-600" />
              )}
            </div>
          </SelectItem>
        )}
        {availableBranches.map((branch) => (
          <SelectItem key={branch.id} value={branch.id}>
            <div className="flex items-center gap-2 py-1">
              {branch.logo_url ? (
                <img 
                  src={branch.logo_url} 
                  alt={branch.name}
                  className="w-6 h-6 object-contain rounded"
                />
              ) : (
                <div className="w-6 h-6 bg-slate-100 rounded flex items-center justify-center">
                  <Building2 className="w-3 h-3 text-slate-500" />
                </div>
              )}
              <div className="flex-1">
                <div className="font-medium">{branch.name}</div>
                {branch.location && (
                  <div className="text-xs text-slate-500">{branch.location}</div>
                )}
              </div>
              {localSelectedBranch === branch.id && (
                <Check className="w-4 h-4 ml-auto text-blue-600" />
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}