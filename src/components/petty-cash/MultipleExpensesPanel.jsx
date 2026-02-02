import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, X, Loader2, FileText, Upload, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function MultipleExpensesPanel({
  isOpen = false,
  onClose,
  onSave,
  employee,
  categories = [],
  currencySymbol = '$',
  isReadOnly = false,
}) {
  const safeCategories = Array.isArray(categories) ? categories : [];

  const [expenses, setExpenses] = useState([
    {
      id: Date.now(),
      date: format(new Date(), 'yyyy-MM-dd'),
      category_id: '',
      provider_detail: '',
      note_number: '',
      text_note: '',
      amount: '',
      document_urls: []
    }
  ]);

  const [uploadingPhotos, setUploadingPhotos] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExpenses([
        {
          id: Date.now(),
          date: format(new Date(), 'yyyy-MM-dd'),
          category_id: '',
          provider_detail: '',
          note_number: '',
          text_note: '',
          amount: '',
          document_urls: []
        }
      ]);
    }
  }, [isOpen]);

  const addExpense = () => {
    setExpenses([
      ...expenses,
      {
        id: Date.now(),
        date: format(new Date(), 'yyyy-MM-dd'),
        category_id: '',
        provider_detail: '',
        note_number: '',
        text_note: '',
        amount: '',
        document_urls: []
      }
    ]);
  };

  const removeExpense = (id) => {
    if (expenses.length === 1) {
      toast.info('At least one expense is required');
      return;
    }
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  const updateExpense = (id, field, value) => {
    setExpenses(expenses.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ));
  };

  const handleFileUpload = async (expenseId, files) => {
    if (!files || files.length === 0) return;

    setUploadingPhotos(prev => ({ ...prev, [expenseId]: true }));

    try {
      const uploadedUrls = [];
      
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      const expense = expenses.find(e => e.id === expenseId);
      const currentUrls = expense?.document_urls || [];
      updateExpense(expenseId, 'document_urls', [...currentUrls, ...uploadedUrls]);
      
      toast.success(`${uploadedUrls.length} document(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload documents');
    } finally {
      setUploadingPhotos(prev => ({ ...prev, [expenseId]: false }));
    }
  };

  const handleRemoveDocument = (expenseId, docUrl) => {
    const expense = expenses.find(e => e.id === expenseId);
    if (!expense) return;

    const updatedUrls = (expense.document_urls || []).filter(url => url !== docUrl);
    updateExpense(expenseId, 'document_urls', updatedUrls);
  };

  const handleSubmit = async () => {
    if (isCreating) {
      console.warn('⚠️ Already creating expenses, ignoring...');
      return;
    }

    console.log('💾 handleSubmit called');
    console.log('📦 expenses:', expenses);
    
    // Validar que tengan al menos fecha y monto
    const validExpenses = expenses.filter(exp => {
      const hasDate = !!exp.date;
      const hasAmount = !!exp.amount && parseFloat(exp.amount) > 0;
      
      return hasDate && hasAmount;
    });
    
    console.log('✅ Valid expenses:', validExpenses.length);
    console.log('❌ Invalid expenses:', expenses.length - validExpenses.length);
    
    if (validExpenses.length === 0) {
      toast.error('❌ Cannot create expenses. Please add at least one expense with Date and Amount.', {
        duration: 5000
      });
      return;
    }

    if (validExpenses.length < expenses.length) {
      const invalidCount = expenses.length - validExpenses.length;
      toast.warning(`⚠️ ${invalidCount} expense(s) skipped (missing Date or Amount)`, {
        duration: 4000
      });
    }

    setIsCreating(true);

    try {
      const expensesToCreate = validExpenses.map(exp => {
        const { id, ...expData } = exp;
        return {
          ...expData,
          amount: parseFloat(expData.amount)
        };
      });

      console.log('📤 Sending to onSave:', expensesToCreate.length, 'expenses');
      
      await onSave(expensesToCreate);
      
      toast.success(`${expensesToCreate.length} expense(s) created successfully`);
      console.log('✅ onSave completed successfully');
      onClose();
    } catch (error) {
      console.error('❌ onSave failed:', error);
      toast.error(`Failed to create expenses: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const totalAmount = expenses.reduce((sum, exp) => {
    const amount = parseFloat(exp.amount || 0);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-[900px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Add Multiple Expenses</SheetTitle>
            <Badge variant="secondary" className="text-sm">
              Total: {currencySymbol}{totalAmount.toFixed(2)}
            </Badge>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            💡 Add multiple expenses at once for {employee?.full_name || employee?.nickname || 'employee'}
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {expenses.map((exp, index) => {
            const missingDate = !exp.date;
            const missingAmount = !exp.amount || parseFloat(exp.amount) <= 0;
            const hasErrors = missingDate || missingAmount;

            return (
              <div 
                key={exp.id} 
                className={cn(
                  "p-4 rounded-lg bg-white shadow-sm",
                  hasErrors ? "border-2 border-red-300" : "border-2 border-slate-300"
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-900 text-lg">Expense #{index + 1}</h3>
                    {hasErrors && (
                      <Badge variant="destructive" className="text-xs">
                        Missing required fields
                      </Badge>
                    )}
                    {exp.amount && parseFloat(exp.amount) > 0 && (
                      <Badge className="text-xs bg-red-100 text-red-700 border-red-300">
                        {currencySymbol}{parseFloat(exp.amount).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  {expenses.length > 1 && !isReadOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExpense(exp.id)}
                      disabled={isCreating}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  )}
                </div>

                {hasErrors && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-red-900 mb-1">
                          Required fields missing:
                        </div>
                        <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                          {missingDate && <li>Select a <strong>Date</strong></li>}
                          {missingAmount && <li>Enter an <strong>Amount</strong> greater than 0</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className={cn(missingDate && "text-red-600 font-bold")}>
                        Date <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="date"
                        value={exp.date}
                        onChange={(e) => updateExpense(exp.id, 'date', e.target.value)}
                        disabled={isReadOnly || isCreating}
                        className={cn(
                          "mt-1 font-light text-sm",
                          missingDate && "border-red-300 bg-red-50"
                        )}
                      />
                    </div>

                    <div>
                      <Label className={cn(missingAmount && "text-red-600 font-bold")}>
                        Amount ({currencySymbol}) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={exp.amount}
                        onChange={(e) => updateExpense(exp.id, 'amount', e.target.value)}
                        disabled={isReadOnly || isCreating}
                        className={cn(
                          "mt-1 font-light text-sm",
                          missingAmount && "border-red-300 bg-red-50"
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={exp.category_id || ''}
                        onValueChange={(value) => updateExpense(exp.id, 'category_id', value)}
                        disabled={isReadOnly || isCreating}
                      >
                        <SelectTrigger className="mt-1 font-light text-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {safeCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id} className="font-light text-sm">
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Note Number</Label>
                      <Input
                        placeholder="Receipt/invoice #"
                        value={exp.note_number || ''}
                        onChange={(e) => updateExpense(exp.id, 'note_number', e.target.value)}
                        disabled={isReadOnly || isCreating}
                        className="mt-1 font-light text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Provider Detail</Label>
                    <Input
                      placeholder="e.g., Taxi, Lunch, Office supplies..."
                      value={exp.provider_detail || ''}
                      onChange={(e) => updateExpense(exp.id, 'provider_detail', e.target.value)}
                      disabled={isReadOnly || isCreating}
                      className="mt-1 font-light text-sm"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Text Note
                    </Label>
                    <div className="mt-1 bg-white rounded border">
                      <ReactQuill
                        theme="snow"
                        value={exp.text_note || ''}
                        onChange={(value) => updateExpense(exp.id, 'text_note', value)}
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
                    <Label className="flex items-center gap-2 mb-2">
                      <Camera className="w-4 h-4" />
                      Documents & Photos
                      {exp.document_urls && exp.document_urls.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {exp.document_urls.length} file{exp.document_urls.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </Label>
                    
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 bg-slate-50">
                      {!isReadOnly && (
                        <div className="mb-3">
                          <label className="cursor-pointer block">
                            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                              <Upload className="w-4 h-4 text-slate-600" />
                              <span className="text-sm font-medium text-slate-700">
                                {uploadingPhotos[exp.id] ? 'Uploading...' : 'Upload Documents'}
                              </span>
                            </div>
                            <input
                              type="file"
                              multiple
                              accept="image/*,.pdf"
                              className="hidden"
                              onChange={(e) => {
                                const files = Array.from(e.target.files);
                                handleFileUpload(exp.id, files);
                                e.target.value = '';
                              }}
                              disabled={uploadingPhotos[exp.id] || isCreating}
                            />
                          </label>
                        </div>
                      )}

                      {exp.document_urls && exp.document_urls.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                          {exp.document_urls.map((url, idx) => (
                            <div key={idx} className="relative group">
                              {url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <img
                                  src={url}
                                  alt={`Document ${idx + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border border-slate-200"
                                />
                              ) : (
                                <div className="w-full h-24 flex items-center justify-center bg-slate-100 rounded-lg border border-slate-200">
                                  <FileText className="w-8 h-8 text-slate-400" />
                                </div>
                              )}
                              {!isReadOnly && (
                                <button
                                  onClick={() => handleRemoveDocument(exp.id, url)}
                                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={isCreating}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs text-slate-500">No documents uploaded yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {!isReadOnly && (
            <Button
              variant="outline"
              onClick={addExpense}
              className="w-full border-dashed border-2 h-12"
              disabled={isCreating}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Expense
            </Button>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 sticky bottom-0 bg-white pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          {!isReadOnly && (
            <Button 
              onClick={handleSubmit} 
              className="bg-red-600 hover:bg-red-700"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create {expenses.length} Expense{expenses.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}