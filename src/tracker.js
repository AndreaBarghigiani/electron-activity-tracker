const activeWin = require('active-win');
const Database = require('better-sqlite3');
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

  initialize() {
    // Initialize SQLite database with better-sqlite3
    this.db = new Database(this.dbPath);
    
    // Create table if not exists
    this.db.exec(`
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
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_synced ON activities(synced)
    `);

    // Migrations: add columns if missing
    try { this.db.exec('ALTER TABLE activities ADD COLUMN input_events INTEGER DEFAULT 0'); } catch (e) {}
    try { this.db.exec('ALTER TABLE activities ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch (e) {}
    
    // Backfill updated_at for existing records
    this.db.exec('UPDATE activities SET updated_at = created_at WHERE updated_at IS NULL');

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
      this.db.close();
    }
    console.log('🛑 Activity tracking stopped');
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
            
            const stmt = this.db.prepare(`
              UPDATE activities 
              SET updated_at = CURRENT_TIMESTAMP,
                  cpu_usage = ?,
                  memory_usage = ?,
                  input_events = ?,
                  is_user_active = ?
              WHERE id = ?
            `);
            stmt.run(
              cpuUsage,
              memoryUsage,
              inputEvents,
              isUserActive,
              previousRecord.id
            );
            
            console.log(`📌 Updated loginwindow session (ID: ${previousRecord.id}, duration: ${duration}s)`);
            return;
          }
        }

        // Normal INSERT for everything else (including first loginwindow)
        const stmt = this.db.prepare(`
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
        `);
        stmt.run(
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
        );

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
    const stmt = this.db.prepare('SELECT id, process_name, created_at FROM activities ORDER BY id DESC LIMIT 1');
    return stmt.get();
  }

  getStats() {
    const total = this.db.prepare('SELECT COUNT(*) as count FROM activities').get();
    const unsynced = this.db.prepare('SELECT COUNT(*) as count FROM activities WHERE synced = 0').get();
    
    return {
      totalRecords: total ? total.count : 0,
      unsyncedRecords: unsynced ? unsynced.count : 0,
      dbPath: this.dbPath
    };
  }

  getUnsyncedActivities(limit = null) {
    let query = 'SELECT * FROM activities WHERE synced = 0 ORDER BY id ASC';
    if (limit) {
      query += ` LIMIT ${limit}`;
    }
    const stmt = this.db.prepare(query);
    return stmt.all();
  }

  markAsSynced(ids) {
    if (!ids || ids.length === 0) return;
    
    const placeholders = ids.map(() => '?').join(',');
    const stmt = this.db.prepare(`UPDATE activities SET synced = 1 WHERE id IN (${placeholders})`);
    stmt.run(...ids);
    
    console.log(`✅ Marked ${ids.length} records as synced`);
  }

  getDatabase() {
    return this.db;
  }
}

module.exports = ActivityTracker;
