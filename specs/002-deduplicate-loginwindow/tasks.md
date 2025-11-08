# Implementation Tasks: Consecutive Login Window Deduplication

## 📋 Task Overview

**Feature**: 002-deduplicate-loginwindow  
**Total Tasks**: 8  
**Estimated Time**: 2-3 hours  

## ✅ Task List

### Task 1: Add `updated_at` Column to Database Schema
**Priority**: High  
**Estimated Time**: 15 minutes  
**Dependencies**: None  

**Description**:
Add the `updated_at` column to the activities table schema in `src/tracker.js`.

**Acceptance Criteria**:
- [ ] Add `updated_at DATETIME DEFAULT CURRENT_TIMESTAMP` to CREATE TABLE statement
- [ ] Add migration logic to handle existing databases (ALTER TABLE if column doesn't exist)
- [ ] Set `updated_at = created_at` for existing records
- [ ] Test with both fresh and existing databases

**Files to Modify**:
- `src/tracker.js` - Update `initialize()` method

**Implementation Notes**:
```javascript
// In initialize() method, after CREATE TABLE
// Add migration for updated_at column
try { 
  this.db.run('ALTER TABLE activities ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); 
} catch (e) {
  // Column already exists, ignore error
}

// Backfill existing records
this.db.run('UPDATE activities SET updated_at = created_at WHERE updated_at IS NULL');
```

---

### Task 2: Add Helper Method to Get Previous Activity Record
**Priority**: High  
**Estimated Time**: 10 minutes  
**Dependencies**: Task 1  

**Description**:
Create a helper method in `ActivityTracker` class to retrieve the most recent activity record.

**Acceptance Criteria**:
- [ ] Method `getPreviousActivity()` returns most recent record or null
- [ ] Query uses `ORDER BY id DESC LIMIT 1` for efficiency
- [ ] Returns object with `id`, `process_name`, `created_at`
- [ ] Handles empty database (returns null)

**Files to Modify**:
- `src/tracker.js` - Add new method to ActivityTracker class

**Implementation Notes**:
```javascript
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
```

---

### Task 3: Implement loginwindow Deduplication Logic
**Priority**: High  
**Estimated Time**: 30 minutes  
**Dependencies**: Task 2  

**Description**:
Modify `captureActivity()` method to check if previous record is loginwindow and update instead of insert.

**Acceptance Criteria**:
- [ ] Check if current process is `loginwindow`
- [ ] Get previous activity record
- [ ] If previous is also `loginwindow`, UPDATE instead of INSERT
- [ ] Update: `updated_at`, `cpu_usage`, `memory_usage`, `input_events`, `is_user_active`
- [ ] Keep original: `timestamp`, `created_at`, `id`
- [ ] Log update action with record ID and duration
- [ ] All other processes insert normally

**Files to Modify**:
- `src/tracker.js` - Modify `captureActivity()` method

**Implementation Notes**:
```javascript
async captureActivity(inputStats = null) {
  try {
    const window = await activeWin();
    const cpuUsage = await this.getCPUUsage();
    const memoryUsage = this.getMemoryUsage();

    if (window) {
      const currentProcess = window.owner.name || 'Unknown';
      
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
            inputStats ? inputStats.inputEvents : 0,
            inputStats ? (inputStats.isActive ? 1 : 0) : 1,
            previousRecord.id
          ]);
          
          this.saveDatabase();
          console.log(`📌 Updated loginwindow session (ID: ${previousRecord.id}, duration: ${duration}s)`);
          return;
        }
      }
      
      // Normal INSERT for everything else
      // ... existing insert logic ...
    }
  } catch (error) {
    console.error('❌ Error capturing activity:', error.message);
  }
}
```

---

### Task 4: Update Network Sync to Include `updated_at`
**Priority**: Medium  
**Estimated Time**: 10 minutes  
**Dependencies**: Task 1  

**Description**:
Add `updated_at` field to the sync payload sent to the API.

**Acceptance Criteria**:
- [ ] Include `updated_at` in activity records sent to API
- [ ] Maintain backward compatibility (API should handle missing field)
- [ ] Document field in API payload example

**Files to Modify**:
- `src/networkSync.js` - Update payload mapping
- `README.md` - Update API payload example

**Implementation Notes**:
```javascript
// In networkSync.js
activities: unsyncedData.map(record => ({
  id: record.id,
  timestamp: record.timestamp,
  // ... existing fields ...
  created_at: record.created_at,
  updated_at: record.updated_at  // NEW
}))
```

---

### Task 5: Enhance `view-data.js` to Show Duration
**Priority**: Medium  
**Estimated Time**: 20 minutes  
**Dependencies**: Task 1  

**Description**:
Update the data viewing script to calculate and display session duration for records where `updated_at` differs from `created_at`.

**Acceptance Criteria**:
- [ ] Calculate duration: `updated_at - created_at`
- [ ] Display format: `[HH:MM:SS → HH:MM:SS] process (X min)` for sessions > 10s
- [ ] Regular format: `[HH:MM:SS] process` for single captures
- [ ] Human-readable duration (minutes, hours)
- [ ] Works with records that don't have `updated_at` (backward compatibility)

**Files to Modify**:
- `view-data.js` - Update display logic

**Implementation Notes**:
```javascript
activities.forEach(activity => {
  const createdAt = new Date(activity.created_at);
  const updatedAt = activity.updated_at ? new Date(activity.updated_at) : createdAt;
  const durationMs = updatedAt - createdAt;
  
  const activeIcon = activity.is_user_active ? '✅' : '😴';
  
  if (durationMs > 10000) { // More than 10 seconds = was a session
    const durationMin = Math.round(durationMs / 60000);
    const durationHr = Math.floor(durationMin / 60);
    const displayDuration = durationHr > 0 
      ? `${durationHr}h ${durationMin % 60}m`
      : `${durationMin}m`;
    
    const createdTime = activity.created_at.split(' ')[1];
    const updatedTime = activity.updated_at ? activity.updated_at.split(' ')[1] : createdTime;
    
    console.log(`[${createdTime} → ${updatedTime}] ${activeIcon} ${activity.process_name} (${displayDuration})`);
  } else {
    console.log(`[${activity.timestamp}] ${activeIcon} ${activity.process_name}`);
  }
  
  // Rest of display logic...
});
```

---

### Task 6: Test loginwindow Deduplication Flow
**Priority**: High  
**Estimated Time**: 30 minutes  
**Dependencies**: Task 3, Task 5  

**Description**:
Manually test the complete loginwindow deduplication workflow.

**Test Cases**:
- [ ] Test 1: Fresh database - loginwindow creates first record
- [ ] Test 2: Consecutive loginwindow updates existing record
- [ ] Test 3: Switch from app to loginwindow creates new record
- [ ] Test 4: Switch from loginwindow to app creates new record
- [ ] Test 5: Multiple breaks create separate loginwindow records
- [ ] Test 6: View data shows duration correctly

**Test Script**:
```bash
# Start fresh
rm ~/activity.db
npm start

# Test Case 1: Lock screen (simulate with loginwindow becoming active)
# Wait 10 seconds, check logs for INSERT

# Test Case 2: Keep screen locked
# Wait 20 seconds, check logs for UPDATE messages

# Test Case 3: Unlock screen, switch to Chrome
# Check logs for new INSERT

# Test Case 4: Lock screen again
# Check logs for new INSERT (new session)

# View results
npm run view-data
# Verify: loginwindow sessions show duration
```

**Files to Test**:
- `src/tracker.js`
- `view-data.js`
- Database: `~/activity.db`

---

### Task 7: Update Documentation
**Priority**: Medium  
**Estimated Time**: 15 minutes  
**Dependencies**: All previous tasks  

**Description**:
Update project documentation to reflect the loginwindow deduplication feature.

**Acceptance Criteria**:
- [ ] Update README.md with loginwindow behavior
- [ ] Update database schema documentation
- [ ] Update API payload example with `updated_at` field
- [ ] Add note about break session tracking

**Files to Modify**:
- `README.md` - Update features list and schema
- `INPUT_TRACKING.md` - Mention idle session consolidation

**Documentation Updates**:
```markdown
## Features
- **Smart Break Tracking**: Consecutive login window sessions are consolidated into single records with duration tracking

## Database Schema
- `updated_at`: Timestamp of last update (used for session duration)

## Break Session Tracking
When you lock your screen, the tracker creates one record for the entire "away" session:
- [12:00 → 13:00] loginwindow (60 minutes) ← Lunch break
Each time you return and lock again, a new session is created.
```

---

### Task 8: Clean Up Old loginwindow Records (Optional)
**Priority**: Low  
**Estimated Time**: 15 minutes  
**Dependencies**: Task 6  

**Description**:
Create a utility script to clean up excessive loginwindow records from before this feature was implemented.

**Acceptance Criteria**:
- [ ] Script identifies consecutive unsynced loginwindow records
- [ ] Consolidates them into single record with earliest `created_at` and latest timestamp
- [ ] Preserves first record, deletes duplicates
- [ ] Creates backup before modification
- [ ] Run script is optional (npm script)

**Files to Create**:
- `scripts/cleanup-loginwindow.js` - Cleanup utility

**Implementation Notes**:
```javascript
// Pseudocode
const Database = require('sql.js');
const fs = require('fs');

// Backup database
fs.copyFileSync('~/activity.db', '~/activity.db.backup');

// Find consecutive loginwindow records
const consecutiveGroups = [];
let currentGroup = [];

activities.forEach(record => {
  if (record.process_name === 'loginwindow' && record.synced === 0) {
    currentGroup.push(record);
  } else {
    if (currentGroup.length > 1) {
      consecutiveGroups.push(currentGroup);
    }
    currentGroup = [];
  }
});

// Consolidate each group
consecutiveGroups.forEach(group => {
  const first = group[0];
  const last = group[group.length - 1];
  
  // Update first record
  db.run('UPDATE activities SET updated_at = ? WHERE id = ?', [last.timestamp, first.id]);
  
  // Delete rest
  const idsToDelete = group.slice(1).map(r => r.id);
  db.run(`DELETE FROM activities WHERE id IN (${idsToDelete.join(',')})`);
});
```

---

## 📊 Task Summary

| Task | Priority | Time | Status |
|------|----------|------|--------|
| 1. Add updated_at column | High | 15m | ⏳ Not Started |
| 2. Get previous activity | High | 10m | ⏳ Not Started |
| 3. Implement deduplication | High | 30m | ⏳ Not Started |
| 4. Update network sync | Medium | 10m | ⏳ Not Started |
| 5. Enhanced view-data | Medium | 20m | ⏳ Not Started |
| 6. Testing | High | 30m | ⏳ Not Started |
| 7. Update docs | Medium | 15m | ⏳ Not Started |
| 8. Cleanup script (optional) | Low | 15m | ⏳ Not Started |

**Total Estimated Time**: 2h 25m (core tasks) + 15m (optional)

## 🎯 Success Criteria

When all tasks are complete:
- ✅ Database has `updated_at` column
- ✅ Consecutive loginwindow records are updated, not inserted
- ✅ View data shows session duration: `[12:00 → 13:00] loginwindow (60m)`
- ✅ Multiple breaks show as separate records
- ✅ All tests pass
- ✅ Documentation updated

## 🚀 Getting Started

```bash
# You're already on the feature branch
git branch  # Verify: feature/002-deduplicate-loginwindow

# Start with Task 1
# Edit src/tracker.js to add updated_at column
```
