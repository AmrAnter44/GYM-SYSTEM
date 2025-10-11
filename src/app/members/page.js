"use client";
import { useState, useEffect } from 'react';

export default function MembersManagement() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [editFormData, setEditFormData] = useState(null);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [searchTerm, filterStatus, members]);

  const loadMembers = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        console.log('Loading members from database...');
        const result = await window.electronAPI.getMembers();
        console.log('Members loaded:', result);
        
        if (result.success) {
          setMembers(result.data);
        } else {
          console.error('Error:', result.error);
        }
      } catch (error) {
        console.error('Error loading members:', error);
      }
    }
  };

const filterMembers = () => {
  let filtered = members;

  // Search filter - دعم الحقول المختلفة
  if (searchTerm) {
    filtered = filtered.filter(member => {
      const name = member.name || '';
      const phone = member.phone || '';
      const searchLower = searchTerm.toLowerCase();
      
      return name.toLowerCase().includes(searchLower) || 
             phone.includes(searchTerm);
    });
  }

  // Status filter - دعم الحقول المختلفة
  if (filterStatus !== 'all') {
    filtered = filtered.filter(member => {
      const endDate = member.subscription_end || member.subscriptionEnd;
      if (!endDate) return false;
      
      const isExpired = new Date(endDate) < new Date();
      
      if (filterStatus === 'active') return !isExpired;
      if (filterStatus === 'expired') return isExpired;
      return true;
    });
  }

  setFilteredMembers(filtered);
};

  const handleViewDetails = (member) => {
    setSelectedMember(member);
    setShowDetailsModal(true);
  };

  const handleEdit = (member) => {
    setSelectedMember(member);
    setEditFormData({...member});
    setShowEditModal(true);
  };

  const handleDelete = async (memberId) => {
    if (confirm('هل أنت متأكد من حذف هذا العضو؟')) {
      try {
        const result = await window.electronAPI.deleteMember(memberId);
        if (result.success) {
          loadMembers(); // إعادة تحميل القائمة
          alert('✅ تم حذف العضو بنجاح');
        } else {
          alert('❌ خطأ: ' + result.error);
        }
      } catch (error) {
        alert('❌ خطأ في الحذف: ' + error.message);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.updateMember(editFormData.id, {
          name: editFormData.name,
          phone: editFormData.phone,
          photo: editFormData.photo,
          subscriptionType: editFormData.subscription_type,
          subscriptionStart: editFormData.subscription_start,
          subscriptionEnd: editFormData.subscription_end,
          paymentType: editFormData.payment_type,
          totalAmount: parseFloat(editFormData.total_amount) || 0,
          paidAmount: parseFloat(editFormData.paid_amount) || 0,
          remainingAmount: parseFloat(editFormData.remaining_amount) || 0,
          notes: editFormData.notes || ''
        });

        if (result.success) {
          alert('✅ تم تحديث البيانات بنجاح');
          loadMembers();
          setShowEditModal(false);
        } else {
          alert('❌ خطأ: ' + result.error);
        }
      }
    } catch (error) {
      alert('❌ خطأ: ' + error.message);
    }
  };

  const handleRenewSubscription = (member) => {
    setSelectedMember(member);
    setShowRenewModal(true);
  };

  const handleRenew = async () => {
    if (!selectedMember) return;

    const today = new Date().toISOString().split('T')[0];
    const subType = selectedMember.subscription_type || selectedMember.subscriptionType;
    let months = 1;
    
    switch(subType) {
      case '3شهور': months = 3; break;
      case '6شهور': months = 6; break;
      case 'سنوي': months = 12; break;
      default: months = 1;
    }

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    const newEndDate = endDate.toISOString().split('T')[0];

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.updateMember(selectedMember.id, {
          name: selectedMember.name,
          phone: selectedMember.phone,
          photo: selectedMember.photo,
          subscriptionType: subType,
          subscriptionStart: today,
          subscriptionEnd: newEndDate,
          paymentType: selectedMember.payment_type || selectedMember.paymentType,
          totalAmount: selectedMember.total_amount || selectedMember.totalAmount,
          paidAmount: selectedMember.paid_amount || selectedMember.paidAmount,
          remainingAmount: selectedMember.remaining_amount || selectedMember.remainingAmount,
          notes: selectedMember.notes || ''
        });

        if (result.success) {
          alert(`✅ تم تجديد الاشتراك حتى ${newEndDate}`);
          loadMembers();
          setShowRenewModal(false);
        }
      }
    } catch (error) {
      alert('❌ خطأ: ' + error.message);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const filters = {
        status: filterStatus,
        searchTerm: searchTerm
      };

      const result = await window.electronAPI.exportMembersToExcel(filters);
      
      if (result.success) {
        alert(`✅ تم تصدير ${result.count} عضو بنجاح!\n\nالملف: ${result.filePath}`);
      } else {
        alert('❌ فشل التصدير: ' + (result.message || result.error));
      }
    } catch (error) {
      alert('❌ خطأ في التصدير: ' + error.message);
    }
  };

  const isExpired = (member) => {
    const endDate = member.subscription_end || member.subscriptionEnd;
    return new Date(endDate) < new Date();
  };

  const getDaysRemaining = (member) => {
    const today = new Date();
    const endDate = member.subscription_end || member.subscriptionEnd;
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">📋 إدارة المشتركين</h1>
          <p className="text-gray-400">عرض وتعديل وحذف بيانات الأعضاء</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="🔍 ابحث بالاسم أو رقم التليفون..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
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

          {/* Export Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <button
              onClick={handleExportToExcel}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2"
            >
              <span className="text-xl">📊</span>
              <span>تصدير إلى Excel</span>
            </button>

            <button
              onClick={() => window.location.href = '/add-member'}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2"
            >
              <span className="text-xl">➕</span>
              <span>إضافة عضو جديد</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
            <div className="text-center">
              <p className="text-gray-400 text-sm">إجمالي</p>
              <p className="text-white text-2xl font-bold">{members.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">نشط</p>
              <p className="text-green-400 text-2xl font-bold">
                {members.filter(m => !isExpired(m)).length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">منتهي</p>
              <p className="text-red-400 text-2xl font-bold">
                {members.filter(m => isExpired(m)).length}
              </p>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-750">
                <tr>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">الاسم</th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">التليفون</th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">نوع الاشتراك</th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">نهاية الاشتراك</th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">الحالة</th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">المتبقي</th>
                  <th className="text-center py-4 px-4 text-gray-300 font-semibold">الإجراءات</th>
                  <th className="text-right py-4 px-4 text-gray-300 font-semibold">ID</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-gray-400">
                      لا يوجد أعضاء
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => {
                    const expired = isExpired(member);
                    const daysLeft = getDaysRemaining(member);
                    const subType = member.subscription_type || member.subscriptionType;
                    const subEnd = member.subscription_end || member.subscriptionEnd;
                    const remaining = member.remaining_amount || member.remainingAmount || 0;
                    
                    return (
                      <tr key={member.id} className="border-t border-gray-700 hover:bg-gray-750 transition">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {member.name.charAt(0)}
                            </div>
                            <span className="text-white font-medium">{member.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-300">{member.phone}</td>
                        <td className="py-4 px-4 text-gray-300">{subType}</td>
                        <td className="py-4 px-4 text-gray-300 font-mono font-bold">
                            {member.custom_id || member.id}
                          </td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-white">{subEnd}</p>
                            {!expired && (
                              <p className="text-xs text-gray-400">
                                {daysLeft > 0 ? `باقي ${daysLeft} يوم` : 'ينتهي اليوم'}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          {expired ? (
                            <span className="bg-red-900/50 text-red-400 px-3 py-1 rounded-full text-sm font-semibold">
                              منتهي ⚠️
                            </span>
                          ) : daysLeft <= 7 ? (
                            <span className="bg-yellow-900/50 text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold">
                              قريب الانتهاء ⏰
                            </span>
                          ) : (
                            <span className="bg-green-900/50 text-green-400 px-3 py-1 rounded-full text-sm font-semibold">
                              نشط ✅
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-bold ${remaining > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {remaining} ج.م
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetails(member)}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition text-sm"
                              title="عرض التفاصيل"
                            >
                              👁️
                            </button>

                            <button
                              onClick={() => handleEdit(member)}
                              className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition text-sm"
                              title="تعديل"
                            >
                              ✏️
                            </button>
                            
                            {expired && (
                              <button
                                onClick={() => handleRenewSubscription(member)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition text-sm"
                                title="تجديد الاشتراك"
                              >
                                🔄
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDelete(member.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition text-sm"
                              title="حذف"
                            >
                              🗑️
                            </button>
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

        {/* Details Modal */}
        {showDetailsModal && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-2xl w-full p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">تفاصيل العضو</h2>
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
                    <p className="text-white font-semibold">{selectedMember.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">رقم التليفون</p>
                    <p className="text-white font-semibold">{selectedMember.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">نوع الاشتراك</p>
                    <p className="text-white font-semibold">{selectedMember.subscription_type || selectedMember.subscriptionType}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">نوع الدفع</p>
                    <p className="text-white font-semibold">{selectedMember.payment_type || selectedMember.paymentType}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">تاريخ البداية</p>
                    <p className="text-white font-semibold">{selectedMember.subscription_start || selectedMember.subscriptionStart}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">تاريخ النهاية</p>
                    <p className="text-white font-semibold">{selectedMember.subscription_end || selectedMember.subscriptionEnd}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">إجمالي المبلغ</p>
                    <p className="text-white font-semibold">{selectedMember.total_amount || selectedMember.totalAmount} ج.م</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">المبلغ المدفوع</p>
                    <p className="text-green-400 font-semibold">{selectedMember.paid_amount || selectedMember.paidAmount} ج.م</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">المبلغ المتبقي</p>
                    <p className={`font-semibold ${(selectedMember.remaining_amount || selectedMember.remainingAmount) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {selectedMember.remaining_amount || selectedMember.remainingAmount} ج.م
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">تاريخ التسجيل</p>
                    <p className="text-white font-semibold">{selectedMember.created_at || selectedMember.createdAt}</p>
                  </div>
                </div>

                {selectedMember.notes && (
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-gray-400 text-sm mb-2">ملاحظات</p>
                    <p className="text-white bg-gray-750 p-3 rounded">{selectedMember.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEdit(selectedMember);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  تعديل البيانات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editFormData && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gray-800 rounded-xl max-w-3xl w-full p-8 border border-gray-700 my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">✏️ تعديل بيانات العضو</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-white text-3xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">الاسم</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">رقم التليفون</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">نوع الاشتراك</label>
                    <select
                      value={editFormData.subscription_type}
                      onChange={(e) => setEditFormData({...editFormData, subscription_type: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="شهري">شهري</option>
                      <option value="3شهور">3 شهور</option>
                      <option value="6شهور">6 شهور</option>
                      <option value="سنوي">سنوي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">نوع الدفع</label>
                    <select
                      value={editFormData.payment_type}
                      onChange={(e) => setEditFormData({...editFormData, payment_type: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="كاش">كاش</option>
                      <option value="فيزا">فيزا</option>
                      <option value="انستباي">انستباي</option>
                      <option value="تحويل بنكي">تحويل بنكي</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">تاريخ البداية</label>
                    <input
                      type="date"
                      value={editFormData.subscription_start}
                      onChange={(e) => setEditFormData({...editFormData, subscription_start: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">تاريخ النهاية</label>
                    <input
                      type="date"
                      value={editFormData.subscription_end}
                      onChange={(e) => setEditFormData({...editFormData, subscription_end: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">إجمالي المبلغ</label>
                    <input
                      type="number"
                      value={editFormData.total_amount}
                      onChange={(e) => {
                        const total = parseFloat(e.target.value) || 0;
                        setEditFormData({
                          ...editFormData, 
                          total_amount: total,
                          remaining_amount: total - editFormData.paid_amount
                        });
                      }}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-semibold">المبلغ المدفوع</label>
                    <input
                      type="number"
                      value={editFormData.paid_amount}
                      onChange={(e) => {
                        const paid = parseFloat(e.target.value) || 0;
                        setEditFormData({
                          ...editFormData,
                          paid_amount: paid,
                          remaining_amount: editFormData.total_amount - paid
                        });
                      }}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-300 mb-2 font-semibold">المبلغ المتبقي</label>
                    <input
                      type="number"
                      value={editFormData.remaining_amount}
                      readOnly
                      className={`w-full px-4 py-3 border border-gray-600 rounded-lg text-white font-bold cursor-not-allowed ${
                        editFormData.remaining_amount > 0 ? 'bg-red-900/50' : 'bg-green-900/50'
                      }`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-300 mb-2 font-semibold">ملاحظات</label>
                    <textarea
                      value={editFormData.notes || ''}
                      onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                      rows="3"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  💾 حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Renew Modal */}
        {showRenewModal && selectedMember && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl max-w-md w-full p-8 border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">🔄 تجديد الاشتراك</h2>
                <button
                  onClick={() => setShowRenewModal(false)}
                  className="text-gray-400 hover:text-white text-3xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gray-750 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm mb-2">العضو</p>
                  <p className="text-white text-xl font-bold">{selectedMember.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-750 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">نوع الاشتراك</p>
                    <p className="text-white font-semibold">{selectedMember.subscription_type || selectedMember.subscriptionType}</p>
                  </div>
                  <div className="bg-gray-750 p-3 rounded-lg">
                    <p className="text-gray-400 text-xs mb-1">الاشتراك القديم انتهى</p>
                    <p className="text-red-400 font-semibold">{selectedMember.subscription_end || selectedMember.subscriptionEnd}</p>
                  </div>
                </div>

                <div className="bg-green-900/20 border border-green-600 p-4 rounded-lg">
                  <p className="text-green-400 text-sm mb-2">📅 الاشتراك الجديد</p>
                  <p className="text-white">
                    <span className="font-bold">من اليوم</span> حتى 
                    <span className="font-bold text-green-400 mr-1">
                      {(() => {
                        const endDate = new Date();
                        let months = 1;
                        const subType = selectedMember.subscription_type || selectedMember.subscriptionType;
                        switch(subType) {
                          case '3شهور': months = 3; break;
                          case '6شهور': months = 6; break;
                          case 'سنوي': months = 12; break;
                        }
                        endDate.setMonth(endDate.getMonth() + months);
                        return endDate.toISOString().split('T')[0];
                      })()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRenewModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleRenew}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
                >
                  ✅ تأكيد التجديد
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}