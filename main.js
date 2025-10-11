const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const ExcelJS = require('exceljs');
const fs = require('fs');

let mainWindow;
let db;

// مسار قاعدة البيانات
const dbPath = path.join(app.getPath('userData'), 'gym.db');

// إنشاء الجداول
function initDatabase() {
  db = new Database(dbPath);
  
  // جدول الأعضاء
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      custom_id TEXT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      photo TEXT,
      subscription_type TEXT NOT NULL,
      subscription_start TEXT NOT NULL,
      subscription_end TEXT NOT NULL,
      payment_type TEXT NOT NULL,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // جدول الزوار
  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      notes TEXT,
      recordedBy TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indexes للبحث السريع
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
    CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
    CREATE INDEX IF NOT EXISTS idx_visitors_name ON visitors(name);
    CREATE INDEX IF NOT EXISTS idx_visitors_phone ON visitors(phone);
  `);

  console.log('✅ Database initialized successfully');
  console.log('📁 Database path:', dbPath);
}

// إنشاء نافذة التطبيق
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // في وضع التطوير
  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:4001');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'out', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ═══════════════════════════════════════════════════════════
// 👥 MEMBERS HANDLERS
// ═══════════════════════════════════════════════════════════

// ✅ إضافة عضو جديد
ipcMain.handle('add-member', async (event, memberData) => {
  try {
    const {
      custom_id, name, phone, photo,
      subscriptionType, subscriptionStart, subscriptionEnd,
      paymentType, totalAmount, paidAmount, remainingAmount, notes
    } = memberData;

    const stmt = db.prepare(`
      INSERT INTO members (
        custom_id, name, phone, photo,
        subscription_type, subscription_start, subscription_end,
        payment_type, total_amount, paid_amount, remaining_amount,
        notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const result = stmt.run(
      custom_id || null,
      name,
      phone,
      photo || null,
      subscriptionType,
      subscriptionStart,
      subscriptionEnd,
      paymentType,
      totalAmount || 0,
      paidAmount || 0,
      remainingAmount || 0,
      notes || ''
    );

    return {
      success: true,
      id: result.lastInsertRowid,
      message: 'تم إضافة العضو بنجاح'
    };

  } catch (error) {
    console.error('Error adding member:', error);
    return { success: false, error: error.message };
  }
});

// ✅ جلب جميع الأعضاء
ipcMain.handle('get-members', async (event) => {
  try {
    const stmt = db.prepare('SELECT * FROM members ORDER BY created_at DESC');
    const rows = stmt.all();
    
    return { success: true, data: rows };
  } catch (error) {
    console.error('Error getting members:', error);
    return { success: false, error: error.message };
  }
});

// ✅ تحديث بيانات عضو
ipcMain.handle('update-member', async (event, memberId, memberData) => {
  try {
    const {
      name, phone, photo,
      subscriptionType, subscriptionStart, subscriptionEnd,
      paymentType, totalAmount, paidAmount, remainingAmount, notes
    } = memberData;

    const stmt = db.prepare(`
      UPDATE members SET
        name = ?,
        phone = ?,
        photo = ?,
        subscription_type = ?,
        subscription_start = ?,
        subscription_end = ?,
        payment_type = ?,
        total_amount = ?,
        paid_amount = ?,
        remaining_amount = ?,
        notes = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      name, phone, photo || null,
      subscriptionType, subscriptionStart, subscriptionEnd,
      paymentType,
      totalAmount || 0,
      paidAmount || 0,
      remainingAmount || 0,
      notes || '',
      memberId
    );

    return {
      success: true,
      changes: result.changes,
      message: 'تم تحديث البيانات بنجاح'
    };

  } catch (error) {
    console.error('Error updating member:', error);
    return { success: false, error: error.message };
  }
});

// ✅ حذف عضو
ipcMain.handle('delete-member', async (event, memberId) => {
  try {
    const stmt = db.prepare('DELETE FROM members WHERE id = ?');
    const result = stmt.run(memberId);

    return {
      success: true,
      changes: result.changes,
      message: 'تم حذف العضو بنجاح'
    };

  } catch (error) {
    console.error('Error deleting member:', error);
    return { success: false, error: error.message };
  }
});

// ✅ تصدير الأعضاء إلى Excel
ipcMain.handle('export-members-to-excel', async (event, filters) => {
  try {
    let sql = 'SELECT * FROM members WHERE 1=1';
    const params = [];

    // فلتر البحث
    if (filters.searchTerm) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${filters.searchTerm}%`);
      params.push(`%${filters.searchTerm}%`);
    }

    // فلتر الحالة
    if (filters.status === 'active') {
      sql += ' AND date(subscription_end) >= date("now")';
    } else if (filters.status === 'expired') {
      sql += ' AND date(subscription_end) < date("now")';
    }

    sql += ' ORDER BY created_at DESC';

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);

    // إنشاء ملف Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('الأعضاء');

    worksheet.columns = [
      { header: 'ID', key: 'custom_id', width: 12 },
      { header: 'الاسم', key: 'name', width: 25 },
      { header: 'التليفون', key: 'phone', width: 15 },
      { header: 'نوع الاشتراك', key: 'subscription_type', width: 15 },
      { header: 'بداية الاشتراك', key: 'subscription_start', width: 15 },
      { header: 'نهاية الاشتراك', key: 'subscription_end', width: 15 },
      { header: 'نوع الدفع', key: 'payment_type', width: 15 },
      { header: 'إجمالي المبلغ', key: 'total_amount', width: 15 },
      { header: 'المبلغ المدفوع', key: 'paid_amount', width: 15 },
      { header: 'المبلغ المتبقي', key: 'remaining_amount', width: 15 },
      { header: 'الحالة', key: 'status', width: 12 },
      { header: 'الملاحظات', key: 'notes', width: 30 },
      { header: 'تاريخ التسجيل', key: 'created_at', width: 20 }
    ];

    // تنسيق الهيدر
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };

    // إضافة البيانات
    rows.forEach(member => {
      const isExpired = new Date(member.subscription_end) < new Date();
      
      worksheet.addRow({
        custom_id: member.custom_id || member.id,
        name: member.name,
        phone: member.phone,
        subscription_type: member.subscription_type,
        subscription_start: member.subscription_start,
        subscription_end: member.subscription_end,
        payment_type: member.payment_type,
        total_amount: member.total_amount,
        paid_amount: member.paid_amount,
        remaining_amount: member.remaining_amount,
        status: isExpired ? 'منتهي' : 'نشط',
        notes: member.notes || '-',
        created_at: member.created_at
      });
    });

    // تنسيق الخلايا
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

          // تلوين حسب الحالة
          if (colNumber === 11) {
            if (cell.value === 'منتهي') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFF6B6B' }
              };
            } else {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF51CF66' }
              };
            }
          }

          // تلوين المتبقي
          if (colNumber === 10) {
            if (parseFloat(cell.value) > 0) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFEB3B' }
              };
            }
          }
        });
      }
    });

    // حفظ الملف
    const downloadsPath = path.join(require('os').homedir(), 'Downloads');
    const fileName = `members_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(downloadsPath, fileName);

    await workbook.xlsx.writeFile(filePath);

    return {
      success: true,
      filePath: filePath,
      count: rows.length,
      message: 'تم التصدير بنجاح'
    };

  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════════
// 🚶 VISITORS HANDLERS
// ═══════════════════════════════════════════════════════════

// ✅ إضافة زائر جديد
ipcMain.handle('add-visitor', async (event, visitorData) => {
  try {
    const { name, phone, notes, recordedBy } = visitorData;

    const stmt = db.prepare(`
      INSERT INTO visitors (name, phone, notes, recordedBy, createdAt)
      VALUES (?, ?, ?, ?, datetime('now'))
    `);

    const result = stmt.run(name, phone, notes || '', recordedBy);

    return {
      success: true,
      id: result.lastInsertRowid,
      message: 'تم إضافة الزائر بنجاح'
    };

  } catch (error) {
    console.error('Error adding visitor:', error);
    return { success: false, error: error.message };
  }
});

// ✅ جلب جميع الزوار
ipcMain.handle('get-visitors', async (event) => {
  try {
    const stmt = db.prepare('SELECT * FROM visitors ORDER BY createdAt DESC');
    const rows = stmt.all();
    
    return { success: true, data: rows };
  } catch (error) {
    console.error('Error getting visitors:', error);
    return { success: false, error: error.message };
  }
});

// ✅ حذف زائر
ipcMain.handle('delete-visitor', async (event, visitorId) => {
  try {
    const stmt = db.prepare('DELETE FROM visitors WHERE id = ?');
    const result = stmt.run(visitorId);

    return {
      success: true,
      message: 'تم حذف الزائر بنجاح'
    };

  } catch (error) {
    console.error('Error deleting visitor:', error);
    return { success: false, error: error.message };
  }
});

// ✅ تصدير الزوار إلى Excel
ipcMain.handle('export-visitors-to-excel', async (event, filters) => {
  try {
    let sql = 'SELECT * FROM visitors WHERE 1=1';
    const params = [];

    if (filters.searchTerm) {
      sql += ' AND (name LIKE ? OR phone LIKE ?)';
      params.push(`%${filters.searchTerm}%`);
      params.push(`%${filters.searchTerm}%`);
    }

    sql += ' ORDER BY createdAt DESC';

    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);

    // إنشاء Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('الزوار');

    worksheet.columns = [
      { header: 'الرقم', key: 'id', width: 10 },
      { header: 'الاسم', key: 'name', width: 25 },
      { header: 'التليفون', key: 'phone', width: 15 },
      { header: 'الملاحظات', key: 'notes', width: 40 },
      { header: 'المسجل', key: 'recordedBy', width: 20 },
      { header: 'التاريخ والوقت', key: 'createdAt', width: 20 }
    ];

    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center'
    };

    rows.forEach(visitor => {
      worksheet.addRow({
        id: visitor.id,
        name: visitor.name,
        phone: visitor.phone,
        notes: visitor.notes || '-',
        recordedBy: visitor.recordedBy,
        createdAt: visitor.createdAt
      });
    });

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      }
    });

    const downloadsPath = path.join(require('os').homedir(), 'Downloads');
    const fileName = `visitors_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(downloadsPath, fileName);

    await workbook.xlsx.writeFile(filePath);

    return {
      success: true,
      filePath: filePath,
      count: rows.length,
      message: 'تم التصدير بنجاح'
    };

  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
});

// ═══════════════════════════════════════════════════════════
// 🚀 APP LIFECYCLE
// ═══════════════════════════════════════════════════════════

app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (db) db.close();
});

console.log('✅ Gym Management System started successfully');