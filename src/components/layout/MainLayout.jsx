import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../DataProvider';

import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, Clock, Calendar, FileText, Users, Building2,
  ClipboardList, FolderOpen, BarChart3, MessageSquare,
  Video, Menu, Briefcase, ListTodo, GitBranch,
  DollarSign, Settings, Search, Download,
  CheckSquare, FolderKanban, Coins, Building, MapPin, Circle,
  Home, Wallet, CalendarDays, Bot, Sparkles, ChevronsUpDown, Check } from
'lucide-react';
import GlobalSearch from './GlobalSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Avatar from '../Avatar';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';

const iconMap = {
  LayoutDashboard, Clock, Calendar, FileText, Users, Building2,
  ClipboardList, FolderOpen, BarChart3, MessageSquare,
  Video, Briefcase, ListTodo, GitBranch, DollarSign, Settings,
  CheckSquare, FolderKanban, Coins, Building, MapPin, Circle,
  Home, Wallet, CalendarDays, Bot, Sparkles, Download
};

export default function MainLayout({ children }) {
  const { currentUser, actualUser, viewAsUser, toggleViewAsUser, loading, currentCompany, setCurrentCompany, branches } = useData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  useEffect(() => {
    console.log('🟦 [MainLayout] showGlobalSearch =>', showGlobalSearch);
  }, [showGlobalSearch]);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isAdmin = currentUser?.role === 'admin';
  const isActualAdmin = actualUser?.role === 'admin';

  const navigation = [
    {
      title: 'Admin',
      items: [
        { name: 'Calendar', icon: 'CalendarDays', path: '/calendar', type: 'page', color: 'bg-purple-100 text-purple-600', customIconUrl: currentCompany?.calendar_tab_icon_url, description: 'Schedule and manage events' },
        { name: 'Clients', icon: 'Building2', path: '/clients', type: 'page', color: 'bg-indigo-100 text-indigo-600', customIconUrl: currentCompany?.clients_tab_icon_url, description: 'Manage customer relationships' },
        { name: 'Projects', icon: 'Briefcase', path: '/projects', type: 'page', color: 'bg-pink-100 text-pink-600', customIconUrl: currentCompany?.projects_tab_icon_url, description: 'Track and organize projects' },
        { name: 'Assets', icon: 'FolderOpen', path: '/documents', type: 'page', color: 'bg-blue-100 text-blue-600', customIconUrl: currentCompany?.documents_assets_tab_icon_url, description: 'Manage company assets' }
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Planner', icon: 'ClipboardList', path: '/work-orders', type: 'page', color: 'bg-orange-100 text-orange-600', customIconUrl: currentCompany?.schedule_tab_icon_url },
        { name: 'Timesheets', icon: 'FileText', path: '/timesheets', type: 'page', color: 'bg-blue-100 text-blue-600', customIconUrl: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/8017094dd_Gemini_Generated_Image_cn5utbcn5utbcn5u.png' },
        { name: 'Orders', icon: 'FileText', path: '/job-orders', type: 'page', color: 'bg-teal-100 text-teal-600', customIconUrl: currentCompany?.orders_tab_icon_url },
        { name: 'Timer', icon: 'Clock', path: '/time-tracker', type: 'page', color: 'bg-blue-600 text-white', customIconUrl: currentCompany?.time_tracker_tab_icon_url },
        { name: 'Contacts', icon: 'Building', path: '/contacts', type: 'page', color: 'bg-cyan-100 text-cyan-600', customIconUrl: currentCompany?.contacts_tab_icon_url }
      ]
    },
    {
      title: 'Connection',
      items: [
        { name: 'AI Assistant', icon: 'Bot', path: '/ai-assistant', type: 'page', badge: 'AI', color: 'bg-violet-100 text-violet-600', customIconUrl: currentCompany?.ai_assistant_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/ddfcb84fc_Gemini_Generated_Image_8uh0068uh0068uh0.png' },
        { name: 'Chat', icon: 'MessageSquare', path: '/chat', type: 'page', color: 'bg-green-100 text-green-600', customIconUrl: currentCompany?.chat_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/5280bc6a8_Gemini_Generated_Image_lxhgu9lxhgu9lxhg.png' },
        { name: 'Wall', icon: 'MessageSquare', path: '/connections-wall', type: 'page', color: 'bg-sky-100 text-sky-600', customIconUrl: currentCompany?.connections_wall_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/53fc9b73a_Screenshot2026-01-23at84002AM.png' }
      ]
    },
    {
      title: 'HR',
      items: [
        { name: 'Users', icon: 'Users', path: '/users', type: 'page', adminOnly: true, color: 'bg-rose-100 text-rose-600', customIconUrl: currentCompany?.users_tab_icon_url },
        { name: 'Payroll', icon: 'DollarSign', path: '/payrolls', type: 'page', adminOnly: true, color: 'bg-yellow-100 text-yellow-600', customIconUrl: currentCompany?.payroll_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/e4658121a_payroll.png' },
        { name: 'Petty Cash', icon: 'Wallet', path: '/petty-cash', type: 'page', color: 'bg-amber-100 text-amber-600', customIconUrl: currentCompany?.petty_cash_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/69f93a109_Gemini_Generated_Image_hfvozihfvozihfvo.png' }
      ]
    },
    {
      title: 'Reports',
      items: [
        { name: 'Analytics', icon: 'BarChart3', path: '/analytics', type: 'page', color: 'bg-gray-100 text-gray-600', customIconUrl: currentCompany?.reports_tab_icon_url || 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68be895889fc1a618ee5fab2/095c34148_Gemini_Generated_Image_rrsmqzrrsmqzrrsm.png' },
        { name: 'QuickFiles', icon: 'Download', path: '/downloads', type: 'page', color: 'bg-gray-100 text-gray-600' },
        { name: 'Reports', icon: 'FileText', path: '/reports', type: 'page', color: 'bg-gray-100 text-gray-600' },
        { name: 'Timesheets Settings', icon: 'Settings', path: '/timesheets', type: 'page', color: 'bg-gray-100 text-gray-700' }
      ]
    }
  ];


  // Save current route to localStorage
  useEffect(() => {
    if (location.pathname !== '/' && currentUser) {
      localStorage.setItem('lastVisitedRoute', location.pathname);
    }
  }, [location.pathname, currentUser]);

  // Redirect root to last visited route or '/work-orders' if currentUser exists
  useEffect(() => {
    if (location.pathname === '/' && currentUser) {
      const lastRoute = localStorage.getItem('lastVisitedRoute');
      navigate(lastRoute || '/work-orders');
    }
  }, [location.pathname, currentUser, navigate]);

  const handleLogout = () => {
    base44.auth.logout();
    window.location.href = '/';
  };

  const getDynamicFullName = (user) => {
    if (!user) return 'User';
    if (user.nickname) return user.nickname;
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    return `${firstName} ${lastName}`.trim() || user.full_name || user.email;
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div
        className={cn(
          "bg-white border-r border-slate-200 flex flex-col transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
        )}>

        {/* Logo and Toggle */}
        <div 
          className={cn("p-4 border-b border-slate-200 flex items-center", sidebarOpen ? "justify-between" : "justify-center")}
        >
          {sidebarOpen ? (
            <div className="flex items-center gap-2 w-full min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start px-2 hover:bg-slate-100 h-14 -ml-2">
                     <div className="flex items-center gap-3 w-full text-left">
                        {currentCompany?.logo_url ? (
                           <img src={currentCompany.logo_url} alt={currentCompany.name} className="w-10 h-10 object-contain rounded-md bg-white border border-slate-200 p-1" />
                        ) : (
                           <Building2 className="w-10 h-10 text-slate-400" />
                        )}
                        <div className="flex-1 min-w-0">
                           <h1 className="text-sm font-bold text-slate-900 truncate">
                             {currentCompany?.short_name || currentCompany?.name || 'Select Company'}
                           </h1>
                           <p className="text-xs text-slate-500 truncate">{currentCompany?.business_type || 'Business Management'}</p>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                     </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">

                  
                  {/* SELECTED COMPANY FIRST */}
                  {currentCompany && (
                    <div>
                      <DropdownMenuItem 
                        disabled
                        className="gap-2 p-3 bg-indigo-100 opacity-100 cursor-default border-b border-slate-200"
                      >
                        {currentCompany.logo_url ? (
                          <img src={currentCompany.logo_url} alt={currentCompany.name} className="w-8 h-8 object-contain rounded" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-bold">
                            {currentCompany.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-bold flex-1 truncate text-slate-900">{currentCompany.name}</span>
                        <Check className="w-4 h-4 text-green-600" />
                      </DropdownMenuItem>
                    </div>
                  )}
                  
                  {/* OTHER COMPANIES */}
                  {Array.isArray(branches) && branches.filter(b => b.id !== currentCompany?.id).length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-xs font-semibold text-slate-600 px-2 py-2">
                        Switch Company
                      </DropdownMenuLabel>
                      {branches
                        .filter(branch => branch.id !== currentCompany?.id)
                        .filter(branch => {
                          const n = (branch.name || '').toLowerCase();
                          // Mostrar sólo las oficiales (con logo) para evitar duplicados sin logo
                          const isOfficial = (n.includes('redcrane') || n.includes('redline')) && branch.logo_url;
                          return isOfficial;
                        })
                        .map((branch) => (
                            <DropdownMenuItem 
                                key={branch.id} 
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setCurrentCompany(branch);
                                }} 
                                className="gap-2 p-2 hover:bg-slate-100 cursor-pointer"
                            >
                              {branch.logo_url ? (
                                <img src={branch.logo_url} alt={branch.name} className="w-8 h-8 object-contain rounded" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                                  {branch.name.charAt(0)}
                                </div>
                              )}
                              <span className="font-medium flex-1 truncate">{branch.name}</span>
                            </DropdownMenuItem>
                        ))}
                    </>
                  )}
                  
                  {/* NO COMPANIES CASE */}
                  {(!branches || branches.length === 0) && (
                    <DropdownMenuItem disabled className="text-slate-500 text-xs">
                      No companies available
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                     <Link to="/admin" className="cursor-pointer flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        <span>Manage Companies</span>
                     </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
             <div 
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 console.log('🔵 [MainLayout] Logo area clicked!');
                 console.log('🔵 [MainLayout] Current sidebarOpen:', sidebarOpen);
                 setSidebarOpen(true);
                 console.log('🔵 [MainLayout] setSidebarOpen(true) called');
               }}
               className="flex items-center justify-center w-full h-full cursor-pointer"
               style={{ minHeight: '60px', minWidth: '60px' }}
             >
                {currentCompany?.logo_collapsed_url || currentCompany?.logo_url ? (
                   <img 
                     src={currentCompany.logo_collapsed_url || currentCompany.logo_url} 
                     alt="Logo" 
                     className="w-14 h-14 object-contain"
                     style={{ pointerEvents: 'none' }}
                   />
                ) : (
                   <Menu className="w-5 h-5 text-slate-600" style={{ pointerEvents: 'none' }} />
                )}
             </div>
          )}
        </div>

        {/* Global Search Button */}
        <div className={cn("px-2 py-3 border-b border-slate-200", sidebarOpen ? "" : "flex justify-center")}>
          <Button
            variant="outline"
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); console.log('🟦 [MainLayout] Clic en lupa (abrir buscador)'); setShowGlobalSearch(true); }}
            className={cn(
              "gap-2 border-slate-300 hover:bg-slate-100",
              sidebarOpen ? "w-full justify-start" : "w-10 h-10 p-0"
            )}
          >
            <Search className="w-4 h-4 text-slate-500" />
            {sidebarOpen && <span className="text-slate-500 text-sm">Search...</span>}
          </Button>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto py-4 px-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>

          {navigation.map((section, sectionIndex) => {
            const visibleItems = section.items.filter((item) => {
              if (item.adminOnly === true && !isAdmin) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={sectionIndex} className="mb-4">
                {sidebarOpen && section.title &&
                <h3 className="px-3 mb-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {section.title}
                  </h3>
                }
                {!sidebarOpen && section.title &&
                <h3 className="px-1 mb-2 text-[9px] font-bold text-slate-900 uppercase tracking-wider text-center">
                    {section.title === 'Admin' ? 'ADM' : 
                     section.title === 'Operations' ? 'OPR' : 
                     section.title === 'Connection' ? 'CON' : 
                     section.title === 'Reports' ? 'REP' : 
                     section.title.substring(0, 3).toUpperCase()}
                  </h3>
                }

                <div className={cn(
                  "space-y-1",
                  sidebarOpen ? "bg-slate-50 rounded-lg border-2 border-black p-2" : "bg-slate-50 rounded-lg border-2 border-black py-2 mx-1"
                )}>
                  {visibleItems.map((item) => {
                    const Icon = iconMap[item.icon] || Circle;
                    const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          "flex transition-colors relative group",
                          sidebarOpen 
                            ? cn("items-center gap-3 px-3 py-1.5 rounded-lg", isActive ? "bg-indigo-50 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-100")
                            : cn("flex-col items-center justify-center py-2 rounded-lg", isActive ? "bg-indigo-50" : "text-slate-700")
                        )}>

                        {item.customIconUrl ? (
                          <div className={cn(
                            "flex-shrink-0 bg-white rounded-lg border border-slate-200 p-1 flex items-center justify-center",
                            sidebarOpen ? "w-12 h-12" : "w-10 h-10"
                          )}>
                            <img 
                              src={item.customIconUrl} 
                              alt={item.name} 
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className={cn(
                            "p-1.5 rounded-lg transition-all duration-200",
                            item.color || "bg-slate-100 text-slate-500",
                            isActive ? "ring-2 ring-offset-1 ring-slate-200 shadow-sm" : "opacity-90 hover:opacity-100"
                          )}>
                            <Icon className="w-5 h-5 flex-shrink-0" />
                          </div>
                        )}

                        {sidebarOpen &&
                        <div className="flex items-center gap-2 flex-1">
                            <span className="flex-1 truncate text-sm font-light">{item.name}</span>
                            {item.badge &&
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-0">

                                {item.badge}
                              </Badge>
                          }
                          </div>
                        }

                        {!sidebarOpen &&
                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg">
                            {item.name}
                            {item.badge &&
                          <span className="ml-1 text-[9px] bg-indigo-500 px-1 rounded">
                                {item.badge}
                              </span>
                          }
                          </div>
                        }

                        {!sidebarOpen &&
                        <span className="text-[8px] text-slate-700 font-bold whitespace-nowrap mt-1 leading-none text-center">
                            {item.name}
                          </span>
                        }
                      </Link>);

                  })}
                </div>
              </div>);

          })}
        </nav>

        {/* User Profile Section */}
        {currentUser &&
        <div className="border-t border-slate-200 p-3">
            {sidebarOpen ?
          <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar
                user={currentUser}
                size="md"
                className="flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-normal text-slate-900 truncate">
                      {getDynamicFullName(currentUser)}
                    </p>
                    <p className="text-xs text-slate-500 capitalize truncate font-light">
                      {currentUser.role}
                    </p>
                  </div>
                </div>

                {/* ✅ Toggle View As User/Admin */}
                {isActualAdmin &&
            <button
              onClick={toggleViewAsUser}
              className={cn(
                "w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-between",
                viewAsUser ?
                "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}>

                    <span>{viewAsUser ? '👤 Viewing as User' : '👑 Viewing as Admin'}</span>
                    {viewAsUser &&
              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                        Switch
                      </Badge>
              }
                  </button>
            }

                <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full text-xs h-7 text-red-600 hover:bg-red-50 font-light">

                  Logout
                </Button>
              </div> :

          <div className="flex flex-col items-center gap-2">
                <Avatar
              user={currentUser}
              size="sm"
              className="cursor-pointer"
              onClick={() => setSidebarOpen(true)} />

                {/* ✅ Indicador visual cuando está en modo "View As User" */}
                {isActualAdmin && viewAsUser &&
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Viewing as User"></div>
            }
              </div>
          }
          </div>
        }
      </div>

      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col overflow-hidden"
        onClick={() => sidebarOpen && setSidebarOpen(false)}
      >
        <div
          className="flex-1 overflow-auto"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>

          {children}
        </div>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch 
        isOpen={showGlobalSearch} 
        onClose={() => setShowGlobalSearch(false)} 
      />
      {/* Captura global de errores para evitar pantallas genéricas */}
      <script dangerouslySetInnerHTML={{__html:`window.addEventListener('error',function(e){console.log('Global error:',e.message)})`}} />
    </div>);

}