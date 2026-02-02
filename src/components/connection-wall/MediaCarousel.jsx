import React, { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function MediaCarousel({ items = [] }) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  if (!items || items.length === 0) return null;

  const clamp = (i) => {
    if (i < 0) return items.length - 1;
    if (i >= items.length) return 0;
    return i;
  };

  const prev = () => setIndex((i) => clamp(i - 1));
  const next = () => setIndex((i) => clamp(i + 1));

  const onTouchStart = (e) => {
    touchStartX.current = e.touches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches?.[0]?.clientX ?? touchStartX.current;
    const dx = endX - touchStartX.current;
    if (Math.abs(dx) > 40) {
      if (dx > 0) prev(); else next();
    }
    touchStartX.current = null;
  };

  const current = items[index];

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div
            className="w-full bg-black/5 rounded-xl overflow-hidden flex items-center justify-center aspect-[16/10]"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {current?.type === 'video' ? (
              <video className="w-full h-full object-cover" controls>
                <source src={current.url} />
              </video>
            ) : (
              <img src={current?.url} alt={`media-${index}`} className="w-full h-full object-cover" />
            )}
          </div>

          {items.length > 1 && (
            <>
              <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 rounded-full p-2 shadow">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-slate-800 rounded-full p-2 shadow">
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 md:hidden">
                {items.map((_, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full ${i === index ? 'bg-white' : 'bg-white/60'} border border-slate-300`} />
                ))}
              </div>
            </>
          )}
        </div>

        {items.length > 1 && (
          <div className="hidden md:flex flex-col gap-2 w-20">
            {items.map((it, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`relative aspect-[4/3] rounded-md overflow-hidden border ${i === index ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-200'}`}
                title={`Media ${i + 1}`}
              >
                {it?.type === 'video' ? (
                  <div className="w-full h-full bg-black/10 flex items-center justify-center text-[10px] text-slate-600">VIDEO</div>
                ) : (
                  <img src={it?.url} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}