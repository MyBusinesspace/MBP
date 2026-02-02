import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { TimeEntry, Project, Customer, Team, Asset, ClientEquipment, WorkOrderCategory, Branch, User, ShiftType, WorkingReport } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { useData } from '../components/DataProvider';

export default function WorkOrderPDFView() {
    const { currentCompany } = useData();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [workOrder, setWorkOrder] = useState(null);
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [branch, setBranch] = useState(null);
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [assignedTeams, setAssignedTeams] = useState([]);
    const [assignedAssets, setAssignedAssets] = useState([]);
    const [woCategory, setWoCategory] = useState(null);
    const [shiftType, setShiftType] = useState(null);
    const [wrNumber, setWrNumber] = useState(null);

    const urlParams = new URLSearchParams(window.location.search);
    const workOrderId = urlParams.get('id');

    useEffect(() => {
        if (!workOrderId) {
            setError('No work order ID provided');
            setLoading(false);
            return;
        }
        loadData();
    }, [workOrderId]);

    const loadData = async () => {
        try {
            console.log('📄 Loading PDF data for work order:', workOrderId);
            setLoading(true);
            
            const wo = await TimeEntry.get(workOrderId);
            console.log('✅ Work Order loaded:', wo);
            if (!wo) {
                console.error('❌ Work Order not found');
                setError('Work Order not found');
                setLoading(false);
                return;
            }
            setWorkOrder(wo);

            // Load existing Working Report number only; do not create if no clock-in
            try {
                const resolveBranchId = wo.branch_id || currentCompany?.id || null;
                const dateRef = wo.start_time || wo.planned_start_time || wo.created_date || new Date().toISOString();
                let wrs = await WorkingReport.filter({ time_entry_id: wo.id });
                wrs = Array.isArray(wrs) ? wrs : [];
                if (wrs.length === 0) {
                    let code = null;
                    if (resolveBranchId) {
                        const res = await base44.functions.invoke('getNextWorkingReportNumber', { branch_id: resolveBranchId, date: dateRef });
                        code = res?.data || null;
                    }
                    await base44.entities.WorkingReport.create({
                        time_entry_id: wo.id,
                        branch_id: resolveBranchId,
                        report_number: code,
                        start_time: wo.start_time || null,
                        end_time: wo.end_time || null,
                        duration_minutes: wo.duration_minutes || null,
                        team_ids: wo.team_ids || [],
                        employee_ids: wo.employee_ids || [],
                        status: 'draft'
                    });
                    setWrNumber(code);
                } else {
                    wrs.sort((a,b) => {
                        const ta = new Date(a.start_time || a.created_date || 0).getTime();
                        const tb = new Date(b.start_time || b.created_date || 0).getTime();
                        return tb - ta;
                    });
                    const latest = wrs[0];
                    if (latest.report_number) {
                        setWrNumber(latest.report_number);
                    } else {
                        let code = null;
                        if (resolveBranchId) {
                            const res = await base44.functions.invoke('getNextWorkingReportNumber', { branch_id: resolveBranchId, date: dateRef });
                            code = res?.data || null;
                        }
                        await base44.entities.WorkingReport.update(latest.id, { report_number: code });
                        setWrNumber(code);
                    }
                }
            } catch {
                setWrNumber(null);
            }

            const [projectData, users, teams, assets, clientEquipments, shiftTypes] = await Promise.all([
                wo.project_id ? Project.get(wo.project_id) : null,
                User.list(),
                Team.list(),
                Asset.list(),
                ClientEquipment.list(),
                ShiftType.list()
            ]);

            setProject(projectData);

            if (projectData?.customer_id) {
                const customerData = await Customer.get(projectData.customer_id);
                setCustomer(customerData);
            }

            // Use work order branch_id first (most reliable), then project branch_id, fallback to currentCompany
            let branchData = null;
            if (wo.branch_id) {
                branchData = await Branch.get(wo.branch_id);
            } else if (projectData?.branch_id) {
                branchData = await Branch.get(projectData.branch_id);
            } else {
                branchData = currentCompany;
            }
            console.log('🏢 Branch resolved:', branchData?.name);
            setBranch(branchData);

            if (wo.work_order_category_id) {
                const cat = await WorkOrderCategory.get(wo.work_order_category_id);
                setWoCategory(cat);
            }

            if (wo.shift_type_id) {
                const shift = shiftTypes.find(s => s.id === wo.shift_type_id);
                setShiftType(shift);
            }

            const assigned = (users || []).filter(u => (wo.employee_ids || []).includes(u.id));
            setAssignedUsers(assigned);

            const assignedT = (teams || []).filter(t => (wo.team_ids || []).includes(t.id));
            setAssignedTeams(assignedT);

            const resolvedAssets = (wo.equipment_ids || []).map(id => {
                const asset = assets.find(a => a.id === id);
                if (asset) return { ...asset, type: 'Asset' };
                const clientEq = clientEquipments.find(e => e.id === id);
                if (clientEq) return { ...clientEq, type: 'Client Equipment' };
                return null;
            }).filter(Boolean);
            setAssignedAssets(resolvedAssets);

        } catch (e) {
            console.error('Error loading data:', e);
            setError(e.message);
        } finally {
            setLoading(false);
            console.log('✅ All data loaded');
            // No auto print; user triggers manually via button
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute:'2-digit', 
            timeZone: 'Asia/Dubai',
            hour12: true 
        });
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleDateString('en-GB', {
            timeZone: 'Asia/Dubai'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-red-500 text-lg">{error}</p>
                <Link to={createPageUrl('work-orders')}>
                    <Button variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Work Orders
                    </Button>
                </Link>
            </div>
        );
    }

    const logoUrl = branch?.logo_forms_url || branch?.logo_url;
    const companyName = branch?.name || "COMPANY NAME";
    const phoneText = branch?.phone || "";
    const companyEmail = branch?.email || "";
    const trnText = branch?.tax_number || "";
    const asset = assignedAssets[0] || {};

    // Helper for checklist rendering
    const renderChecklistTable = (items, title, showQty = false) => {
        const rows = items?.length > 0 ? items : [];
        const emptyRows = Math.max(0, 3 - rows.length);
        
        return (
            <table className="w-full border-collapse text-xs mb-2">
                <thead>
                    <tr>
                        <th className="border border-slate-400 p-1.5 bg-red-600 text-white text-left font-semibold">{title}</th>
                        <th className="border border-slate-400 p-1.5 bg-red-600 text-white text-center w-16 font-semibold">✓</th>
                        {showQty && <th className="border border-slate-400 p-1.5 bg-red-600 text-white text-center w-12 font-semibold">QTY</th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((item, idx) => (
                        <tr key={idx}>
                            <td className="border border-slate-300 p-1.5">{item.text || ''}</td>
                            <td className="border border-slate-300 p-1.5 text-center">{item.checked ? '☑' : '☐'}</td>
                            {showQty && <td className="border border-slate-300 p-1.5 text-center">{item.qty || ''}</td>}
                        </tr>
                    ))}
                    {[...Array(emptyRows)].map((_, idx) => (
                        <tr key={`empty-${idx}`}>
                            <td className="border border-slate-300 p-1.5 h-6">&nbsp;</td>
                            <td className="border border-slate-300 p-1.5 text-center">☐</td>
                            {showQty && <td className="border border-slate-300 p-1.5 text-center"></td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* Controls */}
            <div className="max-w-[210mm] mx-auto mb-4 flex gap-2 no-print">
                <Link to={createPageUrl('work-orders')}>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </Link>
                <Button size="sm" onClick={() => {
                    console.log('🖨️ Manual print button clicked');
                    window.print();
                }} className="bg-red-600 hover:bg-red-700">
                    <Download className="w-4 h-4 mr-2" />
                    Print / Save PDF
                </Button>
            </div>

            {/* PDF Preview */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none pdf-content" style={{ minHeight: '297mm' }}>
                <div className="p-6 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                    
                    {/* ============ HEADER ============ */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 pr-4">
                            <h1 className="text-red-600 font-bold text-lg mb-1">{companyName}</h1>
                            {phoneText && <p className="text-xs text-gray-700">Tel: {phoneText}</p>}
                            {companyEmail && <p className="text-xs text-gray-700">{companyEmail}</p>}
                            {trnText && <p className="text-xs font-semibold">TRN: {trnText}</p>}
                        </div>
                        <div className="flex flex-col items-end">
                            {logoUrl ? (
                                <img 
                                    src={logoUrl} 
                                    alt="Logo" 
                                    className="max-w-[360px] max-h-[160px] object-contain"
                                    crossOrigin="anonymous"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-[300px] h-[120px] bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                                    Logo
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t-4 border-red-600 mb-4"></div>

                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-base">SERVICE & MAINTENANCE REPORT</h2>
                        <div className="text-sm font-semibold text-slate-600 text-right">
                          <div>Working order N: {workOrder?.work_order_number || '-'}</div>
                          <div>Working report N: {wrNumber || '-'}</div>
                        </div>
                    </div>

                    {/* ============ SECTION 1: GENERAL INFORMATION ============ */}
                    <div className="mb-4">
                        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 mb-1">
                            1. GENERAL INFORMATION
                        </div>
                        <table className="w-full border-collapse text-xs">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold w-24">COMPANY</td>
                                    <td className="border border-slate-400 p-1.5">{customer?.name || '-'}</td>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold text-center w-24">CATEGORY</td>
                                    <td className="border border-slate-400 p-1.5 text-center">{woCategory?.name || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold">LOCATION</td>
                                    <td className="border border-slate-400 p-1.5">{project?.location_name || project?.address || '-'}</td>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold text-center">SHIFT</td>
                                    <td className="border border-slate-400 p-1.5 text-center">{shiftType?.name || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold">PROJECT</td>
                                    <td className="border border-slate-400 p-1.5">{project?.name || '-'}</td>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold text-center">DATE</td>
                                    <td className="border border-slate-400 p-1.5 text-center">{formatDate(workOrder?.planned_start_time)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold">EQUIPMENT</td>
                                    <td className="border border-slate-400 p-1.5">{assignedAssets.map(a => a.name).join(', ') || '-'}</td>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold text-center">START</td>
                                    <td className="border border-slate-400 p-1.5 text-center">{formatTime(workOrder?.planned_start_time)}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold">TITLE</td>
                                    <td className="border border-slate-400 p-1.5">{workOrder?.title || '-'}</td>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold text-center">END</td>
                                    <td className="border border-slate-400 p-1.5 text-center">{workOrder?.end_time ? formatTime(workOrder.end_time) : formatTime(workOrder?.planned_end_time)}</td>
                                </tr>
                            </tbody>
                        </table>

                        {/* Equipment Details */}
                        {assignedAssets.length > 0 && (
                            <div className="bg-orange-50 border border-orange-200 p-2 mt-2 text-xs">
                                <div className="grid grid-cols-4 gap-2">
                                    <div><span className="font-semibold">ASSET:</span> {asset.name || '-'}</div>
                                    <div><span className="font-semibold">CATEGORY:</span> {asset.category || '-'}</div>
                                    <div><span className="font-semibold">SERIAL:</span> {asset.serial_number || asset.identifier || '-'}</div>
                                    <div><span className="font-semibold">PLATE:</span> {asset.plate_number || '-'}</div>
                                </div>
                            </div>
                        )}

                        {/* Management Instructions */}
                        {(workOrder?.work_description_items?.length > 0) && (
                            <div className="mt-3">
                                <div className="text-xs font-semibold text-slate-700 mb-1">MANAGEMENT INSTRUCTIONS:</div>
                                {renderChecklistTable(workOrder.work_description_items, 'INSTRUCTION')}
                            </div>
                        )}
                    </div>

                    {/* ============ SECTION 2: ASSIGNED RESOURCES ============ */}
                    <div className="mb-4">
                        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 mb-1">
                            2. ASSIGNED RESOURCES
                        </div>
                        <table className="w-full border-collapse text-xs">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold w-24">TEAMS</td>
                                    <td className="border border-slate-400 p-1.5">{assignedTeams.map(t => t.name).join(', ') || '-'}</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold">WORKERS</td>
                                    <td className="border border-slate-400 p-1.5">
                                        {assignedUsers.map(u => u.nickname || u.first_name || u.full_name || u.email).join(', ') || '-'}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* ============ SECTION 3: SITE REPORT ============ */}
                    <div className="mb-4">
                        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 mb-1">
                            3. SITE REPORT
                        </div>

                        {/* 3.1: Work Done / Pending */}
                        <div className="mb-3">
                            <div className="text-xs font-semibold text-slate-700 mb-1 bg-slate-100 px-2 py-1">3.1 WORK DESCRIPTION</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-[10px] font-semibold text-green-700 mb-0.5">3.1.A - WORK DONE</div>
                                    {renderChecklistTable(workOrder?.work_done_items, 'TASK COMPLETED')}
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold text-orange-700 mb-0.5">3.1.B - WORK PENDING</div>
                                    {renderChecklistTable(workOrder?.work_pending_items, 'TASK PENDING')}
                                </div>
                            </div>
                        </div>

                        {/* 3.2: Spare Parts Done / Pending */}
                        <div className="mb-3">
                            <div className="text-xs font-semibold text-slate-700 mb-1 bg-slate-100 px-2 py-1">3.2 SPARE PARTS</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-[10px] font-semibold text-green-700 mb-0.5">3.2.A - SPARE PARTS INSTALLED</div>
                                    {renderChecklistTable(workOrder?.spare_parts_items, 'PART INSTALLED', true)}
                                </div>
                                <div>
                                    <div className="text-[10px] font-semibold text-orange-700 mb-0.5">3.2.B - SPARE PARTS PENDING</div>
                                    {renderChecklistTable(workOrder?.spare_parts_pending_items, 'PART PENDING', true)}
                                </div>
                            </div>
                        </div>

                        {/* Work Order Status */}
                        <div className="mt-3 p-2 bg-slate-50 border border-slate-200">
                            <span className="font-semibold text-xs">WORK ORDER STATUS: </span>
                            <span className={`text-xs font-bold ${workOrder?.status === 'ongoing' ? 'text-green-600' : 'text-slate-600'}`}>
                                {workOrder?.status?.toUpperCase() || 'ONGOING'}
                            </span>
                        </div>
                    </div>

                    {/* ============ SECTION 4: TIME TRACKER DATA ============ */}
                    <div className="mb-4">
                        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 mb-1">
                            4. TIME TRACKER DATA
                        </div>
                        <table className="w-full border-collapse text-xs">
                            <tbody>
                                <tr>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold w-24">CLOCK IN</td>
                                    <td className="border border-slate-400 p-1.5">
                                        {workOrder?.start_time ? `${formatDate(workOrder.start_time)} ${formatTime(workOrder.start_time)}` : '-'}
                                    </td>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold w-24 text-center">CLOCK OUT</td>
                                    <td className="border border-slate-400 p-1.5 text-center">
                                        {workOrder?.end_time ? `${formatDate(workOrder.end_time)} ${formatTime(workOrder.end_time)}` : '-'}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold">LOCATION IN</td>
                                    <td className="border border-slate-400 p-1.5 text-[10px]">{workOrder?.start_address || '-'}</td>
                                    <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold text-center">LOCATION OUT</td>
                                    <td className="border border-slate-400 p-1.5 text-[10px] text-center">{workOrder?.end_address || '-'}</td>
                                </tr>
                                {workOrder?.duration_minutes > 0 && (
                                    <tr>
                                        <td className="border border-slate-400 p-1.5 bg-red-100 font-semibold">DURATION</td>
                                        <td className="border border-slate-400 p-1.5 font-bold" colSpan={3}>
                                            {Math.floor(workOrder.duration_minutes / 60)}h {workOrder.duration_minutes % 60}m
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ============ SECTION 5: CLIENT APPROVAL ============ */}
                    <div className="mb-4">
                        <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 mb-1">
                            5. CLIENT APPROVAL
                        </div>
                        
                        {workOrder?.client_feedback_comments && (
                            <div className="mb-2">
                                <div className="text-xs font-semibold text-slate-700 mb-1">CLIENT COMMENTS:</div>
                                <div className="border border-slate-300 p-2 min-h-[40px] text-xs bg-slate-50">
                                    {workOrder.client_feedback_comments}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-0 text-xs">
                            <div className="border border-slate-400 p-2 min-h-[70px]">
                                <p className="font-bold text-[10px] text-slate-600 mb-1">COMPANY WORKERS:</p>
                                <p className="text-[11px]">{assignedUsers.map(u => u.nickname || u.first_name || u.full_name).join(', ') || '-'}</p>
                            </div>
                            <div className="border border-slate-400 p-2 min-h-[70px]">
                                <p className="font-bold text-[10px] text-slate-600 mb-1">CLIENT REPRESENTATIVE:</p>
                                <p className="text-[11px]">{workOrder?.client_representative_name || ''}</p>
                                <p className="text-[10px] text-slate-500">{workOrder?.client_representative_phone || ''}</p>
                            </div>
                            <div className="border border-slate-400 p-2 min-h-[70px]">
                                <p className="font-bold text-[10px] text-slate-600 mb-1">SIGNATURE:</p>
                                {workOrder?.client_signature_url ? (
                                    <img
                                        src={workOrder.client_signature_url}
                                        alt="Client signature"
                                        className="h-16 object-contain"
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <div className="h-16 border border-slate-300 rounded-sm flex items-center justify-center text-[10px] text-slate-400">Signature</div>
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
                        margin: 10mm; 
                    }

                    /* Hide everything first */
                    body * {
                        visibility: hidden;
                    }

                    /* Show only pdf-content and its children */
                    .pdf-content, .pdf-content * {
                        visibility: visible;
                    }

                    /* Position pdf-content at top-left */
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

                    .no-print, .print\\:hidden {
                        display: none !important;
                    }

                    /* Allow content to flow across pages */
                    .pdf-content {
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                    }
                }
            `}</style>
        </div>
    );
}