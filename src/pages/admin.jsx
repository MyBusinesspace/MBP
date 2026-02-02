import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, FileText, MapPin, Settings, Plus
} from 'lucide-react';
import { useData } from '@/components/DataProvider';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { mergeCompanies } from '@/functions/mergeCompanies';

const lc = (s) => (s || '').toLowerCase();
const isOfficial = (b) => {
  const n = lc(b?.name);
  return (n.includes('redcrane') || n.includes('redline')) && b?.logo_url;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('company');
  const { branches = [], currentCompany } = useData();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFiles, setUploadFiles] = useState(null);

  const displayBranches = useMemo(() => branches, [branches]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    currentCompany?.id || displayBranches[0]?.id || null
  );

  const { data: companyDocs = [], refetch: refetchDocs } = useQuery({
    queryKey: ['company-docs', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      try {
        return await base44.entities.CompanyDocument.filter({ branch_id: selectedCompanyId }, '-updated_date', 100);
      } catch { return []; }
    }
  });

  const selectedCompany = useMemo(
    () => branches.find((b) => b.id === selectedCompanyId) || displayBranches[0] || null,
    [branches, displayBranches, selectedCompanyId]
  );

  const handleCleanup = async () => {
    await mergeCompanies({});
    window.location.reload();
  };

  const handleUpload = async () => {
    if (!selectedCompanyId || !uploadFiles || uploadFiles.length === 0) return;
    setUploading(true);
    try {
      const filesArr = Array.from(uploadFiles);
      const uploads = await Promise.all(
        filesArr.map((file) => base44.integrations.Core.UploadFile({ file }))
      );
      const urls = uploads.map((u) => u?.file_url).filter(Boolean);
      if (urls.length === 0) return;
      await base44.entities.CompanyDocument.create({
        branch_id: selectedCompanyId,
        name: uploadTitle || 'Company Document',
        notes: uploadNotes || '',
        file_urls: urls,
      });
      setShowUpload(false);
      setUploadFiles(null);
      setUploadTitle('');
      setUploadNotes('');
      await refetchDocs();
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-lg shadow-xl border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                  <Settings className="w-8 h-8 text-indigo-600" />
                  Admin Center
                </CardTitle>
                <p className="text-sm text-slate-600 mt-1">
                  Manage company settings, branches, and administrative resources
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCleanup}>Eliminar duplicados sin logo</Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <Card className="bg-white/80 backdrop-blur-lg shadow-xl border-slate-200">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="company" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Company Info
                </TabsTrigger>
                <TabsTrigger value="branches" className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Branches
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Company Documents
                </TabsTrigger>
              </TabsList>

              {/* Company Info Tab */}
              <TabsContent value="company" className="space-y-6">
                {selectedCompany ? (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      {selectedCompany.logo_url ? (
                        <img src={selectedCompany.logo_url} alt={selectedCompany.name} className="w-16 h-16 object-contain rounded bg-white border" />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900">{selectedCompany.name}</h3>
                        <p className="text-sm text-slate-600">{selectedCompany.location || '—'}</p>
                      </div>
                      <div>
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={selectedCompanyId || ''}
                          onChange={(e) => setSelectedCompanyId(e.target.value)}
                        >
                          {displayBranches.map((b) => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mt-6">
                      <div>
                        <label className="font-semibold text-slate-700">Address</label>
                        <p className="text-slate-600 mt-1">{selectedCompany.address || '—'}</p>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700">Contact</label>
                        <p className="text-slate-600 mt-1">{selectedCompany.contact || selectedCompany.phone || '—'}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-600">No company selected.</div>
                )}
              </TabsContent>

              {/* Branches Tab */}
              <TabsContent value="branches" className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Companies</h3>
                </div>
                {displayBranches.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p>No companies found</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {displayBranches.map((b) => (
                      <div key={b.id} className="border rounded-lg p-4 bg-white/70 flex gap-3 items-center">
                        {b.logo_url ? (
                          <img src={b.logo_url} alt={b.name} className="w-12 h-12 object-contain rounded bg-white border" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{b.name}</div>
                          <div className="text-xs text-slate-500 truncate">{b.location || '—'}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedCompanyId(b.id)}>View</Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Documents Tab */}
              <TabsContent value="documents" className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Company Documents</h3>
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={selectedCompanyId || ''}
                      onChange={(e) => setSelectedCompanyId(e.target.value)}
                    >
                      {displayBranches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                    <Button onClick={() => setShowUpload((v) => !v)} className="bg-indigo-600 hover:bg-indigo-700">
                      <Plus className="w-4 h-4" />
                      Upload
                    </Button>
                  </div>
                </div>
                {showUpload && (
                  <div className="border rounded-lg p-4 bg-white/70 mb-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-sm text-slate-600">Title</label>
                        <Input value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Document title" />
                      </div>
                      <div>
                        <label className="text-sm text-slate-600">Files</label>
                        <input type="file" multiple onChange={(e) => setUploadFiles(e.target.files)} className="block w-full text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-600">Notes</label>
                      <Textarea value={uploadNotes} onChange={(e) => setUploadNotes(e.target.value)} placeholder="Optional notes" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setShowUpload(false); setUploadFiles(null); setUploadTitle(''); setUploadNotes(''); }} disabled={uploading}>Cancel</Button>
                      <Button onClick={handleUpload} disabled={uploading || !(uploadFiles && uploadFiles.length)} className="bg-indigo-600 hover:bg-indigo-700">
                        {uploading ? 'Uploading...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )}
                {companyDocs.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <p>No company documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {companyDocs.map((doc) => (
                      <div key={doc.id} className="border rounded-lg p-3 bg-white/70 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{doc.title || doc.name || 'Document'}</div>
                          {doc.notes && <div className="text-xs text-slate-500">{doc.notes}</div>}
                        </div>
                        {Array.isArray(doc.file_urls) && doc.file_urls[0] && (
                          <a className="text-indigo-600 text-sm" href={doc.file_urls[0]} target="_blank" rel="noreferrer">Open</a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}