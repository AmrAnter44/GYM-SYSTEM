// ═══════════════════════════════════════════════════════════
// main.js - Electron Main Process with better-sqlite3
// مع دعم PT + InBody + Day Use
// ═══════════════════════════════════════════════════════════

const { app, BrowserWindow, ipcMain, shell } = require('electron');
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
  
  db = new Database(dbPath, {
    verbose: isDev ? console.log : null
  });

  // Performance optimizations
  db.pragma('journal_mode = WAL');
  db.pragma('cache_size = -10000');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('mmap_size = 30000000000');
  db.pragma('auto_vacuum = INCREMENTAL');

  console.log('✅ Database pragmas configured');

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

  console.log('✅ Database tables created');

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_members_name ON members(name)',
    'CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone)',
    'CREATE INDEX IF NOT EXISTS idx_members_custom_id ON members(custom_id)',
    'CREATE INDEX IF NOT EXISTS idx_visitors_name ON visitors(name)',
    'CREATE INDEX IF NOT EXISTS idx_pt_client_name ON pt_clients(client_name)',
    'CREATE INDEX IF NOT EXISTS idx_inbody_client_name ON inbody_services(client_name)',
    'CREATE INDEX IF NOT EXISTS idx_dayuse_client_name ON dayuse_services(client_name)'
  ];

  indexes.forEach(sql => db.exec(sql));
  db.exec('ANALYZE');

  console.log('✅ Database indexes created');

  return db;
}

// ═══════════════════════════════════════════════════════════
// 🚀 DATABASE MANAGER CLASS
// ═══════════════════════════════════════════════════════════

class DatabaseManager {
  constructor(database) {
    this.db = database;
    this.preparedStatements = {};
    this.initializePreparedStatements();
  }

  initializePreparedStatements() {
    // Members
    this.preparedStatements.getAllMembers = this.db.prepare(`SELECT * FROM members ORDER BY created_at DESC`);
    this.preparedStatements.insertMember = this.db.prepare(`
      INSERT INTO members (custom_id, name, phone, photo, subscription_type, subscription_start, subscription_end,
        payment_type, total_amount, paid_amount, remaining_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.preparedStatements.deleteMember = this.db.prepare(`DELETE FROM members WHERE id = ?`);

    // Visitors
    this.preparedStatements.getAllVisitors = this.db.prepare(`SELECT * FROM visitors ORDER BY createdAt DESC`);
    this.preparedStatements.insertVisitor = this.db.prepare(`
      INSERT INTO visitors (name, phone, notes, recordedBy, createdAt) VALUES (?, ?, ?, ?, ?)
    `);
    this.preparedStatements.deleteVisitor = this.db.prepare(`DELETE FROM visitors WHERE id = ?`);

    // PT Clients
    this.preparedStatements.getAllPTClients = this.db.prepare(`SELECT * FROM pt_clients ORDER BY created_at DESC`);
    this.preparedStatements.insertPTClient = this.db.prepare(`
      INSERT INTO pt_clients (custom_id, client_name, phone, coach_name, total_sessions, completed_sessions,
        remaining_sessions, total_amount, paid_amount, remaining_amount, start_date, end_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.preparedStatements.deletePTClient = this.db.prepare(`DELETE FROM pt_clients WHERE id = ?`);

    // InBody Services
    this.preparedStatements.getAllInBodyServices = this.db.prepare(`SELECT * FROM inbody_services ORDER BY created_at DESC`);
    this.preparedStatements.insertInBodyService = this.db.prepare(`
      INSERT INTO inbody_services (client_name, phone, service_price, staff_name, notes) VALUES (?, ?, ?, ?, ?)
    `);
    this.preparedStatements.deleteInBodyService = this.db.prepare(`DELETE FROM inbody_services WHERE id = ?`);

    // Day Use Services
    this.preparedStatements.getAllDayUseServices = this.db.prepare(`SELECT * FROM dayuse_services ORDER BY created_at DESC`);
    this.preparedStatements.insertDayUseService = this.db.prepare(`
      INSERT INTO dayuse_services (client_name, phone, service_price, staff_name, notes) VALUES (?, ?, ?, ?, ?)
    `);
    this.preparedStatements.deleteDayUseService = this.db.prepare(`DELETE FROM dayuse_services WHERE id = ?`);
  }

  // Members
  getAllMembers() {
    return this.preparedStatements.getAllMembers.all();
  }

  addMember(data) {
    const result = this.preparedStatements.insertMember.run(
      data.custom_id || null, data.name, data.phone, data.photo || null,
      data.subscriptionType, data.subscriptionStart, data.subscriptionEnd,
      data.paymentType, data.totalAmount || 0, data.paidAmount || 0,
      data.remainingAmount || 0, data.notes || ''
    );
    return { success: true, id: result.lastInsertRowid };
  }

  updateMember(id, data) {
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
  }

  deleteMember(id) {
    this.preparedStatements.deleteMember.run(id);
    return { success: true };
  }

  // Visitors
  getAllVisitors() {
    return this.preparedStatements.getAllVisitors.all();
  }

  addVisitor(data) {
    const result = this.preparedStatements.insertVisitor.run(
      data.name, data.phone, data.notes || '', data.recordedBy || '',
      data.createdAt || new Date().toISOString()
    );
    return { success: true, id: result.lastInsertRowid };
  }

  deleteVisitor(id) {
    this.preparedStatements.deleteVisitor.run(id);
    return { success: true };
  }

  // PT Clients
  getAllPTClients() {
    return this.preparedStatements.getAllPTClients.all();
  }

  addPTClient(data) {
    const result = this.preparedStatements.insertPTClient.run(
      data.custom_id || null, data.client_name, data.phone, data.coach_name,
      data.total_sessions || 0, data.completed_sessions || 0, data.remaining_sessions || 0,
      data.total_amount || 0, data.paid_amount || 0, data.remaining_amount || 0,
      data.start_date, data.end_date, data.notes || ''
    );
    return { success: true, id: result.lastInsertRowid };
  }

  updatePTClient(id, data) {
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
  }

  deletePTClient(id) {
    this.preparedStatements.deletePTClient.run(id);
    return { success: true };
  }

  // InBody Services
  getAllInBodyServices() {
    return this.preparedStatements.getAllInBodyServices.all();
  }

  addInBodyService(data) {
    const result = this.preparedStatements.insertInBodyService.run(
      data.client_name, data.phone, data.service_price || 0,
      data.staff_name, data.notes || ''
    );
    return { success: true, id: result.lastInsertRowid };
  }

  deleteInBodyService(id) {
    this.preparedStatements.deleteInBodyService.run(id);
    return { success: true };
  }

  // Day Use Services
  getAllDayUseServices() {
    return this.preparedStatements.getAllDayUseServices.all();
  }

  addDayUseService(data) {
    const result = this.preparedStatements.insertDayUseService.run(
      data.client_name, data.phone, data.service_price || 0,
      data.staff_name, data.notes || ''
    );
    return { success: true, id: result.lastInsertRowid };
  }

  deleteDayUseService(id) {
    this.preparedStatements.deleteDayUseService.run(id);
    return { success: true };
  }

  getStatistics() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM members').get().count;
    const revenue = this.db.prepare('SELECT SUM(paid_amount) as total FROM members').get().total || 0;
    return { totalMembers: total, totalRevenue: revenue };
  }

  close() {
    this.db.close();
  }
}

// ═══════════════════════════════════════════════════════════
// 🪟 CREATE WINDOW
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

  const startURL = isDev ? 'http://localhost:4001' : `file://${path.join(__dirname, 'out/index.html')}`;
  mainWindow.loadURL(startURL);

  if (isDev) mainWindow.webContents.openDevTools();
}

// ═══════════════════════════════════════════════════════════
// 📡 IPC HANDLERS
// ═══════════════════════════════════════════════════════════

// Members
ipcMain.handle('get-members', async () => {
  try {
    return { success: true, data: dbManager.getAllMembers() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-member', async (event, data) => {
  try {
    return dbManager.addMember(data);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-member', async (event, id, data) => {
  try {
    return dbManager.updateMember(id, data);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-member', async (event, id) => {
  try {
    return dbManager.deleteMember(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Visitors
ipcMain.handle('get-visitors', async () => {
  try {
    return { success: true, data: dbManager.getAllVisitors() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-visitor', async (event, data) => {
  try {
    return dbManager.addVisitor(data);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-visitor', async (event, id) => {
  try {
    return dbManager.deleteVisitor(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// PT Clients
ipcMain.handle('get-pt-clients', async () => {
  try {
    return { success: true, data: dbManager.getAllPTClients() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-pt-client', async (event, data) => {
  try {
    return dbManager.addPTClient(data);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('update-pt-client', async (event, id, data) => {
  try {
    return dbManager.updatePTClient(id, data);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-pt-client', async (event, id) => {
  try {
    return dbManager.deletePTClient(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// InBody Services
ipcMain.handle('get-inbody-services', async () => {
  try {
    return { success: true, data: dbManager.getAllInBodyServices() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-inbody-service', async (event, data) => {
  try {
    return dbManager.addInBodyService(data);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-inbody-service', async (event, id) => {
  try {
    return dbManager.deleteInBodyService(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Day Use Services
ipcMain.handle('get-dayuse-services', async () => {
  try {
    return { success: true, data: dbManager.getAllDayUseServices() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('add-dayuse-service', async (event, data) => {
  try {
    return dbManager.addDayUseService(data);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-dayuse-service', async (event, id) => {
  try {
    return dbManager.deleteDayUseService(id);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Statistics
ipcMain.handle('get-statistics', async () => {
  try {
    return { success: true, data: dbManager.getStatistics() };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════════
// 🚀 APP LIFECYCLE
// ═══════════════════════════════════════════════════════════

app.on('ready', () => {
  db = initializeDatabase();
  dbManager = new DatabaseManager(db);
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