import { useState, useEffect } from 'react';

const DB_NAME = 'base44_app_cache';
const DB_VERSION = 1;
const STORES = ['users', 'projects', 'customers', 'assets', 'teams'];

let db = null;

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      STORES.forEach(storeName => {
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
};

export const useIndexedDB = (storeName) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    openDB().then(() => setIsReady(true)).catch(console.error);
  }, []);

  const getAll = async () => {
    if (!isReady) return [];
    
    try {
      const database = await openDB();
      const transaction = database.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB getAll error:', error);
      return [];
    }
  };

  const setAll = async (items) => {
    if (!isReady || !Array.isArray(items)) return;
    
    try {
      const database = await openDB();
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // Clear existing
      await new Promise((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = resolve;
        clearRequest.onerror = reject;
      });

      // Add new items
      for (const item of items) {
        store.add(item);
      }

      return new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('IndexedDB setAll error:', error);
    }
  };

  const clear = async () => {
    if (!isReady) return;
    
    try {
      const database = await openDB();
      const transaction = database.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = resolve;
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('IndexedDB clear error:', error);
    }
  };

  return { getAll, setAll, clear, isReady };
};