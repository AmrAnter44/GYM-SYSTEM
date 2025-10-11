// ═══════════════════════════════════════════════════════════
// src/hooks/optimizedHooks.js
// جميع الـ Hooks والـ Utils المحسّنة
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useMemo, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════
// 🎯 DEBOUNCE HOOK
// ═══════════════════════════════════════════════════════════
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ═══════════════════════════════════════════════════════════
// 💾 MEMBERS DATA HOOK
// ═══════════════════════════════════════════════════════════
export function useMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      if (window.electronAPI) {
        const result = await window.electronAPI.getMembers();
        if (result.success) {
          setMembers(result.data);
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const addMember = useCallback(async (memberData) => {
    const result = await window.electronAPI.addMember(memberData);
    if (result.success) {
      await loadMembers();
    }
    return result;
  }, [loadMembers]);

  const updateMember = useCallback(async (id, data) => {
    const result = await window.electronAPI.updateMember(id, data);
    if (result.success) {
      await loadMembers();
    }
    return result;
  }, [loadMembers]);

  const deleteMember = useCallback(async (id) => {
    const result = await window.electronAPI.deleteMember(id);
    if (result.success) {
      await loadMembers();
    }
    return result;
  }, [loadMembers]);

  return {
    members,
    loading,
    error,
    reload: loadMembers,
    addMember,
    updateMember,
    deleteMember
  };
}

// ═══════════════════════════════════════════════════════════
// 🔍 FILTERED MEMBERS HOOK
// ═══════════════════════════════════════════════════════════
export function useFilteredMembers(members, searchTerm, filterStatus) {
  return useMemo(() => {
    let filtered = [...members];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(member => {
        const name = (member.name || '').toLowerCase();
        const phone = member.phone || '';
        const customId = String(member.custom_id || '');
        
        return name.includes(searchLower) || 
               phone.includes(searchTerm) ||
               customId.includes(searchTerm);
      });
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(member => {
        const endDate = member.subscription_end || member.subscriptionEnd;
        if (!endDate) return false;
        
        const isExpired = new Date(endDate) < new Date();
        return filterStatus === 'active' ? !isExpired : isExpired;
      });
    }

    return filtered;
  }, [members, searchTerm, filterStatus]);
}

// ═══════════════════════════════════════════════════════════
// 📊 IMAGE COMPRESSION UTILITY
// ═══════════════════════════════════════════════════════════
export async function compressImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              }));
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

// ═══════════════════════════════════════════════════════════
// 🎨 LOADING SKELETON COMPONENT
// ═══════════════════════════════════════════════════════════
export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="animate-pulse">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-gray-700">
          <div className="w-12 h-12 bg-gray-700 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-700 rounded w-1/2" />
          </div>
          <div className="w-24 h-8 bg-gray-700 rounded" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🔄 LOADING SPINNER
// ═══════════════════════════════════════════════════════════
export function LoadingSpinner({ size = 'md' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${sizeClasses[size]} border-4 border-blue-600 border-t-transparent rounded-full animate-spin`} />
    </div>
  );
}