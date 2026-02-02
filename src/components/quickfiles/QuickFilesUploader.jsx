import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, Loader2, Wand2 } from "lucide-react";

const extractionSchema = {
  type: "object",
  properties: {
    doc_type: { type: "string", enum: ["invoice", "purchase_order", "contract", "technical_report"] },
    title: { type: "string" },
    invoice_number: { type: "string" },
    po_number: { type: "string" },
    contract_number: { type: "string" },
    date: { type: "string" },
    total_amount: { type: "number" },
    currency: { type: "string" },
    customer_name: { type: "string" },
    project_name: { type: "string" },
    asset_identifier: { type: "string" }
  },
  required: ["doc_type"],
};

const llmResponseSchema = {
  type: "object",
  properties: {
    doc_type: { type: "string", enum: ["invoice", "purchase_order", "contract", "technical_report"] },
    title: { type: "string" },
    invoice_number: { type: "string" },
    po_number: { type: "string" },
    contract_number: { type: "string" },
    date: { type: "string" },
    total_amount: { type: "number" },
    currency: { type: "string" },
    customer_name: { type: "string" },
    project_name: { type: "string" },
    asset_identifier: { type: "string" },
    target_entity_type: { type: "string", enum: ["Customer", "Project", "Asset"] },
    target_name: { type: "string" },
    confidence: { type: "number" }
  },
  required: ["doc_type"],
};

export default function QuickFilesUploader({ onAnalyzed }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: extractionSchema,
      });

      const prompt = `You are a senior backoffice assistant. Classify the document and normalize fields.
Rules mapping: invoice->Customer, purchase_order->Project, contract->Customer, technical_report->Project or Asset (use asset id/name if present, otherwise project).
Given extracted JSON (may be partial): ${JSON.stringify(extracted?.output || {})}.
Return the best guess with confidence 0-1, normalized strings (trimmed), and fill target_entity_type and target_name if derivable.`;

      const llm = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false,
        response_json_schema: llmResponseSchema,
        file_urls: [file_url],
      });

      onAnalyzed({ fileUrl: file_url, fileName: file.name, analysis: llm });
    } catch (e) {
      setError(e?.message || "Error analyzing file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button onClick={handleAnalyze} disabled={!file || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="h-4 w-4" /><UploadCloud className="h-4 w-4" /></>}
            {loading ? "Analyzing…" : "Upload & Analyze"}
          </Button>
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </CardContent>
    </Card>
  );
}