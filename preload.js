const { contextBridge, ipcRenderer } = require('electron');

/**
 * Gym Management System - Preload Script
 * يربط بين React frontend و Electron backend بشكل آمن
 */

contextBridge.exposeInMainWorld('electronAPI', {
  // ═══════════════════════════════════════════════════════════
  // 👥 MEMBERS APIs
  // ═══════════════════════════════════════════════════════════

  /**
   * إضافة عضو جديد
   * @param {Object} memberData - بيانات العضو
   * @returns {Promise<Object>} - {success, id, message}
   */
  addMember: (memberData) => ipcRenderer.invoke('add-member', memberData),

  /**
   * جلب جميع الأعضاء
   * @returns {Promise<Object>} - {success, data}
   */
  getMembers: () => ipcRenderer.invoke('get-members'),

  /**
   * تحديث بيانات عضو
   * @param {Number} memberId - رقم العضو
   * @param {Object} memberData - البيانات الجديدة
   * @returns {Promise<Object>} - {success, changes, message}
   */
  updateMember: (memberId, memberData) => 
    ipcRenderer.invoke('update-member', memberId, memberData),

  /**
   * حذف عضو
   * @param {Number} memberId - رقم العضو
   * @returns {Promise<Object>} - {success, message}
   */
  deleteMember: (memberId) => 
    ipcRenderer.invoke('delete-member', memberId),

  /**
   * تصدير الأعضاء إلى Excel
   * @param {Object} filters - فلاتر البحث {status, searchTerm}
   * @returns {Promise<Object>} - {success, filePath, count, message}
   */
  exportMembersToExcel: (filters) => 
    ipcRenderer.invoke('export-members-to-excel', filters),

  // ═══════════════════════════════════════════════════════════
  // 🚶 VISITORS APIs
  // ═══════════════════════════════════════════════════════════

  /**
   * إضافة زائر جديد
   * @param {Object} visitorData - بيانات الزائر {name, phone, notes, recordedBy}
   * @returns {Promise<Object>} - {success, id, message}
   */
  addVisitor: (visitorData) => 
    ipcRenderer.invoke('add-visitor', visitorData),

  /**
   * جلب جميع الزوار
   * @returns {Promise<Object>} - {success, data}
   */
  getVisitors: () => 
    ipcRenderer.invoke('get-visitors'),

  /**
   * حذف زائر
   * @param {Number} visitorId - رقم الزائر
   * @returns {Promise<Object>} - {success, message}
   */
  deleteVisitor: (visitorId) => 
    ipcRenderer.invoke('delete-visitor', visitorId),

  /**
   * تصدير الزوار إلى Excel
   * @param {Object} filters - فلاتر البحث {searchTerm}
   * @returns {Promise<Object>} - {success, filePath, count, message}
   */
  exportVisitorsToExcel: (filters) => 
    ipcRenderer.invoke('export-visitors-to-excel', filters),

  // ═══════════════════════════════════════════════════════════
  // 🔧 UTILITY APIs (إضافية للمستقبل)
  // ═══════════════════════════════════════════════════════════

  /**
   * فتح مجلد Downloads
   */
  openDownloadsFolder: () => 
    ipcRenderer.invoke('open-downloads-folder'),

  /**
   * طباعة تقرير
   * @param {Object} reportData - بيانات التقرير
   */
  printReport: (reportData) => 
    ipcRenderer.invoke('print-report', reportData),

  /**
   * أخذ نسخة احتياطية من قاعدة البيانات
   */
  backupDatabase: () => 
    ipcRenderer.invoke('backup-database'),
});

console.log('✅ Preload script loaded successfully');
console.log('📡 electronAPI exposed to renderer process');