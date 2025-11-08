# API Contracts: Consecutive Login Window Deduplication

## Internal API: ActivityTracker.captureActivity()

### Method Signature
```javascript
async captureActivity(inputStats = null)
```

### Input Parameters
- `inputStats` (Object, optional): Input activity statistics
  - `mouseMovements` (Integer): Number of mouse movements detected
  - `isActive` (Boolean): Whether user is currently active
  - `inputEvents` (Integer): Total input events count

### Behavior Changes

#### Previous Behavior
Always INSERT new activity record

#### New Behavior
1. Get current active window information
2. Query previous activity record: `SELECT * FROM activities ORDER BY id DESC LIMIT 1`
3. If previous record exists AND both previous and current process_name are 'loginwindow':
   - UPDATE existing record with new metrics and timestamp
   - Log update message with duration
4. Otherwise:
   - INSERT new activity record (existing behavior)
   - Log insert message

### Return Value
- `undefined` (void function)

### Side Effects
- Database INSERT or UPDATE operation
- Database save to disk
- Console logging of activity

## Database Schema Contract

### Table: activities
```sql
CREATE TABLE activities (
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
  input_events INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP  -- NEW
);
```

### Migration Contract
```sql
-- Add updated_at column
ALTER TABLE activities ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Backfill existing records
UPDATE activities SET updated_at = created_at WHERE updated_at IS NULL;
```

## Query Contracts

### Get Previous Record
```sql
SELECT id, process_name, created_at 
FROM activities 
ORDER BY id DESC 
LIMIT 1
```

### Update Consecutive LoginWindow
```sql
UPDATE activities 
SET updated_at = CURRENT_TIMESTAMP,
    cpu_usage = ?,
    memory_usage = ?,
    input_events = ?,
    is_user_active = ?
WHERE id = ?
```

### Insert New Activity (Unchanged)
```sql
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
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
```

## Display Contract: view-data.js

### Duration Calculation
```javascript
const durationMs = new Date(activity.updated_at) - new Date(activity.created_at);
if (durationMs > 10000) { // More than 10 seconds = was updated
  const durationMin = Math.round(durationMs / 60000);
  display = `[${activity.created_at} → ${activity.updated_at}] ${activity.process_name} (${durationMin} min)`;
} else {
  display = `[${activity.created_at}] ${activity.process_name}`;
}
```

### Output Format
- Single records: `[12:00:00] Chrome`
- Session records: `[12:00:00 → 13:00:00] loginwindow (60 min)`

## Error Handling Contract

### Database Errors
- Log error message but continue operation
- Do not crash application on database failures

### Edge Cases
- Empty database: INSERT first record normally
- Single record: INSERT new record (no previous to compare)
- Process switches: Always INSERT (creates session boundaries)

## Performance Contract

### Query Performance
- Previous record lookup: <1ms (primary key index)
- UPDATE operation: <1ms (indexed by primary key)
- INSERT operation: <1ms (standard operation)

### Memory Usage
- No additional memory overhead
- Database size reduction: ~99% for loginwindow sessions
