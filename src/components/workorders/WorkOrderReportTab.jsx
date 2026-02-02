import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FileText, Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function WorkOrderReportTab({ 
  projects = [], 
  users = [], 
  teams = [], 
  customers = [],
  categories = []
}) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Get all work orders for the selected date from projects
  const workOrdersForDate = useMemo(() => {
    const allWorkOrders = [];
    
    projects.forEach(project => {
      const customer = customers?.find(c => c.id === project.customer_id);
      const projectWOs = project.work_orders || [];
      
      projectWOs.forEach(wo => {
        if (wo.planned_start_time) {
          const woDate = format(new Date(wo.planned_start_time), 'yyyy-MM-dd');
          if (woDate === selectedDate) {
            allWorkOrders.push({
              ...wo,
              project_name: project.name,
              customer_name: customer?.name || 'N/A'
            });
          }
        }
      });
    });

    return allWorkOrders.sort((a, b) => {
      if (a.planned_start_time && b.planned_start_time) {
        return new Date(a.planned_start_time) - new Date(b.planned_start_time);
      }
      return 0;
    });
  }, [projects, customers, selectedDate]);

  const generateHTMLReport = () => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Report - ${format(new Date(selectedDate), 'dd/MM/yyyy')}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10px; margin: 10px; }
    h1 { font-size: 14px; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 5px 0; }
    th, td { border: 1px solid #ddd; padding: 3px 5px; text-align: left; }
    th { background-color: #4f46e5; color: white; font-size: 9px; }
    td { font-size: 9px; }
    .wo-number { font-weight: bold; }
  </style>
</head>
<body>
  <h1>Daily Work Orders Report - ${format(new Date(selectedDate), 'dd/MM/yyyy')}</h1>
  <table>
    <thead>
      <tr>
        <th>WO#</th>
        <th>Time</th>
        <th>Customer</th>
        <th>Project</th>
        <th>Team</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${workOrdersForDate.map(wo => {
        const teamIds = wo.team_ids || [];
        const assignedTeams = teams?.filter(t => teamIds.includes(t.id)) || [];
        const teamNames = assignedTeams.map(t => t.name).join(', ') || 'N/A';
        
        return `
        <tr>
          <td class="wo-number">${wo.work_order_number || 'N/A'}</td>
          <td>${wo.planned_start_time ? format(new Date(wo.planned_start_time), 'HH:mm') : 'N/A'}</td>
          <td>${wo.customer_name}</td>
          <td>${wo.project_name}</td>
          <td>${teamNames}</td>
          <td>${wo.status || 'N/A'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <p style="margin-top: 10px; font-size: 9px;">Total: ${workOrdersForDate.length} work orders</p>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${selectedDate}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('HTML report downloaded');
  };

  const generateCSVReport = () => {
    const headers = ['WO#', 'Time', 'Customer', 'Project', 'Team', 'Status'];
    const rows = workOrdersForDate.map(wo => {
      const teamIds = wo.team_ids || [];
      const assignedTeams = teams?.filter(t => teamIds.includes(t.id)) || [];
      const teamNames = assignedTeams.map(t => t.name).join('; ') || 'N/A';
      
      return [
        wo.work_order_number || 'N/A',
        wo.planned_start_time ? format(new Date(wo.planned_start_time), 'HH:mm') : 'N/A',
        wo.customer_name,
        wo.project_name,
        teamNames,
        wo.status || 'N/A'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-report-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV report downloaded');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Report - ${format(new Date(selectedDate), 'dd/MM/yyyy')}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 10px; margin: 10px; }
    h1 { font-size: 14px; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 5px 0; }
    th, td { border: 1px solid #ddd; padding: 3px 5px; text-align: left; }
    th { background-color: #4f46e5; color: white; font-size: 9px; }
    td { font-size: 9px; }
    .wo-number { font-weight: bold; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <h1>Daily Work Orders Report - ${format(new Date(selectedDate), 'dd/MM/yyyy')}</h1>
  <table>
    <thead>
      <tr>
        <th>WO#</th>
        <th>Time</th>
        <th>Customer</th>
        <th>Project</th>
        <th>Team</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${workOrdersForDate.map(wo => {
        const teamIds = wo.team_ids || [];
        const assignedTeams = teams?.filter(t => teamIds.includes(t.id)) || [];
        const teamNames = assignedTeams.map(t => t.name).join(', ') || 'N/A';
        
        return `
        <tr>
          <td class="wo-number">${wo.work_order_number || 'N/A'}</td>
          <td>${wo.planned_start_time ? format(new Date(wo.planned_start_time), 'HH:mm') : 'N/A'}</td>
          <td>${wo.customer_name}</td>
          <td>${wo.project_name}</td>
          <td>${teamNames}</td>
          <td>${wo.status || 'N/A'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
  <p style="margin-top: 10px; font-size: 9px;">Total: ${workOrdersForDate.length} work orders</p>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const selectedDateObj = new Date(selectedDate);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Add padding days at the start (for proper weekday alignment)
    const startDayOfWeek = getDay(monthStart); // 0 = Sunday
    const paddingDays = Array(startDayOfWeek).fill(null);
    
    return [...paddingDays, ...days];
  }, [currentMonth]);

  return (
    <div className="flex gap-4">
      {/* Mini Calendar */}
      <div className="w-64 flex-shrink-0">
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-slate-700">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-center text-[10px] font-semibold text-slate-500 py-1.5">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7 p-1">
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`empty-${idx}`} className="h-7" />;
              }
              
              const isSelected = isSameDay(day, selectedDateObj);
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(format(day, 'yyyy-MM-dd'))}
                  className={cn(
                    "h-7 w-full text-xs rounded transition-colors",
                    isSelected 
                      ? "bg-indigo-600 text-white font-semibold" 
                      : isToday 
                        ? "bg-indigo-100 text-indigo-700 font-semibold"
                        : isCurrentMonth 
                          ? "text-slate-700 hover:bg-slate-100" 
                          : "text-slate-400"
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Export Buttons below calendar */}
        <div className="mt-3 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateHTMLReport}
            className="w-full h-8 text-xs gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Export HTML
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateCSVReport}
            className="w-full h-8 text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="w-full h-8 text-xs gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="flex-1 space-y-3">

      {/* Compact Report Preview */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
        <div className="bg-indigo-600 text-white px-3 py-1.5">
          <h3 className="text-xs font-semibold">
            Daily Report - {format(new Date(selectedDate), 'dd/MM/yyyy')}
          </h3>
        </div>
        
        {workOrdersForDate.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">
            No work orders for this date
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">WO#</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">Time</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">Customer</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">Project</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">Team</th>
                  <th className="px-2 py-1 text-left font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {workOrdersForDate.map((wo, idx) => {
                  const teamIds = wo.team_ids || [];
                  const assignedTeams = teams?.filter(t => teamIds.includes(t.id)) || [];
                  const teamNames = assignedTeams.map(t => t.name).join(', ') || 'N/A';
                  
                  return (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-2 py-1 font-semibold text-slate-900">{wo.work_order_number || 'N/A'}</td>
                      <td className="px-2 py-1 text-slate-600">
                        {wo.planned_start_time ? format(new Date(wo.planned_start_time), 'HH:mm') : 'N/A'}
                      </td>
                      <td className="px-2 py-1 text-slate-600">{wo.customer_name}</td>
                      <td className="px-2 py-1 text-slate-600">{wo.project_name}</td>
                      <td className="px-2 py-1 text-slate-600">{teamNames}</td>
                      <td className="px-2 py-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          wo.status === 'closed' ? 'bg-green-100 text-green-700' :
                          wo.status === 'ongoing' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {wo.status || 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-600">
              Total: <span className="font-semibold">{workOrdersForDate.length}</span> work orders
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}