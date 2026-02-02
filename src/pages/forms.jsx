
import React, { useState, useEffect, useCallback } from 'react';
import { FormSubmission } from '@/entities/all';
import { useData } from '../components/DataProvider';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plane, ListChecks, Plus, Loader2, Clock, CheckCircle, XCircle, FileCheck } from 'lucide-react'; // Consolidated lucide imports, added FileCheck
import { format } from 'date-fns';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Added Tabs components
import RequestFormDialog from '../components/forms/RequestFormDialog';

// Minimal Avatar component - assuming it's not a shadcn/ui component already globally available
// If you have a shared Avatar component (e.g., from shadcn/ui), import it instead.
const Avatar = ({ name, src }) => (
  <div className="relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full">
    {src ? (
      <img className="aspect-square h-full w-full object-cover" alt={name} src={src} />
    ) : (
      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-200">
        <span className="text-xs font-medium leading-none text-slate-700">
          {name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??'}
        </span>
      </div>
    )}
  </div>
);

// Minimal getDynamicFullName utility
// If you have a shared utility function, import it instead.
const getDynamicFullName = (user) => {
  if (!user) return 'Unknown';
  return user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown';
};

const formTypeConfig = {
  leave_request: {
    label: 'Leave Request',
    icon: Briefcase,
    className: 'bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-500/10'
  },
  vacation_request: {
    label: 'Vacation Request',
    icon: Plane,
    className: 'bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/10'
  },
  work_report: {
    label: 'Work Report',
    icon: ListChecks,
    className: 'bg-purple-50 text-purple-600 ring-1 ring-inset ring-purple-500/10'
  },
};

const statusConfig = {
  Pending: { className: 'bg-yellow-50 text-yellow-600 ring-1 ring-inset ring-yellow-500/10', icon: Clock },
  Approved: { className: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/10', icon: CheckCircle },
  Rejected: { className: 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-500/10', icon: XCircle },
};

// Placeholder for SubmissionDetailsDialog
const SubmissionDetailsDialog = ({ isOpen, onClose, submission, formTypeConfig, statusConfig, projects, users, currentUser, handleStatusChange }) => {
  if (!isOpen || !submission) return null;

  const employee = users.find(u => u.id === submission.employee_id);
  const formConfig = formTypeConfig[submission.form_type];
  const statusConfigItem = statusConfig[submission.status];
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          {formConfig?.icon && <formConfig.icon className="w-5 h-5 text-gray-700" />}
          {formConfig?.label || 'Submission Details'}
        </h2>
        <div className="space-y-3">
          <p className="content-lexend"><strong>Employee:</strong> {getDynamicFullName(employee)}</p>
          <p className="content-lexend"><strong>Submitted:</strong> {format(new Date(submission.created_date), 'MMM d, yyyy HH:mm')}</p>
          <p className="flex items-center gap-2 content-lexend">
            <strong>Status:</strong>
            <Badge className={statusConfigItem.className}>
              {statusConfigItem.icon && <statusConfigItem.icon className="w-3 h-3 mr-1" />}
              {submission.status}
            </Badge>
          </p>
          <p className="content-lexend"><strong>Details:</strong></p>
          <div className="bg-gray-50 p-3 rounded-md text-sm break-all content-lexend">
            {submission.form_type === 'leave_request' && (
              <>
                <p><strong>Leave Type:</strong> {submission.data.leave_type}</p>
                <p><strong>From:</strong> {submission.data.start_date}</p>
                <p><strong>To:</strong> {submission.data.end_date}</p>
                <p><strong>Reason:</strong> {submission.data.reason || 'N/A'}</p>
              </>
            )}
            {submission.form_type === 'vacation_request' && (
              <>
                <p><strong>From:</strong> {submission.data.start_date}</p>
                <p><strong>To:</strong> {submission.data.end_date}</p>
                <p><strong>Destination:</strong> {submission.data.destination || 'N/A'}</p>
              </>
            )}
            {submission.form_type === 'work_report' && (
              <>
                <p><strong>Project:</strong> {projects.find(p => p.id === submission.data.project_id)?.name || 'N/A'}</p>
                <p><strong>Hours:</strong> {submission.data.hours}</p>
                <p><strong>Description:</strong> {submission.data.description || 'N/A'}</p>
              </>
            )}
            {/* Display generic data if type specific details not found */}
            {(!['leave_request', 'vacation_request', 'work_report'].includes(submission.form_type)) && (
                <pre>{JSON.stringify(submission.data, null, 2)}</pre>
            )}
          </div>
          {isAdmin && submission.status === 'Pending' && (
            <div className="mt-4 flex gap-2">
              <Button onClick={() => { handleStatusChange(submission.id, 'Approved'); onClose(); }}>Approve</Button>
              <Button variant="outline" onClick={() => { handleStatusChange(submission.id, 'Rejected'); onClose(); }}>Reject</Button>
            </div>
          )}
        </div>
        <Button onClick={onClose} className="mt-6 w-full">Close</Button>
      </div>
    </div>
  );
};


export default function FormsPage() {
  const { projects, users, currentUser, loading: dataLoading, reloadData } = useData();
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false); // Renamed from isFormOpen
  const [currentFormType, setCurrentFormType] = useState(null); // Keep for dialog if it supports pre-selection
  const [viewingSubmission, setViewingSubmission] = useState(null); // New state for viewing details

  const loadSubmissions = useCallback(async () => {
    if (!currentUser) return;
    setLoadingSubmissions(true);
    try {
      const submissionsData = currentUser.role === 'admin'
        ? await FormSubmission.list('-created_date')
        : await FormSubmission.filter({ employee_id: currentUser.id }, '-created_date');
      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error("Failed to load form submissions:", error);
      toast.error("Failed to load submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!dataLoading && currentUser) {
      loadSubmissions();
    }
  }, [dataLoading, currentUser, loadSubmissions]);
  
  // handleOpenForm logic is removed as the dropdown menu is replaced by a direct button

  const handleSubmitForm = async (formData, selectedFormType) => { // Added selectedFormType parameter
    const formToSubmit = selectedFormType || currentFormType; // Use selectedFormType if provided by dialog, otherwise fall back to currentFormType (which might be null)
    if (!formToSubmit || !currentUser) return;
    try {
      await FormSubmission.create({
        form_type: formToSubmit,
        employee_id: currentUser.id,
        data: formData,
        status: 'Pending',
      });

      toast.success(`${formTypeConfig[formToSubmit]?.label || 'Form'} submitted successfully!`);
      
      setShowNewRequestDialog(false); // Close the new request dialog
      loadSubmissions();
    } catch (error) {
      console.error('Failed to submit form:', error);
      toast.error('Failed to submit form.');
    }
  };
  
  const handleStatusChange = async (submissionId, newStatus) => {
    if(currentUser?.role !== 'admin') return;
    try {
      await FormSubmission.update(submissionId, { status: newStatus });
      toast.success("Submission status updated.");
      loadSubmissions();
    } catch(error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status.");
    }
  };

  const handleViewSubmission = (submission) => {
    setViewingSubmission(submission);
  };

  // Calculate form type counters
  const formTypeCounts = submissions.reduce((acc, submission) => {
    acc[submission.form_type] = (acc[submission.form_type] || 0) + 1;
    return acc;
  }, {});

  const loading = dataLoading || loadingSubmissions; // Combined loading state

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
      </div>
    );
  }
  
  return (
    <div className="p-4 md:p-6 space-y-6"> {/* Updated outer padding */}
      {/* Header Card */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg"> {/* Changed color from cyan-100 to indigo-100 */}
              <FileCheck className="w-6 h-6 text-indigo-600" /> {/* Changed icon from ClipboardList to FileCheck and color */}
            </div>
            <h1 className="header-express text-slate-900">Forms & Requests</h1> {/* Changed title from Form Submissions */}
            {!loading && (
              <Badge variant="secondary" className="font-mono text-sm">{submissions.length}</Badge>
            )}
          </div>
          {/* Form type counters and New Request button were removed from here */}
        </div>
      </div>
      
      {/* Main Content Area with Tabs */}
      <div className="max-w-7xl mx-auto">
        {/* New Request Button and Form Type Counters - moved here, above the TabsList */}
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          {/* Form Type Counters */}
          {!loading && submissions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(formTypeConfig).map(([key, config]) => (
                <Badge key={key} variant="outline" className="flex items-center gap-2 py-1 px-2">
                  <config.icon className="w-3 h-3" />
                  <span className="text-xs font-medium text-gray-700">{config.label}</span>
                  <span className="text-xs font-mono bg-gray-100 rounded px-1.5 py-0.5">{formTypeCounts[key] || 0}</span>
                </Badge>
              ))}
            </div>
          )}
          <Button onClick={() => { setShowNewRequestDialog(true); setCurrentFormType(null); }}>
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-fit grid-cols-1"> {/* A single tab for "All Submissions" for now */}
            <TabsTrigger value="all">All Submissions</TabsTrigger>
            {/* Add more TabsTrigger components here for other categories if needed */}
          </TabsList>
          <TabsContent value="all" className="mt-4 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* The existing table is now inside a TabsContent */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 hover:bg-slate-100 border-0">
                    <TableHead className="header-express py-4 px-4 text-slate-800">Employee</TableHead>
                    <TableHead className="header-express py-4 px-4 text-slate-800">Form Type</TableHead>
                    <TableHead className="header-express py-4 px-4 text-slate-800 hidden md:table-cell">Submitted</TableHead>
                    <TableHead className="header-express py-4 px-4 text-slate-800">Status</TableHead>
                    <TableHead className="header-express py-4 px-4 text-slate-800 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ) : submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center content-lexend text-slate-500">
                        No form submissions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map((submission) => {
                      const employee = users.find(u => u.id === submission.employee_id);
                      const formConfig = formTypeConfig[submission.form_type];
                      const statusConfigItem = statusConfig[submission.status];
                      return (
                        <TableRow key={submission.id} className="hover:bg-slate-50" style={{ borderBottom: 'none' }}>
                          <TableCell className="py-3 px-4" style={{ borderBottom: 'none' }}>
                            <div className="flex items-center gap-3">
                              <Avatar name={getDynamicFullName(employee)} src={employee?.avatar_url} />
                              <span className="font-medium text-slate-900 content-lexend">{getDynamicFullName(employee)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 content-lexend" style={{ borderBottom: 'none' }}>
                            {formConfig ? (
                              <Badge variant="outline" className={formConfig.className}>
                                <formConfig.icon className="w-3 h-3 mr-1.5" />
                                {formConfig.label}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                {/* Fallback if formType is unknown */}
                                {submission.form_type.replace('_', ' ')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 content-lexend text-slate-600 hidden md:table-cell" style={{ borderBottom: 'none' }}>
                            {format(new Date(submission.created_date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell className="py-3 px-4" style={{ borderBottom: 'none' }}>
                            {statusConfigItem ? (
                              <Badge className={`${statusConfigItem.className} content-lexend`}>
                                <statusConfigItem.icon className="w-3 h-3 mr-1.5" />
                                {submission.status}
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10 content-lexend">
                                {/* Fallback if status is unknown */}
                                {submission.status}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right" style={{ borderBottom: 'none' }}>
                            <Button variant="outline" size="sm" onClick={() => handleViewSubmission(submission)}>
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          {/* Additional TabsContent components would go here if needed */}
        </Tabs>
      </div>
      
      <RequestFormDialog
        isOpen={showNewRequestDialog}
        onClose={() => setShowNewRequestDialog(false)}
        onSubmit={handleSubmitForm}
        formType={currentFormType} // Will be null when opened by generic button, dialog should handle selection
        projects={projects}
        formTypeConfig={formTypeConfig} // Pass the new config to the dialog
      />

      <SubmissionDetailsDialog
        isOpen={!!viewingSubmission}
        onClose={() => setViewingSubmission(null)}
        submission={viewingSubmission}
        formTypeConfig={formTypeConfig}
        statusConfig={statusConfig}
        projects={projects}
        users={users}
        currentUser={currentUser}
        handleStatusChange={handleStatusChange}
      />
    </div>
  );
}
