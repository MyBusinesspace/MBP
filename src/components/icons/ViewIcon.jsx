import React from 'react';

export default function ViewIcon({ className = "w-20 h-20" }) {
  return (
    <img 
      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/00d2851e6_eyelogonobackground.png"
      alt="View"
      className={className}
      style={{ 
        objectFit: 'contain'
      }}
    />
  );
}