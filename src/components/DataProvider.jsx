import React, { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useIndexedDB } from './hooks/useIndexedDB';
import { base44 } from '@/api/base44Client';

// ✅ Cache unificado y limpio
const cache = {
  data: new Map(),
  timestamps: new Map(),
};

const CACHE_DURATION = 30 * 60 * 1000;

const getCachedData = (key, forceReload = false) => {
  if (forceReload) {
    cache.data.delete(key);
    cache.timestamps.delete(key);
    return null;
  }
  const item = cache.data.get(key);
  if (!item) return null;

  const timestamp = cache.timestamps.get(key);
  if (!timestamp || (Date.now() - timestamp > CACHE_DURATION)) {
    cache.data.delete(key);
    cache.timestamps.delete(key);
    return null;
  }
  return item;
};

const setCachedData = (key, value) => {
  cache.data.set(key, value);
  cache.timestamps.set(key, Date.now());
};

const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 2000) => {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            const isRateLimit = error.response?.status === 429;
            const isNetworkError = error.message === 'Network Error' && !error.response;
            const isServerError = error.response?.status >= 500 && error.response?.status < 600;

            if ((isRateLimit || isNetworkError || isServerError) && i < maxRetries - 1) {
                const baseDelay = isRateLimit ? initialDelay * 4 : initialDelay;
                const backoff = Math.pow(2, i) * baseDelay;
                const jitter = backoff * (0.3 + Math.random() * 0.4);
                const delayTime = backoff + jitter;
                
                console.log(`⏳ Retry ${i + 1}/${maxRetries} in ${Math.round(delayTime)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayTime));
                continue;
            }
            
            if (isNetworkError || isRateLimit || isServerError) {
                console.warn(`⚠️ ${error.message} after ${maxRetries} retries`);
                return [];
            }
            
            throw error;
        }
    }
};

export const DataContext = createContext(null);

export function DataProvider({ children }) {
    const usersDB = useIndexedDB('users');
    const projectsDB = useIndexedDB('projects');
    const customersDB = useIndexedDB('customers');

    const [actualUser, setActualUser] = useState(null);
    const [viewAsUser, setViewAsUser] = useState(() => {
        try {
            const storedValue = localStorage.getItem('viewAsUser');
            return storedValue ? JSON.parse(storedValue) : false;
        } catch (error) {
            console.error("Failed to parse viewAsUser from localStorage", error);
            return false;
        }
    });

    const [currentCompany, setCurrentCompanyState] = useState(null);

    const setCurrentCompany = useCallback((company) => {
        console.log('🏢 [DataProvider] setCurrentCompany called with:', company?.name, 'id:', company?.id);
        setCurrentCompanyState(company);
        if (company) {
            localStorage.setItem('currentCompanyId', company.id);
        } else {
            localStorage.removeItem('currentCompanyId');
        }
    }, []);

    const [teams, setTeams] = useState([]);
    const [branches, setBranches] = useState([]);
    
    const [initialLoading, setInitialLoading] = useState(true);
    const [authError, setAuthError] = useState(false);
    const [generalError, setGeneralError] = useState(null);

    const getDynamicFullName = useCallback((user) => {
        if (!user) return 'Unnamed User';
        if (user.nickname) return user.nickname;
        
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const dynamicName = `${firstName} ${lastName}`.trim();
        return dynamicName || user.full_name || 'Unnamed User';
    }, []);

    const activateUserIfNeeded = useCallback(async (user) => {
        if (user.status === 'Pending' && user.last_login) {
            try {
                console.log('🔄 Activating user...');
                await base44.auth.updateMe({ status: 'Active' });
                return { ...user, status: 'Active' };
            } catch (error) {
                console.error('❌ Failed to activate user:', error);
                return user;
            }
        }
        return user;
    }, []);

    const loadEssentialData = useCallback(async () => {
        console.log('⚡️ Loading ESSENTIAL data only (user + teams)...');
        const startTime = performance.now();
        
        setAuthError(false);
        setGeneralError(null);
        setInitialLoading(true);

        try {
            console.log('🔐 Authenticating user...');
            let user = await retryWithBackoff(() => base44.auth.me());
            user = await activateUserIfNeeded(user);
            setActualUser(user);
            
            console.log('👥 Loading teams...');
            const teamsData = await retryWithBackoff(() => base44.entities.Team.list('sort_order', 1000));
            const safeTeams = Array.isArray(teamsData) ? teamsData : [];
            setTeams(safeTeams);
            setCachedData('teams', safeTeams);

            // Using SDK directly
            const branchesData = await retryWithBackoff(() => base44.entities.Branch.list());
            const safeBranches = Array.isArray(branchesData) ? branchesData : [];
            setBranches(safeBranches);
            setCachedData('branches', safeBranches);

            let selectedBranch = null;

            if (user?.branch_id && user?.role !== 'admin') {
                selectedBranch = safeBranches.find(b => b.id === user.branch_id);
                console.log('👤 User has assigned branch:', selectedBranch?.name);
            }

            if (!selectedBranch) {
                const storedCompanyId = localStorage.getItem('currentCompanyId');
                if (storedCompanyId) {
                    selectedBranch = safeBranches.find(b => b.id === storedCompanyId);
                    console.log('💾 Found in localStorage:', selectedBranch?.name);
                }
            }

            if (!selectedBranch && safeBranches.length > 0) {
                // Prefer REDCRANE if present (case-insensitive match on short_name or name)
                const preferred = safeBranches.find(b => ((b.short_name || b.name || '') + '').toLowerCase().includes('redcrane'));
                if (preferred) {
                    selectedBranch = preferred;
                    console.log('🏷️ Preferred company selected:', selectedBranch?.name);
                }
            }

            if (!selectedBranch && safeBranches.length > 0) {
                const sortedBranches = [...safeBranches].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                selectedBranch = sortedBranches[0];
                console.log('🔄 Using first alphabetically:', selectedBranch?.name);
            }

            if (selectedBranch) {
                localStorage.setItem('currentCompanyId', selectedBranch.id);
                setCurrentCompanyState(selectedBranch);
            }

            const endTime = performance.now();
            console.log(`✅ ESSENTIAL DATA LOADED in ${Math.round(endTime - startTime)}ms`);

        } catch (error) {
            console.error("❌ Failed to load essential data:", error.message);
            
            if (error.response?.status === 401) {
                setAuthError(true);
            } else {
                setGeneralError(error.message);
            }
        } finally {
            setInitialLoading(false);
        }
    }, [activateUserIfNeeded]);

    useEffect(() => {
        loadEssentialData();
    }, []);

    const loadUsers = useCallback(async (forceReload = false) => {
        const cacheKey = `users_${currentCompany?.id || 'all'}`;
        
        const cached = getCachedData(cacheKey, forceReload);
        if (cached) {
            console.log(`✅ Users from cache - Count: ${cached.length}`);
            return cached;
        }

        if (!forceReload && usersDB.isReady) {
            const dbUsers = await usersDB.getAll();
            if (dbUsers && dbUsers.length > 0) {
                console.log(`✅ Users from IndexedDB (${dbUsers.length})`);
                setCachedData(cacheKey, dbUsers);
                loadUsers(true).catch(console.error);
                return dbUsers;
            }
        }

        console.log('📥 Loading users from backend...');
        try {
            // Using SDK directly
            let usersData;
            if (currentCompany?.id) {
                 usersData = await retryWithBackoff(() => base44.entities.User.filter({ company_id: currentCompany.id }, 'sort_order', 500));
            } else {
                 usersData = await retryWithBackoff(() => base44.entities.User.list('sort_order', 500));
            }
            
            const users = Array.isArray(usersData) ? usersData : [];
            console.log(`✅ Loaded ${users.length} users from backend`);
            
            setCachedData(cacheKey, users);
            
            if (usersDB.isReady) {
                usersDB.setAll(users).catch(console.error);
            }
            
            return users;
        } catch (error) {
            console.error('❌ Failed to load users:', error);
            return getCachedData(cacheKey) || [];
        }
    }, [currentCompany, usersDB]);

    const loadProjects = useCallback(async (forceReload = false) => {
        const cacheKey = `projects_${currentCompany?.id || 'all'}`;
        
        const cached = getCachedData(cacheKey, forceReload);
        if (cached) {
            console.log(`✅ Projects from cache - Count: ${cached.length}`);
            return cached;
        }

        if (!forceReload && projectsDB.isReady) {
            const dbProjects = await projectsDB.getAll();
            if (dbProjects && dbProjects.length > 0) {
                console.log(`✅ Projects from IndexedDB (${dbProjects.length})`);
                setCachedData(cacheKey, dbProjects);
                loadProjects(true).catch(console.error);
                return dbProjects;
            }
        }

        console.log('📥 Loading projects from backend...');
        try {
            const ProjectEntity = base44.entities.Project;

            let projects;
            if (currentCompany?.id) {
                 const branchProjects = await retryWithBackoff(() => ProjectEntity.filter({ branch_id: currentCompany.id }, '-updated_date', 500));
                 // Supplement with recent projects across all branches to cover cross-branch references
                 const recentAll = await retryWithBackoff(() => ProjectEntity.list('-updated_date', 500));
                 const tmp = [...(Array.isArray(branchProjects) ? branchProjects : []), ...(Array.isArray(recentAll) ? recentAll : [])];
                 const map = new Map();
                 tmp.forEach(p => { if (p && p.id && !map.has(p.id)) map.set(p.id, p); });
                 projects = Array.from(map.values());
            } else {
                 projects = await retryWithBackoff(() => ProjectEntity.list('-updated_date', 500));
            }
            
            const filtered = (Array.isArray(projects) ? projects : []).filter(p => p && p.status !== 'archived');
            
            setCachedData(cacheKey, filtered);
            
            if (projectsDB.isReady) {
                projectsDB.setAll(filtered).catch(console.error);
            }
            
            return filtered;
        } catch (error) {
            console.error('❌ Failed to load projects:', error);
            return getCachedData(cacheKey) || [];
        }
    }, [currentCompany, projectsDB]);

    const loadCustomers = useCallback(async (forceReload = false) => {
        const cacheKey = `customers_${currentCompany?.id || 'all'}`;
        
        const cached = getCachedData(cacheKey, forceReload);
        if (cached) {
            console.log(`✅ Customers from cache - Count: ${cached.length}`);
            return cached;
        }

        if (!forceReload && customersDB.isReady) {
            const dbCustomers = await customersDB.getAll();
            if (dbCustomers && dbCustomers.length > 0) {
                console.log(`✅ Customers from IndexedDB (${dbCustomers.length})`);
                setCachedData(cacheKey, dbCustomers);
                loadCustomers(true).catch(console.error);
                return dbCustomers;
            }
        }

        console.log('📥 Loading customers from backend...');
        try {
            const CustomerEntity = base44.entities.Customer;

            let customers;
            if (currentCompany?.id) {
                 const branchCustomers = await retryWithBackoff(() => CustomerEntity.filter({ branch_id: currentCompany.id }, '-updated_date', 500));
                 const recentAll = await retryWithBackoff(() => CustomerEntity.list('-updated_date', 500));
                 const tmp = [...(Array.isArray(branchCustomers) ? branchCustomers : []), ...(Array.isArray(recentAll) ? recentAll : [])];
                 const map = new Map();
                 tmp.forEach(c => { if (c && c.id && !map.has(c.id)) map.set(c.id, c); });
                 customers = Array.from(map.values());
            } else {
                 customers = await retryWithBackoff(() => CustomerEntity.list('-updated_date', 500));
            }

            const filtered = (Array.isArray(customers) ? customers : []).filter(c => c && !c.archived);
            
            setCachedData(cacheKey, filtered);
            
            if (customersDB.isReady) {
                customersDB.setAll(filtered).catch(console.error);
            }
            
            return filtered;
        } catch (error) {
            console.error('❌ Failed to load customers:', error);
            return getCachedData(cacheKey) || [];
        }
    }, [currentCompany, customersDB]);

    const loadAssets = useCallback(async (forceReload = false) => {
        const cacheKey = `assets_${currentCompany?.id || 'all'}`;
        
        const cached = getCachedData(cacheKey, forceReload);
        if (cached) {
            console.log(`✅ Assets from cache - Count: ${cached.length}`);
            return cached;
        }

        console.log('📥 Loading assets...');
        try {
            const AssetEntity = base44.entities.Asset;

            let assets;
            if (currentCompany?.id) {
                 assets = await retryWithBackoff(() => AssetEntity.filter({ branch_id: currentCompany.id }, '-updated_date', 1000));
            } else {
                 assets = await retryWithBackoff(() => AssetEntity.list('-updated_date', 1000));
            }

            const safeAssets = Array.isArray(assets) ? assets : [];
            setCachedData(cacheKey, safeAssets);
            return safeAssets;
        } catch (error) {
            console.error('❌ Failed to load assets:', error);
            return getCachedData(cacheKey) || [];
        }
    }, [currentCompany]);

    const loadWorkOrderCategories = useCallback(async (forceReload = false) => {
        const cacheKey = `workOrderCategories_${currentCompany?.id || 'all'}`;

        const cached = getCachedData(cacheKey, forceReload);
        if (cached) {
            console.log(`✅ WorkOrderCategories from cache - Count: ${cached.length}`);
            return cached;
        }

        console.log('📥 Loading work order categories from backend...');
        try {
            const WorkOrderCategoryEntity = base44.entities.WorkOrderCategory;

            const categories = await retryWithBackoff(() => WorkOrderCategoryEntity.list('sort_order', 1000));

            const safeCategories = Array.isArray(categories) ? categories : [];
            setCachedData(cacheKey, safeCategories);
            return safeCategories;
        } catch (error) {
            console.error('❌ Failed to load work order categories:', error);
            return getCachedData(cacheKey) || [];
        }
    }, [currentCompany]);

    const loadShiftTypes = useCallback(async (forceReload = false) => {
        const cacheKey = `shiftTypes_${currentCompany?.id || 'all'}`;

        const cached = getCachedData(cacheKey, forceReload);
        if (cached) {
            console.log(`✅ ShiftTypes from cache - Count: ${cached.length}`);
            return cached;
        }

        console.log('📥 Loading shift types from backend...');
        try {
            const ShiftTypeEntity = base44.entities.ShiftType;

            let shiftTypes = [];
            if (currentCompany?.id) {
                shiftTypes = await retryWithBackoff(() => ShiftTypeEntity.filter({ branch_id: currentCompany.id }, 'sort_order', 1000));
            }

            if (!shiftTypes || shiftTypes.length === 0) {
                shiftTypes = await retryWithBackoff(() => ShiftTypeEntity.list('sort_order', 1000));
            }

            const safeShiftTypes = Array.isArray(shiftTypes) ? shiftTypes : [];
            setCachedData(cacheKey, safeShiftTypes);
            return safeShiftTypes;
        } catch (error) {
            console.error('❌ Failed to load shift types:', error);
            return getCachedData(cacheKey) || [];
        }
    }, [currentCompany]);

    const loadDepartments = useCallback(async (forceReload = false) => {
        const cached = getCachedData('departments', forceReload);
        if (cached) {
            console.log(`✅ Departments from cache - Count: ${cached.length}`);
            return cached;
        }

        console.log('📥 Loading departments...');
        try {
            const DepartmentEntity = base44.entities.Department;

            const departments = await retryWithBackoff(() => DepartmentEntity.list('sort_order', 1000));
            const safeDepartments = Array.isArray(departments) ? departments : [];
            setCachedData('departments', safeDepartments);
            return safeDepartments;
        } catch (error) {
            console.error('❌ Failed to load departments:', error);
            return getCachedData('departments') || [];
        }
    }, []);

    const loadBranches = useCallback(async (forceReload = false) => {
        const cached = getCachedData('branches', forceReload);
        if (cached) {
            console.log(`✅ Branches from cache - Count: ${cached.length}`);
            return cached;
        }

        console.log('📥 Loading branches...');
        try {
            const BranchEntity = base44.entities.Branch;

            const branchesData = await retryWithBackoff(() => BranchEntity.list());
            const safeBranches = Array.isArray(branchesData) ? branchesData : [];
            setBranches(safeBranches);
            setCachedData('branches', safeBranches);
            return safeBranches;
        } catch (error) {
            console.error('❌ Failed to load branches:', error);
            return getCachedData('branches') || [];
        }
    }, []);

    const loadClientEquipments = useCallback(async (forceReload = false) => {
        const cacheKey = 'clientEquipments_all';
        
        const cached = getCachedData(cacheKey, forceReload);
        if (cached) {
            console.log(`✅ ClientEquipments from cache - Count: ${cached.length}`);
            return cached;
        }

        console.log('📥 Loading client equipments...');
        try {
            const ClientEquipmentEntity = base44.entities.ClientEquipment;

            const equipments = await retryWithBackoff(() => ClientEquipmentEntity.list('-updated_date', 1000));

            const safeEquipments = Array.isArray(equipments) ? equipments : [];
            console.log(`📥 Loaded ${safeEquipments.length} client equipments`);
            setCachedData(cacheKey, safeEquipments);
            return safeEquipments;
        } catch (error) {
            console.error('❌ Failed to load client equipments:', error);
            return getCachedData(cacheKey) || [];
        }
    }, []);

    const refreshData = useCallback(async (keys = []) => {
        console.log(`🔄 Refreshing specific data: ${keys.join(', ')}`);
        const promises = [];

        if (keys.includes('users')) promises.push(loadUsers(true));
        if (keys.includes('projects')) promises.push(loadProjects(true));
        if (keys.includes('customers')) promises.push(loadCustomers(true));
        if (keys.includes('teams')) {
            promises.push((async () => {
                const teamsData = await retryWithBackoff(() => base44.entities.Team.list('sort_order', 1000));
                const safeTeams = Array.isArray(teamsData) ? teamsData : [];
                setTeams(safeTeams);
                setCachedData('teams', safeTeams);
            })());
        }
        if (keys.includes('assets')) promises.push(loadAssets(true));
        if (keys.includes('workOrderCategories')) promises.push(loadWorkOrderCategories(true));
        if (keys.includes('shiftTypes')) promises.push(loadShiftTypes(true));
        if (keys.includes('departments')) promises.push(loadDepartments(true));
        if (keys.includes('branches')) promises.push(loadBranches(true));
        if (keys.includes('clientEquipments')) promises.push(loadClientEquipments(true));

        await Promise.all(promises);
        console.log('✅ Refresh complete');
    }, [loadUsers, loadProjects, loadCustomers, loadAssets, loadWorkOrderCategories, loadShiftTypes, loadDepartments, loadBranches, loadClientEquipments]);

    const reloadData = useCallback(async () => {
        console.log('🔄 Full reload requested (legacy)...');
        await loadEssentialData();
    }, [loadEssentialData]);

    const toggleViewAsUser = useCallback(() => {
        if (actualUser?.role === 'admin') {
            setViewAsUser(prev => {
                const newValue = !prev;
                console.log(`🔄 Switching to ${newValue ? 'User' : 'Admin'} view...`);
                localStorage.setItem('viewAsUser', JSON.stringify(newValue));
                return newValue;
            });
        }
    }, [actualUser]);

    const currentUser = useMemo(() => {
        if (!actualUser) return null;
        const derivedUser = { 
            ...actualUser, 
            originalRole: actualUser.role
        };
        if (viewAsUser && derivedUser.originalRole === 'admin') {
            derivedUser.role = 'user';
        }
        return derivedUser;
    }, [actualUser, viewAsUser]);

    const value = useMemo(() => ({
        currentUser,
        actualUser,
        viewAsUser,
        toggleViewAsUser,
        teams: Array.isArray(teams) ? teams : [],
        
        loadUsers,
        loadProjects,
        loadCustomers,
        loadAssets,
        loadWorkOrderCategories,
        loadShiftTypes,
        loadDepartments,
        loadBranches,
        loadClientEquipments,
        
        loading: initialLoading,
        authError,
        error: generalError,
        reloadData,
        refreshData,
        getDynamicFullName,
        currentCompany,
        currentBranch: currentCompany,
        setCurrentCompany,
        
        users: getCachedData('users') || [],
        projects: getCachedData('projects') || [],
        customers: getCachedData('customers') || [],
        assets: getCachedData('assets') || [],
        branches: getCachedData('branches') || [],
        clientEquipments: getCachedData('clientEquipments') || [],
        workOrderCategories: getCachedData('workOrderCategories') || [],
        shiftTypes: getCachedData('shiftTypes') || [],
        departments: getCachedData('departments') || [],
    }), [
        currentUser,
        actualUser,
        viewAsUser,
        toggleViewAsUser,
        teams,
        branches,
        loadUsers,
        loadProjects,
        loadCustomers,
        loadAssets,
        loadWorkOrderCategories,
        loadShiftTypes,
        loadDepartments,
        loadBranches,
        loadClientEquipments,
        initialLoading,
        authError,
        generalError,
        reloadData,
        refreshData,
        getDynamicFullName,
        currentCompany
    ]);

    if (initialLoading) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-white">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="mt-4 text-slate-600 font-medium text-sm">Loading...</p>
            </div>
        );
    }

    if (authError) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center bg-white">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                </div>
                <p className="mt-4 text-slate-600 font-medium text-sm">Connecting...</p>
            </div>
        );
    }
    
    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}