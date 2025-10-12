// ═══════════════════════════════════════════════════════════
// main.js - Electron Main Process with better-sqlite3
// مع دعم PT (Personal Training)
// ═══════════════════════════════════════════════════════════

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const Database = require('better-sqlite3');

let mainWindow;
let db;
let dbManager;

// ═══════════════════════════════════════════════════════════
// 📊 DATABASE INITIALIZATION WITH OPTIMIZATIONS
// ═══════════════════════════════════════════════════════════

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'gym_database.db');
  console.log('📂 Database path:', dbPath);
  
  // Create database connection
  db = new Database(dbPath, {
    verbose: isDev ? console.log : null // Log SQL queries in development only
  });

  // ═══ PERFORMANCE OPTIMIZATIONS ═══
  
  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  
  // Increase cache size (10MB)
  db.pragma('cache_size = -10000');
  
  // Synchronous mode for better performance
  db.pragma('synchronous = NORMAL');
  
  // Temporary storage in memory
  db.pragma('temp_store = MEMORY');
  
  // Memory-mapped I/O (30GB)
  db.pragma('mmap_size = 30000000000');
  
  // Auto vacuum
  db.pragma('auto_vacuum = INCREMENTAL');

  console.log('✅ Database pragmas configured');

  // ═══ CREATE TABLES ═══
  
  // Members table
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

  // Visitors table
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

  // PT Clients table (NEW!)
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

  console.log('✅ Database tables created');

  // ═══ CREATE INDEXES FOR FAST QUERIES ═══
  
  const indexes = [
    // Members indexes
    'CREATE INDEX IF NOT EXISTS idx_members_name ON members(name)',
    'CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone)',
    'CREATE INDEX IF NOT EXISTS idx_members_custom_id ON members(custom_id)',
    'CREATE INDEX IF NOT EXISTS idx_members_subscription_end ON members(subscription_end)',
    'CREATE INDEX IF NOT EXISTS idx_members_created_at ON members(created_at)',
    
    // Visitors indexes
    'CREATE INDEX IF NOT EXISTS idx_visitors_name ON visitors(name)',
    'CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitors(phone)',
    'CREATE INDEX IF NOT EXISTS idx_visitors_created_at ON visitors(createdAt)',
    
    // PT Clients indexes (NEW!)
    'CREATE INDEX IF NOT EXISTS idx_pt_client_name ON pt_clients(client_name)',
    'CREATE INDEX IF NOT EXISTS idx_pt_phone ON pt_clients(phone)',
    'CREATE INDEX IF NOT EXISTS idx_pt_coach ON pt_clients(coach_name)',
    'CREATE INDEX IF NOT EXISTS idx_pt_custom_id ON pt_clients(custom_id)',
    'CREATE INDEX IF NOT EXISTS idx_pt_end_date ON pt_clients(end_date)',
    'CREATE INDEX IF NOT EXISTS idx_pt_created_at ON pt_clients(created_at)'
  ];

  indexes.forEach(sql => db.exec(sql));

  console.log('✅ Database indexes created successfully');

  // Run ANALYZE for query optimization
  db.exec('ANALYZE');

  return db;
}

// ═══════════════════════════════════════════════════════════
// 🚀 OPTIMIZED DATABASE MANAGER CLASS
// ═══════════════════════════════════════════════════════════

class DatabaseManager {
  constructor(database) {
    this.db = database;
    this.preparedStatements = {};
    this.initializePreparedStatements();
  }

  initializePreparedStatements() {
    // ═══ MEMBERS ═══
    this.preparedStatements.getAllMembers = this.db.prepare(`
      SELECT * FROM members ORDER BY created_at DESC
    `);

    this.preparedStatements.searchMembers = this.db.prepare(`
      SELECT * FROM members 
      WHERE name LIKE ? OR phone LIKE ? OR custom_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    this.preparedStatements.getMemberById = this.db.prepare(`
      SELECT * FROM members WHERE id = ?
    `);

    this.preparedStatements.getExpiringMembers = this.db.prepare(`
      SELECT * FROM members 
      WHERE subscription_end BETWEEN date('now') AND date('now', '+7 days')
      ORDER BY subscription_end ASC
    `);

    this.preparedStatements.getActiveMembersCount = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM members 
      WHERE subscription_end >= date('now')
    `);

    this.preparedStatements.getExpiredMembersCount = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM members 
      WHERE subscription_end < date('now')
    `);

    this.preparedStatements.insertMember = this.db.prepare(`
      INSERT INTO members (
        custom_id, name, phone, photo, 
        subscription_type, subscription_start, subscription_end,
        payment_type, total_amount, paid_amount, remaining_amount, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.preparedStatements.deleteMember = this.db.prepare(`
      DELETE FROM members WHERE id = ?
    `);

    // ═══ VISITORS ═══
    this.preparedStatements.getAllVisitors = this.db.prepare(`
      SELECT * FROM visitors ORDER BY createdAt DESC
    `);

    this.preparedStatements.insertVisitor = this.db.prepare(`
      INSERT INTO visitors (name, phone, notes, recordedBy, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    this.preparedStatements.deleteVisitor = this.db.prepare(`
      DELETE FROM visitors WHERE id = ?
    `);

    // ═══ PT CLIENTS (NEW!) ═══
    this.preparedStatements.getAllPTClients = this.db.prepare(`
      SELECT * FROM pt_clients ORDER BY created_at DESC
    `);

    this.preparedStatements.getPTClientById = this.db.prepare(`
      SELECT * FROM pt_clients WHERE id = ?
    `);

    this.preparedStatements.searchPTClients = this.db.prepare(`
      SELECT * FROM pt_clients 
      WHERE client_name LIKE ? OR phone LIKE ? OR coach_name LIKE ? OR custom_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    this.preparedStatements.insertPTClient = this.db.prepare(`
      INSERT INTO pt_clients (
        custom_id, client_name, phone, coach_name,
        total_sessions, completed_sessions, remaining_sessions,
        total_amount, paid_amount, remaining_amount,
        start_date, end_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.preparedStatements.deletePTClient = this.db.prepare(`
      DELETE FROM pt_clients WHERE id = ?
    `);

    this.preparedStatements.updatePTSessions = this.db.prepare(`
      UPDATE pt_clients 
      SET completed_sessions = ?, remaining_sessions = ?
      WHERE id = ?
    `);

    console.log('✅ Prepared statements initialized');
  }

  // ═══════════════════════════════════════════════════════════
  // 👥 MEMBERS OPERATIONS
  // ═══════════════════════════════════════════════════════════

  getAllMembers() {
    try {
      return this.preparedStatements.getAllMembers.all();
    } catch (error) {
      console.error('Error getting all members:', error);
      throw error;
    }
  }

  searchMembers(searchTerm, limit = 100) {
    try {
      const search = `%${searchTerm}%`;
      return this.preparedStatements.searchMembers.all(search, search, searchTerm, limit);
    } catch (error) {
      console.error('Error searching members:', error);
      throw error;
    }
  }

  getMemberById(id) {
    try {
      return this.preparedStatements.getMemberById.get(id);
    } catch (error) {
      console.error('Error getting member by ID:', error);
      throw error;
    }
  }

  addMember(memberData) {
    try {
      const result = this.preparedStatements.insertMember.run(
        memberData.custom_id || null,
        memberData.name,
        memberData.phone,
        memberData.photo || null,
        memberData.subscriptionType,
        memberData.subscriptionStart,
        memberData.subscriptionEnd,
        memberData.paymentType,
        memberData.totalAmount || 0,
        memberData.paidAmount || 0,
        memberData.remainingAmount || 0,
        memberData.notes || ''
      );
      
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
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
      const stmt = this.db.prepare(sql);
      stmt.run(...values);

      return { success: true };
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  }

  deleteMember(id) {
    try {
      this.preparedStatements.deleteMember.run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 👥 VISITORS OPERATIONS
  // ═══════════════════════════════════════════════════════════

  getAllVisitors() {
    try {
      return this.preparedStatements.getAllVisitors.all();
    } catch (error) {
      console.error('Error getting all visitors:', error);
      throw error;
    }
  }

  addVisitor(visitorData) {
    try {
      const result = this.preparedStatements.insertVisitor.run(
        visitorData.name,
        visitorData.phone,
        visitorData.notes || '',
        visitorData.recordedBy || '',
        visitorData.createdAt || new Date().toISOString()
      );

      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding visitor:', error);
      throw error;
    }
  }

  deleteVisitor(id) {
    try {
      this.preparedStatements.deleteVisitor.run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting visitor:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 💪 PT CLIENTS OPERATIONS (NEW!)
  // ═══════════════════════════════════════════════════════════

  getAllPTClients() {
    try {
      return this.preparedStatements.getAllPTClients.all();
    } catch (error) {
      console.error('Error getting all PT clients:', error);
      throw error;
    }
  }

  getPTClientById(id) {
    try {
      return this.preparedStatements.getPTClientById.get(id);
    } catch (error) {
      console.error('Error getting PT client by ID:', error);
      throw error;
    }
  }

  searchPTClients(searchTerm, limit = 100) {
    try {
      const search = `%${searchTerm}%`;
      return this.preparedStatements.searchPTClients.all(
        search, search, search, searchTerm, limit
      );
    } catch (error) {
      console.error('Error searching PT clients:', error);
      throw error;
    }
  }

  addPTClient(data) {
    try {
      const result = this.preparedStatements.insertPTClient.run(
        data.custom_id || null,
        data.client_name,
        data.phone,
        data.coach_name,
        data.total_sessions || 0,
        data.completed_sessions || 0,
        data.remaining_sessions || 0,
        data.total_amount || 0,
        data.paid_amount || 0,
        data.remaining_amount || 0,
        data.start_date,
        data.end_date,
        data.notes || ''
      );
      
      return { success: true, id: result.lastInsertRowid };
    } catch (error) {
      console.error('Error adding PT client:', error);
      throw error;
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
      const stmt = this.db.prepare(sql);
      stmt.run(...values);

      return { success: true };
    } catch (error) {
      console.error('Error updating PT client:', error);
      throw error;
    }
  }

  deletePTClient(id) {
    try {
      this.preparedStatements.deletePTClient.run(id);
      return { success: true };
    } catch (error) {
      console.error('Error deleting PT client:', error);
      throw error;
    }
  }

  updatePTSession(id, completedSessions) {
    try {
      const client = this.preparedStatements.getPTClientById.get(id);
      if (!client) {
        throw new Error('PT Client not found');
      }

      const remaining = client.total_sessions - completedSessions;
      this.preparedStatements.updatePTSessions.run(completedSessions, remaining, id);

      return { success: true };
    } catch (error) {
      console.error('Error updating PT session:', error);
      throw error;
    }
  }

  // Get PT Statistics
  getPTStatistics() {
    try {
      const total = this.db.prepare('SELECT COUNT(*) as count FROM pt_clients').get().count;
      
      const active = this.db.prepare(`
        SELECT COUNT(*) as count FROM pt_clients 
        WHERE end_date >= date('now')
      `).get().count;
      
      const totalRevenue = this.db.prepare(`
        SELECT SUM(paid_amount) as total FROM pt_clients
      `).get().total || 0;
      
      const pending = this.db.prepare(`
        SELECT SUM(remaining_amount) as total FROM pt_clients
      `).get().total || 0;

      const totalSessions = this.db.prepare(`
        SELECT SUM(total_sessions) as total FROM pt_clients
      `).get().total || 0;

      const completedSessions = this.db.prepare(`
        SELECT SUM(completed_sessions) as total FROM pt_clients
      `).get().total || 0;

      return {
        totalClients: total,
        activeClients: active,
        totalRevenue: totalRevenue,
        pendingPayments: pending,
        totalSessions: totalSessions,
        completedSessions: completedSessions,
        remainingSessions: totalSessions - completedSessions
      };
    } catch (error) {
      console.error('Error getting PT statistics:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 GENERAL STATISTICS
  // ═══════════════════════════════════════════════════════════

  getStatistics() {
    try {
      const total = this.db.prepare('SELECT COUNT(*) as count FROM members').get().count;
      const active = this.preparedStatements.getActiveMembersCount.get().count;
      const expired = this.preparedStatements.getExpiredMembersCount.get().count;
      
      const revenue = this.db.prepare('SELECT SUM(paid_amount) as total FROM members').get().total || 0;
      const pending = this.db.prepare('SELECT SUM(remaining_amount) as total FROM members').get().total || 0;

      return {
        totalMembers: total,
        activeMembers: active,
        expiredMembers: expired,
        totalRevenue: revenue,
        pendingPayments: pending
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🔧 BATCH OPERATIONS
  // ═══════════════════════════════════════════════════════════

  batchInsertMembers(members) {
    const insertMany = this.db.transaction((membersArray) => {
      for (const member of membersArray) {
        this.preparedStatements.insertMember.run(
          member.custom_id || null,
          member.name,
          member.phone,
          member.photo || null,
          member.subscription_type,
          member.subscription_start,
          member.subscription_end,
          member.payment_type,
          member.total_amount || 0,
          member.paid_amount || 0,
          member.remaining_amount || 0,
          member.notes || ''
        );
      }
    });

    try {
      insertMany(members);
      return { success: true, count: members.length };
    } catch (error) {
      console.error('Batch insert error:', error);
      throw error;
    }
  }

  batchInsertPTClients(clients) {
    const insertMany = this.db.transaction((clientsArray) => {
      for (const client of clientsArray) {
        this.preparedStatements.insertPTClient.run(
          client.custom_id || null,
          client.client_name,
          client.phone,
          client.coach_name,
          client.total_sessions || 0,
          client.completed_sessions || 0,
          client.remaining_sessions || 0,
          client.total_amount || 0,
          client.paid_amount || 0,
          client.remaining_amount || 0,
          client.start_date,
          client.end_date,
          client.notes || ''
        );
      }
    });

    try {
      insertMany(clients);
      return { success: true, count: clients.length };
    } catch (error) {
      console.error('Batch insert PT clients error:', error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🔧 OPTIMIZATION & MAINTENANCE
  // ═══════════════════════════════════════════════════════════

  optimizeDatabase() {
    try {
      console.log('🔧 Running database optimization...');
      
      this.db.exec('ANALYZE');
      this.db.exec('PRAGMA incremental_vacuum');
      this.db.exec('PRAGMA optimize');

      console.log('✅ Database optimized successfully');
      return { success: true };
    } catch (error) {
      console.error('Error optimizing database:', error);
      throw error;
    }
  }

  backupDatabase(backupPath) {
    try {
      const backup = this.db.backup(backupPath);
      backup.step(-1);
      backup.finish();
      
      console.log('✅ Database backup created:', backupPath);
      return { success: true, path: backupPath };
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  close() {
    try {
      this.db.close();
      console.log('✅ Database closed successfully');
    } catch (error) {
      console.error('Error closing database:', error);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// 🪟 CREATE BROWSER WINDOW
// ═══════════════════════════════════════════════════════════

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const startURL = isDev
    ? 'http://localhost:4001'
    : `file://${path.join(__dirname, 'out/index.html')}`;

  mainWindow.loadURL(startURL);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ═══════════════════════════════════════════════════════════
// 📡 IPC HANDLERS
// ═══════════════════════════════════════════════════════════

// ═══ MEMBERS ═══

ipcMain.handle('get-members', async () => {
  try {
    const members = dbManager.getAllMembers();
    return { success: true, data: members };
  } catch (error) {
    console.error('IPC Error - get-members:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('search-members', async (event, searchTerm) => {
  try {
    const members = dbManager.searchMembers(searchTerm);
    return { success: true, data: members };
  } catch (error) {
    console.error('IPC Error - search-members:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-member', async (event, id) => {
  try {
    const member = dbManager.getMemberById(id);
    return { success: true, data: member };
  } catch (error) {
    console.error('IPC Error - get-member:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-member', async (event, memberData) => {
  try {
    const result = dbManager.addMember(memberData);
    return result;
  } catch (error) {
    console.error('IPC Error - add-member:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-member', async (event, id, data) => {
  try {
    const result = dbManager.updateMember(id, data);
    return result;
  } catch (error) {
    console.error('IPC Error - update-member:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-member', async (event, id) => {
  try {
    const result = dbManager.deleteMember(id);
    return result;
  } catch (error) {
    console.error('IPC Error - delete-member:', error);
    return { success: false, error: error.message };
  }
});

// ═══ VISITORS ═══

ipcMain.handle('get-visitors', async () => {
  try {
    const visitors = dbManager.getAllVisitors();
    return { success: true, data: visitors };
  } catch (error) {
    console.error('IPC Error - get-visitors:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-visitor', async (event, visitorData) => {
  try {
    const result = dbManager.addVisitor(visitorData);
    return result;
  } catch (error) {
    console.error('IPC Error - add-visitor:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-visitor', async (event, id) => {
  try {
    const result = dbManager.deleteVisitor(id);
    return result;
  } catch (error) {
    console.error('IPC Error - delete-visitor:', error);
    return { success: false, error: error.message };
  }
});

// ═══ PT CLIENTS (NEW!) ═══

ipcMain.handle('get-pt-clients', async () => {
  try {
    const clients = dbManager.getAllPTClients();
    return { success: true, data: clients };
  } catch (error) {
    console.error('IPC Error - get-pt-clients:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-pt-client', async (event, id) => {
  try {
    const client = dbManager.getPTClientById(id);
    return { success: true, data: client };
  } catch (error) {
    console.error('IPC Error - get-pt-client:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('search-pt-clients', async (event, searchTerm) => {
  try {
    const clients = dbManager.searchPTClients(searchTerm);
    return { success: true, data: clients };
  } catch (error) {
    console.error('IPC Error - search-pt-clients:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-pt-client', async (event, data) => {
  try {
    const result = dbManager.addPTClient(data);
    return result;
  } catch (error) {
    console.error('IPC Error - add-pt-client:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-pt-client', async (event, id, data) => {
  try {
    const result = dbManager.updatePTClient(id, data);
    return result;
  } catch (error) {
    console.error('IPC Error - update-pt-client:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-pt-client', async (event, id) => {
  try {
    const result = dbManager.deletePTClient(id);
    return result;
  } catch (error) {
    console.error('IPC Error - delete-pt-client:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-pt-session', async (event, id, completedSessions) => {
  try {
    const result = dbManager.updatePTSession(id, completedSessions);
    return result;
  } catch (error) {
    console.error('IPC Error - update-pt-session:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-pt-statistics', async () => {
  try {
    const stats = dbManager.getPTStatistics();
    return { success: true, data: stats };
  } catch (error) {
    console.error('IPC Error - get-pt-statistics:', error);
    return { success: false, error: error.message };
  }
});

// ═══ STATISTICS ═══

ipcMain.handle('get-statistics', async () => {
  try {
    const stats = dbManager.getStatistics();
    return { success: true, data: stats };
  } catch (error) {
    console.error('IPC Error - get-statistics:', error);
    return { success: false, error: error.message };
  }
});

// ═══ DATABASE OPERATIONS ═══

ipcMain.handle('optimize-database', async () => {
  try {
    const result = dbManager.optimizeDatabase();
    return result;
  } catch (error) {
    console.error('IPC Error - optimize-database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup-database', async () => {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupPath = path.join(app.getPath('documents'), 'Gym Backups', `gym_backup_${timestamp}.db`);
    
    // Create backup folder if not exists
    const backupDir = path.join(app.getPath('documents'), 'Gym Backups');
    const fs = require('fs');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const result = dbManager.backupDatabase(backupPath);
    return result;
  } catch (error) {
    console.error('IPC Error - backup-database:', error);
    return { success: false, error: error.message };
  }
});

// Open data folder
ipcMain.handle('open-data-folder', async () => {
  try {
    const userDataPath = app.getPath('userData');
    await shell.openPath(userDataPath);
    return { success: true, path: userDataPath };
  } catch (error) {
    console.error('Error opening data folder:', error);
    return { success: false, error: error.message };
  }
});

// Get database path
ipcMain.handle('get-database-path', async () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'gym_database.db');
    return { success: true, path: dbPath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══ EXPORT TO EXCEL (Placeholder) ═══

ipcMain.handle('export-members-to-excel', async (event, filters) => {
  try {
    return { 
      success: false, 
      message: 'Excel export not implemented yet. Install exceljs to enable this feature.' 
    };
  } catch (error) {
    console.error('IPC Error - export-members-to-excel:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-visitors-to-excel', async (event, filters) => {
  try {
    return { 
      success: false, 
      message: 'Excel export not implemented yet.' 
    };
  } catch (error) {
    console.error('IPC Error - export-visitors-to-excel:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-pt-clients-to-excel', async (event, filters) => {
  try {
    return { 
      success: false, 
      message: 'Excel export not implemented yet.' 
    };
  } catch (error) {
    console.error('IPC Error - export-pt-clients-to-excel:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-financial-report', async () => {
  try {
    return { 
      success: false, 
      message: 'Financial report export not implemented yet.' 
    };
  } catch (error) {
    console.error('IPC Error - export-financial-report:', error);
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════════
// 🔧 SCHEDULED OPTIMIZATION
// ═══════════════════════════════════════════════════════════

function scheduleOptimization() {
  const now = new Date();
  const nextRun = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    3, 0, 0, 0
  );
  const timeout = nextRun.getTime() - now.getTime();

  setTimeout(() => {
    console.log('🔧 Running scheduled database optimization...');
    try {
      dbManager.optimizeDatabase();
      console.log('✅ Scheduled optimization completed');
    } catch (error) {
      console.error('❌ Scheduled optimization failed:', error);
    }
    scheduleOptimization();
  }, timeout);

  console.log(`⏰ Next optimization scheduled for: ${nextRun.toLocaleString()}`);
}

// ═══════════════════════════════════════════════════════════
// 🚀 APP LIFECYCLE
// ═══════════════════════════════════════════════════════════

app.on('ready', () => {
  console.log('🚀 App is ready');
  
  db = initializeDatabase();
  dbManager = new DatabaseManager(db);
  
  createWindow();
  scheduleOptimization();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (dbManager) {
      dbManager.close();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
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

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = {
  db,
  dbManager,
  initializeDatabase,
  DatabaseManager
};