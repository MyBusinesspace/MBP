import React from 'react';

export default function Logo({ className = "", showText = true, variant = "full" }) {
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/44234b47c_Screenshot2025-09-30at102222AM.png";

  if (variant === "icon-only") {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src={logoUrl}
          alt="Redcrane Pace Logo"
          className="w-8 h-8 rounded-full object-cover flex-shrink-0" />

      </div>);

  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoUrl}
        alt="Redcrane Pace Logo"
        className="w-8 h-8 rounded-full object-cover flex-shrink-0" />

      
      {showText &&
      <div className="flex flex-col">
          <h1 className="header-express text-lg font-medium tracking-tight leading-none">



        </h1>
          <p className="text-[9px] text-slate-500 content-lexend leading-none">

        </p>
        </div>
      }
    </div>);

}