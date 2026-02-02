import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Briefcase, Building, MapPin, Phone, User } from 'lucide-react';
import StackedAvatars from '../shared/StackedAvatars';

function getWOTicker(entry, project, customer) {
  if (!entry) return '';
  const firstWord = customer?.name?.split(' ')[0] || project?.name?.split(' ')[0] || 'N/A';
  return `${entry.work_order_number || 'N/A'} ${firstWord}`.trim();
}

export default function WorkOrderSummaryHeader({ workOrder, project, customer, assignedUsers }) {
  if (!workOrder) return null;

  return (
    <div className="mb-4">
      <Card className="bg-slate-50 border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800">
              Work Order Summary
            </CardTitle>
            <Badge variant="outline" className="text-base font-mono font-bold">
              {getWOTicker(workOrder, project, customer)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {/* Work Order Title */}
          <div className="flex items-start gap-3">
            <Briefcase className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-700">{workOrder.title}</p>
              <p className="text-xs text-slate-500">Title</p>
            </div>
          </div>
          
          {/* Customer & Project */}
          {(customer || project) && (
            <div className="flex items-start gap-3">
              <Building className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{project?.name}</p>
                <p className="text-xs text-slate-500">{customer?.name || 'Project'}</p>
              </div>
            </div>
          )}

          {/* Project Location */}
          {project?.location_name && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{project.location_name}</p>
                {project.address && (
                  <p className="text-xs text-slate-500">{project.address}</p>
                )}
                <p className="text-xs text-slate-500">Location</p>
              </div>
            </div>
          )}

          {/* Project Contact Person */}
          {project?.contact_person && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-700">{project.contact_person}</p>
                <p className="text-xs text-slate-500">Contact Person</p>
              </div>
            </div>
          )}

          {/* Project Phone */}
          {project?.phone && (
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
              <div>
                <a 
                  href={`tel:${project.phone}`} 
                  className="font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  {project.phone}
                </a>
                <p className="text-xs text-slate-500">Phone</p>
              </div>
            </div>
          )}

          {/* Assigned Workers */}
          {assignedUsers && assignedUsers.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
              <div>
                <StackedAvatars users={assignedUsers} maxVisible={10} size="md" />
                <p className="text-xs text-slate-500 mt-1">Assigned Workers</p>
              </div>
            </div>
          )}

          {/* Work Notes */}
          {workOrder.work_notes && (
            <div className="flex items-start gap-3 pt-2 border-t border-slate-200">
              <FileText className="w-4 h-4 mt-0.5 text-slate-500 flex-shrink-0" />
              <div>
                 <p className="text-slate-600 whitespace-pre-wrap max-h-24 overflow-y-auto text-xs bg-white p-2 rounded border">
                  {workOrder.work_notes}
                </p>
                <p className="text-xs text-slate-500 mt-1">Work Notes</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}