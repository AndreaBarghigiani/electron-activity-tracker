const activeWin = require('active-win');
const initSqlJs = require('sql.js');
const fs = require('fs');
const os = require('os');
const osUtils = require('os-utils');
const path = require('path');
const BrowserExtractor = require('./browserExtractor');

class ActivityTracker {
  constructor() {
    this.dbPath = path.join(os.homedir(), 'activity.db');
    this.db = null;
    this.trackingInterval = null;
    this.intervalMs = 10000; // Track every 10 seconds
    this.browserExtractor = new BrowserExtractor();
  }

  async initialize() {
    // Initialize SQLite database
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    let buffer;
    if (fs.existsSync(this.dbPath)) {
      buffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }
    
    // Create table if not exists
    this.db.run(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        window_title TEXT,
        process_name TEXT,
        process_path TEXT,
        cpu_usage REAL,
        memory_usage REAL,
        platform TEXT,
        browser_url TEXT,
        browser_tab_title TEXT,
        mouse_movements INTEGER DEFAULT 0,
        is_user_active INTEGER DEFAULT 1,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for faster queries on unsynced records
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_synced ON activities(synced)
    `);

    // Migrations: add columns if missing
    try { this.db.run('ALTER TABLE activities ADD COLUMN input_events INTEGER DEFAULT 0'); } catch (e) {}
    try { this.db.run('ALTER TABLE activities ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch (e) {}
    
    // Backfill updated_at for existing records
    this.db.run('UPDATE activities SET updated_at = created_at WHERE updated_at IS NULL');

    console.log(`💾 Database initialized at: ${this.dbPath}`);
  }

  start() {
    console.log('🔍 Activity tracking initialized (every 10 seconds)...');
    // Note: captureActivity() will be called externally with input stats
  }

  stop() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    if (this.db) {
      this.saveDatabase();
      this.db.close();
    }
    console.log('🛑 Activity tracking stopped');
  }

  saveDatabase() {
    // Save database to disk
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  async captureActivity(inputStats = null) {
    try {
      // Get active window information
      const window = await activeWin();
      
      // Get CPU usage
      const cpuUsage = await this.getCPUUsage();
      
      // Get memory usage
      const memoryUsage = this.getMemoryUsage();

      if (window) {
        const currentProcess = window.owner.name || 'Unknown';
        let browserUrl = null;
        let browserTabTitle = null;

        // If it's a browser, try to extract URL
        if (this.browserExtractor.isBrowser(currentProcess)) {
          const browserInfo = await this.browserExtractor.extractBrowserInfo(currentProcess);
          if (browserInfo) {
            browserUrl = browserInfo.url;
            browserTabTitle = browserInfo.title;
          }
        }

        // Get input activity data
        const mouseMovements = inputStats ? inputStats.mouseMovements : 0;
        const isUserActive = inputStats ? (inputStats.isActive ? 1 : 0) : 1;
        const inputEvents = inputStats && typeof inputStats.inputEvents === 'number' ? inputStats.inputEvents : mouseMovements;

        // Check for loginwindow deduplication
        if (currentProcess === 'loginwindow') {
          const previousRecord = this.getPreviousActivity();
          
          if (previousRecord && previousRecord.process_name === 'loginwindow') {
            // UPDATE existing loginwindow record
            const duration = Math.round((Date.now() - new Date(previousRecord.created_at).getTime()) / 1000);
            
            this.db.run(`
              UPDATE activities 
              SET updated_at = CURRENT_TIMESTAMP,
                  cpu_usage = ?,
                  memory_usage = ?,
                  input_events = ?,
                  is_user_active = ?
              WHERE id = ?
            `, [
              cpuUsage,
              memoryUsage,
              inputEvents,
              isUserActive,
              previousRecord.id
            ]);
            
            this.saveDatabase();
            console.log(`📌 Updated loginwindow session (ID: ${previousRecord.id}, duration: ${duration}s)`);
            return;
          }
        }

        // Normal INSERT for everything else (including first loginwindow)
        this.db.run(`
          INSERT INTO activities (
            window_title, 
            process_name, 
            process_path, 
            cpu_usage, 
            memory_usage,
            platform,
            browser_url,
            browser_tab_title,
            mouse_movements,
            is_user_active,
            input_events
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          window.title || 'Unknown',
          currentProcess,
          window.owner.path || 'Unknown',
          cpuUsage,
          memoryUsage,
          process.platform,
          browserUrl,
          browserTabTitle,
          mouseMovements,
          isUserActive,
          inputEvents
        ]);
        
        // Save to disk after each insert
        this.saveDatabase();

        const activeIndicator = isUserActive ? '✅' : '😴';
        if (browserUrl) {
          console.log(`${activeIndicator} Tracked: ${currentProcess} - ${browserUrl}`);
        } else {
          console.log(`${activeIndicator} Tracked: ${currentProcess} - ${window.title}`);
        }
      }
    } catch (error) {
      console.error('❌ Error capturing activity:', error.message);
    }
  }

  getCPUUsage() {
    return new Promise((resolve) => {
      osUtils.cpuUsage((usage) => {
        resolve((usage * 100).toFixed(2));
      });
    });
  }

  getMemoryUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return ((usedMem / totalMem) * 100).toFixed(2);
  }

  getPreviousActivity() {
    const results = this.db.exec('SELECT id, process_name, created_at FROM activities ORDER BY id DESC LIMIT 1');
    if (!results || results.length === 0) return null;
    
    const columns = results[0].columns;
    const values = results[0].values[0];
    if (!values) return null;
    
    const record = {};
    columns.forEach((col, i) => {
      record[col] = values[i];
    });
    return record;
  }

  getStats() {
    const total = this.db.exec('SELECT COUNT(*) as count FROM activities')[0];
    const unsynced = this.db.exec('SELECT COUNT(*) as count FROM activities WHERE synced = 0')[0];
    
    return {
      totalRecords: total ? total.values[0][0] : 0,
      unsyncedRecords: unsynced ? unsynced.values[0][0] : 0,
      dbPath: this.dbPath
    };
  }

  getUnsyncedActivities(limit = null) {
    let query = 'SELECT * FROM activities WHERE synced = 0 ORDER BY id ASC';
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    const results = this.db.exec(query);
    if (!results || results.length === 0) return [];
    
    const columns = results[0].columns;
    const values = results[0].values;
    
    return values.map(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  markAsSynced(ids) {
    if (!ids || ids.length === 0) return;
    
    const placeholders = ids.map(() => '?').join(',');
    this.db.run(`UPDATE activities SET synced = 1 WHERE id IN (${placeholders})`, ids);
    this.saveDatabase();
    
    console.log(`✅ Marked ${ids.length} records as synced`);
  }

  getDatabase() {
    return this.db;
  }
}

module.exports = ActivityTracker;
