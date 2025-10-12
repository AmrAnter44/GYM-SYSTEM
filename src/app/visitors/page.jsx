"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce, LoadingSpinner } from '../../hooks/optimizedHooks';

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
    recordedBy: '',
  });

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  useEffect(() => {
    loadVisitors();
  }, []);

  const loadVisitors = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.getVisitors();
        if (result.success) {
          setVisitors(result.data);
        }
      } else {
        // Dummy data for development
        const dummyData = [
          {
            id: 1,
            name: 'محمد أحمد',
            phone: '01012345678',
            notes: 'مهتم بالاشتراك الشهري',
            recordedBy: 'أحمد',
            createdAt: '2025-10-11 14:30:00'
          },
          {
            id: 2,
            name: 'سارة علي',
            phone: '01098765432',
            notes: 'زائرة للمرة الأولى',
            recordedBy: 'محمد',
            createdAt: '2025-10-11 15:45:00'
          }
        ];
        setVisitors(dummyData);
      }
    } catch (error) {
      console.error('Error loading visitors:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized filtered visitors
  const filteredVisitors = useMemo(() => {
    let filtered = [...visitors];

    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(visitor => {
        const name = (visitor.name || '').toLowerCase();
        const phone = visitor.phone || '';
        
        return name.includes(searchLower) || phone.includes(debouncedSearch);
      });
    }

    // Sort by newest first
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return filtered;
  }, [visitors, debouncedSearch]);

  // Memoized stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    return {
      total: visitors.length,
      today: visitors.filter(v => new Date(v.createdAt).toDateString() === today).length,
      thisWeek: visitors.filter(v => new Date(v.createdAt) >= weekAgo).length
    };
  }, [visitors]);

  const handleSubmit = useCallback(async () => {
    if (!formData.name || !formData.phone) {
      alert('من فضلك أدخل الاسم ورقم التليفون');
      return;
    }

    const visitorData = {
      ...formData,
      createdAt: new Date().toISOString()
    };

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const result = await window.electronAPI.addVisitor(visitorData);
        if (result.success) {
          alert('✅ تم تسجيل الزائر بنجاح');
          setShowAddModal(false);
          resetForm();
          loadVisitors();
        } else {
          alert('❌ خطأ: ' + result.error);
        }
      } else {
        alert('✅ تم تسجيل الزائر بنجاح (تجريبي)');
        setShowAddModal(false);
        resetForm();
      }
    } catch (error) {
      alert('❌ خطأ: ' + error.message);
    }
  }, [formData, loadVisitors]);

  const handleDelete = useCallback(async (visitorId) => {
    if (confirm('هل أنت متأكد من حذف هذا الزائر؟')) {
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.deleteVisitor(visitorId);
          if (result.success) {
            loadVisitors();
            alert('✅ تم حذف الزائر بنجاح');
          } else {
            alert('❌ خطأ: ' + result.error);
          }
        }
      } catch (error) {
        alert('❌ خطأ في الحذف: ' + error.message);
      }
    }
  }, [loadVisitors]);

  const handleExportToExcel = useCallback(async () => {
    try {
      const result = await window.electronAPI.exportVisitorsToExcel({
        searchTerm: searchTerm
      });
      
      if (result.success) {
        alert(`✅ تم تصدير ${result.count} زائر بنجاح!\n\nالملف: ${result.filePath}`);
      } else {
        alert('❌ فشل التصدير: ' + (result.message || result.error));
      }
    } catch (error) {
      alert('❌ خطأ في التصدير: ' + error.message);
    }
  }, [searchTerm]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      phone: '',
      notes: '',
      recordedBy: ''
    });
  }, []);

  const handleViewDetails = useCallback((visitor) => {
    setSelectedVisitor(visitor);
    setShowDetailsModal(true);
  }, []);

  const formatDateTime = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const getTimeAgo = useCallback((dateString) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    return `منذ ${diffDays} يوم`;
  }, []);

  const VisitorCard = useCallback(({ visitor }) => (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition shadow-lg">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
            {visitor.name.charAt(0)}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">{visitor.name}</h3>
            <p className="text-gray-400 text-sm">{visitor.phone}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      {visitor.notes && (
        <div className="bg-gray-750 rounded-lg p-3 mb-4">
          <p className="text-gray-300 text-sm">{visitor.notes}</p>
        </div>
      )}

      {/* Footer Info */}
      <div className="space-y-2 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">سجله:</span>
          <span className="text-blue-400 font-semibold">{visitor.recordedBy}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">التاريخ:</span>
          <span className="text-gray-300 font-mono">{getTimeAgo(visitor.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => handleViewDetails(visitor)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition text-sm font-semibold"
        >
          👁️ عرض
        </button>
        <button
          onClick={() => handleDelete(visitor.id)}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm"
        >
          🗑️
        </button>
      </div>
    </div>
  ), [handleViewDetails, handleDelete, getTimeAgo]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">👥 سجل الزوار</h1>
          <p className="text-gray-400">تسجيل ومتابعة زوار الجيم</p>
        </div>

        {/* Search and Actions */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Search */}
            <div>
              <input
                type="text"
                placeholder="🔍 ابحث بالاسم أو رقم التليفون..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Add Button */}
            <div>
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2"
              >
                <span className="text-xl">➕</span>
                <span>تسجيل زائر جديد</span>
              </button>
            </div>
          </div>

          {/* Export Button */}
          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={handleExportToExcel}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2"
            >
              <span className="text-xl">📊</span>
              <span>تصدير إلى Excel</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700 mt-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">إجمالي الزوار</p>
              <p className="text-white text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">اليوم</p>
              <p className="text-blue-400 text-2xl font-bold">{stats.today}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">هذا الأسبوع</p>
              <p className="text-green-400 text-2xl font-bold">{stats.thisWeek}</p>
            </div>
          </div>
        </div>

        {/* Visitors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVisitors.length === 0 ? (
            <div className="col-span-full bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-400 text-lg">لا يوجد زوار مسجلين</p>
            </div>
          ) : (
            filteredVisitors.map((visitor) => (
              <VisitorCard key={visitor.id} visitor={visitor} />
            ))
          )}
        </div>

        {/* Add Visitor Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-md w-full p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">➕ تسجيل زائر جديد</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-white text-3xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">الاسم *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="مثال: أحمد محمد"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">رقم التليفون *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="01xxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">اسم المسجل *</label>
                  <input
                    type="text"
                    value={formData.recordedBy}
                    onChange={(e) => setFormData({...formData, recordedBy: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="اسم الموظف"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">ملاحظات</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows="4"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="أي ملاحظات عن الزيارة..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  ✅ حفظ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedVisitor && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-lg w-full p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">تفاصيل الزائر</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white text-3xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                    {selectedVisitor.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-white text-xl font-bold">{selectedVisitor.name}</h3>
                    <p className="text-gray-400">{selectedVisitor.phone}</p>
                  </div>
                </div>

                <div className="bg-gray-750 rounded-lg p-4">
                  <p className="text-gray-400 text-sm mb-2">الملاحظات</p>
                  <p className="text-white">{selectedVisitor.notes || 'لا توجد ملاحظات'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-750 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">سجله</p>
                    <p className="text-white font-semibold">{selectedVisitor.recordedBy}</p>
                  </div>
                  <div className="bg-gray-750 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">التاريخ</p>
                    <p className="text-white font-mono text-sm">{formatDateTime(selectedVisitor.createdAt)}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}