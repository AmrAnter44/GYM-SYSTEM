// ═══════════════════════════════════════════════════════════
// preload.js - Secure Bridge between Renderer and Main
// مع دعم PT (Personal Training) و Data Folder
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
  // 📊 STATISTICS
  // ═══════════════════════════════════════════════════════════
  getStatistics: () => ipcRenderer.invoke('get-statistics'),

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
console.log('📡 Available APIs: Members, Visitors, PT Clients, Statistics, Database, Exports');