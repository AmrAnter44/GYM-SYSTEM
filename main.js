
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Database = require('better-sqlite3');

let mainWindow;
let db;
let dbManager;

// ═══════════════════════════════════════════════════════════
// 📊 DATABASE INITIALIZATION
// ═══════════════════════════════════════════════════════════

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'gym_database.db');
  console.log('📂 Database path:', dbPath);
  
  db = new Database(dbPath, { verbose: isDev ? console.log : null });

  // Performance optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = -10000');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');

  console.log('✅ Database initialized');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      custom_id TEXT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      photo TEXT,
      subscription_type TEXT,
      subscription_start TEXT,
      subscription_end TEXT,
      payment_type TEXT,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      notes TEXT,
      recordedBy TEXT,
      createdAt TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS pt_clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      custom_id TEXT,
      client_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      coach_name TEXT NOT NULL,
      total_sessions INTEGER DEFAULT 0,
      completed_sessions INTEGER DEFAULT 0,
      remaining_sessions INTEGER DEFAULT 0,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS inbody_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      service_price REAL DEFAULT 0,
      staff_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS dayuse_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      service_price REAL DEFAULT 0,
      staff_name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `);

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_members_name ON members(name)',
    'CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone)',
    'CREATE INDEX IF NOT EXISTS idx_members_custom_id ON members(custom_id)',
    'CREATE INDEX IF NOT EXISTS idx_visitors_name ON visitors(name)',
    'CREATE INDEX IF NOT EXISTS idx_pt_client_name ON pt_clients(client_name)',
    'CREATE INDEX IF NOT EXISTS idx_pt_custom_id ON pt_clients(custom_id)',
    'CREATE INDEX IF NOT EXISTS idx_inbody_client_name ON inbody_services(client_name)',
    'CREATE INDEX IF NOT EXISTS idx_dayuse_client_name ON dayuse_services(client_name)'
  ];

  indexes.forEach(sql => db.exec(sql));
  console.log('✅ Database tables and indexes created');

  return db;
}

// ═══════════════════════════════════════════════════════════
// 🚀 DATABASE MANAGER CLASS
// ═══════════════════════════════════════════════════════════

class DatabaseManager {
  constructor(database) {
    this.db = database;
  }

  // ═══ MEMBERS ═══
  getAllMembers() {
    try {
      return this.db.prepare('SELECT * FROM members ORDER BY created_at DESC').all();
    } catch (error) {
      console.error('Error getting members:', error);
      throw error;
    }
  }

  addMember(data) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO members (custom_id, name, phone, photo, subscription_type, subscription_start, 
          subscription_end, payment_type, total_amount, paid_amount, remaining_amount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        data.custom_id || null, data.name, data.phone, data.photo || null,
        data.subscriptionType, data.subscriptionStart, data.subscriptionEnd,
        data.paymentType, data.totalAmount || 0, data.paidAmount || 0,
        data.remainingAmount || 0, data.notes || ''
      );
      
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding member:', error);
      return { success: false, error: error.message };
    }
  }

  updateMember(id, data) {
    try {
      const fields = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      });
      
      values.push(id);
      const sql = `UPDATE members SET ${fields.join(', ')} WHERE id = ?`;
      
      this.db.prepare(sql).run(...values);
      return { success: true };
    } catch (error) {
      console.error('Error updating member:', error);
      return { success: false, error: error.message };
    }
  }

  deleteMember(id) {
    try {
      this.db.prepare('DELETE FROM members WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting member:', error);
      return { success: false, error: error.message };
    }
  }

  getHighestCustomId() {
    try {
      const result = this.db.prepare(`
        SELECT custom_id FROM members 
        WHERE custom_id IS NOT NULL AND custom_id != ''
        ORDER BY CAST(custom_id AS INTEGER) DESC 
        LIMIT 1
      `).get();
      
      return { success: true, highestId: result?.custom_id || null };
    } catch (error) {
      console.error('Error getting highest custom ID:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══ VISITORS ═══
  getAllVisitors() {
    try {
      return this.db.prepare('SELECT * FROM visitors ORDER BY createdAt DESC').all();
    } catch (error) {
      console.error('Error getting visitors:', error);
      throw error;
    }
  }

  addVisitor(data) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO visitors (name, phone, notes, recordedBy, createdAt) VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        data.name, data.phone, data.notes || '', data.recordedBy || '',
        data.createdAt || new Date().toISOString()
      );
      
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding visitor:', error);
      return { success: false, error: error.message };
    }
  }

  deleteVisitor(id) {
    try {
      this.db.prepare('DELETE FROM visitors WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting visitor:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══ PT CLIENTS ═══
  getAllPTClients() {
    try {
      return this.db.prepare('SELECT * FROM pt_clients ORDER BY created_at DESC').all();
    } catch (error) {
      console.error('Error getting PT clients:', error);
      throw error;
    }
  }

  addPTClient(data) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO pt_clients (custom_id, client_name, phone, coach_name, total_sessions, 
          completed_sessions, remaining_sessions, total_amount, paid_amount, remaining_amount, 
          start_date, end_date, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        data.custom_id || null, data.client_name, data.phone, data.coach_name,
        data.total_sessions || 0, data.completed_sessions || 0, data.remaining_sessions || 0,
        data.total_amount || 0, data.paid_amount || 0, data.remaining_amount || 0,
        data.start_date, data.end_date, data.notes || ''
      );
      
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding PT client:', error);
      return { success: false, error: error.message };
    }
  }

  updatePTClient(id, data) {
    try {
      const fields = [];
      const values = [];
      
      Object.keys(data).forEach(key => {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      });
      
      values.push(id);
      const sql = `UPDATE pt_clients SET ${fields.join(', ')} WHERE id = ?`;
      
      this.db.prepare(sql).run(...values);
      return { success: true };
    } catch (error) {
      console.error('Error updating PT client:', error);
      return { success: false, error: error.message };
    }
  }

  deletePTClient(id) {
    try {
      this.db.prepare('DELETE FROM pt_clients WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting PT client:', error);
      return { success: false, error: error.message };
    }
  }

  getHighestPTCustomId() {
    try {
      const result = this.db.prepare(`
        SELECT custom_id FROM pt_clients 
        WHERE custom_id IS NOT NULL AND custom_id != ''
        ORDER BY CAST(custom_id AS INTEGER) DESC 
        LIMIT 1
      `).get();
      
      return { success: true, highestId: result?.custom_id || null };
    } catch (error) {
      console.error('Error getting highest PT custom ID:', error);
      return { success: false, error: error.message };
    }
  }

  updatePTSession(id, completedSessions) {
    try {
      const client = this.db.prepare('SELECT * FROM pt_clients WHERE id = ?').get(id);
      if (!client) {
        return { success: false, error: 'Client not found' };
      }
      
      const remainingSessions = client.total_sessions - completedSessions;
      
      this.db.prepare(`
        UPDATE pt_clients 
        SET completed_sessions = ?, remaining_sessions = ? 
        WHERE id = ?
      `).run(completedSessions, remainingSessions, id);
      
      return { success: true };
    } catch (error) {
      console.error('Error updating PT session:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══ INBODY SERVICES ═══
  getAllInBodyServices() {
    try {
      return this.db.prepare('SELECT * FROM inbody_services ORDER BY created_at DESC').all();
    } catch (error) {
      console.error('Error getting InBody services:', error);
      throw error;
    }
  }

  addInBodyService(data) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO inbody_services (client_name, phone, service_price, staff_name, notes) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        data.client_name, data.phone, data.service_price || 0,
        data.staff_name, data.notes || ''
      );
      
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding InBody service:', error);
      return { success: false, error: error.message };
    }
  }

  deleteInBodyService(id) {
    try {
      this.db.prepare('DELETE FROM inbody_services WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting InBody service:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══ DAY USE SERVICES ═══
  getAllDayUseServices() {
    try {
      return this.db.prepare('SELECT * FROM dayuse_services ORDER BY created_at DESC').all();
    } catch (error) {
      console.error('Error getting Day Use services:', error);
      throw error;
    }
  }

  addDayUseService(data) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO dayuse_services (client_name, phone, service_price, staff_name, notes) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        data.client_name, data.phone, data.service_price || 0,
        data.staff_name, data.notes || ''
      );
      
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding Day Use service:', error);
      return { success: false, error: error.message };
    }
  }

  deleteDayUseService(id) {
    try {
      this.db.prepare('DELETE FROM dayuse_services WHERE id = ?').run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting Day Use service:', error);
      return { success: false, error: error.message };
    }
  }

  // ═══ STATISTICS ═══
  getStatistics() {
    try {
      const total = this.db.prepare('SELECT COUNT(*) as count FROM members').get().count;
      const revenue = this.db.prepare('SELECT SUM(paid_amount) as total FROM members').get().total || 0;
      return { totalMembers: total, totalRevenue: revenue };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  getOtherServicesStatistics() {
    try {
      const inbodyCount = this.db.prepare('SELECT COUNT(*) as count FROM inbody_services').get().count;
      const inbodyRevenue = this.db.prepare('SELECT SUM(service_price) as total FROM inbody_services').get().total || 0;
      const dayuseCount = this.db.prepare('SELECT COUNT(*) as count FROM dayuse_services').get().count;
      const dayuseRevenue = this.db.prepare('SELECT SUM(service_price) as total FROM dayuse_services').get().total || 0;

      return {
        inbody: { totalServices: inbodyCount, totalRevenue: inbodyRevenue },
        dayuse: { totalServices: dayuseCount, totalRevenue: dayuseRevenue },
        combined: { totalServices: inbodyCount + dayuseCount, totalRevenue: inbodyRevenue + dayuseRevenue }
      };
    } catch (error) {
      console.error('Error getting other services statistics:', error);
      throw error;
    }
  }

  close() {
    try {
      this.db.close();
      console.log('✅ Database closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 🪟 CREATE WINDOW WITH ENHANCED FOCUS MANAGEMENT
// ═══════════════════════════════════════════════════════════

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    // Window settings for better focus
    show: false,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'default',
    frame: true,
    resizable: true,
    center: true,
    focusable: true,
    alwaysOnTop: false
  });
const startURL = isDev
  ? 'http://localhost:4001'
  : `file://${path.join(__dirname, '../renderer/out/index.html')}`;
  // Load URL and show when ready
  mainWindow.loadURL(startURL).then(() => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) mainWindow.webContents.openDevTools();

  // ═══════════════════════════════════════════════════════════
  // ✅ ENHANCED FOCUS MANAGEMENT
  // ═══════════════════════════════════════════════════════════
  
  // Restore focus on window activation
  mainWindow.on('focus', () => {
    console.log('✅ Window focused');
    
    // Send focus event to renderer
    mainWindow.webContents.send('window-focused');
    
    // Execute JavaScript to ensure focus
    mainWindow.webContents.executeJavaScript(`
      // Enable all inputs
      document.body.style.pointerEvents = 'auto';
      document.body.style.userSelect = 'auto';
      
      // Find and focus first available input
      const inputs = document.querySelectorAll('input:not([disabled]), textarea:not([disabled])');
      if (inputs.length > 0) {
        inputs[0].focus();
      }
    `).catch(console.error);
  });

  mainWindow.on('blur', () => {
    console.log('Window blurred');
  });

  // Handle window ready
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('✅ Page loaded - ensuring focus');
    
    // Inject focus management script
    mainWindow.webContents.executeJavaScript(`
      // Global focus fix
      window.addEventListener('load', () => {
        document.body.style.pointerEvents = 'auto';
        document.body.style.userSelect = 'auto';
      });
      
      // Monitor for stuck states
      setInterval(() => {
        if (document.body.style.pointerEvents === 'none') {
          document.body.style.pointerEvents = 'auto';
        }
      }, 1000);
    `).catch(console.error);
  });

  // Prevent window hang
  mainWindow.on('unresponsive', () => {
    console.warn('⚠️ Window unresponsive - attempting recovery');
    mainWindow.reload();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ═══════════════════════════════════════════════════════════
// 📡 IPC HANDLERS - WITH ENHANCED WRAPPER
// ═══════════════════════════════════════════════════════════

// Enhanced wrapper with focus recovery
function createSafeHandler(handlerName, handler) {
  return async (event, ...args) => {
    console.log(`📡 Handling: ${handlerName}`);
    
    try {
      const result = await handler(...args);
      
      // ✅ ENHANCED: Force focus recovery after operation
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Use multiple methods to ensure focus
        process.nextTick(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
            
            // Also send JavaScript to ensure page is interactive
            mainWindow.webContents.executeJavaScript(`
              document.body.style.pointerEvents = 'auto';
              document.body.style.userSelect = 'auto';
              
              // Remove any stuck modals
              document.querySelectorAll('.fixed.inset-0').forEach(el => {
                if (!el.querySelector('input, button, textarea')) {
                  el.remove();
                }
              });
              
              // Restore focus to first input if available
              setTimeout(() => {
                const input = document.querySelector('input:not([disabled]), textarea:not([disabled])');
                if (input) input.focus();
              }, 100);
            `).catch(() => {});
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error(`❌ Error in ${handlerName}:`, error);
      return { success: false, error: error.message };
    }
  };
}

// Register all IPC handlers with enhanced wrapper
function registerIPCHandlers() {
  // MEMBERS
  ipcMain.handle('get-members', createSafeHandler('get-members', async () => {
    const data = dbManager.getAllMembers();
    return { success: true, data };
  }));

  ipcMain.handle('add-member', createSafeHandler('add-member', async (event, data) => {
    return dbManager.addMember(data);
  }));

  ipcMain.handle('update-member', createSafeHandler('update-member', async (event, id, data) => {
    return dbManager.updateMember(id, data);
  }));

  ipcMain.handle('delete-member', createSafeHandler('delete-member', async (event, id) => {
    return dbManager.deleteMember(id);
  }));

  ipcMain.handle('get-highest-custom-id', createSafeHandler('get-highest-custom-id', async () => {
    return dbManager.getHighestCustomId();
  }));

  // VISITORS
  ipcMain.handle('get-visitors', createSafeHandler('get-visitors', async () => {
    const data = dbManager.getAllVisitors();
    return { success: true, data };
  }));

  ipcMain.handle('add-visitor', createSafeHandler('add-visitor', async (event, data) => {
    return dbManager.addVisitor(data);
  }));

  ipcMain.handle('delete-visitor', createSafeHandler('delete-visitor', async (event, id) => {
    return dbManager.deleteVisitor(id);
  }));

  // PT CLIENTS
  ipcMain.handle('get-pt-clients', createSafeHandler('get-pt-clients', async () => {
    const data = dbManager.getAllPTClients();
    return { success: true, data };
  }));

  ipcMain.handle('add-pt-client', createSafeHandler('add-pt-client', async (event, data) => {
    return dbManager.addPTClient(data);
  }));

  ipcMain.handle('update-pt-client', createSafeHandler('update-pt-client', async (event, id, data) => {
    return dbManager.updatePTClient(id, data);
  }));

  ipcMain.handle('delete-pt-client', createSafeHandler('delete-pt-client', async (event, id) => {
    return dbManager.deletePTClient(id);
  }));

  ipcMain.handle('update-pt-session', createSafeHandler('update-pt-session', async (event, id, completedSessions) => {
    return dbManager.updatePTSession(id, completedSessions);
  }));

  ipcMain.handle('get-highest-pt-custom-id', createSafeHandler('get-highest-pt-custom-id', async () => {
    return dbManager.getHighestPTCustomId();
  }));

  // INBODY SERVICES
  ipcMain.handle('get-inbody-services', createSafeHandler('get-inbody-services', async () => {
    const data = dbManager.getAllInBodyServices();
    return { success: true, data };
  }));

  ipcMain.handle('add-inbody-service', createSafeHandler('add-inbody-service', async (event, data) => {
    return dbManager.addInBodyService(data);
  }));

  ipcMain.handle('delete-inbody-service', createSafeHandler('delete-inbody-service', async (event, id) => {
    return dbManager.deleteInBodyService(id);
  }));

  // DAY USE SERVICES
  ipcMain.handle('get-dayuse-services', createSafeHandler('get-dayuse-services', async () => {
    const data = dbManager.getAllDayUseServices();
    return { success: true, data };
  }));

  ipcMain.handle('add-dayuse-service', createSafeHandler('add-dayuse-service', async (event, data) => {
    return dbManager.addDayUseService(data);
  }));

  ipcMain.handle('delete-dayuse-service', createSafeHandler('delete-dayuse-service', async (event, id) => {
    return dbManager.deleteDayUseService(id);
  }));

  // STATISTICS
  ipcMain.handle('get-statistics', createSafeHandler('get-statistics', async () => {
    const data = dbManager.getStatistics();
    return { success: true, data };
  }));

  ipcMain.handle('get-other-services-statistics', createSafeHandler('get-other-services-statistics', async () => {
    const data = dbManager.getOtherServicesStatistics();
    return { success: true, data };
  }));
}

// ═══════════════════════════════════════════════════════════
// 🚀 APP LIFECYCLE
// ═══════════════════════════════════════════════════════════

app.on('ready', () => {
  console.log('🚀 App is ready');
  db = initializeDatabase();
  dbManager = new DatabaseManager(db);
  registerIPCHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (dbManager) dbManager.close();
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', () => {
  console.log('👋 App is quitting...');
  if (dbManager) {
    try {
      dbManager.close();
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
});