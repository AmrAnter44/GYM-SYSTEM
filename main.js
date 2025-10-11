// ═══════════════════════════════════════════════════════════
// 🗄️ DATABASE PERFORMANCE OPTIMIZATIONS
// Add this code to your main.js or database handler file
// ═══════════════════════════════════════════════════════════

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

// ═══════════════════════════════════════════════════════════
// 📊 DATABASE INITIALIZATION WITH OPTIMIZATIONS
// ═══════════════════════════════════════════════════════════

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'gym_database.db');
  const db = new sqlite3.Database(dbPath);

  // ═══ PERFORMANCE OPTIMIZATIONS ═══
  
  // Enable WAL mode for better concurrent access
  db.run('PRAGMA journal_mode = WAL');
  
  // Increase cache size (10MB)
  db.run('PRAGMA cache_size = -10000');
  
  // Synchronous mode for better performance
  db.run('PRAGMA synchronous = NORMAL');
  
  // Temporary storage in memory
  db.run('PRAGMA temp_store = MEMORY');
  
  // Increase page size
  db.run('PRAGMA page_size = 4096');
  
  // Memory-mapped I/O
  db.run('PRAGMA mmap_size = 30000000000');

  // ═══ CREATE INDEXES FOR FAST QUERIES ═══
  
  db.serialize(() => {
    // Members table indexes
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_members_name 
      ON members(name)
    `);
    
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_members_phone 
      ON members(phone)
    `);
    
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_members_custom_id 
      ON members(custom_id)
    `);
    
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_members_subscription_end 
      ON members(subscription_end)
    `);
    
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_members_created_at 
      ON members(created_at)
    `);

    // Visitors table indexes
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_visitors_name 
      ON visitors(name)
    `);
    
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_visitors_phone 
      ON visitors(phone)
    `);
    
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_visitors_created_at 
      ON visitors(createdAt)
    `);

    console.log('✅ Database indexes created successfully');
  });

  return db;
}

// ═══════════════════════════════════════════════════════════
// 🚀 OPTIMIZED QUERY FUNCTIONS
// ═══════════════════════════════════════════════════════════

// Prepared statements for frequently used queries
class DatabaseManager {
  constructor(db) {
    this.db = db;
    this.preparedStatements = {};
    this.initializePreparedStatements();
  }

  initializePreparedStatements() {
    // Get all members (optimized)
    this.preparedStatements.getAllMembers = this.db.prepare(`
      SELECT * FROM members 
      ORDER BY created_at DESC
    `);

    // Search members by name or phone (optimized with indexes)
    this.preparedStatements.searchMembers = this.db.prepare(`
      SELECT * FROM members 
      WHERE name LIKE ? OR phone LIKE ? OR custom_id = ?
      ORDER BY created_at DESC
      LIMIT 100
    `);

    // Get member by ID (optimized)
    this.preparedStatements.getMemberById = this.db.prepare(`
      SELECT * FROM members 
      WHERE id = ?
    `);

    // Get members with expiring subscriptions (optimized)
    this.preparedStatements.getExpiringMembers = this.db.prepare(`
      SELECT * FROM members 
      WHERE subscription_end BETWEEN date('now') AND date('now', '+7 days')
      ORDER BY subscription_end ASC
    `);

    // Get active members count (optimized)
    this.preparedStatements.getActiveMembersCount = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM members 
      WHERE subscription_end >= date('now')
    `);

    console.log('✅ Prepared statements initialized');
  }

  // Get all members (fast)
  getAllMembers() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM members ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Search with pagination (very fast)
  searchMembers(searchTerm, limit = 100, offset = 0) {
    return new Promise((resolve, reject) => {
      const search = `%${searchTerm}%`;
      this.db.all(
        `SELECT * FROM members 
         WHERE name LIKE ? OR phone LIKE ? OR custom_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [search, search, searchTerm, limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  // Batch insert for better performance
  batchInsertMembers(members) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        const stmt = this.db.prepare(`
          INSERT INTO members (
            custom_id, name, phone, photo, 
            subscription_type, subscription_start, subscription_end,
            payment_type, total_amount, paid_amount, remaining_amount,
            notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let errorOccurred = false;
        
        members.forEach(member => {
          stmt.run([
            member.custom_id,
            member.name,
            member.phone,
            member.photo,
            member.subscription_type,
            member.subscription_start,
            member.subscription_end,
            member.payment_type,
            member.total_amount,
            member.paid_amount,
            member.remaining_amount,
            member.notes,
            member.created_at || new Date().toISOString()
          ], (err) => {
            if (err) {
              errorOccurred = true;
              console.error('Batch insert error:', err);
            }
          });
        });

        stmt.finalize((err) => {
          if (err || errorOccurred) {
            this.db.run('ROLLBACK');
            reject(err || new Error('Batch insert failed'));
          } else {
            this.db.run('COMMIT', (commitErr) => {
              if (commitErr) reject(commitErr);
              else resolve({ success: true, count: members.length });
            });
          }
        });
      });
    });
  }

  // Analyze and optimize database
  optimizeDatabase() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Analyze the database for query optimization
        this.db.run('ANALYZE', (err) => {
          if (err) {
            console.error('ANALYZE error:', err);
          }
        });

        // Vacuum to reclaim space and optimize
        this.db.run('VACUUM', (err) => {
          if (err) {
            console.error('VACUUM error:', err);
            reject(err);
          } else {
            console.log('✅ Database optimized successfully');
            resolve({ success: true });
          }
        });
      });
    });
  }

  // Close database properly
  close() {
    return new Promise((resolve, reject) => {
      // Finalize all prepared statements
      Object.values(this.preparedStatements).forEach(stmt => {
        if (stmt && stmt.finalize) {
          stmt.finalize();
        }
      });

      // Close database
      this.db.close((err) => {
        if (err) reject(err);
        else {
          console.log('✅ Database closed successfully');
          resolve();
        }
      });
    });
  }
}

// ═══════════════════════════════════════════════════════════
// 🔧 USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════

// Initialize database
const db = initializeDatabase();
const dbManager = new DatabaseManager(db);

// Schedule database optimization (run daily)
const scheduleOptimization = () => {
  // Run optimization at 3 AM daily
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
    dbManager.optimizeDatabase().then(() => {
      console.log('✅ Scheduled optimization completed');
      scheduleOptimization(); // Schedule next run
    }).catch(err => {
      console.error('❌ Scheduled optimization failed:', err);
    });
  }, timeout);
};

// Start scheduled optimization
scheduleOptimization();

// ═══════════════════════════════════════════════════════════
// 📤 EXPORT
// ═══════════════════════════════════════════════════════════

module.exports = {
  db,
  dbManager,
  initializeDatabase,
  DatabaseManager
};

// ═══════════════════════════════════════════════════════════
// 📝 USAGE IN IPC HANDLERS (Example)
// ═══════════════════════════════════════════════════════════

/*
// In your main.js IPC handlers:

ipcMain.handle('get-members', async () => {
  try {
    const members = await dbManager.getAllMembers();
    return { success: true, data: members };
  } catch (error) {
    console.error('Error getting members:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('search-members', async (event, searchTerm) => {
  try {
    const members = await dbManager.searchMembers(searchTerm);
    return { success: true, data: members };
  } catch (error) {
    console.error('Error searching members:', error);
    return { success: false, error: error.message };
  }
});

// Manual optimization trigger
ipcMain.handle('optimize-database', async () => {
  try {
    const result = await dbManager.optimizeDatabase();
    return result;
  } catch (error) {
    console.error('Error optimizing database:', error);
    return { success: false, error: error.message };
  }
});
*/