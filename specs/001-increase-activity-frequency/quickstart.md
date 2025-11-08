# Quickstart: Testing Increased Activity Resolution

This guide explains how to test the changes for the `001-increase-activity-frequency` feature.

## 1. Prerequisites

-   You must be on the `001-increase-activity-frequency` branch.
-   The application must be installed (`npm install`).

## 2. Running the Application

Start the application with the following command:

```bash
npm start
```

The application will run in the background, and you will see a tray icon.

## 3. Testing Scenarios

### Scenario 1: Verify 5-Second Interval

1.  Keep a single application window (e.g., a text editor) active and provide continuous input (e.g., move the mouse).
2.  Wait for 15-20 seconds.
3.  Stop the application by clicking "Quit" in the tray icon menu.
4.  Run the `view-data` script to inspect the database:
    ```bash
    npm run view-data
    ```
5.  **Expected Result**: You should see at least 3-4 new rows in the `activities` table for the text editor application, each created approximately 5 seconds apart.

### Scenario 2: Verify Granular Window Switching

1.  Start the application.
2.  Quickly switch between three different applications (e.g., your code editor, a web browser, and a terminal) over a period of 10 seconds.
3.  Stop the application.
4.  Run `npm run view-data`.
5.  **Expected Result**: You should see distinct rows for each application you switched to, accurately reflecting the order and approximate time you spent in each.

### Scenario 3: Verify Inactivity Tracking

1.  Start the application.
2.  Do not touch your mouse or keyboard for 15-20 seconds.
3.  Stop the application.
4.  Run `npm run view-data`.
5.  **Expected Result**: The `is_user_active` column should be `0` for the rows corresponding to the period of inactivity. No new rows should be generated if the active window remains the same during the inactive period.
