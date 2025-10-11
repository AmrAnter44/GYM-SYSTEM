const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const XLSX = require('xlsx');

let db;
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // تحميل من localhost مباشرة (للتطوير)
  mainWindow.loadURL('http://localhost:4001');
  
  // فتح DevTools للتشخيص
  mainWindow.webContents.openDevTools();
}

function setupDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'gym.db');
  console.log('Database path:', dbPath);
  
  db = new Database(dbPath);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      photo TEXT,
      subscription_type TEXT NOT NULL,
      subscription_start DATE NOT NULL,
      subscription_end DATE NOT NULL,
      payment_type TEXT NOT NULL,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      remaining_amount REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  console.log('Database setup complete');
}

// === IPC Handlers ===

// حفظ عضو جديد
ipcMain.handle('save-member', async (event, memberData) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO members 
      (name, phone, photo, subscription_type, subscription_start, 
       subscription_end, payment_type, total_amount, paid_amount, 
       remaining_amount, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      memberData.name,
      memberData.phone,
      memberData.photo,
      memberData.subscriptionType,
      memberData.subscriptionStart,
      memberData.subscriptionEnd,
      memberData.paymentType,
      memberData.totalAmount,
      memberData.paidAmount,
      memberData.remainingAmount,
      memberData.notes
    );
    
    return { 
      success: true, 
      id: result.lastInsertRowid,
      message: 'تم إضافة العضو بنجاح'
    };
  } catch (error) {
    console.error('Error saving member:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
});

// جلب كل الأعضاء
ipcMain.handle('get-members', async () => {
  try {
    const stmt = db.prepare('SELECT * FROM members ORDER BY created_at DESC');
    const members = stmt.all();
    return { success: true, data: members };
  } catch (error) {
    console.error('Error getting members:', error);
    return { success: false, error: error.message };
  }
});

// جلب عضو واحد
ipcMain.handle('get-member', async (event, memberId) => {
  try {
    const stmt = db.prepare('SELECT * FROM members WHERE id = ?');
    const member = stmt.get(memberId);
    return { success: true, data: member };
  } catch (error) {
    console.error('Error getting member:', error);
    return { success: false, error: error.message };
  }
});

// تحديث عضو
ipcMain.handle('update-member', async (event, memberId, memberData) => {
  try {
    const stmt = db.prepare(`
      UPDATE members 
      SET name = ?, phone = ?, photo = ?, subscription_type = ?,
          subscription_start = ?, subscription_end = ?, payment_type = ?,
          total_amount = ?, paid_amount = ?, remaining_amount = ?,
          notes = ?
      WHERE id = ?
    `);
    
    stmt.run(
      memberData.name,
      memberData.phone,
      memberData.photo,
      memberData.subscriptionType,
      memberData.subscriptionStart,
      memberData.subscriptionEnd,
      memberData.paymentType,
      memberData.totalAmount,
      memberData.paidAmount,
      memberData.remainingAmount,
      memberData.notes,
      memberId
    );
    
    return { 
      success: true, 
      message: 'تم تحديث البيانات بنجاح' 
    };
  } catch (error) {
    console.error('Error updating member:', error);
    return { success: false, error: error.message };
  }
});

// حذف عضو
ipcMain.handle('delete-member', async (event, memberId) => {
  try {
    const stmt = db.prepare('DELETE FROM members WHERE id = ?');
    stmt.run(memberId);
    return { 
      success: true, 
      message: 'تم حذف العضو بنجاح' 
    };
  } catch (error) {
    console.error('Error deleting member:', error);
    return { success: false, error: error.message };
  }
});

// إحصائيات Dashboard
ipcMain.handle('get-dashboard-stats', async () => {
  try {
    const totalMembers = db.prepare('SELECT COUNT(*) as count FROM members').get();
    
    const activeMembers = db.prepare(`
      SELECT COUNT(*) as count FROM members 
      WHERE DATE(subscription_end) >= DATE('now')
    `).get();
    
    const expiredMembers = db.prepare(`
      SELECT COUNT(*) as count FROM members 
      WHERE DATE(subscription_end) < DATE('now')
    `).get();
    
    const totalRevenue = db.prepare(`
      SELECT SUM(paid_amount) as total FROM members
    `).get();
    
    const pendingPayments = db.prepare(`
      SELECT SUM(remaining_amount) as total FROM members
      WHERE remaining_amount > 0
    `).get();
    
    const todayJoins = db.prepare(`
      SELECT COUNT(*) as count FROM members 
      WHERE DATE(created_at) = DATE('now')
    `).get();
    
    return {
      success: true,
      data: {
        totalMembers: totalMembers.count,
        activeMembers: activeMembers.count,
        expiredMembers: expiredMembers.count,
        totalRevenue: totalRevenue.total || 0,
        pendingPayments: pendingPayments.total || 0,
        todayJoins: todayJoins.count
      }
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { success: false, error: error.message };
  }
});

// البحث عن أعضاء
ipcMain.handle('search-members', async (event, searchTerm) => {
  try {
    const stmt = db.prepare(`
      SELECT * FROM members 
      WHERE name LIKE ? OR phone LIKE ?
      ORDER BY created_at DESC
    `);
    const members = stmt.all(`%${searchTerm}%`, `%${searchTerm}%`);
    return { success: true, data: members };
  } catch (error) {
    console.error('Error searching members:', error);
    return { success: false, error: error.message };
  }
});

// تصدير الأعضاء إلى Excel
ipcMain.handle('export-members-to-excel', async (event, filters = {}) => {
  try {
    let query = 'SELECT * FROM members';
    const conditions = [];
    const params = [];

    if (filters.status === 'active') {
      conditions.push("DATE(subscription_end) >= DATE('now')");
    } else if (filters.status === 'expired') {
      conditions.push("DATE(subscription_end) < DATE('now')");
    }

    if (filters.searchTerm) {
      conditions.push('(name LIKE ? OR phone LIKE ?)');
      params.push(`%${filters.searchTerm}%`, `%${filters.searchTerm}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const members = stmt.all(...params);

    const excelData = members.map(member => ({
      'الرقم': member.id,
      'الاسم': member.name,
      'رقم التليفون': member.phone,
      'نوع الاشتراك': member.subscription_type,
      'تاريخ البداية': member.subscription_start,
      'تاريخ النهاية': member.subscription_end,
      'نوع الدفع': member.payment_type,
      'إجمالي المبلغ': member.total_amount,
      'المبلغ المدفوع': member.paid_amount,
      'المبلغ المتبقي': member.remaining_amount,
      'الملاحظات': member.notes || '',
      'تاريخ التسجيل': member.created_at
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    const colWidths = [
      { wch: 8 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 18 }
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'الأعضاء');

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ ملف Excel',
      defaultPath: `gym-members-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });

    if (!filePath) {
      return { success: false, message: 'تم الإلغاء' };
    }

    XLSX.writeFile(wb, filePath);

    return { 
      success: true, 
      message: 'تم التصدير بنجاح',
      filePath: filePath,
      count: members.length
    };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return { success: false, error: error.message };
  }
});

// تصدير تقرير مالي
ipcMain.handle('export-financial-report', async () => {
  try {
    const members = db.prepare('SELECT * FROM members ORDER BY created_at DESC').all();

    const stats = {
      totalMembers: members.length,
      activeMembers: members.filter(m => new Date(m.subscription_end) >= new Date()).length,
      expiredMembers: members.filter(m => new Date(m.subscription_end) < new Date()).length,
      totalRevenue: members.reduce((sum, m) => sum + m.paid_amount, 0),
      pendingAmount: members.reduce((sum, m) => sum + m.remaining_amount, 0),
      expectedRevenue: members.reduce((sum, m) => sum + m.total_amount, 0)
    };

    const summaryData = [
      { 'البيان': 'إجمالي الأعضاء', 'القيمة': stats.totalMembers },
      { 'البيان': 'الاشتراكات النشطة', 'القيمة': stats.activeMembers },
      { 'البيان': 'الاشتراكات المنتهية', 'القيمة': stats.expiredMembers },
      { 'البيان': '', 'القيمة': '' },
      { 'البيان': 'إجمالي الإيرادات المتوقعة', 'القيمة': `${stats.expectedRevenue} ج.م` },
      { 'البيان': 'إجمالي المحصل', 'القيمة': `${stats.totalRevenue} ج.م` },
      { 'البيان': 'إجمالي المتبقي', 'القيمة': `${stats.pendingAmount} ج.م` },
      { 'البيان': 'نسبة التحصيل', 'القيمة': `${((stats.totalRevenue / stats.expectedRevenue) * 100).toFixed(1)}%` }
    ];

    const membersData = members.map(m => ({
      'الرقم': m.id,
      'الاسم': m.name,
      'نوع الاشتراك': m.subscription_type,
      'نهاية الاشتراك': m.subscription_end,
      'الحالة': new Date(m.subscription_end) >= new Date() ? 'نشط' : 'منتهي',
      'إجمالي المبلغ': m.total_amount,
      'المدفوع': m.paid_amount,
      'المتبقي': m.remaining_amount
    }));

    const paymentTypes = {};
    members.forEach(m => {
      if (!paymentTypes[m.payment_type]) {
        paymentTypes[m.payment_type] = { count: 0, total: 0 };
      }
      paymentTypes[m.payment_type].count++;
      paymentTypes[m.payment_type].total += m.paid_amount;
    });

    const paymentData = Object.entries(paymentTypes).map(([type, data]) => ({
      'نوع الدفع': type,
      'عدد العمليات': data.count,
      'الإجمالي': `${data.total} ج.م`
    }));

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    ws1['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'الملخص المالي');

    const ws2 = XLSX.utils.json_to_sheet(membersData);
    ws2['!cols'] = [
      { wch: 8 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, 
      { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'تفاصيل الأعضاء');

    const ws3 = XLSX.utils.json_to_sheet(paymentData);
    ws3['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'المدفوعات حسب النوع');

    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'حفظ التقرير المالي',
      defaultPath: `financial-report-${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [
        { name: 'Excel Files', extensions: ['xlsx'] }
      ]
    });

    if (!filePath) {
      return { success: false, message: 'تم الإلغاء' };
    }

    XLSX.writeFile(wb, filePath);

    return { 
      success: true, 
      message: 'تم تصدير التقرير بنجاح',
      filePath: filePath
    };
  } catch (error) {
    console.error('Error exporting financial report:', error);
    return { success: false, error: error.message };
  }
});

// === App Events ===

app.whenReady().then(() => {
  setupDatabase();
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
  if (db) {
    db.close();
  }
});