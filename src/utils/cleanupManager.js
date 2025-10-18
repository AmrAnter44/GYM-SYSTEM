// ═══════════════════════════════════════════════════════════
// src/utils/cleanupManager.js
// نظام تنظيف شامل لحل جميع مشاكل الـ Focus والـ Input
// ═══════════════════════════════════════════════════════════

class CleanupManager {
  constructor() {
    this.isInitialized = false;
    this.cleanupQueue = [];
    this.activeModals = new Set();
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 INITIALIZE - يتم استدعاؤه مرة واحدة عند بدء التطبيق
  // ═══════════════════════════════════════════════════════════
  
  initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Override alert
    const originalAlert = window.alert;
    window.alert = (...args) => {
      const result = originalAlert.apply(window, args);
      this.immediateCleanup();
      return result;
    };

    // Override confirm
    const originalConfirm = window.confirm;
    window.confirm = (...args) => {
      const result = originalConfirm.apply(window, args);
      this.immediateCleanup();
      return result;
    };

    // Listen for clicks on document
    document.addEventListener('click', (e) => {
      // If clicking on backdrop, cleanup
      if (e.target.classList.contains('fixed') && 
          e.target.classList.contains('inset-0')) {
        this.immediateCleanup();
      }
    });

    // Periodic cleanup every second
    setInterval(() => {
      this.periodicCleanup();
    }, 1000);

    // Cleanup on navigation
    window.addEventListener('popstate', () => this.immediateCleanup());
    window.addEventListener('hashchange', () => this.immediateCleanup());

    console.log('✅ CleanupManager initialized');
  }

  // ═══════════════════════════════════════════════════════════
  // 🔥 IMMEDIATE CLEANUP - التنظيف الفوري
  // ═══════════════════════════════════════════════════════════
  
  immediateCleanup() {
    // 1. Enable pointer events globally
    document.body.style.pointerEvents = 'auto';
    document.body.style.userSelect = 'auto';
    document.body.style.overflow = 'auto';
    
    // 2. Remove all style attributes that might block input
    document.querySelectorAll('*').forEach(el => {
      if (el.style.pointerEvents === 'none' && !el.hasAttribute('disabled')) {
        el.style.pointerEvents = '';
      }
      if (el.style.userSelect === 'none') {
        el.style.userSelect = '';
      }
    });

    // 3. Remove stuck overlays (but keep navigation)
    document.querySelectorAll('.fixed.inset-0').forEach(el => {
      // Don't remove if it contains navigation or permanent elements
      const isNavigation = el.querySelector('aside, nav');
      const isPermanent = el.hasAttribute('data-permanent') || 
                         el.closest('[data-permanent]');
      
      if (!isNavigation && !isPermanent) {
        // Check if it's a stuck overlay (no interactive elements)
        const hasInteractive = el.querySelector('input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled])');
        
        if (!hasInteractive) {
          console.warn('🧹 Removing stuck overlay');
          el.remove();
        }
      }
    });

    // 4. Clear any focus traps
    const activeElement = document.activeElement;
    if (activeElement && activeElement !== document.body) {
      // If focused element is hidden or in a removed modal
      const isVisible = activeElement.offsetParent !== null;
      if (!isVisible) {
        activeElement.blur();
        document.body.focus();
        setTimeout(() => document.body.blur(), 50);
      }
    }

    // 5. Re-enable all form elements
    document.querySelectorAll('input, textarea, select, button').forEach(el => {
      // Don't enable if explicitly disabled by the app
      if (!el.hasAttribute('data-disabled')) {
        el.style.pointerEvents = 'auto';
      }
    });

    // 6. Clear modal tracking
    this.activeModals.clear();

    // 7. Dispatch custom event
    window.dispatchEvent(new CustomEvent('cleanup-complete'));
  }

  // ═══════════════════════════════════════════════════════════
  // ⏰ PERIODIC CLEANUP - التنظيف الدوري
  // ═══════════════════════════════════════════════════════════
  
  periodicCleanup() {
    // Check if body is disabled
    if (document.body.style.pointerEvents === 'none') {
      console.warn('⚠️ Body pointer events disabled - fixing...');
      this.immediateCleanup();
      return;
    }

    // Check for stuck modals
    const modals = document.querySelectorAll('.fixed.inset-0.z-50');
    modals.forEach(modal => {
      // If modal has no interactive elements, it's stuck
      const hasInteractive = modal.querySelector('input:not([disabled]), button:not([disabled]), textarea:not([disabled])');
      
      if (!hasInteractive && !modal.hasAttribute('data-permanent')) {
        console.warn('⚠️ Found stuck modal - removing...');
        modal.remove();
      }
    });

    // Check if any input is unreachable
    const firstInput = document.querySelector('input:not([disabled]), textarea:not([disabled])');
    if (firstInput) {
      const style = window.getComputedStyle(firstInput);
      if (style.pointerEvents === 'none') {
        console.warn('⚠️ Input has pointer-events: none - fixing...');
        this.immediateCleanup();
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📝 REGISTER MODAL - تسجيل Modal جديد
  // ═══════════════════════════════════════════════════════════
  
  registerModal(modalId) {
    this.activeModals.add(modalId);
    console.log(`📝 Modal registered: ${modalId}`);
  }

  // ═══════════════════════════════════════════════════════════
  // 🗑️ UNREGISTER MODAL - إلغاء تسجيل Modal
  // ═══════════════════════════════════════════════════════════
  
  unregisterModal(modalId) {
    this.activeModals.delete(modalId);
    console.log(`🗑️ Modal unregistered: ${modalId}`);
    
    // If no more modals, do cleanup
    if (this.activeModals.size === 0) {
      setTimeout(() => this.immediateCleanup(), 100);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🎯 FOCUS FIX - إصلاح مشاكل الـ Focus
  // ═══════════════════════════════════════════════════════════
  
  fixFocus() {
    // Try to find a suitable element to focus
    const focusable = [
      'input:not([disabled]):not([type="hidden"])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    for (const selector of focusable) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        element.focus();
        console.log('✅ Focus restored to:', element);
        return;
      }
    }

    // Fallback: focus body then blur
    document.body.focus();
    setTimeout(() => document.body.blur(), 50);
  }

  // ═══════════════════════════════════════════════════════════
  // 🔄 SAFE OPERATION - تنفيذ عملية مع ضمان التنظيف
  // ═══════════════════════════════════════════════════════════
  
  async safeOperation(operation, cleanupDelay = 100) {
    try {
      const result = await operation();
      setTimeout(() => this.immediateCleanup(), cleanupDelay);
      return result;
    } catch (error) {
      this.immediateCleanup();
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🛡️ WRAP HANDLER - تغليف أي handler مع cleanup تلقائي
  // ═══════════════════════════════════════════════════════════
  
  wrapHandler(handler) {
    return async (...args) => {
      try {
        const result = await handler(...args);
        setTimeout(() => this.immediateCleanup(), 100);
        return result;
      } catch (error) {
        this.immediateCleanup();
        throw error;
      }
    };
  }
}

// Create singleton instance
const cleanupManager = new CleanupManager();

// Export both the instance and the class
export default cleanupManager;
export { CleanupManager };

// ═══════════════════════════════════════════════════════════
// 🎯 HELPER HOOKS
// ═══════════════════════════════════════════════════════════

export function useCleanup() {
  return {
    cleanup: () => cleanupManager.immediateCleanup(),
    fixFocus: () => cleanupManager.fixFocus(),
    safeOperation: (op) => cleanupManager.safeOperation(op),
    wrapHandler: (handler) => cleanupManager.wrapHandler(handler)
  };
}

// ═══════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

export function ensureCleanState() {
  cleanupManager.immediateCleanup();
}

export function withCleanup(fn) {
  return async (...args) => {
    try {
      const result = await fn(...args);
      ensureCleanState();
      return result;
    } catch (error) {
      ensureCleanState();
      throw error;
    }
  };
}