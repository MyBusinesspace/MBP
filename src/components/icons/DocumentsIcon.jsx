import React from 'react';

export default function DocumentsIcon({ className = "w-8 h-8" }) {
  return (
    <img 
      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/11d21565d_HQ_docs-removebg.png"
      alt="Documents"
      className={className}
      style={{ 
        objectFit: 'contain'
      }}
    />
  );
}