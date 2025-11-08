# Quickstart: Consecutive Login Window Deduplication

## Overview

This feature eliminates duplicate `loginwindow` entries in the activity tracker by updating consecutive records instead of inserting new ones. A single "away session" becomes one record with start/end times.

## Implementation Steps

### 1. Database Migration
Add `updated_at` column to track session duration:

```javascript
// In src/tracker.js, initialize() method
// Add after existing migrations
try { 
  this.db.run('ALTER TABLE activities ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); 
  // Backfill existing records
  this.db.run('UPDATE activities SET updated_at = created_at WHERE updated_at IS NULL');
} catch (e) {
  // Column already exists
}
```

### 2. Modify Activity Capture Logic
Update `captureActivity()` method to check previous record:

```javascript
// In src/tracker.js, captureActivity() method
async captureActivity(inputStats = null) {
  try {
    const window = await activeWin();
    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();

    if (window) {
      // Get previous record
      const previousRecord = this.getPreviousRecord();
      
      // Check if we should update instead of insert
      if (this.shouldUpdateLoginWindow(previousRecord, window.owner.name)) {
        this.updateLoginWindowRecord(previousRecord.id, cpuUsage, memoryUsage, inputStats, window);
        return;
      }
      
      // Normal insert for everything else
      this.insertNewActivityRecord(window, cpuUsage, memoryUsage, inputStats);
    }
  } catch (error) {
    console.error('❌ Error capturing activity:', error.message);
  }
}
```

### 3. Add Helper Methods
```javascript
getPreviousRecord() {
  const results = this.db.exec(`
    SELECT id, process_name, created_at 
    FROM activities 
    ORDER BY id DESC 
    LIMIT 1
  `);
  return results && results.length > 0 ? 
    { id: results[0].values[0][0], process_name: results[0].values[0][1] } : 
    null;
}

shouldUpdateLoginWindow(previousRecord, currentProcess) {
  return previousRecord && 
         previousRecord.process_name === 'loginwindow' && 
         currentProcess === 'loginwindow';
}

updateLoginWindowRecord(recordId, cpuUsage, memoryUsage, inputStats, window) {
  const mouseMovements = inputStats ? inputStats.mouseMovements : 0;
  const isUserActive = inputStats ? (inputStats.isActive ? 1 : 0) : 1;
  
  this.db.run(`
    UPDATE activities 
    SET updated_at = CURRENT_TIMESTAMP,
        cpu_usage = ?,
        memory_usage = ?,
        input_events = ?,
        is_user_active = ?
    WHERE id = ?
  `, [cpuUsage, memoryUsage, 
      inputStats && typeof inputStats.inputEvents === 'number' ? inputStats.inputEvents : mouseMovements,
      isUserActive, recordId]);
  
  const duration = Math.round((Date.now() - new Date().getTime()) / 1000); // Will be calculated properly
  console.log(`📌 Updated loginwindow session (ID: ${recordId})`);
  this.saveDatabase();
}

insertNewActivityRecord(window, cpuUsage, memoryUsage, inputStats) {
  // Existing INSERT logic (unchanged)
  // ... (copy from current implementation)
}
```

### 4. Update View Data Display
Modify `view-data.js` to show session duration:

```javascript
// In view-data.js
activities.forEach(activity => {
  const createdAt = new Date(activity.created_at);
  const updatedAt = new Date(activity.updated_at);
  const durationMs = updatedAt - createdAt;
  
  if (durationMs > 10000) { // More than 10 seconds = was updated
    const durationMin = Math.round(durationMs / 60000);
    console.log(`[${activity.created_at} → ${activity.updated_at}] ${activity.process_name} (${durationMin} min)`);
  } else {
    console.log(`[${activity.created_at}] ${activity.process_name}`);
  }
});
```

## Testing

### Manual Test Scenario
1. Start the application
2. Lock your screen for 2+ minutes
3. Unlock and check the database
4. Expected: ONE loginwindow record with updated_at showing session end

### Database Query for Verification
```sql
-- Check for session records
SELECT created_at, updated_at, 
       (julianday(updated_at) - julianday(created_at)) * 24 * 60 as duration_minutes
FROM activities 
WHERE process_name = 'loginwindow' 
ORDER BY id DESC LIMIT 5;
```

## Expected Results

### Before Implementation
```
[12:00:00] loginwindow
[12:00:10] loginwindow  
[12:00:20] loginwindow
... (720 records for 2-hour session)
```

### After Implementation  
```
[12:00:00 → 14:00:00] loginwindow (120 min)
```

**Storage reduction**: ~99.86% for long away sessions

## Files Modified

1. `src/tracker.js` - Main logic implementation
2. `view-data.js` - Display enhancement  
3. Database schema (via migration in tracker.js)

## Backward Compatibility

- Existing databases automatically migrated
- No data loss during migration
- All existing functionality preserved
