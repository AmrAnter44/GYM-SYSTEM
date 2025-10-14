"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce, LoadingSpinner } from '../../hooks/optimizedHooks';

export default function OtherServices() {
  // ═══════════════════════════════════════════════════════════
  // STATE MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  
  const [activeTab, setActiveTab] = useState('inbody'); // 'inbody' or 'dayuse'
  
  // InBody State
  const [inbodyServices, setInbodyServices] = useState([]);
  const [inbodyLoading, setInbodyLoading] = useState(true);
  const [inbodySearch, setInbodySearch] = useState('');
  
  // Day Use State
  const [dayuseServices, setDayuseServices] = useState([]);
  const [dayuseLoading, setDayuseLoading] = useState(true);
  const [dayuseSearch, setDayuseSearch] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [modalType, setModalType] = useState('inbody'); // 'inbody' or 'dayuse'
  
  // Form Data
  const [formData, setFormData] = useState({
    client_name: '',
    phone: '',
    service_price: 0,
    staff_name: '',
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced searches
  const debouncedInbodySearch = useDebounce(inbodySearch, 300);
  const debouncedDayuseSearch = useDebounce(dayuseSearch, 300);

  // ═══════════════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    loadInBodyServices();
    loadDayUseServices();
  }, []);

  const loadInBodyServices = useCallback(async () => {
    setInbodyLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getInBodyServices();
        if (result.success) {
          setInbodyServices(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading InBody services:', error);
    } finally {
      setInbodyLoading(false);
    }
  }, []);

  const loadDayUseServices = useCallback(async () => {
    setDayuseLoading(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getDayUseServices();
        if (result.success) {
          setDayuseServices(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading Day Use services:', error);
    } finally {
      setDayuseLoading(false);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // FILTERED DATA
  // ═══════════════════════════════════════════════════════════

  const filteredInbody = useMemo(() => {
    if (!debouncedInbodySearch) return inbodyServices;
    
    const search = debouncedInbodySearch.toLowerCase();
    return inbodyServices.filter(service => 
      service.client_name.toLowerCase().includes(search) ||
      service.phone.includes(search) ||
      service.staff_name.toLowerCase().includes(search)
    );
  }, [inbodyServices, debouncedInbodySearch]);

  const filteredDayuse = useMemo(() => {
    if (!debouncedDayuseSearch) return dayuseServices;
    
    const search = debouncedDayuseSearch.toLowerCase();
    return dayuseServices.filter(service => 
      service.client_name.toLowerCase().includes(search) ||
      service.phone.includes(search) ||
      service.staff_name.toLowerCase().includes(search)
    );
  }, [dayuseServices, debouncedDayuseSearch]);

  // ═══════════════════════════════════════════════════════════
  // STATISTICS
  // ═══════════════════════════════════════════════════════════

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    
    const inbodyToday = inbodyServices.filter(s => 
      new Date(s.created_at).toDateString() === today
    ).length;
    const inbodyRevenue = inbodyServices.reduce((sum, s) => sum + (s.service_price || 0), 0);
    
    const dayuseToday = dayuseServices.filter(s => 
      new Date(s.created_at).toDateString() === today
    ).length;
    const dayuseRevenue = dayuseServices.reduce((sum, s) => sum + (s.service_price || 0), 0);

    return {
      inbody: {
        total: inbodyServices.length,
        today: inbodyToday,
        revenue: inbodyRevenue
      },
      dayuse: {
        total: dayuseServices.length,
        today: dayuseToday,
        revenue: dayuseRevenue
      },
      totalRevenue: inbodyRevenue + dayuseRevenue
    };
  }, [inbodyServices, dayuseServices]);

  // ═══════════════════════════════════════════════════════════
  // FORM HANDLERS
  // ═══════════════════════════════════════════════════════════

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      client_name: '',
      phone: '',
      service_price: 0,
      staff_name: '',
      notes: ''
    });
  }, []);

  const handleAddService = useCallback(async () => {
    if (!formData.client_name || !formData.phone || !formData.staff_name) {
      alert('⚠️ من فضلك أكمل البيانات المطلوبة (الاسم، التليفون، اسم الموظف)');
      return;
    }

    setIsSubmitting(true);

    try {
      if (window.electronAPI) {
        const result = modalType === 'inbody' 
          ? await window.electronAPI.addInBodyService(formData)
          : await window.electronAPI.addDayUseService(formData);

        if (result.success) {
          alert(`✅ تم تسجيل ${modalType === 'inbody' ? 'InBody' : 'Day Use'} بنجاح!`);
          setShowAddModal(false);
          resetForm();
          
          if (modalType === 'inbody') {
            loadInBodyServices();
          } else {
            loadDayUseServices();
          }
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
  }, [formData, modalType, loadInBodyServices, loadDayUseServices, resetForm]);

  const handleDelete = useCallback(async (id, type) => {
    if (confirm('هل أنت متأكد من حذف هذه الخدمة؟')) {
      try {
        const result = type === 'inbody'
          ? await window.electronAPI.deleteInBodyService(id)
          : await window.electronAPI.deleteDayUseService(id);
        
        if (result.success) {
          alert('✅ تم الحذف بنجاح');
          if (type === 'inbody') {
            loadInBodyServices();
          } else {
            loadDayUseServices();
          }
        }
      } catch (error) {
        alert('❌ خطأ: ' + error.message);
      }
    }
  }, [loadInBodyServices, loadDayUseServices]);

  const handleViewDetails = useCallback((service, type) => {
    setSelectedService(service);
    setModalType(type);
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

  // ═══════════════════════════════════════════════════════════
  // SERVICE CARD COMPONENT
  // ═══════════════════════════════════════════════════════════

  const ServiceCard = useCallback(({ service, type }) => {
    const bgColor = type === 'inbody' ? 'from-cyan-500 to-blue-600' : 'from-orange-500 to-red-600';
    
    return (
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${bgColor} flex items-center justify-center text-white font-bold text-xl`}>
              {service.client_name.charAt(0)}
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{service.client_name}</h3>
              <p className="text-gray-400 text-sm">{service.phone}</p>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="bg-green-900/20 rounded-lg p-3 mb-4 border border-green-600">
          <p className="text-green-300 text-sm mb-1">💰 السعر</p>
          <p className="text-white text-2xl font-bold">{service.service_price} ج.م</p>
        </div>

        {/* Staff & Time */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">👤 الموظف:</span>
            <span className="text-blue-400 font-semibold">{service.staff_name}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">⏰ الوقت:</span>
            <span className="text-gray-300 font-mono">{getTimeAgo(service.created_at)}</span>
          </div>
        </div>

        {/* Notes */}
        {service.notes && (
          <div className="bg-gray-750 rounded-lg p-3 mb-4">
            <p className="text-gray-300 text-sm">{service.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => handleViewDetails(service, type)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition text-sm font-semibold"
          >
            👁️ عرض
          </button>
          <button
            onClick={() => handleDelete(service.id, type)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition text-sm"
          >
            🗑️
          </button>
        </div>
      </div>
    );
  }, [handleViewDetails, handleDelete, getTimeAgo]);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (inbodyLoading && dayuseLoading) {
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
          <h1 className="text-4xl font-bold text-white mb-2">📊 خدمات أخرى</h1>
          <p className="text-gray-400">InBody و Day Use</p>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-xl p-2 shadow-lg mb-6 border border-gray-700 flex gap-2">
          <button
            onClick={() => setActiveTab('inbody')}
            className={`flex-1 py-3 px-6 rounded-lg font-bold transition ${
              activeTab === 'inbody'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white'
                : 'bg-gray-750 text-gray-400 hover:text-white'
            }`}
          >
            📊 InBody
          </button>
          <button
            onClick={() => setActiveTab('dayuse')}
            className={`flex-1 py-3 px-6 rounded-lg font-bold transition ${
              activeTab === 'dayuse'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                : 'bg-gray-750 text-gray-400 hover:text-white'
            }`}
          >
            🏃 Day Use
          </button>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-cyan-900/30 border border-cyan-600 rounded-xl p-4">
            <p className="text-cyan-300 text-sm mb-1">InBody - إجمالي</p>
            <p className="text-white text-2xl font-bold">{stats.inbody.total}</p>
          </div>
          <div className="bg-cyan-900/30 border border-cyan-600 rounded-xl p-4">
            <p className="text-cyan-300 text-sm mb-1">InBody - اليوم</p>
            <p className="text-white text-2xl font-bold">{stats.inbody.today}</p>
          </div>
          <div className="bg-orange-900/30 border border-orange-600 rounded-xl p-4">
            <p className="text-orange-300 text-sm mb-1">Day Use - إجمالي</p>
            <p className="text-white text-2xl font-bold">{stats.dayuse.total}</p>
          </div>
          <div className="bg-orange-900/30 border border-orange-600 rounded-xl p-4">
            <p className="text-orange-300 text-sm mb-1">Day Use - اليوم</p>
            <p className="text-white text-2xl font-bold">{stats.dayuse.today}</p>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="bg-green-900/30 border border-green-600 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-green-300 text-sm mb-2">💰 إيرادات InBody</p>
              <p className="text-white text-2xl font-bold">{stats.inbody.revenue.toLocaleString()} ج.م</p>
            </div>
            <div>
              <p className="text-green-300 text-sm mb-2">💰 إيرادات Day Use</p>
              <p className="text-white text-2xl font-bold">{stats.dayuse.revenue.toLocaleString()} ج.م</p>
            </div>
            <div>
              <p className="text-green-300 text-sm mb-2">💎 الإجمالي</p>
              <p className="text-white text-3xl font-bold">{stats.totalRevenue.toLocaleString()} ج.م</p>
            </div>
          </div>
        </div>

        {/* Search and Add */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder={`🔍 ابحث في ${activeTab === 'inbody' ? 'InBody' : 'Day Use'}...`}
              value={activeTab === 'inbody' ? inbodySearch : dayuseSearch}
              onChange={(e) => activeTab === 'inbody' ? setInbodySearch(e.target.value) : setDayuseSearch(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />

            <button
              onClick={() => {
                resetForm();
                setModalType(activeTab);
                setShowAddModal(true);
              }}
              className={`bg-gradient-to-r ${
                activeTab === 'inbody' 
                  ? 'from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700' 
                  : 'from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
              } text-white font-bold py-3 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2`}
            >
              <span className="text-xl">➕</span>
              <span>إضافة {activeTab === 'inbody' ? 'InBody' : 'Day Use'}</span>
            </button>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'inbody' ? (
            filteredInbody.length === 0 ? (
              <div className="col-span-full bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-400 text-lg">لا يوجد InBody مسجل</p>
              </div>
            ) : (
              filteredInbody.map((service) => (
                <ServiceCard key={service.id} service={service} type="inbody" />
              ))
            )
          ) : (
            filteredDayuse.length === 0 ? (
              <div className="col-span-full bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                <div className="text-6xl mb-4">🏃</div>
                <p className="text-gray-400 text-lg">لا يوجد Day Use مسجل</p>
              </div>
            ) : (
              filteredDayuse.map((service) => (
                <ServiceCard key={service.id} service={service} type="dayuse" />
              ))
            )
          )}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-md w-full p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  ➕ تسجيل {modalType === 'inbody' ? 'InBody' : 'Day Use'}
                </h2>
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
                  <label className="block text-gray-300 mb-2 font-semibold">اسم العميل *</label>
                  <input
                    type="text"
                    name="client_name"
                    value={formData.client_name}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="مثال: أحمد محمد"
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

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">سعر الخدمة (جنيه) *</label>
                  <input
                    type="number"
                    name="service_price"
                    value={formData.service_price}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-2 font-semibold">اسم الموظف *</label>
                  <input
                    type="text"
                    name="staff_name"
                    value={formData.staff_name}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    placeholder="اسم الموظف"
                  />
                </div>

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

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAddService}
                  disabled={isSubmitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50"
                >
                  {isSubmitting ? '⏳ جاري الحفظ...' : '✅ حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedService && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-lg w-full p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">
                  تفاصيل {modalType === 'inbody' ? 'InBody' : 'Day Use'}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white text-3xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${
                    modalType === 'inbody' ? 'from-cyan-500 to-blue-600' : 'from-orange-500 to-red-600'
                  } flex items-center justify-center text-white font-bold text-2xl`}>
                    {selectedService.client_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-white text-xl font-bold">{selectedService.client_name}</h3>
                    <p className="text-gray-400">{selectedService.phone}</p>
                  </div>
                </div>

                <div className="bg-green-900/30 border border-green-600 rounded-lg p-4">
                  <p className="text-green-300 text-sm mb-2">💰 السعر</p>
                  <p className="text-white text-2xl font-bold">{selectedService.service_price} ج.م</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-750 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">الموظف</p>
                    <p className="text-white font-semibold">{selectedService.staff_name}</p>
                  </div>
                  <div className="bg-gray-750 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">التاريخ</p>
                    <p className="text-white font-mono text-sm">{formatDateTime(selectedService.created_at)}</p>
                  </div>
                </div>

                {selectedService.notes && (
                  <div className="bg-gray-750 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-2">الملاحظات</p>
                    <p className="text-white">{selectedService.notes}</p>
                  </div>
                )}
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