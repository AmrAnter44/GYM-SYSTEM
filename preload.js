const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveMember: (memberData) => ipcRenderer.invoke('save-member', memberData),
  getMembers: () => ipcRenderer.invoke('get-members'),
  getMember: (memberId) => ipcRenderer.invoke('get-member', memberId),
  updateMember: (memberId, memberData) => ipcRenderer.invoke('update-member', memberId, memberData),
  deleteMember: (memberId) => ipcRenderer.invoke('delete-member', memberId),
  searchMembers: (searchTerm) => ipcRenderer.invoke('search-members', searchTerm),
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  exportMembersToExcel: (filters) => ipcRenderer.invoke('export-members-to-excel', filters),
  exportFinancialReport: () => ipcRenderer.invoke('export-financial-report'),
  getNextMemberId: () => ipcRenderer.invoke('get-next-member-id'), // ← السطر الجديد
});