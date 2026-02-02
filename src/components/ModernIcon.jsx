import React from 'react';
import {
  LayoutDashboard,
  Clock,
  ClipboardList,
  Building2,
  Briefcase,
  CheckSquare,
  Users,
  Network,
  MapPin,
  Package,
  FileText,
  MessageSquare,
  FolderPlus,
  Calendar,
  HelpCircle
} from 'lucide-react';

const icons = {
  LayoutDashboard,
  Clock,
  ClipboardList,
  Building2,
  Briefcase,
  CheckSquare,
  Users,
  Network,
  MapPin,
  Package,
  FileText,
  MessageSquare,
  FolderPlus,
  Calendar,
  HelpCircle
};

export default function ModernIcon({ name, className = "w-5 h-5", ...props }) {
  const IconComponent = icons[name];
  
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in ModernIcon component. Add it to the import list.`);
    return <HelpCircle className={className} {...props} />;
  }
  
  return <IconComponent className={className} {...props} />;
}