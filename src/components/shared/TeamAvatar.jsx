import React from 'react';
import { cn } from '@/lib/utils';

const colorMap = {
  gray: 'bg-gray-600',
  red: 'bg-red-600',
  yellow: 'bg-yellow-600',
  green: 'bg-green-600',
  blue: 'bg-blue-600',
  indigo: 'bg-indigo-600',
  purple: 'bg-purple-600',
  pink: 'bg-pink-600'
};

export default function TeamAvatar({ team, size = 'md', className }) {
  const sizeClasses = {
    xs: 'w-4 h-4 text-[8px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm'
  };

  const avatarCode = team?.avatar_code || team?.name?.substring(0, 2).toUpperCase() || '??';
  const bgColor = colorMap[team?.color] || 'bg-gray-600';

  return (
    <div 
      className={cn(
        "rounded-full text-white flex items-center justify-center font-bold flex-shrink-0",
        sizeClasses[size],
        bgColor,
        className
      )}
      title={team?.name}
    >
      {avatarCode}
    </div>
  );
}