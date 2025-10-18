"use client";
import { useEffect } from 'react';
import './globals.css';
import cleanupManager from '../utils/cleanupManager';

export default function RootLayout({ children }) {
  
  // ═══════════════════════════════════════════════════════════
  // 🚀 INITIALIZE CLEANUP MANAGER ON MOUNT
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    // Initialize the cleanup manager
    cleanupManager.initialize();
    
    // Do immediate cleanup on mount
    cleanupManager.immediateCleanup();
    
    // Global keyboard handler for ESC key
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // On ESC, do immediate cleanup
        cleanupManager.immediateCleanup();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🎯 FOCUS RECOVERY ON ROUTE CHANGE
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    // Monitor for route changes
    const handleRouteChange = () => {
      setTimeout(() => {
        cleanupManager.immediateCleanup();
        cleanupManager.fixFocus();
      }, 100);
    };

    // Listen for any navigation
    window.addEventListener('popstate', handleRouteChange);
    
    // Also monitor for hash changes
    window.addEventListener('hashchange', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🔍 MONITOR FOR STUCK STATES
  // ═══════════════════════════════════════════════════════════
  
  useEffect(() => {
    // Check every 2 seconds for stuck states
    const interval = setInterval(() => {
      // Check if body is clickable
      const bodyStyle = window.getComputedStyle(document.body);
      if (bodyStyle.pointerEvents === 'none') {
        console.warn('⚠️ Body is not clickable - auto-fixing...');
        cleanupManager.immediateCleanup();
      }
      
      // Check for stuck modals
      const modals = document.querySelectorAll('.fixed.inset-0.bg-black.bg-opacity-75');
      modals.forEach(modal => {
        // If modal has no visible content, remove it
        const hasContent = modal.querySelector('div[class*="bg-gray-800"]');
        if (!hasContent) {
          console.warn('⚠️ Removing empty modal overlay');
          modal.remove();
        }
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <html lang="ar" dir="rtl">
      <head>
        <style jsx global>{`
          /* Ensure body is always interactive */
          body {
            pointer-events: auto !important;
            user-select: auto !important;
            overflow: auto !important;
          }
          
          /* Prevent any element from blocking the entire screen */
          .fixed.inset-0:not([data-permanent]) {
            pointer-events: none;
          }
          
          .fixed.inset-0:not([data-permanent]) > * {
            pointer-events: auto;
          }
          
          /* Ensure inputs are always accessible */
          input:not([disabled]),
          textarea:not([disabled]),
          select:not([disabled]),
          button:not([disabled]) {
            pointer-events: auto !important;
          }
        `}</style>
      </head>
      <body>
        <div className="flex h-screen bg-gray-900" data-permanent="true">
          <aside className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col" data-permanent="true">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
                  🏋️
                </div>
                <div>
                  <h1 className="text-white font-bold text-lg">نظام الجيم</h1>
                  <p className="text-gray-400 text-xs">Gym Management</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                <NavLink href="/" icon="🏠" label="الرئيسية" />
                <NavLink href="/add-member" icon="➕" label="إضافة عضو جديد" />
                <NavLink href="/members" icon="👥" label="إدارة المشتركين" />
                <NavLink href="/pt-clients" icon="💪" label="PT - التدريب الشخصي" />
                <NavLink href="/visitors" icon="👥" label="الزائرين" />
                <NavLink href="/other-services" icon="📊" label="خدمات أخرى" />
              </ul>
            </nav>

            <div className="p-4 border-t border-gray-700">
              <p className="text-gray-400 text-xs text-center">© 2025 Gym System</p>
            </div>
          </aside>

          <main className="flex-1 overflow-auto" data-main-content="true">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, icon, label }) {
  // Use cleanupManager for navigation
  const handleClick = (e) => {
    e.preventDefault();
    cleanupManager.immediateCleanup();
    window.location.href = href;
  };

  return (
    <li>
      <a
        href={href}
        onClick={handleClick}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition"
      >
        <span className="text-xl">{icon}</span>
        <span className="font-medium">{label}</span>
      </a>
    </li>
  );
}