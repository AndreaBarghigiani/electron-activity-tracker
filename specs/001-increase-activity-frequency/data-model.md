# Data Model: ActivityEvent

This feature does not introduce any changes to the existing database schema. It only affects the frequency and manner in which data is written to the `activities` table.

## Existing `activities` Table Schema

The `tracker.js` file defines the following schema:

```sql
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
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  input_events INTEGER DEFAULT 0
)
```

## Key Entity

-   **ActivityEvent**: This corresponds to a single row in the `activities` table. It represents a snapshot of user activity at a specific point in time.
    -   **`id`**: Unique identifier for the event.
    -   **`timestamp`**: The time the event was recorded.
    -   **`process_name`**: The name of the active application (e.g., "Google Chrome", "Code").
    -   **`window_title`**: The title of the active window.
    -   **`is_user_active`**: A boolean (0 or 1) indicating if the user was active (mouse/keyboard input) during the interval.
    -   ... and other system metrics.

## State Transitions

-   A new `ActivityEvent` record is created (a new row is `INSERT`ed) every 5 seconds if the user is active.
-   A new `ActivityEvent` is also created immediately upon a change in the active window, although the current implementation will pick this up on the next 5-second poll.
