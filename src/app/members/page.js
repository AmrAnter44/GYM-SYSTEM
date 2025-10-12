"use client";
import { useState, useCallback, useMemo, Suspense, lazy } from 'react';
import { useMembers, useDebounce, useFilteredMembers, TableSkeleton, LoadingSpinner } from '../../hooks/optimizedHooks';

// Lazy load modals



export default function MembersManagement() {
  const { members, loading, reload, updateMember, deleteMember } = useMembers();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  // Debounced search
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Filtered and memoized members
  const filteredMembers = useFilteredMembers(members, debouncedSearch, filterStatus);

  // Memoized stats
  const stats = useMemo(() => {
    const total = members.length;
    const active = members.filter(m => {
      const endDate = m.subscription_end || m.subscriptionEnd;
      return endDate && new Date(endDate) >= new Date();
    }).length;
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
  }, []);

  const handleDelete = useCallback(async (memberId) => {
    if (confirm('هل أنت متأكد من حذف هذا العضو؟')) {
      try {
        const result = await deleteMember(memberId);
        if (result.success) {
          alert('✅ تم حذف العضو بنجاح');
        } else {
          alert('❌ خطأ: ' + result.error);
        }
      } catch (error) {
        alert('❌ خطأ في الحذف: ' + error.message);
      }
    }
  }, [deleteMember]);

  const handleRenewSubscription = useCallback((member) => {
    setSelectedMember(member);
    setShowRenewModal(true);
  }, []);

  const handleExportToExcel = useCallback(async () => {
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
  }, [filterStatus, searchTerm]);

  const isExpired = useCallback((member) => {
    const endDate = member.subscription_end || member.subscriptionEnd;
    return new Date(endDate) < new Date();
  }, []);

  const getDaysRemaining = useCallback((member) => {
    const today = new Date();
    const endDate = member.subscription_end || member.subscriptionEnd;
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  // Memoized table rows
  const MemberRow = useCallback(({ member }) => {
    const expired = isExpired(member);
    const daysLeft = getDaysRemaining(member);
    const subType = member.subscription_type || member.subscriptionType;
    const subEnd = member.subscription_end || member.subscriptionEnd;
    const remaining = member.remaining_amount || member.remainingAmount || 0;
    
    return (
      <tr className="border-t border-gray-700 hover:bg-gray-750 transition">
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {member.name.charAt(0)}
            </div>
            <span className="text-white font-medium">{member.name}</span>
          </div>
        </td>
        <td className="py-4 px-4 text-blue-400 font-mono font-bold">
          {member.custom_id || member.id}
        </td>
        <td className="py-4 px-4 text-gray-300">{member.phone}</td>
        <td className="py-4 px-4 text-gray-300">{subType}</td>
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
  }, [handleViewDetails, handleEdit, handleDelete, handleRenewSubscription, isExpired, getDaysRemaining]);

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

        {/* Members Table */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <TableSkeleton rows={10} />
            ) : (
              <table className="w-full">
                <thead className="bg-gray-750">
                  <tr>
                    <th className="text-right py-4 px-4 text-gray-300 font-semibold">الاسم</th>
                    <th className="text-right py-4 px-4 text-gray-300 font-semibold">ID</th>
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
                      <td colSpan="8" className="text-center py-8 text-gray-400">
                        لا يوجد أعضاء
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member) => (
                      <MemberRow key={member.id} member={member} />
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modals with Lazy Loading */}
        <Suspense fallback={<LoadingSpinner />}>
          {showDetailsModal && selectedMember && (
            <DetailsModal
              member={selectedMember}
              onClose={() => setShowDetailsModal(false)}
              onEdit={() => {
                setShowDetailsModal(false);
                handleEdit(selectedMember);
              }}
            />
          )}

          {showEditModal && selectedMember && (
            <EditModal
              member={selectedMember}
              onClose={() => setShowEditModal(false)}
              onSave={async (data) => {
                const result = await updateMember(selectedMember.id, data);
                if (result.success) {
                  alert('✅ تم تحديث البيانات بنجاح');
                  setShowEditModal(false);
                } else {
                  alert('❌ خطأ: ' + result.error);
                }
              }}
            />
          )}

          {showRenewModal && selectedMember && (
            <RenewModal
              member={selectedMember}
              onClose={() => setShowRenewModal(false)}
              onRenew={async () => {
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

                const result = await updateMember(selectedMember.id, {
                  subscriptionStart: today,
                  subscriptionEnd: newEndDate
                });

                if (result.success) {
                  alert(`✅ تم تجديد الاشتراك حتى ${newEndDate}`);
                  setShowRenewModal(false);
                }
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}