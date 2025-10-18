"use client";
import { useState, useCallback, useMemo } from 'react';
import { useMembers, LoadingSpinner } from '../../hooks/optimizedHooks';
import cleanupManager, { useCleanup } from '../../utils/cleanupManager';

// ═══════════════════════════════════════════════════════════
// 📝 DETAILS MODAL COMPONENT
// ═══════════════════════════════════════════════════════════

function DetailsModal({ member, onClose, onEdit }) {
  const { cleanup } = useCleanup();
  
  const handleClose = () => {
    cleanup();
    onClose();
  };
  
  const endDate = member.subscription_end || member.subscriptionEnd;
  const isExpired = new Date(endDate) < new Date();
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">📋 تفاصيل العضو</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">الاسم</p>
            <p className="text-white text-xl font-bold">{member.name}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">ID</p>
              <p className="text-blue-400 text-lg font-mono font-bold">{member.custom_id || member.id}</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">التليفون</p>
              <p className="text-white text-lg font-bold">{member.phone}</p>
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1">الحالة</p>
            {isExpired ? (
              <span className="bg-red-900/50 text-red-400 px-4 py-2 rounded-full text-lg font-bold inline-block">منتهي ⚠️</span>
            ) : (
              <span className="bg-green-900/50 text-green-400 px-4 py-2 rounded-full text-lg font-bold inline-block">نشط ✅</span>
            )}
          </div>
          
          {member.notes && (
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-gray-400 text-sm mb-1">ملاحظات</p>
              <p className="text-white">{member.notes}</p>
            </div>
          )}
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={onEdit} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg transition">
            ✏️ تعديل
          </button>
          <button onClick={handleClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition">
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ✏️ EDIT MODAL COMPONENT
// ═══════════════════════════════════════════════════════════

function EditModal({ member, onClose, onSave }) {
  const { cleanup, wrapHandler } = useCleanup();
  const [formData, setFormData] = useState({
    name: member.name || '',
    phone: member.phone || '',
    subscription_type: member.subscription_type || member.subscriptionType || '',
    subscription_start: member.subscription_start || member.subscriptionStart || '',
    subscription_end: member.subscription_end || member.subscriptionEnd || '',
    total_amount: member.total_amount || 0,
    paid_amount: member.paid_amount || 0,
    remaining_amount: member.remaining_amount || member.remainingAmount || 0,
    notes: member.notes || ''
  });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'total_amount' || name === 'paid_amount') {
        const total = name === 'total_amount' ? parseFloat(value) || 0 : prev.total_amount;
        const paid = name === 'paid_amount' ? parseFloat(value) || 0 : prev.paid_amount;
        updated.remaining_amount = total - paid;
      }
      return updated;
    });
  }, []);

  const handleSubmit = wrapHandler(async () => {
    if (!formData.name || !formData.phone || !formData.subscription_type) {
      alert('⚠️ برجاء ملء جميع الحقول المطلوبة');
      return;
    }
    await onSave(formData);
    cleanup();
  });
  
  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">✏️ تعديل بيانات العضو</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl">✕</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-gray-300 block mb-2">الاسم</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            />
          </div>
          
          <div>
            <label className="text-gray-300 block mb-2">التليفون</label>
            <input 
              type="text" 
              name="phone" 
              value={formData.phone} 
              onChange={handleChange} 
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none" 
            />
          </div>
          
          <div>
            <label className="text-gray-300 block mb-2">ملاحظات</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleChange} 
              rows="3" 
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" 
            />
          </div>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button onClick={handleSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition">
            💾 حفظ التعديلات
          </button>
          <button onClick={handleClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition">
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// 🎯 MAIN MEMBERS COMPONENT
// ═══════════════════════════════════════════════════════════

export default function MembersManagement() {
  const { members, loading, updateMember, deleteMember } = useMembers();
  const { cleanup, safeOperation, wrapHandler } = useCleanup();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           member.phone.includes(searchTerm) ||
                           String(member.custom_id || '').includes(searchTerm);
      
      if (filterStatus === 'all') return matchesSearch;
      
      const isExpired = new Date(member.subscription_end) < new Date();
      if (filterStatus === 'expired') return matchesSearch && isExpired;
      if (filterStatus === 'active') return matchesSearch && !isExpired;
      
      return matchesSearch;
    });
  }, [members, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => new Date(m.subscription_end) >= new Date()).length;
    const expired = total - active;
    return { total, active, expired };
  }, [members]);

  const handleViewDetails = useCallback((member) => {
    setSelectedMember(member);
    setShowDetailsModal(true);
  }, []);

  const handleEdit = useCallback((member) => {
    setSelectedMember(member);
    setShowEditModal(true);
    setShowDetailsModal(false);
  }, []);

  const handleDelete = wrapHandler(async (memberId) => {
    const confirmed = await safeOperation(() => 
      confirm('هل أنت متأكد من حذف هذا العضو؟')
    );
    
    if (confirmed) {
      try {
        const result = await deleteMember(memberId);
        if (result.success) {
          await safeOperation(() => alert('✅ تم حذف العضو بنجاح'));
        } else {
          await safeOperation(() => alert('❌ خطأ: ' + result.error));
        }
      } catch (error) {
        await safeOperation(() => alert('❌ خطأ: ' + error.message));
      }
    }
  });

  const handleSaveEdit = wrapHandler(async (formData) => {
    try {
      const result = await updateMember(selectedMember.id, formData);
      if (result.success) {
        await safeOperation(() => alert('✅ تم تحديث البيانات بنجاح'));
        setShowEditModal(false);
        setSelectedMember(null);
      } else {
        await safeOperation(() => alert('❌ خطأ: ' + result.error));
      }
    } catch (error) {
      await safeOperation(() => alert('❌ خطأ: ' + error.message));
    }
  });

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📋 إدارة المشتركين</h1>
          <p className="text-gray-400">عرض وتعديل وحذف بيانات الأعضاء</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="🔍 ابحث بالاسم أو رقم التليفون أو ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">جميع الأعضاء</option>
                <option value="active">الاشتراكات النشطة</option>
                <option value="expired">الاشتراكات المنتهية</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div className="text-center">
              <p className="text-gray-400 text-sm">إجمالي</p>
              <p className="text-white text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">نشط</p>
              <p className="text-green-400 text-2xl font-bold">{stats.active}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">منتهي</p>
              <p className="text-red-400 text-2xl font-bold">{stats.expired}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750">
                <tr>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">الاسم</th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">ID</th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">التليفون</th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">الحالة</th>
                  <th className="text-center py-4 px-4 text-gray-300 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-gray-400">لا يوجد أعضاء</td></tr>
                ) : (
                  filteredMembers.map((member) => {
                    const isExpired = new Date(member.subscription_end) < new Date();
                    return (
                      <tr key={member.id} className="border-t border-gray-700 hover:bg-gray-750 transition">
                        <td className="py-4 px-4 text-white font-medium">{member.name}</td>
                        <td className="py-4 px-4 text-blue-400 font-mono">{member.custom_id || member.id}</td>
                        <td className="py-4 px-4 text-gray-300">{member.phone}</td>
                        <td className="py-4 px-4">
                          {isExpired ? (
                            <span className="bg-red-900/50 text-red-400 px-3 py-1 rounded-full text-sm font-semibold">منتهي</span>
                          ) : (
                            <span className="bg-green-900/50 text-green-400 px-3 py-1 rounded-full text-sm font-semibold">نشط</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleViewDetails(member)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition text-sm">👁️</button>
                            <button onClick={() => handleEdit(member)} className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition text-sm">✏️</button>
                            <button onClick={() => handleDelete(member.id)} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition text-sm">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showDetailsModal && selectedMember && (
          <DetailsModal
            member={selectedMember}
            onClose={() => {
              setShowDetailsModal(false);
              cleanup();
            }}
            onEdit={() => {
              setShowDetailsModal(false);
              handleEdit(selectedMember);
            }}
          />
        )}

        {showEditModal && selectedMember && (
          <EditModal
            member={selectedMember}
            onClose={() => {
              setShowEditModal(false);
              cleanup();
            }}
            onSave={handleSaveEdit}
          />
        )}
      </div>
    </div>
  );
}