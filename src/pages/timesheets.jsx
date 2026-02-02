import React, { useEffect, useMemo, useState } from "react";
import TimesheetsSettingsPanel from "../components/timesheets/TimesheetsSettingsPanel";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import Avatar from "@/components/Avatar";
import { CalendarDays, MoreVertical, FileText, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { createPageUrl } from "@/utils";
import { useData } from "@/components/DataProvider";

const dayLabel = (dateStr) => `${format(new Date(dateStr), "EEEE, d MMM").toUpperCase()}`;
const toHM = (totalMinutes) => { const m = Math.max(0, Math.round(totalMinutes || 0)); const h = Math.floor(m/60); const mm = String(m%60).padStart(2,'0'); return `${String(h).padStart(2,'0')}:${mm}`; };
const diffMinutes = (a,b) => { if(!a||!b) return 0; const s=parseISO(a), e=parseISO(b); if(isNaN(s)||isNaN(e)) return 0; return Math.max(0, Math.round((e.getTime()-s.getTime())/60000)); };

export default function TimesheetsPage(){
  const { currentCompany } = useData();
  const [loading,setLoading]=useState(true);
  const [entries,setEntries]=useState([]);
  const [projects,setProjects]=useState([]);
  const [customers,setCustomers]=useState([]);
  const [users,setUsers]=useState([]);
  const [categories,setCategories]=useState([]);
  const [settings,setSettings]=useState(null);
  const [selected,setSelected]=useState(new Set());
  const [bulkBusy,setBulkBusy]=useState(false);
  const [showExtras,setShowExtras]=useState(()=>{ const v=localStorage.getItem('timesheets_show_extras'); return v===null?true:v==='true'; });
  const [showSettings, setShowSettings] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [orderBy, setOrderBy] = useState('date');
  const [runningBackfill, setRunningBackfill] = useState(false);
  useEffect(()=>{ localStorage.setItem('timesheets_show_extras', String(showExtras)); },[showExtras]);

  useEffect(()=>{ (async()=>{ setLoading(true); try{
      const [wrs, tes, pro, cus, usr, cat, setts] = await Promise.all([
        base44.entities.WorkingReport.list('-updated_date', 2000),
        base44.entities.TimeEntry.list('-updated_date', 2000),
        base44.entities.Project.list('-updated_date', 1000),
        base44.entities.Customer.list('-updated_date', 1000),
        base44.entities.User.list('-updated_date', 1000),
        base44.entities.WorkOrderCategory.list('sort_order', 1000).catch(()=>[]),
        base44.entities.TimesheetsSettings.list().catch(()=>[])
      ]);
      const teById = new Map((tes||[]).map(t=>[t.id,t]));
      const filteredReports = (wrs||[]).filter(r=>{
        if(currentCompany?.id && r.branch_id && r.branch_id!==currentCompany.id) return false;
        return true; // include reports with or without times or linked order
      });
      const combined = filteredReports.map(r=>{
        const o = teById.get(r.time_entry_id) || {};
        return {
          id: r.id,
          report_number: r.report_number,
          title: o.title,
          project_id: o.project_id,
          work_order_number: o.work_order_number,
          employee_ids: r.employee_ids && r.employee_ids.length ? r.employee_ids : (o.employee_ids||[]),
          work_order_category_id: o.work_order_category_id,
          status: r.status,
          planned_start_time: o.planned_start_time,
          planned_end_time: o.planned_end_time,
          start_time: r.start_time || o.start_time,
          end_time: r.end_time || o.end_time,
          duration_minutes: typeof r.duration_minutes==='number' ? r.duration_minutes : o.duration_minutes,
          time_entry_id: o.id
        };
      });
      setEntries(combined); setProjects(pro||[]); setCustomers(cus||[]); setUsers(usr||[]); setCategories(cat||[]); setSettings((setts&&setts[0])||null);
    } finally { setLoading(false); } })(); },[currentCompany?.id]);

  const projectById = useMemo(()=>new Map(projects.map(p=>[p.id,p])),[projects]);
  const customerById = useMemo(()=>new Map(customers.map(c=>[c.id,c])),[customers]);
  const extraFields = useMemo(()=> settings?.fields || [], [settings]);
  const visibleExtraKeys = useMemo(()=> showExtras ? extraFields.filter(f=>f?.default_visible!==false).map(f=>f.key) : [], [extraFields, showExtras]);

  const grouped = useMemo(()=>{
    const inRange = (e) => {
      if (!dateFrom && !dateTo) return true;
      const d = e.end_time || e.start_time || e.planned_start_time || e.task_start_date;
      if (!d) return false;
      const dt = new Date(d);
      const from = dateFrom ? new Date(dateFrom) : null;
      const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
      if (from && dt < from) return false;
      if (to && dt > to) return false;
      return true;
    };
    const filtered = (entries||[]).filter(inRange);
    const map=new Map();
    filtered.forEach(e=>{ const d=e.end_time||e.start_time||e.planned_start_time||e.task_start_date||e.created_date; const k=d?format(new Date(d),'yyyy-MM-dd'):'Unknown'; if(!map.has(k)) map.set(k,[]); map.get(k).push(e); });
    return Array.from(map.entries())
      .sort((a,b)=> b[0].localeCompare(a[0]))
      .map(([k,list])=>{
        const items = [...list];
        if (orderBy === 'report') {
          items.sort((a,b)=> (a.report_number||'').localeCompare(b.report_number||''));
        } else {
          items.sort((a,b)=> {
            const ad = new Date(a.end_time||a.start_time||a.planned_start_time||0).getTime();
            const bd = new Date(b.end_time||b.start_time||b.planned_start_time||0).getTime();
            return ad - bd;
          });
        }
        return {key:k,label:k==='Unknown'?'UNKNOWN':dayLabel(k),items};
      });
  },[entries, dateFrom, dateTo, orderBy]);

  const toggleSelect=(id,checked)=> setSelected(prev=>{ const n=new Set(prev); if(checked) n.add(id); else n.delete(id); return n; });
  const toggleSelectAll=(ids,checked)=> setSelected(prev=>{ const n=new Set(prev); ids.forEach(id=>{ if(checked) n.add(id); else n.delete(id); }); return n; });

  const approveSelected=async()=>{ if(selected.size===0) return; setBulkBusy(true); try{ await Promise.all(Array.from(selected).map(id=> base44.entities.WorkingReport.update(id,{status:'approved'}))); const wrs=await base44.entities.WorkingReport.list('-updated_date',2000); const tes=await base44.entities.TimeEntry.list('-updated_date',2000); const teById=new Map((tes||[]).map(t=>[t.id,t])); const combined=(wrs||[]).map(r=>{ const o=teById.get(r.time_entry_id)||{}; return { id:r.id, report_number:r.report_number, title:o.title, project_id:o.project_id, work_order_number:o.work_order_number, employee_ids:r.employee_ids&&r.employee_ids.length?r.employee_ids:(o.employee_ids||[]), work_order_category_id:o.work_order_category_id, status:r.status, planned_start_time:o.planned_start_time, planned_end_time:o.planned_end_time, start_time:r.start_time||o.start_time, end_time:r.end_time||o.end_time, duration_minutes: typeof r.duration_minutes==='number'?r.duration_minutes:o.duration_minutes, time_entry_id:o.id }; }); setEntries(combined); setSelected(new Set()); } finally { setBulkBusy(false);} };
  const rejectSelected=async()=>{ if(selected.size===0) return; setBulkBusy(true); try{ await Promise.all(Array.from(selected).map(id=> base44.entities.WorkingReport.update(id,{status:'draft'}))); const wrs=await base44.entities.WorkingReport.list('-updated_date',2000); const tes=await base44.entities.TimeEntry.list('-updated_date',2000); const teById=new Map((tes||[]).map(t=>[t.id,t])); const combined=(wrs||[]).map(r=>{ const o=teById.get(r.time_entry_id)||{}; return { id:r.id, report_number:r.report_number, title:o.title, project_id:o.project_id, work_order_number:o.work_order_number, employee_ids:r.employee_ids&&r.employee_ids.length?r.employee_ids:(o.employee_ids||[]), work_order_category_id:o.work_order_category_id, status:r.status, planned_start_time:o.planned_start_time, planned_end_time:o.planned_end_time, start_time:r.start_time||o.start_time, end_time:r.end_time||o.end_time, duration_minutes: typeof r.duration_minutes==='number'?r.duration_minutes:o.duration_minutes, time_entry_id:o.id }; }); setEntries(combined); setSelected(new Set()); } finally { setBulkBusy(false);} };

  const runBackfill = async () => {
    setRunningBackfill(true);
    try {
      await base44.functions.invoke('backfillWorkingReportNumbers', {});
      window.location.reload();
    } finally {
      setRunningBackfill(false);
    }
  };

  const openPDF=(id)=>{ const url=createPageUrl(`WorkOrderPDFView?id=${id}`); window.open(url,'_blank'); };

  // Grid: compact like Projects page (small fonts, tight rows)
  const baseCols=["40px","120px","minmax(240px,1fr)","140px","120px","100px","100px","100px","60px"]; // select, report no, titles, workers, category, status, planned, total, actions
  const gridTemplate=[...baseCols, ...visibleExtraKeys.map(()=>"140px")].join(" ");

  return (
    <>
      <div className="p-4 text-[12px]">
      <div className="max-w-[1200px] mx-auto">
        {/* Header with toggle and settings */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Timesheets Reports</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Extra columns</span>
              <Switch checked={showExtras} onCheckedChange={(v)=>setShowExtras(!!v)} />
            </div>
            <Button variant="outline" size="sm" onClick={runBackfill} disabled={runningBackfill} className="gap-2">
              {runningBackfill ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Backfill WR numbers
            </Button>
            <Button variant="outline" size="sm" onClick={()=>setShowSettings(true)}>Settings</Button>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-[12px]">
         <div className="flex items-center gap-2">
           <span className="text-slate-600">From</span>
           <input type="date" className="border rounded px-2 py-1 text-sm" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} />
         </div>
         <div className="flex items-center gap-2">
           <span className="text-slate-600">To</span>
           <input type="date" className="border rounded px-2 py-1 text-sm" value={dateTo} onChange={e=>setDateTo(e.target.value)} />
         </div>
         <div className="flex items-center gap-2">
           <span className="text-slate-600">Sort</span>
           <select className="border rounded px-2 py-1 text-sm" value={orderBy} onChange={e=>setOrderBy(e.target.value)}>
             <option value="date">Date</option>
             <option value="report">Report No</option>
           </select>
         </div>
        </div>

        <Card className="overflow-hidden">
          {/* Column headers */}
          <div className="grid items-center bg-slate-100 px-4 py-2 text-[10px] uppercase tracking-wide text-slate-600" style={{gridTemplateColumns:gridTemplate}}>
            <div>Select</div>
            <div>Report No</div>
            <div>Order Title / Report Title / Client</div>
            <div>Workers</div>
            <div>Categories</div>
            <div>Status</div>
            <div className="text-right">Planned</div>
            <div className="text-right">Total</div>
            <div className="text-right">Actions</div>
            {visibleExtraKeys.map((key)=> (
              <div key={key} className="text-right">{extraFields.find(f=>f.key===key)?.label}</div>
            ))}
          </div>

          <div className="divide-y">
            {loading ? (
              <div className="flex items-center justify-center p-10 text-slate-500 text-sm"><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Loading…</div>
            ) : (
              grouped.map(group=>{
                const ids = group.items.map(i=>i.id);
                const allChecked = ids.every(id=>selected.has(id));
                return (
                  <div key={group.key}>
                    {/* Group header */}
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-1.5 text-[10px] uppercase tracking-wide text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4" /> {group.label}
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={allChecked} onCheckedChange={(v)=>toggleSelectAll(ids, !!v)} />
                        <span className="text-slate-500">Select all</span>
                      </div>
                    </div>

                    {/* Rows */}
                    <div>
                      {group.items.map(e=>{
                        const proj=projectById.get(e.project_id); const cust=proj?customerById.get(proj.customer_id):null;
                        const planned = toHM(diffMinutes(e.planned_start_time, e.planned_end_time));
                        const total = toHM(e.duration_minutes ?? diffMinutes(e.start_time, e.end_time));
                        const cat = categories.find(c=>c.id===e.work_order_category_id);
                        const workerIds = e.employee_ids || [];
                        return (
                          <div key={e.id} className="grid items-center px-4 py-1.5 hover:bg-slate-50" style={{gridTemplateColumns:gridTemplate}}>
                            <div className="flex items-center"><Checkbox checked={selected.has(e.id)} onCheckedChange={(v)=>toggleSelect(e.id, !!v)} /></div>
                            <div>
                              <button onClick={()=>openPDF(e.time_entry_id)} className="text-indigo-600 hover:underline font-medium flex items-center gap-1 text-[12px]"><FileText className="w-4 h-4" /> {e.work_order_number || '—'}</button>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[12px] font-medium text-slate-900 truncate">{e.title || '—'}</div>
                              <div className="flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-sky-500" />
                                <span className="font-semibold text-slate-800 truncate">{proj?.name || 'No Project Assigned'}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">{cust?.name ? `Client: ${cust.name}` : 'Client: -'}</div>
                            </div>
                            <div>
                              <div className="flex -space-x-2 items-center">
                                {workerIds.slice(0,3).map(uid=> (
                                  <div key={uid} className="inline-block border-2 border-white rounded-full"><Avatar user={users.find(u=>u.id===uid)} size="xs" /></div>
                                ))}
                                {workerIds.length>3 && <div className="h-6 w-6 rounded-full bg-slate-200 text-[10px] flex items-center justify-center text-slate-700 font-medium">+{workerIds.length-3}</div>}
                              </div>
                            </div>
                            <div>{cat ? <Badge className="bg-slate-100 text-slate-700">{cat.name}</Badge> : <span className="text-[11px] text-slate-500">—</span>}</div>
                            <div>{e.status==='approved' ? (
  <Badge className="bg-green-100 text-green-700">Approved</Badge>
) : e.status==='submitted' ? (
  <Badge className="bg-blue-100 text-blue-700">Submitted</Badge>
) : (
  <Badge className="bg-amber-100 text-amber-800">Draft</Badge>
)}</div>
                            <div className="text-right text-[12px] text-slate-900">{planned} h</div>
                            <div className="text-right"><div className="inline-block px-3 py-0.5 rounded-full bg-blue-100 text-blue-900 font-bold text-[12px] tracking-wide">{total} h</div></div>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-slate-100"><MoreVertical className="w-4 h-4 text-slate-600" /></button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end"><DropdownMenuItem onClick={()=>openPDF(e.time_entry_id)}>📄 View Report PDF</DropdownMenuItem></DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            {visibleExtraKeys.map((key)=> (<div key={key} className="text-right text-[11px] text-slate-600">—</div>))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {selected.size>0 && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border border-slate-200 shadow-xl rounded-full px-3 py-1.5 flex items-center gap-2 text-[12px]">
            <span className="text-slate-700 mr-2">{selected.size} selected</span>
            <Button size="sm" onClick={approveSelected} disabled={bulkBusy} className="bg-green-600 hover:bg-green-700 text-white h-8">{bulkBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}Approve</Button>
            <Button size="sm" variant="outline" onClick={rejectSelected} disabled={bulkBusy} className="h-8">{bulkBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : null}Reject</Button>
          </div>
        )}
      </div>
    </div>
    {showSettings && (
      <TimesheetsSettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSaved={() => {}}
      />
    )}
    </>
  );
}