import React from 'react';

export default function ActivityIcon({ className = "w-20 h-20" }) {
  return (
    <img 
      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/f6c1c41d4_removebg1.png"
      alt="Activity"
      className={className}
      style={{ 
        objectFit: 'contain'
      }}
    />
  );
}