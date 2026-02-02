import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Asset, AssetCategory, AssetStatus, FinanceCategory } from '@/entities/all';
import { Plus, Loader2, Upload, FileSpreadsheet, Package, Download, Link as LinkIcon, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useData } from '@/components/DataProvider';
import { CurrencyIcon } from '../../Layout';
import ProjectCombobox from '../workorders/ProjectCombobox';

export default function AddAssetPanel({ isOpen, onClose, onAssetAdded, users = [], projects = [], customers = [] }) {
  const { currentCompany } = useData();
  const [activeTab, setActiveTab] = useState('single');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [financeCategories, setFinanceCategories] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Single asset form
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    finance_category: '',
    status: '',
    identifier: '',
    assigned_to_user_id: '',
    project_id: '',
    purchase_date: '',
    purchase_cost: '',
    plate_number: '',
    notes: ''
  });

  // Bulk upload
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkData, setBulkData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [loadingSheets, setLoadingSheets] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const [categoriesData, statusesData, financeCatsData] = await Promise.all([
        AssetCategory.list('sort_order'),
        AssetStatus.list('sort_order'),
        FinanceCategory.list('sort_order')
      ]);
      setCategories(categoriesData || []);
      setStatuses(statusesData || []);
      setFinanceCategories(financeCatsData || []);
      
      // Set defaults
      if (categoriesData && categoriesData.length > 0) {
        setFormData(prev => ({ ...prev, category: categoriesData[0].name }));
      }
      if (statusesData && statusesData.length > 0) {
        setFormData(prev => ({ ...prev, status: statusesData[0].name }));
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper to get default finance category based on asset category
  const getDefaultFinanceCategory = (assetCategory) => {
    if (assetCategory === 'Vehicle') {
      return 'Fixed Assets';
    }
    // For equipment like Tower Crane, Hoist, etc.
    if (['Tower Crane', 'Hoist', 'Hoist Mast Section', 'Tool'].includes(assetCategory)) {
      return 'Operational Fixed Assets';
    }
    return '';
  };

  const handleCreateSingle = async () => {
    if (!formData.name?.trim()) {
      toast.error('Asset name is required');
      return;
    }

    setLoading(true);
    try {
      // Determine finance category - use selected or default based on asset category
      const selectedCategory = formData.category || (categories[0]?.name || 'Other');
      const financeCategory = formData.finance_category || getDefaultFinanceCategory(selectedCategory);

      const assetData = {
        name: formData.name,
        category: selectedCategory,
        finance_category: financeCategory || null,
        status: formData.status || (statuses[0]?.name || 'Available'),
        identifier: formData.identifier || null,
        plate_number: formData.plate_number || null,
        assigned_to_user_id: formData.assigned_to_user_id || null,
        project_id: formData.project_id || null,
        purchase_date: formData.purchase_date || null,
        purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
        branch_id: currentCompany?.id,
        notes: formData.notes || null
      };

      const newAsset = await Asset.create(assetData);
      toast.success('Asset created successfully!');
      
      setFormData({
        name: '',
        category: categories[0]?.name || '',
        finance_category: '',
        status: statuses[0]?.name || '',
        identifier: '',
        plate_number: '',
        assigned_to_user_id: '',
        project_id: '',
        purchase_date: '',
        purchase_cost: '',
        notes: ''
      });

      if (onAssetAdded) onAssetAdded(newAsset);
      onClose();
    } catch (error) {
      console.error('Failed to create asset:', error);
      toast.error('Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleCSV = `name,category,subcategory,status,identifier,purchase_date,purchase_cost,notes
Ford Transit Van,Vehicle,Van,Available,ABC123XYZ,2024-01-15,25000,Company delivery van
Milwaukee M18 Drill,Tool,Power Tools,In Use,SN-987654,2024-03-20,450,Cordless drill for construction
Dell Laptop i7,IT Equipment,Laptop,Available,LAP-2024-01,2024-02-10,1200,Office laptop for admin
Safety Helmet,Uniform,PPE,Available,HLM-001,2024-01-05,35,PPE equipment
Office Chair,Other,Furniture,In Use,CHR-045,2023-12-01,180,Ergonomic office chair`;

    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'assets-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('Template CSV downloaded! Open it in Google Sheets or Excel.');
  };

  const handleCopyHeaders = () => {
    const headers = 'name\tcategory\tsubcategory\tstatus\tidentifier\tpurchase_date\tpurchase_cost\tnotes';
    navigator.clipboard.writeText(headers);
    toast.success('Column headers copied! Paste them in your Google Sheet first row.');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setBulkFile(file);
    setLoading(true);
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            assets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string' },
                  subcategory: { type: 'string' },
                  status: { type: 'string' },
                  identifier: { type: 'string' },
                  purchase_date: { type: 'string' },
                  purchase_cost: { type: 'number' },
                  notes: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (extractedData.status === 'success' && extractedData.output?.assets) {
        setBulkData(extractedData.output.assets);
        setShowPreview(true);
        toast.success(`${extractedData.output.assets.length} assets extracted from file`);
      } else {
        toast.error('Failed to extract data from file');
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const convertDateToISO = (dateStr) => {
    if (!dateStr) return null;
    
    // If already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Handle dd/mm/yyyy or dd-mm-yyyy
    const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const [, day, month, year] = ddmmyyyyMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return dateStr; // Return as is if format not recognized
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('File is empty or has no data rows');
    }

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    const assets = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Simple CSV parsing (handles basic cases)
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const asset = {};
      
      headers.forEach((header, index) => {
        if (values[index]) {
          asset[header] = values[index];
        }
      });

      if (asset.name && asset.name.trim()) {
        // Normalize category
        let finalCategory = asset.category || null;
        if (finalCategory) {
          const existingCat = categories.find(c => c.name.toLowerCase().trim() === finalCategory.toLowerCase().trim());
          if (existingCat) {
            finalCategory = existingCat.name;
          }
        }

        assets.push({
          name: asset.name,
          category: finalCategory,
          subcategory: asset.subcategory || null,
          status: asset.status || null,
          identifier: asset.identifier || null,
          purchase_date: convertDateToISO(asset.purchase_date) || null,
          purchase_cost: asset.purchase_cost ? parseFloat(asset.purchase_cost) : null,
          notes: asset.notes || null
        });
      }
    }

    return assets;
  };

  const handleLoadGoogleSheets = async () => {
    if (!googleSheetsUrl.trim()) {
      toast.error('Please enter a Google Sheets URL');
      return;
    }

    setLoadingSheets(true);
    
    try {
      // Extract spreadsheet ID from URL
      let spreadsheetId = null;
      const match = googleSheetsUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        spreadsheetId = match[1];
      } else {
        throw new Error('Invalid Google Sheets URL format');
      }

      // Convert to export URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&id=${spreadsheetId}`;
      
      console.log('Fetching from:', csvUrl);

      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(csvUrl, {
        signal: controller.signal,
        mode: 'cors',
        credentials: 'omit'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          throw new Error('Access denied. Make sure the Google Sheet is shared publicly (Anyone with the link can view)');
        }
        throw new Error(`Failed to fetch (${response.status}). Check if the sheet is publicly accessible.`);
      }
      
      const csvText = await response.text();
      
      if (!csvText || csvText.length < 10) {
        throw new Error('The sheet appears to be empty');
      }

      const assets = parseCSV(csvText);

      if (assets.length > 0) {
        setBulkData(assets);
        setShowPreview(true);
        toast.success(`✓ ${assets.length} assets loaded from Google Sheets`);
      } else {
        toast.error('No valid assets found. Make sure the first row has column names and data rows follow.');
      }

    } catch (error) {
      console.error('Google Sheets error:', error);
      
      if (error.name === 'AbortError') {
        toast.error('Request timed out. The sheet might be too large or the connection is slow.');
      } else {
        toast.error(error.message || 'Failed to load Google Sheets');
      }
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleBulkCreate = async () => {
    if (bulkData.length === 0) {
      toast.error('No assets to create');
      return;
    }

    setLoading(true);
    try {
      const assetsToCreate = bulkData.map(item => {
        // Double check normalization before creating
        let finalCategory = item.category;
        if (finalCategory) {
          const existingCat = categories.find(c => c.name.toLowerCase().trim() === finalCategory.toLowerCase().trim());
          if (existingCat) {
            finalCategory = existingCat.name;
          }
        }

        return {
          name: item.name,
          category: finalCategory || (categories[0]?.name || 'Other'),
          subcategory: item.subcategory || null,
        status: item.status || (statuses[0]?.name || 'Available'),
        identifier: item.identifier || null,
        purchase_date: item.purchase_date || null,
        purchase_cost: item.purchase_cost ? parseFloat(item.purchase_cost) : null,
        branch_id: currentCompany?.id,
        notes: item.notes || null
      };
      });

      await Asset.bulkCreate(assetsToCreate);
      
      toast.success(`${assetsToCreate.length} assets created successfully!`);
      
      setBulkFile(null);
      setBulkData([]);
      setShowPreview(false);
      setGoogleSheetsUrl('');

      if (onAssetAdded) onAssetAdded();
      onClose();
    } catch (error) {
      console.error('Bulk create error:', error);
      toast.error('Failed to create assets');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 overflow-hidden">
        <SheetHeader className="border-b py-4 px-6">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <SheetTitle>Add Assets</SheetTitle>
          </div>
        </SheetHeader>

        <div className="overflow-y-auto h-[calc(100vh-80px)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none px-6 bg-white sticky top-0 z-10">
              <TabsTrigger value="single" className="gap-2">
                <Plus className="w-4 h-4" />
                Single Asset
              </TabsTrigger>
              <TabsTrigger value="bulk" className="gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Bulk Upload
              </TabsTrigger>
            </TabsList>

            {/* Single Asset Tab */}
            <TabsContent value="single" className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Asset Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Ford Transit Van, Milwaukee Drill"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => {
                      handleChange('category', val);
                      // Auto-set default finance category when category changes
                      if (!formData.finance_category) {
                        const defaultFc = getDefaultFinanceCategory(val);
                        if (defaultFc) {
                          handleChange('finance_category', defaultFc);
                        }
                      }
                    }}
                    disabled={loadingConfig}
                  >
                    <SelectTrigger id="category">
                      <SelectValue>
                        {formData.category || 'Select category'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => handleChange('status', val)}
                    disabled={loadingConfig}
                  >
                    <SelectTrigger id="status">
                      <SelectValue>
                        {formData.status || 'Select status'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(stat => (
                        <SelectItem key={stat.id} value={stat.name}>
                          {stat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="finance_category">Finance Category</Label>
                <Select
                  value={formData.finance_category || ''}
                  onValueChange={(val) => handleChange('finance_category', val === '' ? '' : val)}
                  disabled={loadingConfig}
                >
                  <SelectTrigger id="finance_category">
                    <SelectValue>
                      {formData.finance_category || 'Select finance category'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {financeCategories.map(fc => (
                      <SelectItem key={fc.id} value={fc.name}>
                        {fc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Auto-assigned: Vehicles → Fixed Assets, Equipment → Operational Fixed Assets</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Identifier / Serial Number</Label>
                  <Input
                    id="identifier"
                    value={formData.identifier}
                    onChange={(e) => handleChange('identifier', e.target.value)}
                    placeholder="VIN, Serial Number..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plate_number">Plate Number</Label>
                  <Input
                    id="plate_number"
                    value={formData.plate_number}
                    onChange={(e) => handleChange('plate_number', e.target.value)}
                    placeholder="Plate Number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <Select
                    value={formData.assigned_to_user_id || ''}
                    onValueChange={(val) => handleChange('assigned_to_user_id', val === '' ? '' : val)}
                  >
                    <SelectTrigger id="assigned_to">
                      <SelectValue>
                        {formData.assigned_to_user_id ? 
                          users.find(u => u.id === formData.assigned_to_user_id) ? 
                            `${users.find(u => u.id === formData.assigned_to_user_id).first_name || ''} ${users.find(u => u.id === formData.assigned_to_user_id).last_name || ''}`.trim() || 
                            users.find(u => u.id === formData.assigned_to_user_id).email 
                          : 'Select user'
                        : 'Select user'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Not assigned</SelectItem>
                      {users.map(user => (
                        <SelectItem key={user.id} value={user.id}>
                          {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project">Project</Label>
                  <ProjectCombobox
                    projects={projects}
                    customers={customers}
                    selectedProjectId={formData.project_id}
                    onSelectProject={(id) => handleChange('project_id', id)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => handleChange('purchase_date', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase_cost">Purchase Cost</Label>
                  <Input
                    id="purchase_cost"
                    type="number"
                    step="0.01"
                    value={formData.purchase_cost}
                    onChange={(e) => handleChange('purchase_cost', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Additional notes or details..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSingle} disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Create Asset
                </Button>
              </div>
            </TabsContent>

            {/* Bulk Upload Tab */}
            <TabsContent value="bulk" className="px-6 py-4 space-y-4">
              {!showPreview ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-blue-900 mb-1">Upload Excel/CSV File or Link Google Sheets</h3>
                        <p className="text-sm text-blue-800">
                          Upload a spreadsheet or paste a Google Sheets link with asset information
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadSample}
                        className="gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Template
                      </Button>
                    </div>
                    
                    <p className="text-sm text-blue-800 mb-2">Required columns:</p>
                    <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                      <li><strong>name</strong> (required)</li>
                      <li><strong>category</strong> (e.g., Vehicle, Tool)</li>
                      <li><strong>subcategory</strong></li>
                      <li><strong>status</strong> (e.g., Available, In Use)</li>
                      <li><strong>identifier</strong> (serial number, VIN, etc.)</li>
                      <li><strong>purchase_date</strong> (YYYY-MM-DD)</li>
                      <li><strong>purchase_cost</strong> (number)</li>
                      <li><strong>notes</strong></li>
                    </ul>
                  </div>

                  {/* Google Sheets Option */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-slate-200"></div>
                      <span className="text-xs text-slate-500">Option 1: Google Sheets</span>
                      <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    {/* Instructions for creating Google Sheet */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                            📋 How to Use Google Sheets
                          </h4>
                          <ol className="text-sm text-green-800 space-y-2 ml-4 list-decimal">
                            <li>
                              Go to <a href="https://sheets.google.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">sheets.google.com</a> and create a new sheet
                            </li>
                            <li>
                              Click button below to copy column headers, then paste in first row →
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyHeaders}
                                className="ml-2 h-7"
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copy Headers
                              </Button>
                            </li>
                            <li>Fill in your asset data in the rows below</li>
                            <li><strong>Share:</strong> Click "Share" button (top right) → Change to "Anyone with the link" → Set to "Viewer"</li>
                            <li>Copy the URL from your browser and paste it below</li>
                          </ol>
                          <p className="text-xs text-green-700 mt-3 italic">
                            💡 Tip: Download the template above and upload it to Google Sheets (File → Import) to get started faster!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sheets-url">Paste Your Google Sheets URL</Label>
                      <div className="flex gap-2">
                        <Input
                          id="sheets-url"
                          value={googleSheetsUrl}
                          onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/..."
                          className="flex-1"
                        />
                        <Button
                          onClick={handleLoadGoogleSheets}
                          disabled={loadingSheets || !googleSheetsUrl.trim()}
                        >
                          {loadingSheets ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <LinkIcon className="w-4 h-4 mr-2" />
                          )}
                          Load
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">
                        ⚠️ Important: The sheet MUST be shared as "Anyone with the link can view"
                      </p>
                    </div>
                  </div>

                  {/* File Upload Option */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-slate-200"></div>
                      <span className="text-xs text-slate-500">Option 2: Upload File</span>
                      <div className="flex-1 h-px bg-slate-200"></div>
                    </div>

                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="bulk-upload"
                        disabled={loading}
                      />
                      <label htmlFor="bulk-upload" className="cursor-pointer">
                        {loading ? (
                          <>
                            <Loader2 className="w-12 h-12 mx-auto mb-3 text-indigo-600 animate-spin" />
                            <p className="text-sm font-medium text-indigo-700">Processing file...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                            <p className="text-sm font-medium text-slate-700">
                              Click to upload or drag & drop
                            </p>
                            <p className="text-xs text-slate-500 mt-1">CSV or Excel files</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-1">
                      ✓ {bulkData.length} assets ready to import
                    </h3>
                    <p className="text-sm text-green-700">
                      Review the data below and click "Create All" to import
                    </p>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden max-h-96 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Category</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Identifier</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Date</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkData.map((item, idx) => (
                          <tr key={idx} className="border-b border-slate-100">
                            <td className="px-3 py-2 text-xs text-slate-900">{item.name}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">{item.category || '-'}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">{item.status || '-'}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">{item.identifier || '-'}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">{item.purchase_date || '-'}</td>
                            <td className="px-3 py-2 text-xs text-slate-600">
                              {item.purchase_cost ? (
                                <span className="flex items-center gap-1">
                                  <CurrencyIcon className="w-3 h-3 text-[8px]" />
                                  {parseFloat(item.purchase_cost).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPreview(false);
                        setBulkData([]);
                        setBulkFile(null);
                        setGoogleSheetsUrl('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleBulkCreate} disabled={loading}>
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Create All ({bulkData.length})
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}