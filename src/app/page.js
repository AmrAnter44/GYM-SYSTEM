"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useMembers, LoadingSpinner } from '../hooks/optimizedHooks';
import MemberCheckScanner from './MemberCheckScanner';

export default function Dashboard() {
  const { members, loading } = useMembers();

  const stats = useMemo(() => {
    if (!members.length) {
      return { totalMembers: 0, activeMembers: 0, expiredMembers: 0, totalRevenue: 0, pendingPayments: 0, todayJoins: 0 };
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let activeCount = 0, expiredCount = 0, totalRevenue = 0, pendingPayments = 0, todayJoins = 0;
    
    members.forEach(member => {
      const endDate = new Date(member.subscription_end || member.subscriptionEnd);
      if (endDate < today) expiredCount++; else activeCount++;
      
      totalRevenue += parseFloat(member.paid_amount || 0);
      pendingPayments += parseFloat(member.remaining_amount || 0);
      
      const createdAt = (member.created_at || '').split('T')[0];
      if (createdAt === todayStr) todayJoins++;
    });
    
    return { totalMembers: members.length, activeMembers: activeCount, expiredMembers: expiredCount, totalRevenue, pendingPayments, todayJoins };
  }, [members]);

  const StatCard = useCallback(({ icon, title, value, subtitle, color }) => (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-6 shadow-lg transform transition hover:scale-105`}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-4xl">{icon}</div>
        <div className="text-right">
          <h3 className="text-white text-sm font-medium opacity-90">{title}</h3>
          <p className="text-white text-3xl font-bold mt-1">{value}</p>
        </div>
      </div>
      {subtitle && <div className="text-white text-xs opacity-75 mt-2">{subtitle}</div>}
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🏋️ لوحة التحكم</h1>
          <p className="text-gray-400">نظرة عامة على الجيم</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard icon="👥" title="إجمالي الأعضاء" value={stats.totalMembers} subtitle="عضو مسجل" color="from-blue-600 to-blue-700" />
          <StatCard icon="✅" title="الاشتراكات النشطة" value={stats.activeMembers} subtitle={`${stats.totalMembers > 0 ? ((stats.activeMembers / stats.totalMembers) * 100).toFixed(0) : 0}% من الإجمالي`} color="from-green-600 to-green-700" />
          <StatCard icon="⚠️" title="اشتراكات منتهية" value={stats.expiredMembers} subtitle="يحتاج تجديد" color="from-red-600 to-red-700" />
          <StatCard icon="💰" title="إجمالي الإيرادات" value={`${stats.totalRevenue.toLocaleString()} ج.م`} subtitle="الشهر الحالي" color="from-purple-600 to-purple-700" />
          <StatCard icon="⏳" title="مدفوعات معلقة" value={`${stats.pendingPayments.toLocaleString()} ج.م`} subtitle="مستحقات متأخرة" color="from-orange-600 to-orange-700" />
          <StatCard icon="🎉" title="انضموا اليوم" value={stats.todayJoins} subtitle="عضو جديد" color="from-cyan-600 to-cyan-700" />
        </div>

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">⚡ إجراءات سريعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button onClick={() => window.location.href = '/add-member'} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 transform hover:scale-105">
              <span className="text-2xl">➕</span>
              <span>إضافة عضو جديد</span>
            </button>
            <button onClick={() => window.location.href = '/members'} className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 transform hover:scale-105">
              <span className="text-2xl">📋</span>
              <span>إدارة الأعضاء</span>
            </button>
            <button onClick={() => window.location.href = '/visitors'} className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-4 px-6 rounded-lg transition shadow-lg flex items-center justify-center gap-2 transform hover:scale-105">
              <span className="text-2xl">👥</span>
              <span>الزائرين</span>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Add MemberCheckScanner ONLY on Dashboard */}
      <MemberCheckScanner />
    </div>
  );
}