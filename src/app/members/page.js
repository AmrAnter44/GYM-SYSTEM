"use client";
import { useState, useEffect } from 'react';

export default function MembersManagement() {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, expired
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.phone.includes(searchTerm)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(member => {
        const isExpired = new Date(member.subscriptionEnd) < new Date();
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

const handleDelete = async (memberId) => {
  if (confirm('هل أنت متأكد من حذف هذا العضو؟')) {
    try {
      const result = await window.electronAPI.deleteMember(memberId);
      if (result.success) {
        setMembers(members.filter(m => m.id !== memberId));
        alert('✅ تم حذف العضو بنجاح');
      } else {
        alert('❌ خطأ: ' + result.error);
      }
    } catch (error) {
      alert('❌ خطأ في الحذف: ' + error.message);
    }
  }
};

  const handleRenewSubscription = (member) => {
    alert(`تجديد اشتراك: ${member.name}`);
    // يمكن فتح modal للتجديد
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

  const isExpired = (endDate) => {
    return new Date(endDate) < new Date();
  };

  const getDaysRemaining = (endDate) => {
    const today = new Date();
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
            <div className="text-center">
              <p className="text-gray-400 text-sm">إجمالي</p>
              <p className="text-white text-2xl font-bold">{members.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">نشط</p>
              <p className="text-green-400 text-2xl font-bold">
                {members.filter(m => !isExpired(m.subscriptionEnd)).length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">منتهي</p>
              <p className="text-red-400 text-2xl font-bold">
                {members.filter(m => isExpired(m.subscriptionEnd)).length}
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
                    const expired = isExpired(member.subscriptionEnd);
                    const daysLeft = getDaysRemaining(member.subscriptionEnd);
                    
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
                        <td className="py-4 px-4 text-gray-300">{member.subscriptionType}</td>
                        <td className="py-4 px-4">
                          <div>
                            <p className="text-white">{member.subscriptionEnd}</p>
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
                          <span className={`font-bold ${member.remainingAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                            {member.remainingAmount} ج.م
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
                    <p className="text-white font-semibold">{selectedMember.subscriptionType}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">نوع الدفع</p>
                    <p className="text-white font-semibold">{selectedMember.paymentType}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">تاريخ البداية</p>
                    <p className="text-white font-semibold">{selectedMember.subscriptionStart}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">تاريخ النهاية</p>
                    <p className="text-white font-semibold">{selectedMember.subscriptionEnd}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">إجمالي المبلغ</p>
                    <p className="text-white font-semibold">{selectedMember.totalAmount} ج.م</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">المبلغ المدفوع</p>
                    <p className="text-green-400 font-semibold">{selectedMember.paidAmount} ج.م</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">المبلغ المتبقي</p>
                    <p className={`font-semibold ${selectedMember.remainingAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {selectedMember.remainingAmount} ج.م
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">تاريخ التسجيل</p>
                    <p className="text-white font-semibold">{selectedMember.createdAt}</p>
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
                >
                  تعديل البيانات
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}