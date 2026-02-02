import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, FileText, BarChart3, Calendar as CalendarIcon, Archive, Settings } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import CustomReportExplorer from '@/components/reports/CustomReportExplorer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import AdminReportGenerator from '@/components/reports/AdminReportGenerator';
import QuickReportsSettings from '@/components/reports/QuickReportsSettings';
import DocumentUploader from '@/components/documents/DocumentUploader';
import QuickFiles from "./QuickFiles";

 export default function Downloads() {
  const [startDate, setStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [loadingKey, setLoadingKey] = useState('');
  const [activeTab, setActiveTab] = useState('finder');

  // Set initial tab from URL if provided (e.g., /downloads?tab=settings)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab) setActiveTab(tab);
  }, []);

  const downloadBlob = (data, filename, mime = 'application/pdf') => {
    const blob = new Blob([data], { type: mime });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleExport = async (fnName, filename, payload = {}, mime = 'application/pdf') => {
    setLoadingKey(fnName);
    try {
      const res = await base44.functions.invoke(fnName, payload);
      downloadBlob(res.data, filename, mime);
      toast.success('Download started');
    } catch (err) {
      console.error(err);
      toast.error('Failed to download. Please try again.');
    } finally {
      setLoadingKey('');
    }
  };

  const openWeeklySummary = async () => {
    await handleExport('exportWorkOrdersPDF', `work-orders-${startDate}_to_${endDate}.pdf`, { startDate, endDate, groupBy: 'team' }, 'application/pdf');
  };

  const fetchDocsUris = async (entityName) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let docs = [];
    try {
      docs = await base44.entities[entityName].list('-updated_date', 500);
    } catch (e) {
      console.error('Failed to load documents for', entityName, e);
      return [];
    }
    const inRange = (Array.isArray(docs) ? docs : []).filter((d) => {
      const ts = d.upload_date || d.last_updated_date;
      if (!ts) return true;
      const dt = new Date(ts);
      return dt >= start && dt <= end;
    });
    const uris = [];
    inRange.forEach((d) => {
      const arr = Array.isArray(d.file_urls) ? d.file_urls : (d.file_url ? [d.file_url] : []);
      arr.forEach((u) => { if (u) uris.push(u); });
    });
    return uris;
  };

  const handleExportDocumentsZip = async (entityName, filenamePrefix) => {
    setLoadingKey(`zip_${entityName}`);
    try {
      const file_uris = await fetchDocsUris(entityName);
      if (!file_uris.length) {
        toast.error('No documents in the selected period');
        return;
      }
      const res = await base44.functions.invoke('exportDocumentsZip', { file_uris });
      downloadBlob(res.data, `${filenamePrefix}-${startDate}_to_${endDate}.zip`, 'application/zip');
      toast.success('ZIP generated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate ZIP');
    } finally {
      setLoadingKey('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Download className="w-5 h-5 text-gray-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Quick Reports</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setActiveTab('settings')}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </Button>
            </div>
          </div>
        </Card>



        <Card>

          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full flex">

                <TabsTrigger value="finder">Document finder</TabsTrigger>
                <TabsTrigger value="uploader">Upload</TabsTrigger>
              </TabsList>



              <TabsContent value="finder">
                <div className="bg-white rounded-xl border border-slate-200">
                  <CustomReportExplorer />
                </div>
              </TabsContent>

              <TabsContent value="uploader">
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-6">
                  <div className="space-y-2">
                    <div className="text-sm text-slate-700 font-medium">Section 1 — Upload to existing records</div>
                    <div className="text-sm text-slate-600">Attach documents to Customers, Projects, Assets or Users that already exist.</div>
                    <DocumentUploader />
                  </div>
                  <div className="border-t" />
                  <div className="space-y-2">
                    <div className="text-sm text-slate-700 font-medium">Section 2 — Create as you upload</div>
                    <div className="text-sm text-slate-600">If the target entity does not exist (e.g. new Project or Customer), use QuickFiles to create it and then attach the file.</div>
                    <QuickFiles />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings">
                <div className="bg-white rounded-xl border border-slate-200">
                  <QuickReportsSettings />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}