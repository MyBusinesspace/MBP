import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle, CheckCircle, AlertTriangle, Download, RefreshCw } from 'lucide-react';

export default function CSVImport({ 
  entityName, 
  onImportComplete, 
  processRecords, 
  sampleCSVHeaders,
  exampleData = [],
  trigger,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [importStats, setImportStats] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);

  const fileInputRef = useRef(null);

  const downloadExample = () => {
    try {
      const headers = sampleCSVHeaders.join(',');
      const rows = exampleData.map(row => 
        sampleCSVHeaders.map(header => {
          const value = row[header] || '';
          return value.toString().includes(',') || value.toString().includes('"') 
            ? `"${value.toString().replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      );
      
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${entityName}_example.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Example CSV downloaded successfully');
    } catch (error) {
      console.error('❌ Error downloading example CSV:', error);
      setMessage('Failed to download example file');
      setMessageType('error');
    }
  };

  // Parse CSV directly in browser
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const records = [];

    for (let i = 1; i < lines.length; i++) {
      const values = [];
      let current = '';
      let inQuotes = false;

      for (let char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));

      const record = {};
      headers.forEach((header, index) => {
        if (values[index] !== undefined && values[index] !== '') {
          record[header] = values[index];
        }
      });

      if (Object.keys(record).length > 0) {
        records.push(record);
      }
    }

    return records;
  };

  const processFile = async (file) => {
    setIsLoading(true);
    setMessage('');
    setMessageType('');
    setImportStats(null);

    try {
      console.log('📖 Reading CSV file directly...');
      
      const text = await file.text();
      const records = parseCSV(text);
      
      console.log(`📋 Parsed ${records.length} records from CSV`);
      console.log('🔍 First 3 records:', records.slice(0, 3));
      
      if (records.length === 0) {
        setMessage('No valid records found in the CSV file');
        setMessageType('warning');
        return;
      }

      // Process records using the provided function
      const { successful, skipped } = await processRecords(records);

      const successCount = successful?.length || 0;
      const skippedCount = skipped?.length || 0;
      const totalCount = records.length;

      setImportStats({ successCount, skippedCount, totalCount });

      if (successCount > 0) {
        setMessage(`Successfully imported ${successCount} ${entityName.toLowerCase()}${successCount !== 1 ? 's' : ''}`);
        setMessageType('success');
        await onImportComplete();
        
        setTimeout(() => {
          setIsOpen(false);
          setMessage('');
          setMessageType('');
          setImportStats(null);
        }, 2000);
      } else {
        setMessage(`No records were imported. Found ${records.length} records but none matched the expected format.`);
        setMessageType('warning');
      }

    } catch (error) {
      console.error('❌ Import error:', error);
      setMessage(error.message || 'Import failed. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setMessage('Please upload a CSV file');
      setMessageType('error');
      return;
    }

    setCurrentFile(file);
    await processFile(file);
  };

  const handleRetry = async () => {
    if (!currentFile) return;
    await processFile(currentFile);
  };

  const TriggerComponent = trigger ? (
    React.cloneElement(trigger, { onClick: () => setIsOpen(true) })
  ) : (
    <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
      <Upload className="w-4 h-4 mr-2" />
      Import CSV
    </Button>
  );

  return (
    <>
      {TriggerComponent}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import {entityName} from CSV</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-blue-900">Need help getting started?</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadExample}
                  className="text-blue-700 border-blue-300 hover:bg-blue-100"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Example
                </Button>
              </div>
              <p className="text-xs text-blue-700">
                Download a sample CSV file to see the expected format. Any column names will work!
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">
                Recommended columns: <span className="font-mono text-xs bg-gray-100 px-1 rounded">{sampleCSVHeaders.join(', ')}</span>
              </p>
              <p className="text-xs text-gray-500">
                Your CSV can use any column names - we'll match them automatically.
              </p>
            </div>

            <div>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="cursor-pointer"
                ref={fileInputRef}
              />
            </div>

            {message && (
              <Alert className={
                messageType === 'error' ? 'border-red-200 bg-red-50' : 
                messageType === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-green-200 bg-green-50'
              }>
                {messageType === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : messageType === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription className={
                  messageType === 'error' ? 'text-red-700' : 
                  messageType === 'warning' ? 'text-yellow-700' :
                  'text-green-700'
                }>
                  {message}
                  {importStats && (
                    <div className="mt-2 text-xs">
                      📊 Results: {importStats.successCount} successful, {importStats.skippedCount} skipped, {importStats.totalCount} total
                    </div>
                  )}
                  {currentFile && messageType === 'warning' && (
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        disabled={isLoading}
                        className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {isLoading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-sm text-gray-600 mt-2">Processing your CSV file...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}