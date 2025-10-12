"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce, LoadingSpinner } from '../../hooks/optimizedHooks';

export default function PTClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Form data for adding new PT client
  const [formData, setFormData] = useState({
    custom_id: '',
    client_name: '',
    phone: '',
    coach_name: '',
    total_sessions: 12,
    completed_sessions: 0,
    remaining_sessions: 12,
    total_amount: 0,
    paid_amount: 0,
    remaining_amount: 0,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getPTClients();
        if (result.success) {
          setClients(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading PT clients:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredClients = useMemo(() => {
    if (!debouncedSearch) return clients;
    
    const search = debouncedSearch.toLowerCase();
    return clients.filter(client => 
      client.client_name.toLowerCase().includes(search) ||
      client.phone.includes(search) ||
      client.coach_name.toLowerCase().includes(search) ||
      String(client.custom_id || '').includes(search)
    );
  }, [clients, debouncedSearch]);

  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => {
      const endDate = new Date(c.end_date);
      return endDate >= new Date();
    }).length;
    const totalRevenue = clients.reduce((sum, c) => sum + (c.paid_amount || 0), 0);
    const pending = clients.reduce((sum, c) => sum + (c.remaining_amount || 0), 0);

    return { total, active, totalRevenue, pending };
  }, [clients]);

  // ═══════════════════════════════════════════════════════════
  // FORM HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto calculate remaining sessions
      if (name === 'total_sessions' || name === 'completed_sessions') {
        const total = name === 'total_sessions' ? parseInt(value) || 0 : prev.total_sessions;
        const completed = name === 'completed_sessions' ? parseInt(value) || 0 : prev.completed_sessions;
        updated.remaining_sessions = total - completed;
      }
      
      // Auto calculate remaining amount
      if (name === 'total_amount' || name === 'paid_amount') {
        const total = name === 'total_amount' ? parseFloat(value) || 0 : prev.total_amount;
        const paid = name === 'paid_amount' ? parseFloat(value) || 0 : prev.paid_amount;
        updated.remaining_amount = total - paid;
      }
      
      return updated;
    });
  }, []);

  const handleAddClient = useCallback(async () => {
    if (!formData.client_name || !formData.phone || !formData.coach_name) {
      alert('⚠️ من فضلك أكمل البيانات المطلوبة (الاسم، التليفون، الكوتش)');
      return;
    }

    setIsSubmitting(true);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.addPTClient(formData);

        if (result.success) {
          alert('✅ تم تسجيل عميل PT بنجاح!');
          setShowAddModal(false);
          resetForm();
          loadClients();
        } else {
          alert('❌ خطأ في التسجيل: ' + result.error);
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
      alert('❌ حدث خطأ: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, loadClients]);

  const resetForm = useCallback(() => {
    setFormData({
      custom_id: '',
      client_name: '',
      phone: '',
      coach_name: '',
      total_sessions: 12,
      completed_sessions: 0,
      remaining_sessions: 12,
      total_amount: 0,
      paid_amount: 0,
      remaining_amount: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      notes: ''
    });
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      try {
        const result = await window.electronAPI.deletePTClient(id);
        if (result.success) {
          alert('✅ تم الحذف بنجاح');
          loadClients();
        }
      } catch (error) {
        alert('❌ خطأ: ' + error.message);
      }
    }
  }, [loadClients]);

  const handleUpdateSession = useCallback(async () => {
    if (!selectedClient) return;

    try {
      const result = await window.electronAPI.updatePTSession(
        selectedClient.id,
        selectedClient.completed_sessions
      );

      if (result.success) {
        alert('✅ تم تحديث الحصص بنجاح');
        setShowSessionModal(false);
        loadClients();
      }
    } catch (error) {
      alert('❌ خطأ: ' + error.message);
    }
  }, [selectedClient, loadClients]);

  // ═══════════════════════════════════════════════════════════
  // CLIENT CARD COMPONENT
  // ═══════════════════════════════════════════════════════════

  const ClientCard = useCallback(({ client }) => {
    const isExpired = new Date(client.end_date) < new Date();
    const hasRemaining = client.remaining_amount > 0;
    const sessionsProgress = (client.completed_sessions / client.total_sessions) * 100;

    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-xl">
              {client.client_name.charAt(0)}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{client.client_name}</h3>
              <p className="text-gray-400 text-sm">{client.phone}</p>
              {client.custom_id && (
                <p className="text-purple-400 text-xs font-mono">ID: {client.custom_id}</p>
              )}
            </div>
          </div>
        </div>

        {/* Coach */}
        <div className="bg-purple-900/20 rounded-lg p-3 mb-4">
          <p className="text-purple-300 text-sm mb-1">👨‍🏫 الكوتش</p>
          <p className="text-white font-semibold">{client.coach_name}</p>
        </div>

        {/* Sessions Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">الحصص</span>
            <span className="text-white font-bold">
              {client.completed_sessions} / {client.total_sessions}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
              style={{ width: `${sessionsProgress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">
            متبقي {client.remaining_sessions} حصة
          </p>
        </div>

        {/* Financial */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-750 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">المدفوع</p>
            <p className="text-green-400 font-bold">{client.paid_amount} ج.م</p>
          </div>
          <div className="bg-gray-750 rounded-lg p-3">
            <p className="text-gray-400 text-xs mb-1">المتبقي</p>
            <p className={`font-bold ${hasRemaining ? 'text-red-400' : 'text-green-400'}`}>
              {client.remaining_amount} ج.م
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-gray-750 rounded-lg p-3 mb-4">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">من {client.start_date}</span>
            <span className={isExpired ? 'text-red-400' : 'text-gray-400'}>
              حتى {client.end_date}
            </span>
          </div>
        </div>

        {/* Status */}
        {isExpired && (
          <div className="bg-red-900/30 border border-red-500 rounded-lg p-2 mb-4 text-center">
            <p className="text-red-400 text-sm font-bold">⚠️ اشتراك منتهي</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => {
              setSelectedClient(client);
              setShowDetailsModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition text-sm"
            title="التفاصيل"
          >
            👁️
          </button>

          <button
            onClick={() => {
              setSelectedClient(client);
              setShowSessionModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition text-sm"
            title="تحديث حصة"
          >
            ✓
          </button>

          <button
            onClick={() => {
              setSelectedClient(client);
              setShowEditModal(true);
            }}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-2 rounded-lg transition text-sm"
            title="تعديل"
          >
            ✏️
          </button>

          <button
            onClick={() => handleDelete(client.id)}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition text-sm"
            title="حذف"
          >
            🗑️
          </button>
        </div>
      </div>
    );
  }, [handleDelete]);

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
          <h1 className="text-4xl font-bold text-white mb-2">💪 PT - التدريب الشخصي</h1>
          <p className="text-gray-400">إدارة عملاء التدريب الشخصي</p>
        </div>

        {/* Search & Stats */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="🔍 ابحث بالاسم أو التليفون أو الكوتش..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />

            <button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2"
            >
              <span className="text-xl">➕</span>
              <span>إضافة PT Client</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-700">
            <div className="text-center">
              <p className="text-gray-400 text-sm">إجمالي</p>
              <p className="text-white text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">نشط</p>
              <p className="text-purple-400 text-2xl font-bold">{stats.active}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">الإيرادات</p>
              <p className="text-green-400 text-2xl font-bold">{stats.totalRevenue}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">معلق</p>
              <p className="text-red-400 text-2xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </div>

        {/* Clients Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.length === 0 ? (
            <div className="col-span-full bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <div className="text-6xl mb-4">💪</div>
              <p className="text-gray-400 text-lg">لا يوجد عملاء PT</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition"
              >
                إضافة أول عميل
              </button>
            </div>
          ) : (
            filteredClients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════
            ADD MODAL
            ═══════════════════════════════════════════════════════════ */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-800 rounded-xl max-w-3xl w-full p-8 border border-gray-700 my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">➕ إضافة PT Client جديد</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-white text-3xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {/* Custom ID */}
                <div className="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
                  <label className="block text-purple-300 mb-2 font-semibold">رقم ID</label>
                  <input
                    type="text"
                    name="custom_id"
                    value={formData.custom_id}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="PT-001"
                  />
                </div>

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">اسم العميل *</label>
                    <input
                      type="text"
                      name="client_name"
                      value={formData.client_name}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      placeholder="أحمد محمد"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">رقم التليفون *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      placeholder="01xxxxxxxxx"
                      maxLength="11"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-gray-300 mb-2 font-semibold">اسم الكوتش *</label>
                    <input
                      type="text"
                      name="coach_name"
                      value={formData.coach_name}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      placeholder="كابتن محمود"
                    />
                  </div>
                </div>

                {/* Sessions */}
                <div className="bg-gray-750 rounded-lg p-4">
                  <h3 className="text-white font-bold mb-3">🎯 الحصص</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2 text-sm">إجمالي</label>
                      <input
                        type="number"
                        name="total_sessions"
                        value={formData.total_sessions}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2 text-sm">المكتملة</label>
                      <input
                        type="number"
                        name="completed_sessions"
                        value={formData.completed_sessions}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2 text-sm">المتبقية</label>
                      <input
                        type="number"
                        value={formData.remaining_sessions}
                        readOnly
                        className="w-full px-4 py-2 bg-green-900/50 border border-green-600 rounded-lg text-green-400 text-center cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div className="bg-gray-750 rounded-lg p-4">
                  <h3 className="text-white font-bold mb-3">💰 المالية</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2 text-sm">الإجمالي</label>
                      <input
                        type="number"
                        name="total_amount"
                        value={formData.total_amount}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2 text-sm">المدفوع</label>
                      <input
                        type="number"
                        name="paid_amount"
                        value={formData.paid_amount}
                        onChange={handleFormChange}
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2 text-sm">المتبقي</label>
                      <input
                        type="number"
                        value={formData.remaining_amount}
                        readOnly
                        className={`w-full px-4 py-2 border border-gray-600 rounded-lg cursor-not-allowed ${
                          formData.remaining_amount > 0 ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">تاريخ البداية</label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">تاريخ النهاية</label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleFormChange}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">ملاحظات</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows="3"
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                    placeholder="أي ملاحظات..."
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddClient}
                  disabled={isSubmitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {isSubmitting ? '⏳ جاري الحفظ...' : '✅ حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Update Modal */}
        {showSessionModal && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-md w-full p-8 border border-gray-700">
              <h2 className="text-2xl font-bold text-white mb-6">✓ تحديث الحصص</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">العميل</label>
                  <p className="text-white font-bold text-lg">{selectedClient.client_name}</p>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">الحصص المكتملة</label>
                  <input
                    type="number"
                    value={selectedClient.completed_sessions}
                    onChange={(e) => setSelectedClient({
                      ...selectedClient,
                      completed_sessions: parseInt(e.target.value) || 0,
                      remaining_sessions: selectedClient.total_sessions - (parseInt(e.target.value) || 0)
                    })}
                    min="0"
                    max={selectedClient.total_sessions}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-center text-xl font-bold"
                  />
                </div>

                <div className="bg-purple-900/20 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">المتبقي</p>
                  <p className="text-purple-400 text-2xl font-bold">
                    {selectedClient.remaining_sessions} حصة
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleUpdateSession}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg"
                >
                  ✅ حفظ
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedClient && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">تفاصيل PT Client</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white text-3xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">الاسم</p>
                    <p className="text-white font-semibold">{selectedClient.client_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">التليفون</p>
                    <p className="text-white font-semibold">{selectedClient.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">الكوتش</p>
                    <p className="text-white font-semibold">{selectedClient.coach_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">ID</p>
                    <p className="text-purple-400 font-semibold">{selectedClient.custom_id || 'N/A'}</p>
                  </div>
                </div>

                {selectedClient.notes && (
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-2">ملاحظات</p>
                    <p className="text-white bg-gray-750 p-3 rounded">{selectedClient.notes}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg"
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