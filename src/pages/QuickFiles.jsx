import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import QuickFilesUploader from "../components/quickfiles/QuickFilesUploader";
import QuickFilesReviewPanel from "../components/quickfiles/QuickFilesReviewPanel";

export default function QuickFiles() {
  const [fileInfo, setFileInfo] = useState(null); // { fileUrl, fileName }
  const [analysis, setAnalysis] = useState(null); // LLM output
  const [openPanel, setOpenPanel] = useState(false);

  const { data: customers = [], isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
    enabled: openPanel,
    initialData: [],
  });

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list(),
    enabled: openPanel,
    initialData: [],
  });

  const { data: assets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ["assets"],
    queryFn: () => base44.entities.Asset.list(),
    enabled: openPanel,
    initialData: [],
  });

  const loadingAny = useMemo(() => loadingCustomers || loadingProjects || loadingAssets, [loadingCustomers, loadingProjects, loadingAssets]);

  const handleAnalyzed = ({ fileUrl, fileName, analysis }) => {
    setFileInfo({ fileUrl, fileName });
    setAnalysis(analysis);
    setOpenPanel(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>QuickFiles</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickFilesUploader onAnalyzed={handleAnalyzed} />
          {fileInfo && (
            <div className="mt-4 text-sm text-slate-600">
              Ready: {fileInfo.fileName}. Opening review panel...
            </div>
          )}
        </CardContent>
      </Card>

      {openPanel && (
        <QuickFilesReviewPanel
          open={openPanel}
          onClose={() => setOpenPanel(false)}
          fileUrl={fileInfo?.fileUrl}
          fileName={fileInfo?.fileName}
          analysis={analysis}
          customers={customers}
          projects={projects}
          assets={assets}
          loading={loadingAny}
        />
      )}

      {loadingAny && (
        <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-md bg-white/90 border px-3 py-2 shadow">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading data for matches…</span>
        </div>
      )}

      <div className="mt-8 text-xs text-slate-500">
        Flujo: Subir archivo → Extraer datos → LLM clasifica y sugiere destino → Confirmar/editar → Adjuntar al registro.
      </div>
    </div>
  );
}