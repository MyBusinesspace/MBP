import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import { User, Project, Customer, Team, Asset } from '@/entities/all';
import PerformanceMonitor from './PerformanceMonitor';

// 1. Crear el Contexto
export const DataProviderContext = createContext(null);

// Cache para evitar peticiones duplicadas
const cache = new Map();
const CACHE_DURATION = 30000; // 30 segundos

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Cache hit for ${key}`);
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
  console.log(`💾 Cached data for ${key}`);
};

// Función optimizada para cargar datos con cache
const loadEntityWithCache = async (entityName, loadFunction) => {
  const cacheKey = `${entityName}_list`;
  const cachedData = getCachedData(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

  console.log(`🔄 Loading fresh data for ${entityName}`);
  const startTime = performance.now();
  
  try {
    const data = await loadFunction();
    const endTime = performance.now();
    console.log(`✅ ${entityName} loaded in ${Math.round(endTime - startTime)}ms`);
    
    setCachedData(cacheKey, data);
    return data;
  } catch (error) {
    const endTime = performance.now();
    console.error(`❌ ${entityName} failed to load in ${Math.round(endTime - startTime)}ms:`, error);
    throw error;
  }
};

// 2. Crear el Proveedor del Contexto Optimizado
export function OptimizedDataProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadCoreData = useCallback(async () => {
        const startTime = performance.now();
        console.log('🚀 OPTIMIZED DATA PROVIDER: Starting core data load...');
        
        try {
            setError(null);
            
            // Cargar usuario primero (crítico)
            const user = await loadEntityWithCache('User_me', () => User.me());
            setCurrentUser(user);
            
            // Cargar el resto en paralelo con cache
            const [usersData, projectsData, customersData, teamsData, assetsData] = await Promise.all([
                loadEntityWithCache('Users', () => User.list()),
                loadEntityWithCache('Projects', () => Project.list()),
                loadEntityWithCache('Customers', () => Customer.list()),
                loadEntityWithCache('Teams', () => Team.list()),
                loadEntityWithCache('Assets', () => Asset.list())
            ]);

            setUsers(usersData || []);
            setProjects(projectsData || []);
            setCustomers(customersData || []);
            setTeams(teamsData || []);
            setAssets(assetsData || []);
            
            const endTime = performance.now();
            const totalTime = Math.round(endTime - startTime);
            
            if (totalTime > 3000) {
                console.warn(`⚠️ SLOW CORE DATA LOADING: ${totalTime}ms`);
            } else {
                console.log(`✅ OPTIMIZED DATA PROVIDER: All core data loaded in ${totalTime}ms`);
            }
            
        } catch (error) {
            console.error("❌ OPTIMIZED DATA PROVIDER: Failed to load core data:", error);
            setError(error.message || 'Failed to load application data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCoreData();
    }, [loadCoreData]);

    // Función para limpiar cache manualmente
    const clearCache = useCallback(() => {
        cache.clear();
        console.log('🧹 Cache cleared');
    }, []);

    // Función para recargar datos (limpia cache primero)
    const reloadData = useCallback(async () => {
        clearCache();
        setLoading(true);
        await loadCoreData();
    }, [loadCoreData, clearCache]);

    const value = {
        currentUser,
        users,
        projects,
        customers,
        teams,
        assets,
        loading,
        error,
        reloadData,
        clearCache,
    };
    
    return (
        <DataProviderContext.Provider value={value}>
            <PerformanceMonitor pageName="DataProvider" />
            {children}
        </DataProviderContext.Provider>
    );
}

// 3. Hook personalizado para usar el contexto fácilmente
export function useOptimizedData() {
    const context = useContext(DataProviderContext);
    if (!context) {
        throw new Error('useOptimizedData must be used within a OptimizedDataProvider');
    }
    return context;
}