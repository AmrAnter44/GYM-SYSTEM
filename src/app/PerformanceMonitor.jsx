// ═══════════════════════════════════════════════════════════
// src/components/PerformanceMonitor.jsx
// مكون اختياري لمراقبة الأداء في وضع التطوير
// ═══════════════════════════════════════════════════════════

"use client";
import { useState, useEffect, useRef } from 'react';

export default function PerformanceMonitor() {
  const [isVisible, setIsVisible] = useState(false);
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: 0,
    renderTime: 0,
    apiCalls: 0
  });
  
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const apiCallsRef = useRef(0);
  const renderStartRef = useRef(0);

  // Show only in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setIsVisible(true);
    }
  }, []);

  // Monitor FPS
  useEffect(() => {
    if (!isVisible) return;

    let animationId;
    
    const measureFPS = () => {
      frameCountRef.current++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTimeRef.current + 1000) {
        const fps = Math.round(
          (frameCountRef.current * 1000) / (currentTime - lastTimeRef.current)
        );
        
        setMetrics(prev => ({ ...prev, fps }));
        
        frameCountRef.current = 0;
        lastTimeRef.current = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };
    
    animationId = requestAnimationFrame(measureFPS);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isVisible]);

  // Monitor Memory (if available)
  useEffect(() => {
    if (!isVisible) return;

    const measureMemory = () => {
      if (performance.memory) {
        const memoryMB = Math.round(
          performance.memory.usedJSHeapSize / 1048576
        );
        setMetrics(prev => ({ ...prev, memory: memoryMB }));
      }
    };

    const interval = setInterval(measureMemory, 2000);
    return () => clearInterval(interval);
  }, [isVisible]);

  // Monitor Render Time
  useEffect(() => {
    if (!isVisible) return;

    renderStartRef.current = performance.now();

    return () => {
      const renderTime = Math.round(
        performance.now() - renderStartRef.current
      );
      setMetrics(prev => ({ ...prev, renderTime }));
    };
  });

  // Monitor API Calls (you need to integrate this with your API layer)
  useEffect(() => {
    if (!isVisible) return;

    // Example: Intercept fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      apiCallsRef.current++;
      setMetrics(prev => ({ ...prev, apiCalls: apiCallsRef.current }));
      return originalFetch.apply(this, args);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const getFPSColor = (fps) => {
    if (fps >= 55) return 'text-green-400';
    if (fps >= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMemoryColor = (memory) => {
    if (memory < 100) return 'text-green-400';
    if (memory < 200) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs font-mono shadow-2xl border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        <span className="font-bold">Performance Monitor</span>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">FPS:</span>
          <span className={`font-bold ${getFPSColor(metrics.fps)}`}>
            {metrics.fps}
          </span>
        </div>
        
        {performance.memory && (
          <div className="flex justify-between gap-4">
            <span className="text-gray-400">Memory:</span>
            <span className={`font-bold ${getMemoryColor(metrics.memory)}`}>
              {metrics.memory} MB
            </span>
          </div>
        )}
        
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Render:</span>
          <span className="font-bold text-blue-400">
            {metrics.renderTime}ms
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">API Calls:</span>
          <span className="font-bold text-purple-400">
            {metrics.apiCalls}
          </span>
        </div>
      </div>

      <button
        onClick={() => {
          apiCallsRef.current = 0;
          setMetrics(prev => ({ ...prev, apiCalls: 0 }));
        }}
        className="mt-2 w-full bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition"
      >
        Reset API Counter
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 📊 USAGE IN LAYOUT.JS
// ═══════════════════════════════════════════════════════════

/*
// في src/app/layout.js أضف:

import PerformanceMonitor from '../components/PerformanceMonitor';

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="flex h-screen bg-gray-900">
          <aside className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col">
            ...
          </aside>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
          
          <MemberCheckScanner />
          <PerformanceMonitor />  // أضف هنا
        </div>
      </body>
    </html>
  );
}
*/

// ═══════════════════════════════════════════════════════════
// 🎯 ADVANCED PERFORMANCE TRACKING
// ═══════════════════════════════════════════════════════════

export function usePerformanceTracking(componentName) {
  const renderCountRef = useRef(0);
  const mountTimeRef = useRef(0);

  useEffect(() => {
    mountTimeRef.current = performance.now();
    
    return () => {
      const lifetime = performance.now() - mountTimeRef.current;
      console.log(`[${componentName}] Lifetime: ${lifetime.toFixed(2)}ms, Renders: ${renderCountRef.current}`);
    };
  }, [componentName]);

  useEffect(() => {
    renderCountRef.current++;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] Render #${renderCountRef.current}`);
    }
  });
}

// ═══════════════════════════════════════════════════════════
// 📈 USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════

/*
// في أي component:

import { usePerformanceTracking } from '../components/PerformanceMonitor';

export default function MyComponent() {
  usePerformanceTracking('MyComponent');
  
  return <div>...</div>;
}
*/

// ═══════════════════════════════════════════════════════════
// 🔍 SEARCH PERFORMANCE LOGGER
// ═══════════════════════════════════════════════════════════

export function logSearchPerformance(searchTerm, startTime, resultCount) {
  const duration = performance.now() - startTime;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Search Performance:`, {
      query: searchTerm,
      duration: `${duration.toFixed(2)}ms`,
      results: resultCount,
      resultsPerMs: (resultCount / duration).toFixed(2)
    });
  }

  // Log warning if search is slow
  if (duration > 100) {
    console.warn(`⚠️ Slow search detected: ${duration.toFixed(2)}ms for "${searchTerm}"`);
  }
}

// ═══════════════════════════════════════════════════════════
// 💾 DATABASE QUERY LOGGER
// ═══════════════════════════════════════════════════════════

export function logDatabaseQuery(queryName, startTime, rowCount) {
  const duration = performance.now() - startTime;
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`💾 Database Query:`, {
      query: queryName,
      duration: `${duration.toFixed(2)}ms`,
      rows: rowCount,
      rowsPerMs: rowCount ? (rowCount / duration).toFixed(2) : 'N/A'
    });
  }

  // Log warning if query is slow
  if (duration > 200) {
    console.warn(`⚠️ Slow query detected: ${duration.toFixed(2)}ms for "${queryName}"`);
  }
}

// ═══════════════════════════════════════════════════════════
// 🎨 RENDER PERFORMANCE WRAPPER
// ═══════════════════════════════════════════════════════════

export function withPerformanceTracking(Component, componentName) {
  return function PerformanceWrapper(props) {
    const startTime = useRef(performance.now());
    const renderCount = useRef(0);

    useEffect(() => {
      renderCount.current++;
      const renderTime = performance.now() - startTime.current;
      
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(
          `⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
        );
      }
      
      startTime.current = performance.now();
    });

    return <Component {...props} />;
  };
}