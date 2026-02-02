import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, X, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

// Format WO number into 0019/26 no matter the stored variant
const formatWONumber = (n) => {
  if (!n) return '';
  const s = String(n).trim();
  if (/^\d{3,4}\/\d{2}$/i.test(s)) return s;
  const m2 = s.match(/^WO-(\d{3,4})\/(\d{2})$/i);
  if (m2) return `${m2[1]}/${m2[2]}`;
  const m3 = s.match(/^WR-(\d{4})-(\d{1,4})$/i);
  if (m3) return `${m3[2].padStart(4,'0')}/${m3[1].slice(-2)}`;
  const m4 = s.match(/^WO-(\d{4})-(\d{1,4})$/i);
  if (m4) return `${m4[2].padStart(4,'0')}/${m4[1].slice(-2)}`;
  return '-';
};

export default function WorkOrderPDFDialog({ 
    workOrder, 
    project, 
    customer, 
    branch,
    assignedUsers,
    assignedTeams,
    assignedAssets,
    woCategory,
    shiftType,
    onClose 
}) {
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [wrNumber, setWrNumber] = useState(null);
    const [woNumber, setWoNumber] = useState(null);
    const [formData, setFormData] = useState({
        work_done_items: [],
        work_pending_items: [],
        spare_parts_items: [],
        spare_parts_pending_items: [],
        client_feedback_comments: '',
        client_representative_name: '',
        client_representative_phone: '',
        client_signature_url: ''
    });

    useEffect(() => {
        if (workOrder) {
            setFormData({
                work_done_items: workOrder.work_done_items || [],
                work_pending_items: workOrder.work_pending_items || [],
                spare_parts_items: workOrder.spare_parts_items || [],
                spare_parts_pending_items: workOrder.spare_parts_pending_items || [],
                client_feedback_comments: workOrder.client_feedback_comments || '',
                client_representative_name: workOrder.client_representative_name || '',
                client_representative_phone: workOrder.client_representative_phone || '',
                client_signature_url: workOrder.client_signature_url || ''
            });
        }
    }, [workOrder]);

    // Ensure WR exists with number and refresh WO number
    useEffect(() => {
        if (!workOrder?.id) { setWrNumber(null); setWoNumber(null); return; }
        (async () => {
            try {
                const resolveBranchId = workOrder?.branch_id || project?.branch_id || branch?.id || null;
                const dateRef = workOrder?.start_time || workOrder?.planned_start_time || new Date().toISOString();
                let arr = await base44.entities.WorkingReport.filter({ time_entry_id: workOrder.id });
                arr = Array.isArray(arr) ? arr : [];
                if (!workOrder?.start_time) {
                    if (arr.length > 0) {
                        const sorted = [...arr].sort((a,b) => {
                            const ta = new Date(a.start_time || a.created_date || 0).getTime();
                            const tb = new Date(b.start_time || b.created_date || 0).getTime();
                            return tb - ta;
                        });
                        const latest = sorted[0];
                        setWrNumber(latest?.report_number || null);
                    } else {
                        setWrNumber(null);
                    }
                } else if (arr.length === 0) {
                    let code = null;
                    if (resolveBranchId) {
                        const res = await base44.functions.invoke('getNextWorkingReportNumber', { branch_id: resolveBranchId, date: dateRef });
                        code = res?.data || null;
                    }
                    await base44.entities.WorkingReport.create({
                        time_entry_id: workOrder.id,
                        branch_id: resolveBranchId,
                        report_number: code,
                        start_time: workOrder?.start_time || null,
                        end_time: workOrder?.end_time || null,
                        duration_minutes: workOrder?.duration_minutes || null,
                        team_ids: workOrder?.team_ids || [],
                        employee_ids: workOrder?.employee_ids || [],
                        status: 'draft'
                    });
                    setWrNumber(code);
                } else {
                    const sorted = [...arr].sort((a,b) => {
                        const ta = new Date(a.start_time || a.created_date || 0).getTime();
                        const tb = new Date(b.start_time || b.created_date || 0).getTime();
                        return tb - ta;
                    });
                    const latest = sorted[0];
                    if (latest.report_number) setWrNumber(latest.report_number);
                    else if (workOrder?.start_time) {
                        let code = null;
                        if (resolveBranchId) {
                            const res = await base44.functions.invoke('getNextWorkingReportNumber', { branch_id: resolveBranchId, date: dateRef });
                            code = res?.data || null;
                        }
                        await base44.entities.WorkingReport.update(latest.id, { report_number: code });
                        setWrNumber(code);
                    } else {
                        setWrNumber(null);
                    }
                }
            } catch { setWrNumber(null); }

            try {
                const rows = await base44.entities.TimeEntry.filter({ id: workOrder.id });
                const latestWO = rows?.[0] || workOrder;
                setWoNumber(latestWO?.work_order_number || null);
            } catch {
                setWoNumber(workOrder?.work_order_number || null);
            }
        })();
    }, [workOrder?.id]);

    const formatTime = (isoString) => {
        if (!isoString) return '-';
        try {
            const date = parseISO(isoString);
            return format(date, 'hh:mm a');
        } catch {
            return '-';
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        try {
            const date = parseISO(isoString);
            return format(date, 'dd/MM/yyyy');
        } catch {
            return '-';
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Save TimeEntry fields edited in PDF
            await base44.entities.TimeEntry.update(workOrder.id, formData);

            // Ensure a WorkingReport exists WITH number
            const existing = await base44.entities.WorkingReport.filter({ time_entry_id: workOrder.id });
            let number = existing?.[0]?.report_number || null;

            const resolveBranchId = workOrder?.branch_id || project?.branch_id || branch?.id || null;
            const dateRef = workOrder?.start_time || workOrder?.planned_start_time || new Date().toISOString();

            if (!existing || existing.length === 0) {
                let code = null;
                if (resolveBranchId) {
                    const res = await base44.functions.invoke('getNextWorkingReportNumber', { branch_id: resolveBranchId, date: dateRef });
                    code = res?.data || null;
                }
                const wr = await base44.entities.WorkingReport.create({
                    time_entry_id: workOrder.id,
                    branch_id: resolveBranchId,
                    report_number: code,
                    start_time: workOrder?.start_time || null,
                    end_time: workOrder?.end_time || null,
                    duration_minutes: workOrder?.duration_minutes || null,
                    team_ids: workOrder?.team_ids || [],
                    employee_ids: workOrder?.employee_ids || [],
                    status: 'draft'
                });
                number = wr?.report_number || code || null;
            } else if (!number) {
                let code = null;
                if (resolveBranchId) {
                    const res = await base44.functions.invoke('getNextWorkingReportNumber', { branch_id: resolveBranchId, date: dateRef });
                    code = res?.data || null;
                }
                await base44.entities.WorkingReport.update(existing[0].id, { report_number: code });
                number = code;
            }

            if (number) setWrNumber(number);
            toast.success('Report saved successfully');
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving:', error);
            toast.error('Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const renderChecklistTable = (items, title, showQty = false, fieldName = null) => {
        const rows = items?.length > 0 ? items : [];
        const maxRows = 3;
        const displayRows = rows.slice(0, maxRows);
        const emptyRows = Math.max(0, maxRows - displayRows.length);
        
        return (
            <table className="w-full border-collapse text-[9px]">
                <thead>
                    <tr>
                        <th className="border border-slate-400 px-1 py-0.5 bg-red-600 text-white text-left font-semibold">{title}</th>
                        <th className="border border-slate-400 px-1 py-0.5 bg-red-600 text-white text-center w-10 font-semibold">✓</th>
                        {showQty && <th className="border border-slate-400 px-1 py-0.5 bg-red-600 text-white text-center w-12 font-semibold">QTY</th>}
                    </tr>
                </thead>
                <tbody>
                    {displayRows.map((item, idx) => (
                        <tr key={idx}>
                            <td className="border border-slate-300 px-1 py-0.5">
                                {isEditing && fieldName ? (
                                    <input
                                        type="text"
                                        value={item.text || ''}
                                        onChange={(e) => {
                                            const newItems = [...formData[fieldName]];
                                            newItems[idx] = { ...newItems[idx], text: e.target.value };
                                            setFormData({ ...formData, [fieldName]: newItems });
                                        }}
                                        className="w-full bg-white border-0 text-[9px] p-0 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                    />
                                ) : (
                                    item.text || ''
                                )}
                            </td>
                            <td className="border border-slate-300 px-1 py-0.5 text-center">
                                {isEditing && fieldName ? (
                                    <input
                                        type="checkbox"
                                        checked={item.checked || false}
                                        onChange={(e) => {
                                            const newItems = [...formData[fieldName]];
                                            newItems[idx] = { ...newItems[idx], checked: e.target.checked };
                                            setFormData({ ...formData, [fieldName]: newItems });
                                        }}
                                        className="h-3 w-3 mx-auto cursor-pointer"
                                    />
                                ) : (
                                    item.checked ? '☑' : '☐'
                                )}
                            </td>
                            {showQty && (
                                <td className="border border-slate-300 px-1 py-0.5 text-center">
                                    {isEditing && fieldName ? (
                                        <input
                                            type="text"
                                            value={item.qty || ''}
                                            onChange={(e) => {
                                                const newItems = [...formData[fieldName]];
                                                newItems[idx] = { ...newItems[idx], qty: e.target.value };
                                                setFormData({ ...formData, [fieldName]: newItems });
                                            }}
                                            className="w-full bg-white border-0 text-[9px] p-0 text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                    ) : (
                                        item.qty || ''
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                    {[...Array(emptyRows)].map((_, idx) => (
                        <tr key={`empty-${idx}`}>
                            <td className="border border-slate-300 px-1 py-0.5 h-4">&nbsp;</td>
                            <td className="border border-slate-300 px-1 py-0.5 text-center">☐</td>
                            {showQty && <td className="border border-slate-300 px-1 py-0.5 text-center"></td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    if (!workOrder) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="bg-white p-8 rounded-lg text-center">
                    <p className="text-red-500 mb-4">Work Order not found</p>
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        );
    }

    const logoUrl = branch?.logo_forms_url || branch?.logo_url;
    const companyName = branch?.name || "COMPANY NAME";
    const phoneText = branch?.phone || "";
    const companyEmail = branch?.email || "";
    const trnText = branch?.tax_number || "";
    const asset = assignedAssets[0] || {};

    return (
        <div className="fixed inset-0 z-[100] bg-gray-100 overflow-auto">
            {/* Controls */}
            <div className="sticky top-0 bg-white border-b shadow-sm z-10 no-print">
                <div className="max-w-[210mm] mx-auto px-4 py-2 flex gap-2 items-center justify-between">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        <X className="w-4 h-4 mr-2" />
                        Close
                    </Button>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => window.print()} className="bg-red-600 hover:bg-red-700">
                            <Download className="w-4 h-4 mr-2" />
                            Print / Save PDF
                        </Button>
                    </div>
                </div>
            </div>

            {/* PDF Preview */}
            <div className="max-w-[210mm] mx-auto my-4 bg-white shadow-lg print:shadow-none print:my-0 pdf-content">
                <div className="p-4 text-[10px]" style={{ fontFamily: 'Arial, sans-serif' }}>
                    
                    {/* Header - Compacto */}
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-2">
                            <h1 className="text-red-600 font-bold text-sm mb-0.5">{companyName}</h1>
                            <div className="text-[8px] text-gray-700">
                                {phoneText && <div>Tel: {phoneText}</div>}
                                {companyEmail && <div>{companyEmail}</div>}
                                {trnText && <div className="font-semibold">TRN: {trnText}</div>}
                            </div>
                        </div>
                        <div className="flex flex-col items-end">
                            {logoUrl && (
                                <img 
                                    src={logoUrl} 
                                    alt="Logo" 
                                    className="max-w-[200px] max-h-[80px] object-contain"
                                    crossOrigin="anonymous"
                                />
                            )}
                        </div>
                    </div>

                    <div className="border-t-2 border-red-600 mb-2"></div>

                    <div className="flex justify-between items-center mb-2">
                        <h2 className="font-bold text-xs">SERVICE & MAINTENANCE REPORT</h2>
                        <div className="text-[9px] font-semibold text-slate-600 text-right">
                            <div>Working order N: {(woNumber || workOrder?.work_order_number) ? formatWONumber(woNumber || workOrder?.work_order_number) : '-'}</div>
                            <div>Working report N: {wrNumber || '-'}</div>
                        </div>
                    </div>

                    {/* Section 1 - Compacto */}
                    <div className="mb-2">
                        <div className="bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 mb-0.5">
                            1. GENERAL INFORMATION
                        </div>
                        <table className="w-full border-collapse text-[9px]">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold w-16">COMPANY</td>
                                    <td className="border border-slate-400 px-1 py-0.5">{customer?.name || '-'}</td>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold text-center w-16">CATEGORY</td>
                                    <td className="border border-slate-400 px-1 py-0.5 text-center">{woCategory?.name || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold">LOCATION</td>
                                    <td className="border border-slate-400 px-1 py-0.5">{project?.location_name || project?.address || '-'}</td>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold text-center">SHIFT</td>
                                    <td className="border border-slate-400 px-1 py-0.5 text-center">{shiftType?.name || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold">PROJECT</td>
                                    <td className="border border-slate-400 px-1 py-0.5">{project?.name || '-'}</td>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold text-center">DATE</td>
                                    <td className="border border-slate-400 px-1 py-0.5 text-center">{formatDate(workOrder?.planned_start_time)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold">EQUIPMENT</td>
                                    <td className="border border-slate-400 px-1 py-0.5">{assignedAssets.map(a => a.name).join(', ') || '-'}</td>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold text-center">TIME</td>
                                    <td className="border border-slate-400 px-1 py-0.5 text-center">
                                        {formatTime(workOrder?.planned_start_time)} - {workOrder?.end_time ? formatTime(workOrder.end_time) : formatTime(workOrder?.planned_end_time)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold">TITLE</td>
                                    <td className="border border-slate-400 px-1 py-0.5" colSpan={3}>{workOrder?.title || '-'}</td>
                                </tr>
                            </tbody>
                        </table>

                        {(workOrder?.work_description_items?.length > 0) && (
                            <div className="mt-1">
                                <div className="text-[8px] font-semibold text-slate-700 mb-0.5">MANAGEMENT INSTRUCTIONS:</div>
                                {renderChecklistTable(workOrder.work_description_items, 'INSTRUCTION')}
                            </div>
                        )}
                    </div>

                    {/* Section 2 */}
                    <div className="mb-2">
                        <div className="bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 mb-0.5">
                            2. ASSIGNED RESOURCES
                        </div>
                        <table className="w-full border-collapse text-[9px]">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold w-16">TEAMS</td>
                                    <td className="border border-slate-400 px-1 py-0.5">{assignedTeams.map(t => t.name).join(', ') || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold">WORKERS</td>
                                    <td className="border border-slate-400 px-1 py-0.5">
                                        {assignedUsers.map(u => u.nickname || u.first_name || u.full_name || u.email).join(', ') || '-'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 3 - Editable */}
                    <div className="mb-2">
                        <div className="bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 mb-0.5">
                            3. SITE REPORT {isEditing && <span className="text-yellow-300 ml-2">✎ EDITING</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-1 mb-1">
                            <div>
                                <div className="text-[8px] font-semibold text-green-700 mb-0.5">WORK DONE</div>
                                {renderChecklistTable(formData.work_done_items, 'TASK COMPLETED', false, 'work_done_items')}
                            </div>
                            <div>
                                <div className="text-[8px] font-semibold text-orange-700 mb-0.5">WORK PENDING</div>
                                {renderChecklistTable(formData.work_pending_items, 'TASK PENDING', false, 'work_pending_items')}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-1 mb-1">
                            <div>
                                <div className="text-[8px] font-semibold text-green-700 mb-0.5">SPARE PARTS INSTALLED</div>
                                {renderChecklistTable(formData.spare_parts_items, 'PART', true, 'spare_parts_items')}
                            </div>
                            <div>
                                <div className="text-[8px] font-semibold text-orange-700 mb-0.5">SPARE PARTS PENDING</div>
                                {renderChecklistTable(formData.spare_parts_pending_items, 'PART', true, 'spare_parts_pending_items')}
                            </div>
                        </div>

                        <div className="p-1 bg-slate-50 border border-slate-200">
                            <span className="font-semibold text-[9px]">STATUS: </span>
                            <span className={`text-[9px] font-bold ${workOrder?.status === 'open' ? 'text-green-600' : 'text-slate-600'}`}>
                                {workOrder?.status?.toUpperCase() || 'OPEN'}
                            </span>
                        </div>
                    </div>

                    {/* Section 4 */}
                    <div className="mb-2">
                        <div className="bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 mb-0.5">
                            4. TIME TRACKER DATA
                        </div>
                        <table className="w-full border-collapse text-[9px]">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold w-16">CLOCK IN</td>
                                    <td className="border border-slate-400 px-1 py-0.5 text-[8px]">
                                        {workOrder?.start_time ? `${formatDate(workOrder.start_time)} ${formatTime(workOrder.start_time)}` : '-'}
                                    </td>
                                    <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold w-16 text-center">CLOCK OUT</td>
                                    <td className="border border-slate-400 px-1 py-0.5 text-center text-[8px]">
                                        {workOrder?.end_time ? `${formatDate(workOrder.end_time)} ${formatTime(workOrder.end_time)}` : '-'}
                                    </td>
                                </tr>
                                {workOrder?.duration_minutes > 0 && (
                                    <tr>
                                        <td className="border border-slate-400 px-1 py-0.5 bg-red-100 font-semibold">DURATION</td>
                                        <td className="border border-slate-400 px-1 py-0.5 font-bold" colSpan={3}>
                                            {Math.floor(workOrder.duration_minutes / 60)}h {workOrder.duration_minutes % 60}m
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Section 5 - Editable */}
                    <div>
                        <div className="bg-red-600 text-white text-[9px] font-bold px-1 py-0.5 mb-0.5">
                            5. CLIENT APPROVAL {isEditing && <span className="text-yellow-300 ml-2">✎ EDITING</span>}
                        </div>
                        
                        <div className="mb-1">
                            <div className="text-[8px] font-semibold text-slate-700 mb-0.5">CLIENT COMMENTS:</div>
                            {isEditing ? (
                                <textarea
                                    value={formData.client_feedback_comments}
                                    onChange={(e) => setFormData({ ...formData, client_feedback_comments: e.target.value })}
                                    className="w-full border border-slate-300 px-1 py-0.5 min-h-[30px] text-[9px] bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    placeholder="Enter client comments..."
                                />
                            ) : (
                                <div className="border border-slate-300 px-1 py-0.5 min-h-[20px] text-[9px] bg-slate-50">
                                    {formData.client_feedback_comments || '-'}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-0 text-[9px]">
                            <div className="border border-slate-400 px-1 py-1 min-h-[40px]">
                                <p className="font-bold text-[8px] text-slate-600 mb-0.5">WORKERS:</p>
                                <p className="text-[8px]">{assignedUsers.map(u => u.nickname || u.first_name || u.full_name).join(', ') || '-'}</p>
                            </div>
                            <div className="border border-slate-400 px-1 py-1 min-h-[40px]">
                                <p className="font-bold text-[8px] text-slate-600 mb-0.5">CLIENT:</p>
                                {isEditing ? (
                                    <>
                                        <input
                                            type="text"
                                            value={formData.client_representative_name}
                                            onChange={(e) => setFormData({ ...formData, client_representative_name: e.target.value })}
                                            placeholder="Name/Signature"
                                            className="w-full bg-white border border-slate-300 text-[8px] px-1 py-0.5 mb-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                        <input
                                            type="tel"
                                            value={formData.client_representative_phone}
                                            onChange={(e) => setFormData({ ...formData, client_representative_phone: e.target.value })}
                                            placeholder="Mobile"
                                            className="w-full bg-white border border-slate-300 text-[7px] px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <p className="text-[8px]">{formData.client_representative_name || '-'}</p>
                                        <p className="text-[7px] text-slate-500">{formData.client_representative_phone || '-'}</p>
                                    </>
                                )}
                            </div>
                            <div className="border border-slate-400 px-1 py-1 min-h-[40px]">
                                <p className="font-bold text-[8px] text-slate-600 mb-0.5">SIGNATURE:</p>
                                {isEditing ? (
                                    <>
                                        {formData.client_signature_url ? (
                                            <img
                                                src={formData.client_signature_url}
                                                alt="Client signature"
                                                className="h-12 object-contain"
                                                crossOrigin="anonymous"
                                            />
                                        ) : (
                                            <div className="h-12 border border-slate-300 rounded-sm flex items-center justify-center text-[8px] text-slate-400">Signature</div>
                                        )}
                                        <input
                                            type="text"
                                            value={formData.client_signature_url}
                                            onChange={(e) => setFormData({ ...formData, client_signature_url: e.target.value })}
                                            placeholder="Paste signature image URL..."
                                            className="w-full bg-white border border-slate-300 text-[7px] px-1 py-0.5 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        />
                                    </>
                                ) : (
                                    formData.client_signature_url ? (
                                        <img
                                            src={formData.client_signature_url}
                                            alt="Client signature"
                                            className="h-12 object-contain"
                                            crossOrigin="anonymous"
                                        />
                                    ) : (
                                        <div className="h-12 border border-slate-300 rounded-sm flex items-center justify-center text-[8px] text-slate-400">Signature</div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Print styles */}
            <style>{`
                @media print {
                    @page { 
                        size: A4; 
                        margin: 8mm; 
                    }

                    body * {
                        visibility: hidden;
                    }

                    .pdf-content, .pdf-content * {
                        visibility: visible;
                    }

                    .pdf-content {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                    }

                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .no-print {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}