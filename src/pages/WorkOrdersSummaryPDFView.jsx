import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { TimeEntry, Project, Customer, Team, Asset, ClientEquipment, WorkOrderCategory, Branch, User, LeaveRequest } from '@/entities/all';
import { useData } from '../components/DataProvider';

// Helper to get equipment names
const getEquipmentNames = (equipmentIds, assets, clientEquipments) => {
    if (!equipmentIds?.length) return '-';
    return equipmentIds.map(id => {
        const asset = assets?.find(a => a.id === id);
        if (asset) return asset.name;
        const clientEq = clientEquipments?.find(e => e.id === id);
        if (clientEq) return clientEq.name;
        return null;
    }).filter(Boolean).join(', ') || '-';
};
import { format, parseISO } from 'date-fns';

export default function WorkOrdersSummaryPDFView() {
    const { currentCompany } = useData();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [workOrders, setWorkOrders] = useState([]);
    const [projects, setProjects] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [assets, setAssets] = useState([]);
    const [clientEquipments, setClientEquipments] = useState([]);
    const [branch, setBranch] = useState(null);
    const [filters, setFilters] = useState({});
    const [approvedLeaves, setApprovedLeaves] = useState([]);

    const urlParams = new URLSearchParams(window.location.search);
    const [pageBreakPerTeam, setPageBreakPerTeam] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            // Parse URL params
            const startDate = urlParams.get('startDate') || format(new Date(), 'yyyy-MM-dd');
            const endDate = urlParams.get('endDate') || format(new Date(), 'yyyy-MM-dd');
            const teamIds = urlParams.get('teamIds')?.split(',').filter(Boolean) || [];
            const projectIds = urlParams.get('projectIds')?.split(',').filter(Boolean) || [];
            const categoryIds = urlParams.get('categoryIds')?.split(',').filter(Boolean) || [];
            const statusFilter = urlParams.get('statusFilter')?.split(',').filter(Boolean) || [];
            const userIds = urlParams.get('userIds')?.split(',').filter(Boolean) || [];
            const groupBy = urlParams.get('groupBy') || 'team';
            
            setFilters({ startDate, endDate, teamIds, projectIds, categoryIds, statusFilter, userIds, groupBy });

            // Fetch all data
            const [allWorkOrders, allProjects, allCustomers, allTeams, allUsers, allCategories, allBranches, allAssets, allClientEquipments, allLeaves] = await Promise.all([
                TimeEntry.list(),
                Project.list(),
                Customer.list(),
                Team.list(),
                User.list(),
                WorkOrderCategory.list(),
                Branch.list(),
                Asset.list(),
                ClientEquipment.list(),
                LeaveRequest.filter({ status: 'approved' })
            ]);
            
            setApprovedLeaves(allLeaves || []);

            setProjects(allProjects || []);
            setCustomers(allCustomers || []);
            // Sort teams by sort_order
            const sortedTeams = (allTeams || []).sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));
            setTeams(sortedTeams);
            setUsers(allUsers || []);
            setCategories(allCategories || []);
            setAssets(allAssets || []);
            setClientEquipments(allClientEquipments || []);
            // Find branch by URL param or use currentCompany
            const branchIdParam = urlParams.get('branchId');
            let currentBranch = currentCompany;
            if (branchIdParam) {
                currentBranch = allBranches?.find(b => b.id === branchIdParam) || currentCompany;
            }
            setBranch(currentBranch || allBranches?.[0] || null);
            
            // Set page break per team from branch settings
            const summarySettings = currentBranch?.form_settings?.summary_report || {};
            setPageBreakPerTeam(summarySettings.page_break_per_team || false);

            // Filter work orders by date range
            const startDateObj = new Date(startDate);
            startDateObj.setHours(0, 0, 0, 0);
            const endDateObj = new Date(endDate);
            endDateObj.setHours(23, 59, 59, 999);

            let filtered = (allWorkOrders || []).filter(wo => {
                const woDate = new Date(wo.planned_start_time || wo.task_start_date || wo.created_date);
                return woDate >= startDateObj && woDate <= endDateObj;
            });

            // Apply other filters
            if (teamIds.length > 0) {
                filtered = filtered.filter(wo => 
                    (wo.team_ids || []).some(tid => teamIds.includes(tid))
                );
            }
            if (projectIds.length > 0) {
                filtered = filtered.filter(wo => projectIds.includes(wo.project_id));
            }
            if (categoryIds.length > 0) {
                filtered = filtered.filter(wo => categoryIds.includes(wo.work_order_category_id));
            }
            if (statusFilter.length > 0) {
                filtered = filtered.filter(wo => statusFilter.includes(wo.status));
            }
            if (userIds.length > 0) {
                filtered = filtered.filter(wo => 
                    (wo.employee_ids || []).some(eid => userIds.includes(eid))
                );
            }

            setWorkOrders(filtered);

        } catch (e) {
            console.error('Error loading data:', e);
            setError(e.message);
        }
        setLoading(false);
    };

    const formatTime = (isoString) => {
        if (!isoString) return '-';
        try {
            // Parse the ISO string and format with date-fns
            // The time stored is already in Dubai timezone, just extract HH:mm
            const date = parseISO(isoString);
            return format(date, 'hh:mm a'); // 12-hour format with AM/PM
        } catch (e) {
            return '-';
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        try {
            const date = parseISO(isoString);
            return format(date, 'dd/MM/yyyy');
        } catch (e) {
            return '-';
        }
    };

    const getProject = (projectId) => {
        return projects.find(p => p.id === projectId);
    };

    const getCustomer = (customerId) => {
        return customers.find(c => c.id === customerId);
    };

    // Helper to check if a user is on leave for a given date
    const isUserOnLeave = (userId, dateStr) => {
        return approvedLeaves.some(leave => {
            if (leave.employee_id !== userId) return false;
            return dateStr >= leave.start_date && dateStr <= leave.end_date;
        });
    };

    const getUserNames = (userIds, woDate) => {
        if (!userIds?.length) return '-';
        // Get date string from work order for leave checking
        const dateStr = woDate ? format(new Date(woDate), 'yyyy-MM-dd') : null;
        
        return userIds.map(uid => {
            const u = users.find(u => u.id === uid);
            if (!u) return null;
            const name = u?.nickname || u?.first_name || u?.full_name?.split(' ')[0];
            // Check if user is on leave for this WO date
            if (dateStr && isUserOnLeave(uid, dateStr)) {
                return { name, onLeave: true };
            }
            return { name, onLeave: false };
        }).filter(Boolean);
    };

    const renderUserNames = (userIds, woDate) => {
        const userList = getUserNames(userIds, woDate);
        if (!userList || !Array.isArray(userList) || userList.length === 0) return '-';
        
        return (
            <div className="flex flex-col">
                {userList.map((user, idx) => (
                    <div key={idx} className="font-bold">
                        {user.onLeave ? (
                            <span className="line-through text-red-500">{user.name} 🏖️</span>
                        ) : (
                            <span>{user.name}</span>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const getCategoryName = (categoryId) => {
        return categories.find(c => c.id === categoryId)?.name || '-';
    };

    // Group work orders by team (sorted by team sort_order)
    const groupWorkOrdersByTeam = () => {
        const grouped = new Map();
        
        // Initialize groups in team sort order
        teams.forEach(team => {
            grouped.set(team.id, { team, workOrders: [] });
        });
        grouped.set('unassigned', { team: null, workOrders: [] });
        
        workOrders.forEach(wo => {
            const teamIds = wo.team_ids || [];
            if (teamIds.length === 0) {
                grouped.get('unassigned').workOrders.push(wo);
            } else {
                // Add to first team (primary)
                const primaryTeamId = teamIds[0];
                if (grouped.has(primaryTeamId)) {
                    grouped.get(primaryTeamId).workOrders.push(wo);
                }
            }
        });
        
        // Convert to array and filter empty, sort WOs by time within each group
        return Array.from(grouped.values())
            .filter(g => g.workOrders.length > 0)
            .map(g => ({
                ...g,
                workOrders: g.workOrders.sort((a, b) => {
                    const timeA = a.planned_start_time ? new Date(a.planned_start_time).getTime() : 0;
                    const timeB = b.planned_start_time ? new Date(b.planned_start_time).getTime() : 0;
                    return timeA - timeB;
                })
            }));
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
    const groupedData = groupWorkOrdersByTeam();
    
    // Generate report title in format: DMMYY _ Working Orders Day Summary
    const reportTitle = (() => {
        try {
            const date = new Date(filters.startDate);
            const day = date.getDate(); // No leading zero
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            document.title = `${day}${month}${year} _ Working Orders Day Summary`;
            return `${day}${month}${year} _ Working Orders Day Summary`;
        } catch {
            document.title = 'Working Orders Day Summary';
            return 'Working Orders Day Summary';
        }
    })();

    // ✅ NUEVO: Agrupar work orders por trabajador individual
    const groupWorkOrdersByWorker = () => {
        const grouped = new Map();

        workOrders.forEach(wo => {
            const employeeIds = wo.employee_ids || [];
            if (employeeIds.length === 0) {
                if (!grouped.has('unassigned')) {
                    grouped.set('unassigned', { user: null, workOrders: [] });
                }
                grouped.get('unassigned').workOrders.push(wo);
            } else {
                employeeIds.forEach(userId => {
                    const user = users.find(u => u.id === userId);
                    if (!grouped.has(userId)) {
                        grouped.set(userId, { user, workOrders: [] });
                    }
                    grouped.get(userId).workOrders.push(wo);
                });
            }
        });

        // Convertir a array y ordenar por nombre de usuario
        return Array.from(grouped.values())
            .filter(g => g.workOrders.length > 0)
            .sort((a, b) => {
                const nameA = a.user ? (a.user.nickname || a.user.first_name || a.user.full_name || a.user.email) : 'Unassigned';
                const nameB = b.user ? (b.user.nickname || b.user.first_name || b.user.full_name || b.user.email) : 'Unassigned';
                return nameA.localeCompare(nameB);
            })
            .map(g => ({
                ...g,
                workOrders: g.workOrders.sort((a, b) => {
                    const timeA = a.planned_start_time ? new Date(a.planned_start_time).getTime() : 0;
                    const timeB = b.planned_start_time ? new Date(b.planned_start_time).getTime() : 0;
                    return timeA - timeB;
                })
            }));
    };

    const groupedByWorker = groupWorkOrdersByWorker();

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            {/* Controls */}
            <div className="max-w-[210mm] mx-auto mb-4 flex gap-2 items-center no-print">
                <Link to={createPageUrl('work-orders')}>
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                </Link>
                <Button size="sm" onClick={() => window.print()}>
                    <Download className="w-4 h-4 mr-2" />
                    Print / Save PDF
                </Button>
                <label className="flex items-center gap-2 text-sm ml-4 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={pageBreakPerTeam}
                        onChange={(e) => setPageBreakPerTeam(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300"
                    />
                    One page per team
                </label>
                <span className="text-xs text-gray-500 ml-2">(Configure in PDF Forms settings)</span>
            </div>

            {/* PDF Preview */}
            <div className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none pdf-content">
                <div className="p-6 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
                    
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                            <h1 className="text-red-600 font-bold text-lg mb-1">{companyName}</h1>
                            <h2 className="font-bold text-base">{reportTitle}</h2>
                            <p className="text-xs text-gray-600 mt-1">
                                Period: {filters.startDate} to {filters.endDate}
                            </p>
                            <p className="text-xs text-gray-600">
                                Total Work Orders: {workOrders.length}
                            </p>
                        </div>
                        {logoUrl && (
                            <img 
                                src={logoUrl} 
                                alt="Company Logo" 
                                className="max-w-[400px] max-h-[200px] object-contain"
                                crossOrigin="anonymous"
                            />
                        )}
                    </div>

                    {/* Red line */}
                    <div className="border-t-2 border-red-600 my-3"></div>

                    {/* Grouped Work Orders by Team */}
                    {groupedData.map(({ team, workOrders: teamWOs }, groupIndex) => (
                        <div 
                            key={team?.id || 'unassigned'} 
                            className={`mb-6 ${pageBreakPerTeam && groupIndex > 0 ? 'page-break-before' : ''}`}
                        >
                            <h3 className="font-bold text-sm bg-gray-100 p-2 mb-2 border-l-4 border-red-600">
                                {team?.name || 'Unassigned'} ({teamWOs.length})
                            </h3>
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr>
                                        <th className="border p-1 bg-red-600 text-white text-left w-14">WO</th>
                                        <th className="border p-1 bg-red-600 text-white text-center w-20">🕐 Time</th>
                                        <th className="border p-1 bg-red-600 text-white text-left w-28">📝 Title</th>
                                        <th className="border p-1 bg-red-600 text-white text-left">Project / Client</th>
                                        <th className="border p-1 bg-red-600 text-white text-left w-20">🔧 Equipment</th>
                                        <th className="border p-1 bg-red-600 text-white text-left">📍 Location</th>
                                        <th className="border p-1 bg-red-600 text-white text-left w-24">👤 Contact</th>
                                        <th className="border p-1 bg-red-600 text-white text-left w-20">👷 Assigned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamWOs.map((wo, idx) => {
                                        const project = getProject(wo.project_id);
                                        const customer = project ? getCustomer(project.customer_id) : null;
                                        const contactPerson = project?.contact_person || project?.contact_persons?.[0] || '-';
                                        const contactPhone = project?.phone || project?.phones?.[0] || '';
                                        const location = project?.location_name || project?.address || '-';
                                        const equipmentName = getEquipmentNames(wo.equipment_ids, assets, clientEquipments);
                                        
                                        return (
                                            <React.Fragment key={wo.id}>
                                                {idx > 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="p-0">
                                                            <div className="h-4"></div>
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr className="border-4 border-black">
                                                    <td className="border p-1 border-black">
                                                        <div className="font-bold text-[10px]">N{idx + 1} of {teamWOs.length}</div>
                                                        <div className="text-[8px] text-gray-500 font-mono">{wo.work_order_number || ''}</div>
                                                    </td>
                                                    <td className="border border-black p-1 text-center text-[10px]">
                                                        {formatTime(wo.planned_start_time)}
                                                        {wo.planned_end_time && <><br/>{formatTime(wo.planned_end_time)}</>}
                                                    </td>
                                                    <td className="border border-black p-1 text-[10px]">
                                                        <div className="font-semibold">{wo.title || '-'}</div>
                                                        {wo.task && <div className="text-gray-500 text-[9px] mt-0.5">{wo.task}</div>}
                                                    </td>
                                                    <td className="border border-black p-1 text-[10px]">
                                                        <div className="font-semibold">{project?.name || '-'}</div>
                                                        <div className="text-gray-500">({customer?.name || '-'})</div>
                                                    </td>
                                                    <td className="border border-black p-1 text-[10px]">{equipmentName}</td>
                                                    <td className="border border-black p-1 text-[10px]">{location}</td>
                                                    <td className="border border-black p-1 text-[10px]">
                                                        <div>{contactPerson}</div>
                                                        {contactPhone && <div className="text-gray-500">{contactPhone}</div>}
                                                    </td>
                                                    <td className="border border-black p-1 text-[10px]">{renderUserNames(wo.employee_ids, wo.planned_start_time)}</td>
                                                </tr>
                                                {wo.work_description_items && wo.work_description_items.length > 0 && (
                                                    <tr className="border-4 border-black border-t-0">
                                                        <td colSpan={8} className="border-black p-1 bg-yellow-300">
                                                            <div className="text-[9px] text-gray-900">
                                                                <span className="font-bold">📋 Work Order Description / Instructions from Management:</span>
                                                                <ul className="ml-3 mt-1 list-none">
                                                                    {wo.work_description_items.map((item, i) => (
                                                                        <li key={i} className="flex items-start gap-1">
                                                                            <span className="font-bold min-w-[20px]">{item.checked ? '✓' : (i + 1) + '.'}</span>
                                                                            <span>{item.text}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                                {wo.work_notes && (
                                                    <tr className={wo.work_description_items?.length > 0 ? "border-4 border-black border-t-0" : "border-4 border-black border-t-0"}>
                                                        <td colSpan={8} className="border-black p-1 bg-amber-50">
                                                            <div className="text-[9px] text-amber-800">
                                                                <span>📄 <span className="font-bold">Notes:</span> {wo.work_notes}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                            );
                                            })}
                                            </tbody>
                                            </table>
                                            </div>
                                            ))}

                    {workOrders.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No work orders found for the selected criteria.
                        </div>
                    )}

                    {/* ✅ NUEVA PÁGINA: Work Orders por Trabajador */}
                    {groupedByWorker.length > 0 && (
                        <div className="page-break-before mt-12">
                            <h2 className="text-lg font-bold mb-4 border-b-2 border-red-600 pb-2">Work Orders by Worker</h2>

                            {groupedByWorker.map(({ user, workOrders: workerWOs }, groupIndex) => (
                                <div key={user?.id || 'unassigned'} className={`mb-6 ${groupIndex > 0 ? 'page-break-before' : ''}`}>
                                    <h3 className="font-bold text-sm bg-gray-100 p-2 mb-2 border-l-4 border-red-600 flex items-center gap-2">
                                        <span>👤</span>
                                        <span>{user ? (user.nickname || user.first_name || user.full_name || user.email) : 'Unassigned'}</span>
                                        <span className="text-gray-500 font-normal">({workerWOs.length} work orders)</span>
                                    </h3>

                                    <table className="w-full border-collapse text-xs">
                                        <thead>
                                            <tr>
                                                <th className="border p-1 bg-red-600 text-white text-left w-14">WO</th>
                                                <th className="border p-1 bg-red-600 text-white text-center w-20">🕐 Time</th>
                                                <th className="border p-1 bg-red-600 text-white text-left w-28">📝 Title</th>
                                                <th className="border p-1 bg-red-600 text-white text-left">Project / Client</th>
                                                <th className="border p-1 bg-red-600 text-white text-left w-20">🔧 Equipment</th>
                                                <th className="border p-1 bg-red-600 text-white text-left">📍 Location</th>
                                                <th className="border p-1 bg-red-600 text-white text-left w-24">👤 Contact</th>
                                                <th className="border p-1 bg-red-600 text-white text-left w-20">👥 Team</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {workerWOs.map((wo, idx) => {
                                                const project = getProject(wo.project_id);
                                                const customer = project ? getCustomer(project.customer_id) : null;
                                                const contactPerson = project?.contact_person || project?.contact_persons?.[0] || '-';
                                                const contactPhone = project?.phone || project?.phones?.[0] || '';
                                                const location = project?.location_name || project?.address || '-';
                                                const equipmentName = getEquipmentNames(wo.equipment_ids, assets, clientEquipments);
                                                const teamNames = (wo.team_ids || []).map(tid => teams.find(t => t.id === tid)?.name).filter(Boolean).join(', ') || '-';

                                                return (
                                                    <React.Fragment key={wo.id}>
                                                        {idx > 0 && (
                                                            <tr>
                                                                <td colSpan={8} className="p-0">
                                                                    <div className="h-4"></div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        <tr className="border-4 border-black">
                                                            <td className="border p-1 border-black">
                                                                <div className="font-bold text-[10px]">N{idx + 1} of {workerWOs.length}</div>
                                                                <div className="text-[8px] text-gray-500 font-mono">{wo.work_order_number || ''}</div>
                                                            </td>
                                                            <td className="border border-black p-1 text-center text-[10px]">
                                                                {formatTime(wo.planned_start_time)}
                                                                {wo.planned_end_time && <><br/>{formatTime(wo.planned_end_time)}</>}
                                                            </td>
                                                            <td className="border border-black p-1 text-[10px]">
                                                                <div className="font-semibold">{wo.title || '-'}</div>
                                                                {wo.task && <div className="text-gray-500 text-[9px] mt-0.5">{wo.task}</div>}
                                                            </td>
                                                            <td className="border border-black p-1 text-[10px]">
                                                                <div className="font-semibold">{project?.name || '-'}</div>
                                                                <div className="text-gray-500">({customer?.name || '-'})</div>
                                                            </td>
                                                            <td className="border border-black p-1 text-[10px]">{equipmentName}</td>
                                                            <td className="border border-black p-1 text-[10px]">{location}</td>
                                                            <td className="border border-black p-1 text-[10px]">
                                                                <div>{contactPerson}</div>
                                                                {contactPhone && <div className="text-gray-500">{contactPhone}</div>}
                                                            </td>
                                                            <td className="border border-black p-1 text-[10px]">{teamNames}</td>
                                                        </tr>
                                                        {wo.work_description_items && wo.work_description_items.length > 0 && (
                                                            <tr className="border-4 border-black border-t-0">
                                                                <td colSpan={8} className="border-black p-1 bg-yellow-300">
                                                                    <div className="text-[9px] text-gray-900">
                                                                        <span className="font-bold">📋 Work Order Description / Instructions from Management:</span>
                                                                        <ul className="ml-3 mt-1 list-none">
                                                                            {wo.work_description_items.map((item, i) => (
                                                                                <li key={i} className="flex items-start gap-1">
                                                                                    <span className="font-bold min-w-[20px]">{item.checked ? '✓' : (i + 1) + '.'}</span>
                                                                                    <span>{item.text}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {wo.work_notes && (
                                                            <tr className={wo.work_description_items?.length > 0 ? "border-4 border-black border-t-0" : "border-4 border-black border-t-0"}>
                                                                <td colSpan={8} className="border-black p-1 bg-amber-50">
                                                                    <div className="text-[9px] text-amber-800">
                                                                        <span>📄 <span className="font-bold">Notes:</span> {wo.work_notes}</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-8 pt-4 border-t text-xs text-gray-500 text-center">
                        Generated on {new Date().toLocaleString('en-GB', { timeZone: 'Asia/Dubai' })}
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

                    /* Hide no-print elements */
                    .no-print {
                        display: none !important;
                    }

                    /* PDF content styling */
                    .pdf-content {
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        background: white !important;
                        min-height: auto !important;
                    }

                    /* Reset root elements */
                    html, body, #root {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        height: auto !important;
                        min-height: auto !important;
                        overflow: visible !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Allow tables to break across pages */
                    table {
                        page-break-inside: auto !important;
                    }

                    tr {
                        page-break-inside: avoid !important;
                        page-break-after: auto !important;
                    }

                    thead {
                        display: table-header-group !important;
                    }

                    .page-break-before {
                        page-break-before: always !important;
                    }

                    /* Parent container - remove fixed height */
                    .min-h-screen {
                        min-height: auto !important;
                        height: auto !important;
                        padding: 0 !important;
                        background: white !important;
                        overflow: visible !important;
                    }
                }
            `}</style>
        </div>
    );
}