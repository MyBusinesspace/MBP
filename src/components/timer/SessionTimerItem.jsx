import React, { useState, useEffect } from 'react';
import { Briefcase, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";

const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

export default function SessionTimerItem({ entry, project, customer, isActive = false }) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        // ✅ FIX: Para timers activos, correr en tiempo real (eliminar condición extra)
        if (isActive && entry?.start_time) {
            const updateTimer = () => {
                const startTime = new Date(entry.start_time);
                const now = new Date();
                const calculatedSeconds = Math.floor((now - startTime) / 1000);
                setElapsedSeconds(Math.max(0, calculatedSeconds)); // Evitar valores negativos
            };
            
            updateTimer(); // Ejecutar inmediatamente
            const timer = setInterval(updateTimer, 1000); // Luego cada segundo
            
            console.log('⏱️ ACTIVE TIMER: Started for entry', entry.id);
            
            return () => {
                clearInterval(timer);
                console.log('⏱️ ACTIVE TIMER: Stopped for entry', entry.id);
            };
        } 
        // ✅ Para timers completados, calcular desde start_time y end_time
        else if (entry?.start_time && entry?.end_time) {
            const startTime = new Date(entry.start_time);
            const endTime = new Date(entry.end_time);
            const calculatedSeconds = Math.floor((endTime - startTime) / 1000);
            setElapsedSeconds(Math.max(0, calculatedSeconds));
            console.log('⏱️ COMPLETED TIMER: Calculated', calculatedSeconds, 'seconds for entry', entry.id);
        }
        // Fallback para casos muy extraños
        else if (entry?.duration_minutes) {
            setElapsedSeconds(entry.duration_minutes * 60);
            console.log('⏱️ FALLBACK TIMER: Using duration_minutes for entry', entry.id);
        } else {
            setElapsedSeconds(0);
        }
    }, [entry, isActive]);

    return (
        <div className={cn(
            "flex items-center justify-between p-3 rounded-md transition-colors border-b border-slate-100 last:border-b-0",
            isActive ? 'bg-green-50' : ''
        )}>
            <div className="flex items-center gap-3 overflow-hidden">
                <Briefcase className={cn(
                    "w-5 h-5 flex-shrink-0",
                    isActive ? 'text-green-600 animate-pulse' : 'text-slate-400'
                )} />
                <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-medium text-slate-800 truncate">{project?.name || 'Unknown Project'}</p>
                    <p className="text-xs text-slate-500 truncate">{entry?.task || (isActive ? 'In progress...' : 'No description')}</p>
                </div>
            </div>
            <div className={cn(
                "flex items-center gap-2 text-lg font-mono font-bold tracking-tight flex-shrink-0 ml-4",
                isActive ? 'text-green-700' : 'text-slate-500'
            )}>
                <Clock className="w-5 h-5" />
                {formatTime(elapsedSeconds)}
            </div>
        </div>
    );
}