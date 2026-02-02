import React from 'react';
import { DataProvider } from './components/DataProvider';
import MainLayout from '@/components/layout/MainLayout';
import PerformanceMonitor from './components/PerformanceMonitor';

// Componente global para el ícono de moneda
export function CurrencyIcon({ className = "w-4 h-4" }) {
  return (
    <span className={`inline-flex items-center justify-center font-semibold ${className}`}>
      AED
    </span>
  );
}

export default function Layout({ children, currentPageName }) {
  // Check if current page is a PDF view page
  const isPDFPage = currentPageName?.includes('PDFView') || currentPageName?.includes('pdf');

  const globalStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Expressway:wght@100;200;300;400;500;600;700;800;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@100;200;300;400;500;600;700;800;900&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Ballet:wght@400&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    html, body, #root {
      width: 100%;
      height: 100%;
      overflow: auto !important;
      overscroll-behavior: auto !important;
    }
    
    body {
      font-family: 'Inter', sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      overflow-y: scroll !important;
      overflow-x: hidden !important;
    }
    
    /* ✅ SCROLLBARS VISIBLES Y CON ESTILO MODERNO */
    * {
      scrollbar-width: thin;
      scrollbar-color: #94a3b8 #f1f5f9;
    }
    
    *::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    
    *::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 6px;
    }
    
    *::-webkit-scrollbar-thumb {
      background: #94a3b8;
      border-radius: 6px;
      transition: background 0.2s;
      border: 2px solid #f1f5f9;
    }
    
    *::-webkit-scrollbar-thumb:hover {
      background: #64748b;
    }
    
    /* ✅ SMOOTH SCROLLING */
    * {
      scroll-behavior: smooth !important;
    }
    
    .glass-button {
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      color: white;
      padding: 4px 8px !important;
    }
    .glass-button:hover { background: rgba(255, 255, 255, 0.3); }
    .glass-sidebar {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-right: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
    }
    .glass-nav-item {
      color: rgba(255, 255, 255, 0.7);
      transition: all 0.2s ease-in-out;
      padding: 6px 8px !important;
      font-size: 13px !important;
    }
    .glass-nav-item:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
    .glass-nav-item.active {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .glass-overlay {
      background: rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
    }
  `;

  // For PDF pages, render without layout
  if (isPDFPage) {
    return (
      <DataProvider>
        <style>{globalStyles}</style>
        {children}
      </DataProvider>
    );
  }

  return (
    <DataProvider>
      <style>{globalStyles}</style>
      {/* PerformanceMonitor disabled to avoid unnecessary background work */}
      <MainLayout>
        {children}
      </MainLayout>
    </DataProvider>
  );
}