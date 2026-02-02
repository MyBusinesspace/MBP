
import React, { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Plus,
  Minus,
  Download,
  Share2,
  FileText,
  Upload,
  Eye,
  Trash2,
  Loader2,
  Save,
  Edit,
  MoreVertical,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PettyCashEntry } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Avatar from '../Avatar';
import DocumentViewer from '../shared/DocumentViewer';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import MultipleExpensesPanel from './MultipleExpensesPanel';

export default function EmployeeDetailPanel({
  isOpen,
  onClose,
  employee,
  entries = [],
  categories = [],
  currencySymbol = '$',
  decimalSeparator = '.',
  decimalPlaces = 2,
  allowUserInput = false,
  isAdmin = false,
  onEntriesChanged
}) {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [showMultipleExpenses, setShowMultipleExpenses] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewingDocuments, setViewingDocuments] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [analyzingInvoice, setAnalyzingInvoice] = useState(false);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category_id: '',
    provider_detail: '',
    note_number: '',
    text_note: '',
    amount: '',
    document_urls: []
  });

  const employeeEntries = useMemo(() => {
    return entries
      .filter(e => e.employee_id === employee?.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [entries, employee]);

  const totalBalance = useMemo(() => {
    return employeeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);
  }, [employeeEntries]);

  const formatCurrency = (amount) => {
    const absAmount = Math.abs(amount);
    const formatted = absAmount.toFixed(decimalPlaces);
    const [integer, decimal] = formatted.split('.');
    const withThousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, decimalSeparator === '.' ? ',' : '.');
    return `${currencySymbol}${withThousands}${decimal ? decimalSeparator + decimal : ''}`;
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      category_id: '',
      provider_detail: '',
      note_number: '',
      text_note: '',
      amount: '',
      document_urls: []
    });
    setEditingEntry(null);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date ? format(parseISO(entry.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      category_id: entry.category_id || '',
      provider_detail: entry.provider_detail || '',
      note_number: entry.note_number || '',
      text_note: entry.text_note || '',
      amount: Math.abs(entry.amount || 0).toString(),
      document_urls: entry.document_urls || []
    });
    
    if (entry.type === 'expense') {
      setShowAddExpense(true);
    } else {
      setShowAddInput(true);
    }
  };

  const handleDeleteEntry = async (entry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!entryToDelete) return;

    setDeleting(true);
    try {
      await PettyCashEntry.delete(entryToDelete.id);
      toast.success('Entry deleted successfully');
      setShowDeleteConfirm(false);
      setEntryToDelete(null);
      if (onEntriesChanged) onEntriesChanged();
    } catch (error) {
      console.error('Failed to delete entry:', error);
      toast.error('Failed to delete entry');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddExpense = async () => {
    if (!formData.amount || !employee) return;

    setSaving(true);
    try {
      const amount = parseFloat(formData.amount);
      
      if (editingEntry) {
        // Update existing entry
        await PettyCashEntry.update(editingEntry.id, {
          date: formData.date,
          category_id: formData.category_id || null,
          provider_detail: formData.provider_detail,
          note_number: formData.note_number,
          text_note: formData.text_note,
          amount: -amount,
          document_urls: formData.document_urls
        });
        toast.success('Expense updated successfully');
      } else {
        // Create new entry
        const previousBalance = employeeEntries.length > 0 
          ? employeeEntries[employeeEntries.length - 1].balance_after_transaction || 0
          : 0;
        
        await PettyCashEntry.create({
          employee_id: employee.id,
          type: 'expense',
          date: formData.date,
          category_id: formData.category_id || null,
          provider_detail: formData.provider_detail,
          note_number: formData.note_number,
          text_note: formData.text_note,
          amount: -amount,
          document_urls: formData.document_urls,
          balance_after_transaction: previousBalance - amount
        });
        toast.success('Expense added successfully');
      }

      resetForm();
      setShowAddExpense(false);
      if (onEntriesChanged) onEntriesChanged();
    } catch (error) {
      console.error('Failed to save expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInput = async () => {
    if (!formData.amount || !employee) return;

    setSaving(true);
    try {
      const amount = parseFloat(formData.amount);
      
      if (editingEntry) {
        // Update existing entry
        await PettyCashEntry.update(editingEntry.id, {
          date: formData.date,
          category_id: formData.category_id || null,
          provider_detail: formData.provider_detail,
          note_number: formData.note_number,
          text_note: formData.text_note,
          amount: amount,
          document_urls: formData.document_urls
        });
        toast.success('Input updated successfully');
      } else {
        // Create new entry
        const previousBalance = employeeEntries.length > 0 
          ? employeeEntries[employeeEntries.length - 1].balance_after_transaction || 0
          : 0;
        
        await PettyCashEntry.create({
          employee_id: employee.id,
          type: 'input',
          date: formData.date,
          category_id: formData.category_id || null,
          provider_detail: formData.provider_detail,
          note_number: formData.note_number,
          text_note: formData.text_note,
          amount: amount,
          document_urls: formData.document_urls,
          balance_after_transaction: previousBalance + amount
        });
        toast.success('Input added successfully');
      }

      resetForm();
      setShowAddInput(false);
      if (onEntriesChanged) onEntriesChanged();
    } catch (error) {
      console.error('Failed to save input:', error);
      toast.error('Failed to save input');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }
      setFormData(prev => ({
        ...prev,
        document_urls: [...prev.document_urls, ...uploadedUrls]
      }));
      toast.success(`${uploadedUrls.length} document(s) uploaded`);

      // Auto-analyze if it's a single image file
      if (files.length === 1 && files[0].type.startsWith('image/')) {
        const shouldAnalyze = window.confirm('🤖 Would you like to automatically extract invoice data from this image using AI?');
        if (shouldAnalyze) {
          await analyzeInvoice(uploadedUrls[0]);
        }
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      toast.error('Failed to upload documents');
    } finally {
      setUploading(false);
    }
  };

  const analyzeInvoice = async (fileUrl) => {
    setAnalyzingInvoice(true);
    
    try {
      toast.info('🤖 AI is analyzing the invoice...');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an invoice/receipt data extraction expert. Analyze this invoice/receipt image and extract the following information:
        
1. Total amount/cost (look for words like "Total", "Amount", "Cost", "Price")
2. Provider/vendor/merchant name (store name, company name)
3. Date (transaction date, invoice date)
4. Invoice/receipt number (if visible)
5. Description/items (what was purchased - summarize if multiple items)
6. Category (guess the most appropriate category: Transportation, Food, Office Supplies, Travel, Equipment, Maintenance, Other)

Be as accurate as possible. If you can't find certain information, leave it empty.
Extract numbers without currency symbols. Format dates as YYYY-MM-DD.`,
        add_context_from_internet: false,
        file_urls: [fileUrl],
        response_json_schema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: 'Total amount' },
            provider_detail: { type: 'string', description: 'Vendor/merchant name' },
            date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
            note_number: { type: 'string', description: 'Invoice/receipt number' },
            description: { type: 'string', description: 'What was purchased' },
            suggested_category: { type: 'string', description: 'Suggested category name' }
          }
        }
      });

      console.log('📊 AI Analysis Result:', result);

      // Find matching category
      let categoryId = '';
      if (result.suggested_category) {
        const matchedCategory = categories.find(c => 
          c.name.toLowerCase().includes(result.suggested_category.toLowerCase()) ||
          result.suggested_category.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedCategory) {
          categoryId = matchedCategory.id;
        }
      }

      // Update form with extracted data
      setFormData(prev => ({
        ...prev,
        amount: result.amount ? result.amount.toString() : prev.amount,
        provider_detail: result.provider_detail || prev.provider_detail,
        date: result.date || prev.date,
        note_number: result.note_number || prev.note_number,
        text_note: result.description ? `<p>${result.description}</p>` : prev.text_note,
        category_id: categoryId || prev.category_id
      }));

      toast.success('✅ Invoice data extracted! Please review and confirm.');
    } catch (error) {
      console.error('Failed to analyze invoice:', error);
      toast.error('Failed to analyze invoice. Please enter data manually.');
    } finally {
      setAnalyzingInvoice(false);
    }
  };

  const handleAnalyzeDocument = async (documentUrl) => {
    if (!documentUrl) return;
    await analyzeInvoice(documentUrl);
  };

  const removeDocument = (urlToRemove) => {
    setFormData(prev => ({
      ...prev,
      document_urls: prev.document_urls.filter(url => url !== urlToRemove)
    }));
  };

  const handleExportPDF = async () => {
    try {
      const response = await base44.functions.invoke('exportPettyCash', {
        employee_id: employee.id
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petty-cash-${employee.full_name}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export PDF');
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/petty-cash?employee=${employee.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '-';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (showAddExpense) {
        handleAddExpense();
      } else if (showAddInput) {
        handleAddInput();
      }
    }
  };

  const handleViewDocuments = (entry) => {
    if (!entry.document_urls || entry.document_urls.length === 0) return;
    
    const docs = entry.document_urls.map((url, index) => {
      const fileName = url.split('/').pop().split('?')[0];
      return {
        file_url: url,
        file_name: decodeURIComponent(fileName) || `Document ${index + 1}`,
        upload_date: entry.created_date || new Date().toISOString()
      };
    });
    
    setViewingDocuments(docs);
  };

  const handleSaveMultipleExpenses = async (expensesData) => {
    try {
      console.log('💾 Creating multiple expenses...', expensesData.length);
      
      // Determine the starting balance for the new transactions
      let currentRunningBalance = employeeEntries.length > 0 
        ? employeeEntries[employeeEntries.length - 1].balance_after_transaction || 0
        : 0;
      
      // Sort expenses by date to ensure correct balance calculation order
      const sortedExpensesData = [...expensesData].sort((a, b) => new Date(a.date) - new Date(b.date));

      for (const expData of sortedExpensesData) {
        const amount = -Math.abs(parseFloat(expData.amount)); // Ensure amount is negative and parsed as float
        
        await PettyCashEntry.create({
          employee_id: employee.id,
          type: 'expense',
          date: expData.date,
          category_id: expData.category_id || null,
          provider_detail: expData.provider_detail || '',
          note_number: expData.note_number || '',
          text_note: expData.text_note || '',
          amount: amount,
          document_urls: expData.document_urls || [],
          balance_after_transaction: currentRunningBalance + amount
        });
        
        currentRunningBalance += amount;
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      toast.success('Multiple expenses added successfully');
      setShowMultipleExpenses(false);
      if (onEntriesChanged) onEntriesChanged();
    } catch (error) {
      console.error('Failed to create multiple expenses:', error);
      toast.error('Failed to create expenses');
    }
  };

  if (!employee) return null;

  const canAddInput = isAdmin || allowUserInput;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  name={employee.full_name}
                  src={employee.avatar_url}
                  className="h-12 w-12"
                />
                <div>
                  <SheetTitle className="text-xl font-extralight tracking-wide">{employee.full_name}</SheetTitle>
                  <p className="text-xs text-slate-500 font-light">{employee.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-light">Total Balance</p>
                  <p className={cn(
                    "text-2xl font-extralight tracking-wide",
                    totalBalance >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {totalBalance >= 0 ? '+' : ''}{formatCurrency(totalBalance)}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPDF} className="font-light">
                    <Download className="w-3 h-3 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleShare} className="font-light">
                    <Share2 className="w-3 h-3 mr-2" />
                    Share
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => {
                  resetForm();
                  setShowAddExpense(true);
                }}
                size="sm"
                className="bg-red-600 hover:bg-red-700 font-light"
              >
                <Minus className="w-3 h-3 mr-2" />
                Add Expense
              </Button>
              
              <Button
                onClick={() => setShowMultipleExpenses(true)}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 font-light"
              >
                <Plus className="w-3 h-3 mr-2" />
                Add Multiple Expenses
              </Button>
              
              {canAddInput && (
                <Button
                  onClick={() => {
                    resetForm();
                    setShowAddInput(true);
                  }}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 font-light"
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add Input
                </Button>
              )}
            </div>
          </SheetHeader>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-[100px] font-extralight text-xs">Date</TableHead>
                  <TableHead className="font-extralight text-xs">Provider</TableHead>
                  <TableHead className="w-[100px] font-extralight text-xs">Note #</TableHead>
                  <TableHead className="font-extralight text-xs">Note</TableHead>
                  <TableHead className="w-[100px] text-right font-extralight text-xs">Paid</TableHead>
                  <TableHead className="w-[100px] text-right font-extralight text-xs">Received</TableHead>
                  <TableHead className="w-[80px] font-extralight text-xs">Docs</TableHead>
                  <TableHead className="w-[120px] text-right font-extralight text-xs">Balance</TableHead>
                  {isAdmin && (
                    <TableHead className="w-[60px] font-extralight text-xs"></TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-12 text-slate-400 font-light text-sm">
                      No transactions yet
                    </TableCell>
                  </TableRow>
                ) : (
                  employeeEntries.map((entry) => {
                    const isExpense = entry.type === 'expense';
                    
                    return (
                      <TableRow key={entry.id} className="hover:bg-slate-50/50">
                        <TableCell className="text-xs font-light">
                          {format(parseISO(entry.date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-xs font-light">
                          {entry.provider_detail || '-'}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-extralight">
                          {entry.note_number || '-'}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 max-w-[200px] truncate font-light">
                          {entry.text_note ? (
                            <div 
                              dangerouslySetInnerHTML={{ __html: entry.text_note }} 
                              className="truncate"
                            />
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-light text-red-600">
                          {isExpense ? formatCurrency(Math.abs(entry.amount)) : '-'}
                        </TableCell>
                        <TableCell className="text-right text-xs font-light text-green-600">
                          {!isExpense ? formatCurrency(entry.amount) : '-'}
                        </TableCell>
                        <TableCell>
                          {entry.document_urls && entry.document_urls.length > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocuments(entry)}
                              className="h-7 px-2 font-light hover:bg-indigo-50"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              <span className="text-xs">{entry.document_urls.length}</span>
                            </Button>
                          ) : (
                            <span className="text-slate-300 text-xs font-light">-</span>
                          )}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-light text-xs",
                          entry.balance_after_transaction >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {entry.balance_after_transaction >= 0 ? '+' : ''}
                          {formatCurrency(entry.balance_after_transaction)}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditEntry(entry)}>
                                  <Edit className="w-3 h-3 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteEntry(entry)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-3 h-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Expense Sheet */}
      <Sheet open={showAddExpense} onOpenChange={(open) => {
        setShowAddExpense(open);
        if (!open) resetForm();
      }}>
        <SheetContent side="right" className="w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-red-600 font-extralight text-lg tracking-wide">
              {editingEntry ? 'Edit Expense' : 'Add Expense'}
            </SheetTitle>
          </SheetHeader>

          {analyzingInvoice && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div>
                <p className="text-sm font-medium text-blue-900">AI is analyzing the invoice...</p>
                <p className="text-xs text-blue-700">This may take a few seconds</p>
              </div>
            </div>
          )}

          <div className="space-y-3 mt-4" onKeyPress={handleKeyPress}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-light text-xs text-slate-600">Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 font-light text-sm h-9"
                />
              </div>

              <div>
                <Label className="font-light text-xs text-slate-600">Amount ({currencySymbol})</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 font-light text-sm h-9"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <Label className="font-light text-xs text-slate-600">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger className="mt-1 font-light text-sm h-9">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id} className="font-light text-sm">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="font-light text-xs text-slate-600">Provider Detail</Label>
              <Input
                placeholder="e.g., Taxi, Lunch, Office supplies..."
                value={formData.provider_detail}
                onChange={(e) => setFormData({ ...formData, provider_detail: e.target.value })}
                className="mt-1 font-light text-sm h-9"
              />
            </div>

            <div>
              <Label className="font-light text-xs text-slate-600">Note Number</Label>
              <Input
                placeholder="Receipt/invoice #"
                value={formData.note_number}
                onChange={(e) => setFormData({ ...formData, note_number: e.target.value })}
                className="mt-1 font-light text-sm h-9"
              />
            </div>

            <div>
              <Label className="font-light text-xs text-slate-600">Text Note</Label>
              <div className="mt-1 bg-white rounded border">
                <ReactQuill
                  theme="snow"
                  value={formData.text_note}
                  onChange={(value) => setFormData({ ...formData, text_note: value })}
                  placeholder="Additional details..."
                  className="font-light text-sm"
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ]
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="font-light text-xs text-slate-600">Documents</Label>
              <div className="mt-1 space-y-2">
                {formData.document_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <FileText className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-xs flex-1 truncate font-light">{url.split('/').pop()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAnalyzeDocument(url)}
                      className="h-6 px-2"
                      disabled={analyzingInvoice}
                      title="Analyze with AI"
                    >
                      <Sparkles className="w-3 h-3 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(url)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full font-light text-xs h-8"
                  onClick={() => document.getElementById('expense-file-upload').click()}
                  disabled={uploading || analyzingInvoice}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 mr-2" />
                      Upload Invoice/Receipt
                    </>
                  )}
                </Button>
                <input
                  id="expense-file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf"
                />
                <p className="text-xs text-slate-500 italic">
                  💡 Upload an invoice image to auto-extract data with AI
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowAddExpense(false);
                  resetForm();
                }}
                className="font-light text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddExpense}
                disabled={!formData.amount || saving}
                className="bg-red-600 hover:bg-red-700 font-light text-xs h-8"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-2" />
                    {editingEntry ? 'Update' : 'Save'} (Ctrl+Enter)
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add/Edit Input Sheet */}
      <Sheet open={showAddInput} onOpenChange={(open) => {
        setShowAddInput(open);
        if (!open) resetForm();
      }}>
        <SheetContent side="right" className="w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-green-600 font-extralight text-lg tracking-wide">
              {editingEntry ? 'Edit Money Input' : 'Add Money Input'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-3 mt-4" onKeyPress={handleKeyPress}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="font-light text-xs text-slate-600">Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 font-light text-sm h-9"
                />
              </div>

              <div>
                <Label className="font-light text-xs text-slate-600">Amount ({currencySymbol})</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="mt-1 font-light text-sm h-9"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <Label className="font-light text-xs text-slate-600">Text Note</Label>
              <div className="mt-1 bg-white rounded border">
                <ReactQuill
                  theme="snow"
                  value={formData.text_note}
                  onChange={(value) => setFormData({ ...formData, text_note: value })}
                  placeholder="Reason for money input..."
                  className="font-light text-sm"
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      ['clean']
                    ]
                  }}
                />
              </div>
            </div>

            <div>
              <Label className="font-light text-xs text-slate-600">Documents</Label>
              <div className="mt-1 space-y-2">
                {formData.document_urls.map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <FileText className="w-3 h-3 text-slate-400 flex-shrink-0" />
                    <span className="text-xs flex-1 truncate font-light">{url.split('/').pop()}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(url)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full font-light text-xs h-8"
                  onClick={() => document.getElementById('input-file-upload').click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
                <input
                  id="input-file-upload"
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="image/*,.pdf"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowAddInput(false);
                  resetForm();
                }}
                className="font-light text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddInput}
                disabled={!formData.amount || saving}
                className="bg-green-600 hover:bg-green-700 font-light text-xs h-8"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-2" />
                    {editingEntry ? 'Update' : 'Save'} (Ctrl+Enter)
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Entry?</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 mt-2">
              Are you sure you want to delete this {entryToDelete?.type === 'expense' ? 'expense' : 'input'} entry?
              <br /><br />
              <strong>Amount:</strong> {entryToDelete && formatCurrency(Math.abs(entryToDelete.amount || 0))}
              <br />
              <strong>Date:</strong> {entryToDelete && format(parseISO(entryToDelete.date), 'MMM d, yyyy')}
              {entryToDelete?.provider_detail && (
                <>
                  <br />
                  <strong>Provider:</strong> {entryToDelete.provider_detail}
                </>
              )}
              <br /><br />
              <span className="text-red-600">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setEntryToDelete(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Entry
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      {viewingDocuments && (
        <DocumentViewer
          isOpen={!!viewingDocuments}
          onClose={() => setViewingDocuments(null)}
          title="Transaction Documents"
          documents={viewingDocuments}
          canEdit={false}
        />
      )}

      {/* Multiple Expenses Panel */}
      <MultipleExpensesPanel
        isOpen={showMultipleExpenses}
        onClose={() => setShowMultipleExpenses(false)}
        onSave={handleSaveMultipleExpenses}
        employee={employee}
        categories={categories}
        currencySymbol={currencySymbol}
      />
    </>
  );
}
