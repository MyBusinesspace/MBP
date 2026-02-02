import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Settings } from 'lucide-react';
import AdminReportGenerator from '@/components/reports/AdminReportGenerator';

export default function Reports() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card className="p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Download className="w-5 h-5 text-gray-600" />
              </div>
              <h1 className="text-xl font-bold text-slate-900">Generate report</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { window.location.href = '/downloads?tab=settings'; }}
              >
                <Settings className="w-4 h-4 mr-2" /> Settings
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardContent className="py-4">
            <AdminReportGenerator />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}