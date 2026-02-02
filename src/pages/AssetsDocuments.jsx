import React from "react";
import AssetDocumentMatrixTab from "@/components/assets/AssetDocumentMatrixTab";
import { Button } from "@/components/ui/button";

export default function AssetsDocuments() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Assets & Equipment Documents</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.history.back()}>Volver</Button>
          </div>
        </div>
        <AssetDocumentMatrixTab isAdmin={true} />
      </div>
    </div>
  );
}