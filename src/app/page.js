"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMembers, LoadingSpinner } from '../hooks/optimizedHooks';

export default function Dashboard() {
  const { members, loading } = useMembers();

  // Memoized statistics
  const stats = useMemo(() => {
    if (!members.length) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        expiredMembers: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        todayJoins: 0
      };
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let activeCount = 0;
    let expiredCount = 0;
    let totalRevenue = 0;
    let pendingPayments = 0;
    let todayJoins = 0;
    
    members.forEach(member => {
      const endDate = member.subscription_end || member.subscriptionEnd;
      const isExpired = new Date(endDate) < today;
      
      if (isExpired) {
        expiredCount++;
      } else {
        activeCount++;
      }
      
      // Calculate revenue
      const paidAmount = parseFloat(member.paid_amount || member.paidAmount || 0);
      const remainingAmount = parseFloat(member.remaining_amount || member.remainingAmount || 0);
      
      totalRevenue += paidAmount;
      pendingPayments += remainingAmount;
      
      // Calculate today's joins
      const createdAt = (member.created_at || member.createdAt || '').split('T')[0];
      if (createdAt === todayStr) {
        todayJoins++;
      }
    });
    
    return {
      totalMembers: members.length,
      activeMembers: activeCount,
      expiredMembers: expiredCount,
      totalRevenue: totalRevenue,
      pendingPayments: pendingPayments,
      todayJoins: todayJoins
    };
  }, [members]);

  // Memoized recent members (top 3)
  const recentMembers = useMemo(() => {
    return members.slice(0, 3);
  }, [members]);

  const handleExportFinancialReport = useCallback(async () => {
    try {
      const result = await window.electronAPI.exportFinancialReport();
      
      if (result.success) {
        alert(`✅ تم تصدير التقرير المالي بنجاح!\n\nالملف: ${result.filePath}`);
      } else {
        alert('❌ فشل التصدير: ' + (result.message || result.error));
      }
    } catch (error) {
      alert('❌ خطأ في التصدير: ' + error.message);
    }
  }, []);

  const StatCard = useCallback(({ icon, title, value, subtitle, color }) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-6 shadow-lg transform transition hover:scale-105`}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-4xl">{icon}</div>
        <div className="text-right">
          <h3 className="text-white text-sm font-medium opacity-90">{title}</h3>
          <p className="text-white text-3xl font-bold mt-1">{value}</p>
        </div>
      </div>
      {subtitle && (
        <div className="text-white text-xs opacity-75 mt-2">
          {subtitle}
        </div>
      )}
    </div>
  ), []);

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
          <h1 className="text-4xl font-bold text-white mb-2">🏋️ لوحة التحكم</h1>
          <p className="text-gray-400">نظرة عامة على الجيم</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon="👥"
            title="إجمالي الأعضاء"
            value={stats.totalMembers}
            subtitle="عضو مسجل"
            color="from-blue-600 to-blue-700"
          />
          
          <StatCard
            icon="✅"
            title="الاشتراكات النشطة"
            value={stats.activeMembers}
            subtitle={stats.totalMembers > 0 ? `${((stats.activeMembers / stats.totalMembers) * 100).toFixed(0)}% من الإجمالي` : '0% من الإجمالي'}
            color="from-green-600 to-green-700"
          />
          
          <StatCard
            icon="⚠️"
            title="اشتراكات منتهية"
            value={stats.expiredMembers}
            subtitle="يحتاج تجديد"
            color="from-red-600 to-red-700"
          />
          
          <StatCard
            icon="💰"
            title="إجمالي الإيرادات"
            value={`${stats.totalRevenue.toLocaleString()} ج.م`}
            subtitle="الشهر الحالي"
            color="from-purple-600 to-purple-700"
          />
          
          <StatCard
            icon="⏳"
            title="مدفوعات معلقة"
            value={`${stats.pendingPayments.toLocaleString()} ج.م`}
            subtitle="مستحقات متأخرة"
            color="from-orange-600 to-orange-700"
          />
          
          <StatCard
            icon="🎉"
            title="انضموا اليوم"
            value={stats.todayJoins}
            subtitle="عضو جديد"
            color="from-cyan-600 to-cyan-700"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">⚡ إجراءات سريعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => window.location.href = '/add-member'}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
            >
              <span className="text-2xl">➕</span>
              <span>إضافة عضو جديد</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/members'}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
            >
              <span className="text-2xl">📋</span>
              <span>إدارة الأعضاء</span>
            </button>
            
            <button 
              onClick={handleExportFinancialReport}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
            >
              <span className="text-2xl">📊</span>
              <span>تصدير تقرير مالي</span>
            </button>

            <button 
              onClick={() => window.location.href = '/visitors'}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 transform hover:scale-105"
            >
              <span className="text-2xl">👥</span>
              <span>الزائرين</span>
            </button>
          </div>
        </div>

        {/* Recent Members */}
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">👤 آخر الأعضاء المسجلين</h2>
          
          {recentMembers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-400">لا يوجد أعضاء مسجلين بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">الاسم</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">التليفون</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">نهاية الاشتراك</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">المتبقي</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMembers.map((member) => {
                    const isExpired = new Date(member.subscription_end || member.subscriptionEnd) < new Date();
                    const hasPending = (member.remaining_amount || member.remainingAmount) > 0;
                    
                    return (
                      <tr key={member.id} className="border-b border-gray-700 hover:bg-gray-750 transition">
                        <td className="py-3 px-4 text-white">{member.name}</td>
                        <td className="py-3 px-4 text-gray-300">{member.phone}</td>
                        <td className="py-3 px-4 text-gray-300">{member.subscription_end || member.subscriptionEnd}</td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${hasPending ? 'text-red-400' : 'text-green-400'}`}>
                            {member.remaining_amount || member.remainingAmount} ج.م
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isExpired ? (
                            <span className="bg-red-900/50 text-red-400 px-3 py-1 rounded-full text-sm">
                              منتهي
                            </span>
                          ) : (
                            <span className="bg-green-900/50 text-green-400 px-3 py-1 rounded-full text-sm">
                              نشط
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 text-center">
            <button 
              onClick={() => window.location.href = '/members'}
              className="text-blue-400 hover:text-blue-300 font-semibold transition"
            >
              عرض جميع الأعضاء ←
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}