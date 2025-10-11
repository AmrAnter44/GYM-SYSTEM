// ═══════════════════════════════════════════════════════════
// preload.js - Secure Bridge between Renderer and Main
// ═══════════════════════════════════════════════════════════

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // ═══ MEMBERS ═══
  getMembers: () => ipcRenderer.invoke('get-members'),
  searchMembers: (searchTerm) => ipcRenderer.invoke('search-members', searchTerm),
  getMember: (id) => ipcRenderer.invoke('get-member', id),
  addMember: (memberData) => ipcRenderer.invoke('add-member', memberData),
  updateMember: (id, data) => ipcRenderer.invoke('update-member', id, data),
  deleteMember: (id) => ipcRenderer.invoke('delete-member', id),

  // ═══ VISITORS ═══
  getVisitors: () => ipcRenderer.invoke('get-visitors'),
  addVisitor: (visitorData) => ipcRenderer.invoke('add-visitor', visitorData),
  deleteVisitor: (id) => ipcRenderer.invoke('delete-visitor', id),

  // ═══ STATISTICS ═══
  getStatistics: () => ipcRenderer.invoke('get-statistics'),

  // ═══ DATABASE ═══
  optimizeDatabase: () => ipcRenderer.invoke('optimize-database'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),

  // ═══ EXPORTS ═══
  exportMembersToExcel: (filters) => ipcRenderer.invoke('export-members-to-excel', filters),
  exportVisitorsToExcel: (filters) => ipcRenderer.invoke('export-visitors-to-excel', filters),
  exportFinancialReport: () => ipcRenderer.invoke('export-financial-report'),
});

console.log('✅ Preload script loaded successfully');