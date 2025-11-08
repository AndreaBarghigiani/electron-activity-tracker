# Research & Analysis: Increase Activity Tracking Resolution

## 1. Research Tasks & Findings

### Task: Analyze the current activity tracking and data storage mechanism.

-   **Finding 1: Main Loop in `main.js`**: The core logic is in `main.js`. A `setInterval` function runs every 10,000ms (10 seconds). Inside this loop, it gets input statistics from `inputTracker` and calls `tracker.captureActivity()`.
-   **Finding 2: Activity Capture in `tracker.js`**: The `captureActivity` function in `src/tracker.js` is responsible for gathering data from `active-win`, CPU/memory usage, and the input stats. It then prepares a SQL statement to write this data to the SQLite database.
-   **Finding 3: Input Tracking in `inputTracker.js`**: The `inputTracker.js` module checks for user idle time on macOS every 2 seconds. It doesn't capture individual events but rather detects if the user was active at all during the polling interval.
-   **Finding 4: Database Writes**: The system uses `better-sqlite3` for synchronous database operations. For most activities, it performs an `INSERT`. However, it has a special deduplication logic for `loginwindow` activity, where it performs an `UPDATE` on the last record if it was also a `loginwindow` event.

### Task: Determine the best approach to increase the tracking frequency to 5 seconds and capture more granular events.

-   **Decision**: The most direct approach is to change the `setInterval` in `main.js` from `10000` to `5000`.
-   **Rationale**: This is a simple change that directly addresses the "write more frequently" requirement. The existing architecture supports this change without major refactoring.
-   **Alternatives Considered**:
    -   **Event-driven approach**: Instead of a fixed interval, trigger `captureActivity` on window change events. This would be more complex to implement and might miss activity within a single window. The current polling approach is sufficient to meet the requirements.

### Task: Determine the necessary changes to the database write logic to ensure a new row is created for each event.

-   **Decision**: The `loginwindow` deduplication logic in `tracker.js` will be retained. This means that when the `loginwindow` is active, the existing record will be updated, rather than a new one being inserted. For all other activities, a new row will be inserted.
-   **Rationale**: The user has explicitly requested to keep this logic to update the `updated_at` column when away, which is essential for their use case.
-   **Alternatives Considered**:
    -   **Remove the logic**: This was initially considered but rejected based on user feedback.

## 2. Implementation Strategy

1.  **Modify `main.js`**:
    -   Locate the `setInterval` that calls `tracker.captureActivity()`.
    -   Change the interval from `10000` to `5000`.

2.  **No changes to `src/tracker.js` related to `loginwindow` deduplication**: The existing logic will be preserved.

3.  **No changes to `inputTracker.js`**: The current 2-second polling interval for user activity is sufficient to determine if the user is active within the new 5-second tracking interval.

This strategy is straightforward, minimally invasive, and directly addresses all functional requirements from the specification, while respecting the user's specific requirement for `loginwindow` activity.
