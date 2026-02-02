import React, { useState, useEffect } from 'react';
import { Briefcase, Clock } from 'lucide-react';

const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

export default function ActiveSessionTimer({ entry, project }) {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        let timer;
        if (entry?.is_active) {
            const updateTimer = () => {
                const startTime = new Date(entry.start_time);
                const now = new Date();
                setElapsedSeconds(Math.floor((now - startTime) / 1000));
            };
            updateTimer();
            timer = setInterval(updateTimer, 1000);
        }
        return () => clearInterval(timer);
    }, [entry]);

    if (!entry) return null;

    return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                    <Briefcase className="w-5 h-5 flex-shrink-0 text-green-600 animate-pulse" />
                    <div className="flex-grow overflow-hidden">
                        <p className="text-sm font-medium text-slate-800 truncate">{project?.name || 'Unknown Project'}</p>
                        <p className="text-xs text-slate-500 truncate">{entry.task || 'In progress...'}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-lg font-mono font-bold tracking-tight text-green-700 flex-shrink-0 ml-4">
                    <Clock className="w-5 h-5" />
                    {formatTime(elapsedSeconds)}
                </div>
            </div>
        </div>
    );
}