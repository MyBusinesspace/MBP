import React from 'react';
import { Avatar as AvatarUI, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Circle, Crown, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Avatar({ user, name, src, className, isAdmin = false, isLeader = false, isPending = false, adminRoleType = null, size = "md" }) {
  // If user object is provided, extract info from it
  const finalName = user ? (user.nickname || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email) : name;
  const finalSrc = user?.avatar_url || src;
  const finalIsAdmin = user?.role === 'admin' || isAdmin;
  const finalIsLeader = user?.is_team_leader || isLeader;
  const finalIsPending = user?.status === 'Pending' || isPending;
  const finalAdminRoleType = user?.admin_role_type || adminRoleType;

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.trim().split(' ');
    if (names.length > 1 && names[1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  const getAdminBadge = () => {
    const badgeSizes = {
      xs: { container: 'w-2.5 h-2.5 -top-0.5 -right-0.5 p-[1px]', icon: 'w-1.5 h-1.5' },
      sm: { container: 'w-3 h-3 -top-0.5 -right-0.5 p-[2px]', icon: 'w-2 h-2' },
      md: { container: 'w-3.5 h-3.5 -top-0 -right-0 p-[2px]', icon: 'w-2.5 h-2.5' },
      lg: { container: 'w-4 h-4 -top-0 -right-0 p-0.5', icon: 'w-3 h-3' },
      xl: { container: 'w-5 h-5 -top-0.5 -right-0.5 p-0.5', icon: 'w-3.5 h-3.5' }
    };
    
    const sizes = badgeSizes[size] || badgeSizes.md;
    
    // PRIORITY 1: Team Leader (Blue Crown)
    if (finalIsLeader) {
      return (
        <div className={cn("absolute bg-blue-500 rounded-full shadow-md", sizes.container)}>
          <Crown className={cn("text-white fill-white stroke-blue-600", sizes.icon)} style={{ strokeWidth: 1 }} />
        </div>
      );
    }
    
    // PRIORITY 2: Admin badges (only if not team leader)
    if (finalAdminRoleType === 'director') {
      return (
        <div className={cn("absolute bg-orange-500 rounded-full shadow-md", sizes.container)}>
          <Shield className={cn("text-white", sizes.icon)} />
        </div>
      );
    }
    
    if (finalAdminRoleType === 'advisor') {
      return (
        <div className={cn("absolute bg-purple-500 rounded-full shadow-sm", sizes.container)}>
          <Star className={cn("text-white fill-white", sizes.icon)} />
        </div>
      );
    }
    
    if (finalIsAdmin) {
      return (
        <div className={cn("absolute bg-yellow-400 rounded-full shadow-sm", sizes.container)}>
          <Star className={cn("text-yellow-800 fill-yellow-800", sizes.icon)} />
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="relative">
      <AvatarUI className={cn(sizeClasses[size], className)}>
        <AvatarImage src={finalSrc} alt={finalName} className="object-cover" />
        <AvatarFallback>{getInitials(finalName)}</AvatarFallback>
      </AvatarUI>
      {getAdminBadge()}
      {finalIsPending && !finalIsAdmin && !finalIsLeader && (
        <div className={cn(
          "absolute bg-slate-800 rounded-full animate-pulse shadow-md",
          size === 'xs' ? 'w-2.5 h-2.5 -top-0.5 -right-0.5 p-[1px]' : 'w-3 h-3 -top-0.5 -right-0.5 p-0.5'
        )} title="Invitation pending">
          <Circle className={cn(
            "text-white fill-white",
            size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2'
          )} />
        </div>
      )}
    </div>
  );
}