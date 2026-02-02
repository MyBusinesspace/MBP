import React from 'react';
import { cn } from '@/lib/utils';

export default function StackedAvatars({ users = [], maxVisible = 3, size = 'sm' }) {
  if (!users || users.length === 0) return null;

  const sizeClasses = {
    xs: 'w-5 h-5 text-[8px]',
    sm: 'w-6 h-6 text-[9px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  };

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <div className="flex -space-x-1.5">
      {visibleUsers.map(user => (
        <div
          key={user.id}
          className={cn(
            "rounded-lg bg-slate-200 flex items-center justify-center font-semibold border-2 border-white overflow-hidden flex-shrink-0",
            sizeClasses[size]
          )}
          title={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>
              {user.first_name && user.last_name
                ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase()
                : user.email ? user.email.charAt(0).toUpperCase() : '?'}
            </span>
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            "rounded-lg bg-slate-300 flex items-center justify-center font-semibold border-2 border-white flex-shrink-0",
            sizeClasses[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  );
}