import React from 'react';

export default function ChatIcon({ className = "w-5 h-5" }) {
  return (
    <img 
      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/ac4de18a7_Gemini_Generated_Image_x0frsfx0frsfx0fr.png"
      alt="Chat"
      className={className}
      style={{ 
        objectFit: 'contain'
      }}
    />
  );
}