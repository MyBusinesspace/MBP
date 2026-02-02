import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Pencil, Trash2, Loader2 } from 'lucide-react';
import Avatar from '../Avatar';

export default function AvatarViewerDialog({ 
  isOpen, 
  onClose, 
  user, 
  onUpload, 
  onEdit, 
  onRemove, 
  isUploading,
  canEdit 
}) {
  const getDynamicFullName = () => {
    const firstName = user?.first_name || '';
    const lastName = user?.last_name || '';
    return `${firstName} ${lastName}`.trim() || user?.full_name || user?.email || 'User';
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const triggerFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleFileSelect;
    input.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Profile Photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-4">
          {/* Large Avatar Preview */}
          <div className="relative">
            <Avatar
              name={getDynamicFullName()}
              src={user?.avatar_url}
              isAdmin={user?.role === 'admin'}
              adminRoleType={user?.admin_role_type}
              className="h-40 w-40 text-4xl"
            />
          </div>

          {/* Action Buttons */}
          {canEdit && (
            <div className="grid grid-cols-3 gap-2 w-full px-4">
              {/* Upload New */}
              <button
                onClick={triggerFileUpload}
                disabled={isUploading}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-blue-600 group-hover:text-white animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                  )}
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-blue-600">
                  Upload
                </span>
              </button>

              {/* Edit Existing */}
              <button
                onClick={onEdit}
                disabled={!user?.avatar_url || isUploading}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-500 transition-colors">
                  <Pencil className="w-5 h-5 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-indigo-600">
                  Adjust
                </span>
              </button>

              {/* Remove */}
              <button
                onClick={onRemove}
                disabled={!user?.avatar_url || isUploading}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-slate-200 hover:border-red-500 hover:bg-red-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center group-hover:bg-red-500 transition-colors">
                  <Trash2 className="w-5 h-5 text-red-600 group-hover:text-white transition-colors" />
                </div>
                <span className="text-xs font-medium text-slate-700 group-hover:text-red-600">
                  Remove
                </span>
              </button>
            </div>
          )}

          {/* Info Text */}
          {canEdit && (
            <p className="text-xs text-slate-500 text-center px-6">
              {user?.avatar_url 
                ? 'Upload a new photo, adjust the current one, or remove it' 
                : 'Upload a profile photo to personalize your account'}
            </p>
          )}

          {!canEdit && (
            <p className="text-sm text-slate-500 text-center px-6">
              You don't have permission to edit this photo
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}