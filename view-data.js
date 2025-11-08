const initSqlJs = require('sql.js');
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const dbPath = path.join(os.homedir(), 'activity.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('\n⚠️  No database found. Run the tracker first to collect data.\n');
    process.exit(0);
  }

  // Open the database
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);

  console.log('\n📊 Activity Tracker Database\n');
  console.log(`Database: ${dbPath}\n`);

  // Get statistics
  const statsResult = db.exec('SELECT COUNT(*) as total, COUNT(CASE WHEN synced = 0 THEN 1 END) as unsynced FROM activities');
  const stats = statsResult.length > 0 ? {
    total: statsResult[0].values[0][0],
    unsynced: statsResult[0].values[0][1]
  } : { total: 0, unsynced: 0 };
  
  console.log(`Total records: ${stats.total}`);
  console.log(`Unsynced records: ${stats.unsynced}\n`);

  // Get last 10 activities
  console.log('📋 Last 10 activities:\n');
  const activitiesResult = db.exec('SELECT * FROM activities ORDER BY id DESC LIMIT 10');
  const activities = [];
  
  if (activitiesResult.length > 0) {
    const columns = activitiesResult[0].columns;
    const values = activitiesResult[0].values;
    
    values.forEach(row => {
      const obj = {};
      columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      activities.push(obj);
    });
  }

  activities.forEach(activity => {
    const activeIcon = activity.is_user_active ? '✅' : '😴';
    console.log(`[${activity.timestamp}] ${activeIcon} ${activity.process_name}`);
    
    // Show URL if it's a browser
    if (activity.browser_url) {
      console.log(`  🌐 URL: ${activity.browser_url}`);
      if (activity.browser_tab_title) {
        console.log(`  📄 Tab: ${activity.browser_tab_title}`);
      }
    } else {
      console.log(`  Window: ${activity.window_title}`);
    }
    
    // Show input activity
    if (activity.mouse_movements !== undefined) {
      const events = activity.input_events !== undefined ? activity.input_events : activity.mouse_movements;
      console.log(`  🖘️  Input events: ${events} | Active: ${activity.is_user_active ? 'Yes' : 'Idle'}`);
    }
    
    console.log(`  CPU: ${activity.cpu_usage}% | Memory: ${activity.memory_usage}%`);
    console.log(`  Synced: ${activity.synced ? '✅' : '⏳'}\n`);
  });

  // Get top 5 most used apps
  console.log('🏆 Top 5 most used applications:\n');
  const topAppsResult = db.exec(`
    SELECT process_name, COUNT(*) as count 
    FROM activities 
    GROUP BY process_name 
    ORDER BY count DESC 
    LIMIT 5
  `);
  
  if (topAppsResult.length > 0) {
    const columns = topAppsResult[0].columns;
    const values = topAppsResult[0].values;
    
    values.forEach((row, index) => {
      console.log(`${index + 1}. ${row[0]} - ${row[1]} captures`);
    });
  }

  db.close();
  console.log('\n✅ Done\n');
})();
