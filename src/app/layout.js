
"use client";
import { useEffect } from 'react';
import './globals.css';

export default function RootLayout({ children }) {
  
  // ✅ CRITICAL FIX: Clean everything after any operation
  useEffect(() => {
    // Override alert to clean up after
    const originalAlert = window.alert;
    window.alert = function(...args) {
      const result = originalAlert.apply(this, args);
      
      // Immediate cleanup
      setTimeout(() => {
        // Remove stuck overlays
        document.querySelectorAll('[class*="fixed"][class*="inset"]').forEach(el => {
          if (!el.querySelector('input, button, textarea, select')) {
            el.remove();
          }
        });
        
        // Force enable pointer events
        document.body.style.pointerEvents = 'auto';
        document.querySelectorAll('*').forEach(el => {
          if (el.style.pointerEvents === 'none') {
            el.style.pointerEvents = 'auto';
          }
        });
        
        // Restore focus
        document.body.focus();
        setTimeout(() => document.body.blur(), 50);
      }, 50);
      
      return result;
    };
    
    // Override confirm
    const originalConfirm = window.confirm;
    window.confirm = function(...args) {
      const result = originalConfirm.apply(this, args);
      
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
        document.body.focus();
        setTimeout(() => document.body.blur(), 50);
      }, 50);
      
      return result;
    };
    
    // Cleanup on navigation
    const handleNavigation = () => {
      document.body.style.pointerEvents = 'auto';
      document.querySelectorAll('[class*="fixed"]').forEach(el => {
        if (!el.closest('[data-permanent]') && !el.querySelector('aside, nav')) {
          el.remove();
        }
      });
    };
    
    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('hashchange', handleNavigation);
    
    // Periodic cleanup every 2 seconds
    const cleanupInterval = setInterval(() => {
      // Force enable pointer events
      if (document.body.style.pointerEvents === 'none') {
        document.body.style.pointerEvents = 'auto';
      }
      
      // Remove stuck modals
      document.querySelectorAll('[class*="fixed"][class*="inset-0"][class*="z-50"]').forEach(modal => {
        // If modal has no interactive elements, remove it
        if (!modal.querySelector('input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled])')) {
          console.warn('Removing stuck modal:', modal);
          modal.remove();
        }
      });
    }, 2000);
    
    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('hashchange', handleNavigation);
      clearInterval(cleanupInterval);
    };
  }, []);

  return (
    <html lang="ar" dir="rtl">
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

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, icon, label }) {
  return (
    <li>
      <a
        href={href}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition"
      >
        <span className="text-xl">{icon}</span>
        <span className="font-medium">{label}</span>
      </a>
    </li>
  );
}