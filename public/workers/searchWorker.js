// public/workers/searchWorker.js
// ═══════════════════════════════════════════════════════════
// 🔍 WEB WORKER FOR FAST MEMBER SEARCH
// ═══════════════════════════════════════════════════════════

self.onmessage = function(e) {
  const { members, searchTerm } = e.data;
  
  try {
    const searchLower = searchTerm.toLowerCase();
    
    // البحث بالـ ID أو الاسم
    const result = members.find(m => {
      const matchId = String(m.id) === searchTerm || String(m.custom_id) === searchTerm;
      const matchName = (m.name || '').toLowerCase().includes(searchLower);
      const matchPhone = (m.phone || '').includes(searchTerm);
      
      return matchId || matchName || matchPhone;
    });
    
    self.postMessage({
      success: true,
      result: result || null
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    });
  }
};