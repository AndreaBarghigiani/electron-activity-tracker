# Feature Specification: Consecutive Login Window Deduplication

## 📋 Overview

**Feature ID**: 002  
**Feature Name**: Consecutive Login Window Deduplication  
**Priority**: High  
**Status**: Specified  

## 🎯 Problem Statement

When the user steps away from their computer and the screen locks, the activity tracker logs the macOS login window (`loginwindow` process) every 10 seconds. This creates excessive duplicate entries for a single "away" session.

### Current Behavior (Problem)
```
[10:00:00] Chrome          ← working
[10:00:10] Chrome          ← working
[10:00:20] loginwindow     ← user locks screen (away break starts)
[10:00:30] loginwindow     ← duplicate!
[10:00:40] loginwindow     ← duplicate!
[10:00:50] loginwindow     ← duplicate!
... (hundreds of duplicates)
[11:30:00] loginwindow     ← duplicate!
[11:30:10] Chrome          ← user returns (break ends)
```

Result: 540 `loginwindow` records for a 90-minute break.

## ✅ Desired Outcome

Track the **continuous session** of `loginwindow` as a single record that gets updated:

```
[10:00:00] Chrome                              ← working
[10:00:10] Chrome                              ← working
[10:00:20 → 11:30:00] loginwindow (90 min)    ← ONE record for entire break
[11:30:10] Chrome                              ← user returns
```

### Key Behavior
- If **previous** record is `loginwindow` → **UPDATE** it
- If **previous** record is something else → **CREATE** new `loginwindow` record
- This naturally tracks separate "away" sessions:

```
[09:00:00] Chrome
[09:15:00 → 09:20:00] loginwindow (5 min)     ← coffee break
[09:20:10] Chrome
[12:00:00 → 13:00:00] loginwindow (60 min)    ← lunch break
[13:00:10] Chrome
```

## 📊 Requirements

### Functional Requirements

#### FR1: Add `updated_at` Column
**Description**: Track when a record was last updated  
**Acceptance Criteria**:
- Add column `updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`
- Migration handles existing database (sets `updated_at = created_at` for old records)
- Default value on insert: `CURRENT_TIMESTAMP`

#### FR2: Check Previous Activity Record
**Description**: Before inserting, check if the most recent activity is also `loginwindow`  
**Acceptance Criteria**:
- Query for the most recent record: `SELECT * FROM activities ORDER BY id DESC LIMIT 1`
- Compare `process_name` of previous record with current window
- Only applies when current process is `loginwindow`

#### FR3: Update Consecutive loginwindow
**Description**: If previous record is `loginwindow` and current is `loginwindow`, update instead of insert  
**Acceptance Criteria**:
- UPDATE the previous row's `updated_at = CURRENT_TIMESTAMP`
- UPDATE metrics: `cpu_usage`, `memory_usage`, `input_events`, `is_user_active`
- Keep original `timestamp`, `created_at`, and `id` unchanged
- Log: `"📌 Updated loginwindow session (ID: 123, duration: 90s)"`

#### FR4: Insert When Different Process
**Description**: Create new row when switching TO or FROM loginwindow  
**Acceptance Criteria**:
- Previous: `Chrome`, Current: `loginwindow` → **INSERT** new `loginwindow`
- Previous: `loginwindow`, Current: `Chrome` → **INSERT** new `Chrome`
- Previous: `Chrome`, Current: `Firefox` → **INSERT** new `Firefox`
- This creates natural session boundaries

#### FR5: Handle First Record
**Description**: If database is empty, always insert  
**Acceptance Criteria**:
- When no previous record exists, insert normally
- Handles fresh database initialization

### Non-Functional Requirements

#### NFR1: Performance
- Query for previous record must be instant (already in memory, just sorted by ID DESC)
- No additional indexes needed (PK lookup is fast)

#### NFR2: Simplicity
- Logic is straightforward: "if previous == loginwindow && current == loginwindow, then update"
- No complex time windows or sync status checks needed

#### NFR3: Data Integrity
- Each distinct "away session" remains a separate record
- Duration can be calculated: `updated_at - created_at`

## 📐 Database Schema Changes

### Migration
```sql
-- Add updated_at column
ALTER TABLE activities ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Set updated_at for existing records
UPDATE activities SET updated_at = created_at WHERE updated_at IS NULL;
```

### No New Indexes Required
The query `SELECT * FROM activities ORDER BY id DESC LIMIT 1` uses the primary key and is already optimal.

## 🔄 User Stories

### User Story 1: Track Single Break Session
**As a** user  
**I want** my lunch break to appear as one record  
**So that** I can see clear break boundaries in my activity log

**Acceptance Criteria**:
- Lock screen at 12:00 → creates ONE loginwindow record
- Stays locked until 13:00 → record updates every 10s
- Unlock at 13:00 → record shows `[12:00:00 → 13:00:00] loginwindow`

### User Story 2: Track Multiple Breaks
**As a** user  
**I want** separate breaks to be tracked separately  
**So that** I can analyze my break patterns

**Acceptance Criteria**:
```
Morning coffee: [09:15 → 09:20] loginwindow (5 min)
Lunch break:    [12:00 → 13:00] loginwindow (60 min)
Afternoon walk: [15:30 → 15:45] loginwindow (15 min)
```

### User Story 3: View Duration
**As a** user  
**I want** to see how long each break lasted  
**So that** I can understand my time away from work

**Acceptance Criteria**:
- `view-data.js` calculates duration: `updated_at - created_at`
- Displays: `"[12:00:00 → 13:00:00] loginwindow (60 minutes)"`

## 🧪 Test Scenarios

### Scenario 1: User Locks Screen
```
Step 1: Chrome active → Insert Chrome record
Step 2: User locks → loginwindow active
        Previous record: Chrome
        Current: loginwindow
        Action: INSERT new loginwindow
```

### Scenario 2: Screen Stays Locked
```
Step 1: loginwindow active (from 10s ago)
Step 2: loginwindow still active
        Previous record: loginwindow
        Current: loginwindow
        Action: UPDATE previous loginwindow (set updated_at = now)
```

### Scenario 3: User Unlocks Screen
```
Step 1: loginwindow active
Step 2: User unlocks → Chrome active
        Previous record: loginwindow
        Current: Chrome
        Action: INSERT new Chrome record
```

### Scenario 4: Multiple Breaks in One Day
```
[09:00] Chrome           INSERT
[09:15] loginwindow      INSERT (previous was Chrome)
[09:15] loginwindow      UPDATE (previous was loginwindow)
[09:20] Chrome           INSERT (previous was loginwindow)
[12:00] loginwindow      INSERT (previous was Chrome - NEW BREAK SESSION)
[12:00] loginwindow      UPDATE (previous was loginwindow)
[13:00] Chrome           INSERT (previous was loginwindow)
```

Result: 2 separate loginwindow sessions tracked correctly

## 🚀 Implementation

### Algorithm Pseudocode
```javascript
async function captureActivity(inputStats) {
  const currentWindow = await getActiveWindow();
  const currentProcess = currentWindow.owner.name;
  
  // Get the most recent activity record
  const previousRecord = db.exec(`
    SELECT id, process_name, created_at 
    FROM activities 
    ORDER BY id DESC 
    LIMIT 1
  `)[0];
  
  // Check if we should update instead of insert
  if (previousRecord && 
      previousRecord.process_name === 'loginwindow' && 
      currentProcess === 'loginwindow') {
    
    // Update existing loginwindow record
    const recordId = previousRecord.id;
    const duration = (Date.now() - new Date(previousRecord.created_at)) / 1000;
    
    db.run(`
      UPDATE activities 
      SET updated_at = CURRENT_TIMESTAMP,
          cpu_usage = ?,
          memory_usage = ?,
          input_events = ?,
          is_user_active = ?
      WHERE id = ?
    `, [cpuUsage, memoryUsage, inputEvents, isActive, recordId]);
    
    console.log(`📌 Updated loginwindow session (ID: ${recordId}, duration: ${duration}s)`);
    saveDatabase();
    return;
  }
  
  // Normal insert for everything else
  db.run(`INSERT INTO activities (...)`, [...]);
  console.log(`✅ Tracked: ${currentProcess} - ${currentWindow.title}`);
  saveDatabase();
}
```

### View Data Enhancement
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

## 📈 Success Metrics

**Example: 2-hour locked screen**

Before:
- Records created: 720 (one every 10 seconds)
- Database rows: 720
- Storage: ~100 KB

After:
- Records created: 1 (updated 719 times)
- Database rows: 1
- Storage: ~0.15 KB
- **99.86% reduction**

## 📝 Implementation Notes

### Simple Logic
1. Get current window
2. Get previous record (ORDER BY id DESC LIMIT 1)
3. If both are `loginwindow` → UPDATE
4. Else → INSERT

### Why This Works
- Natural session boundaries: switching to/from loginwindow creates new records
- No time windows needed: consecutive check is sufficient
- No sync status needed: logic applies to all records
- Handles tracker restarts: first record after restart will INSERT, then subsequent loginwindows UPDATE

### Edge Cases Handled
- **Empty database**: No previous record → INSERT
- **Tracker restart during loginwindow**: Next loginwindow will INSERT (different session after restart)
- **Fast user switching**: Each loginwindow instance is separate
- **Display sleep vs lock**: Both show loginwindow, both deduplicated correctly

## 🔗 Dependencies

- Database must support `ALTER TABLE` (SQLite does)
- `updated_at` must default to `CURRENT_TIMESTAMP`
- Migration runs once on first startup after update
