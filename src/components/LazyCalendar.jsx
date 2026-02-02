import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const WeekCalendarView = lazy(() => import('./workorders/WeekCalendarView'));
const MonthCalendarView = lazy(() => import('./workorders/MonthCalendarView'));
const DayCalendarView = lazy(() => import('./workorders/DayCalendarView'));

export function LazyWeekCalendar(props) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <WeekCalendarView {...props} />
    </Suspense>
  );
}

export function LazyMonthCalendar(props) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <MonthCalendarView {...props} />
    </Suspense>
  );
}

export function LazyDayCalendar(props) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <DayCalendarView {...props} />
    </Suspense>
  );
}

function CalendarSkeleton() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-600">Loading calendar...</p>
      </div>
    </div>
  );
}