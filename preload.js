// ═══════════════════════════════════════════════════════════
// preload.js - Secure Bridge between Renderer and Main
// مع دعم PT + InBody + Day Use + Auto ID
// ═══════════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // ═══════════════════════════════════════════════════════════
  // 👥 MEMBERS
  // ═══════════════════════════════════════════════════════════
  getMembers: () => ipcRenderer.invoke('get-members'),
  searchMembers: (searchTerm) => ipcRenderer.invoke('search-members', searchTerm),
  getMember: (id) => ipcRenderer.invoke('get-member', id),
  addMember: (memberData) => ipcRenderer.invoke('add-member', memberData),
  updateMember: (id, data) => ipcRenderer.invoke('update-member', id, data),
  deleteMember: (id) => ipcRenderer.invoke('delete-member', id),

  // ═══════════════════════════════════════════════════════════
  // 🆔 AUTO ID (NEW!)
  // ═══════════════════════════════════════════════════════════
  getHighestCustomId: () => ipcRenderer.invoke('get-highest-custom-id'),
  getHighestPTCustomId: () => ipcRenderer.invoke('get-highest-pt-custom-id'),

  // ═══════════════════════════════════════════════════════════
  // 👥 VISITORS
  // ═══════════════════════════════════════════════════════════
  getVisitors: () => ipcRenderer.invoke('get-visitors'),
  addVisitor: (visitorData) => ipcRenderer.invoke('add-visitor', visitorData),
  deleteVisitor: (id) => ipcRenderer.invoke('delete-visitor', id),

  // ═══════════════════════════════════════════════════════════
  // 💪 PT CLIENTS (Personal Training)
  // ═══════════════════════════════════════════════════════════
  getPTClients: () => ipcRenderer.invoke('get-pt-clients'),
  getPTClient: (id) => ipcRenderer.invoke('get-pt-client', id),
  searchPTClients: (searchTerm) => ipcRenderer.invoke('search-pt-clients', searchTerm),
  addPTClient: (data) => ipcRenderer.invoke('add-pt-client', data),
  updatePTClient: (id, data) => ipcRenderer.invoke('update-pt-client', id, data),
  deletePTClient: (id) => ipcRenderer.invoke('delete-pt-client', id),
  updatePTSession: (id, completedSessions) => ipcRenderer.invoke('update-pt-session', id, completedSessions),
  getPTStatistics: () => ipcRenderer.invoke('get-pt-statistics'),

  // ═══════════════════════════════════════════════════════════
  // 📊 INBODY SERVICES
  // ═══════════════════════════════════════════════════════════
  getInBodyServices: () => ipcRenderer.invoke('get-inbody-services'),
  addInBodyService: (data) => ipcRenderer.invoke('add-inbody-service', data),
  deleteInBodyService: (id) => ipcRenderer.invoke('delete-inbody-service', id),
  searchInBodyServices: (searchTerm) => ipcRenderer.invoke('search-inbody-services', searchTerm),

  // ═══════════════════════════════════════════════════════════
  // 🏃 DAY USE SERVICES
  // ═══════════════════════════════════════════════════════════
  getDayUseServices: () => ipcRenderer.invoke('get-dayuse-services'),
  addDayUseService: (data) => ipcRenderer.invoke('add-dayuse-service', data),
  deleteDayUseService: (id) => ipcRenderer.invoke('delete-dayuse-service', id),
  searchDayUseServices: (searchTerm) => ipcRenderer.invoke('search-dayuse-services', searchTerm),
  
  // ═══════════════════════════════════════════════════════════
  // 📊 STATISTICS
  // ═══════════════════════════════════════════════════════════
  getStatistics: () => ipcRenderer.invoke('get-statistics'),
  getOtherServicesStatistics: () => ipcRenderer.invoke('get-other-services-statistics'),

  // ═══════════════════════════════════════════════════════════
  // 🗄️ DATABASE OPERATIONS
  // ═══════════════════════════════════════════════════════════
  optimizeDatabase: () => ipcRenderer.invoke('optimize-database'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
  getDatabasePath: () => ipcRenderer.invoke('get-database-path'),

  // ═══════════════════════════════════════════════════════════
  // 📤 EXPORTS
  // ═══════════════════════════════════════════════════════════
  exportMembersToExcel: (filters) => ipcRenderer.invoke('export-members-to-excel', filters),
  exportVisitorsToExcel: (filters) => ipcRenderer.invoke('export-visitors-to-excel', filters),
  exportPTClientsToExcel: (filters) => ipcRenderer.invoke('export-pt-clients-to-excel', filters),
  exportFinancialReport: () => ipcRenderer.invoke('export-financial-report'),
});

console.log('✅ Preload script loaded successfully');
console.log('📡 Available APIs:');
console.log('   - Members (إدارة المشتركين) ✅');
console.log('   - Auto ID (رقم تلقائي) ✅ NEW!');
console.log('   - Visitors (الزائرين) ✅');
console.log('   - PT Clients (التدريب الشخصي) ✅');
console.log('   - InBody Services (خدمات InBody) ✅');
console.log('   - Day Use Services (خدمات Day Use) ✅');
console.log('   - Statistics (الإحصائيات) ✅');
console.log('   - Database Operations (إدارة قاعدة البيانات) ✅');
console.log('   - Export Functions (التصدير) ✅');