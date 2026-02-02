import React from 'react';
import { useData } from '../DataProvider';
import Avatar from '../Avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from '@/components/ui/switch';
import { Button } from "@/components/ui/button";
import { Monitor, User, Settings, Bell, Plug, LogOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function UserProfileDropdown({ showAdminToggle = false }) {
    const { currentUser, viewAsUser, toggleViewAsUser, getDynamicFullName } = useData();

    if (!currentUser) return null;

    const isAdmin = currentUser.originalRole === 'admin';
    const fullName = getDynamicFullName(currentUser);

    const handleLogout = () => {
        base44.auth.logout();
        window.location.href = '/';
    };
    
    const handleNotImplemented = () => {
        toast.info("This feature is not yet implemented.");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button 
                    variant="ghost" 
                    className="flex items-center gap-3 px-2 py-2 h-auto"
                >
                    <div className="text-right">
                        <p className="text-sm font-medium text-slate-800">{fullName}</p>
                        <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
                    </div>
                    <Avatar name={fullName} src={currentUser.avatar_url} className="w-9 h-9" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel>
                    <p className="font-bold">{fullName}</p>
                    <p className="text-xs font-normal text-slate-500">{currentUser.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {showAdminToggle && isAdmin && (
                    <>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <div 
                                className="flex items-center justify-between w-full cursor-pointer"
                                onClick={toggleViewAsUser}
                            >
                                <div className="flex items-center gap-2">
                                    {viewAsUser ? <User className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                                    <span>{viewAsUser ? "Admin View" : "User View"}</span>
                                </div>
                                <Switch checked={viewAsUser} onCheckedChange={toggleViewAsUser} />
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}
                
                <DropdownMenuItem onClick={handleNotImplemented}>
                    <Bell className="w-4 h-4 mr-2" />
                    <span>Notifications</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNotImplemented}>
                    <Plug className="w-4 h-4 mr-2" />
                    <span>Integrations</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNotImplemented}>
                    <Settings className="w-4 h-4 mr-2" />
                    <span>Settings</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                    <LogOut className="w-4 h-4 mr-2" />
                    <span>Log Out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}