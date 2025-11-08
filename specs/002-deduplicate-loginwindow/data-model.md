# Data Model: Consecutive Login Window Deduplication

## Entity: Activity

### Core Fields (Existing)
- `id` - INTEGER PRIMARY KEY AUTOINCREMENT
- `timestamp` - DATETIME DEFAULT CURRENT_TIMESTAMP
- `window_title` - TEXT
- `process_name` - TEXT
- `process_path` - TEXT
- `cpu_usage` - REAL
- `memory_usage` - REAL
- `platform` - TEXT
- `browser_url` - TEXT
- `browser_tab_title` - TEXT
- `mouse_movements` - INTEGER DEFAULT 0
- `is_user_active` - INTEGER DEFAULT 1
- `synced` - INTEGER DEFAULT 0
- `created_at` - DATETIME DEFAULT CURRENT_TIMESTAMP
- `input_events` - INTEGER DEFAULT 0

### New Fields
- `updated_at` - DATETIME DEFAULT CURRENT_TIMESTAMP
  - Tracks when a record was last updated
  - Used to calculate session duration for loginwindow deduplication
  - Defaults to created_at for existing records via migration

## Relationships

### Self-Referential (Temporal)
- Each activity record has an implicit "previous" relationship via ORDER BY id DESC
- Used for consecutive loginwindow detection

## State Transitions

### Activity Capture Flow
```
New Activity Detected
    ↓
Get Previous Record (ORDER BY id DESC LIMIT 1)
    ↓
Is Previous & Current both 'loginwindow'?
    ├─ YES → UPDATE existing record
    └─ NO  → INSERT new record
```

### Record Lifecycle
1. **INSERT**: First occurrence of any process
2. **UPDATE**: Only for consecutive loginwindow records
3. **READ**: View data with duration calculation
4. **SYNC**: Mark as synced (existing behavior)

## Validation Rules

### Process Name Validation
- `process_name` must not be null or empty
- `loginwindow` is the special process for deduplication

### Timestamp Validation
- `created_at` <= `updated_at` (enforced by application logic)
- `updated_at` defaults to `created_at` for new records

### Data Integrity
- Duration calculation: `updated_at - created_at` >= 0
- Session boundaries preserved when process switches

## Index Strategy

### Existing Indexes
- Primary key on `id` (used for ORDER BY id DESC LIMIT 1)
- Index on `synced` (for network sync operations)

### No New Indexes Needed
- Previous record query uses primary key index
- No performance impact from new column

## Migration Schema

### Step 1: Add Column
```sql
ALTER TABLE activities ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
```

### Step 2: Backfill Existing Records
```sql
UPDATE activities SET updated_at = created_at WHERE updated_at IS NULL;
```

### Migration Notes
- Existing records maintain data integrity
- New column has sensible default
- No data loss or corruption risk
