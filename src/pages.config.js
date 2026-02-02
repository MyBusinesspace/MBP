/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AssetsDocuments from './pages/AssetsDocuments';
import Downloads from './pages/Downloads';
import QuickFiles from './pages/QuickFiles';
import RecentActivities from './pages/RecentActivities';
import Reports from './pages/Reports';
import TimeTrackerSettings from './pages/TimeTrackerSettings';
import WorkOrderPDFView from './pages/WorkOrderPDFView';
import WorkOrdersSummaryPDFView from './pages/WorkOrdersSummaryPDFView';
import activityLog from './pages/activity-log';
import admin from './pages/admin';
import aiAssistant from './pages/ai-assistant';
import analytics from './pages/analytics';
import calendar from './pages/calendar';
import chat from './pages/chat';
import clients from './pages/clients';
import connectionsWall from './pages/connections-wall';
import contacts from './pages/contacts';
import documents from './pages/documents';
import forms from './pages/forms';
import jobOrders from './pages/job-orders';
import payrolls from './pages/payrolls';
import pettyCash from './pages/petty-cash';
import projects from './pages/projects';
import quickTasks from './pages/quick-tasks';
//import reports from './pages/reports';
import timeClock from './pages/time-clock';
import timeTracker from './pages/time-tracker';
import timesheets from './pages/timesheets';
import users from './pages/users';
import workOrders from './pages/work-orders';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AssetsDocuments": AssetsDocuments,
    "Downloads": Downloads,
    "QuickFiles": QuickFiles,
    "RecentActivities": RecentActivities,
    "Reports": Reports,
    "TimeTrackerSettings": TimeTrackerSettings,
    "WorkOrderPDFView": WorkOrderPDFView,
    "WorkOrdersSummaryPDFView": WorkOrdersSummaryPDFView,
    "activity-log": activityLog,
    "admin": admin,
    "ai-assistant": aiAssistant,
    "analytics": analytics,
    "calendar": calendar,
    "chat": chat,
    "clients": clients,
    "connections-wall": connectionsWall,
    "contacts": contacts,
    "documents": documents,
    "forms": forms,
    "job-orders": jobOrders,
    "payrolls": payrolls,
    "petty-cash": pettyCash,
    "projects": projects,
    "quick-tasks": quickTasks,
    "reports": reports,
    "time-clock": timeClock,
    "time-tracker": timeTracker,
    "timesheets": timesheets,
    "users": users,
    "work-orders": workOrders,
}

export const pagesConfig = {
    mainPage: "projects",
    Pages: PAGES,
    Layout: __Layout,
};
