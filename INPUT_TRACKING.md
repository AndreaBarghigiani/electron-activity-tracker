# 🖱️ Input Activity Tracking

## Overview

The tracker now includes **input activity detection** on macOS **without requiring Accessibility permissions**!

## How It Works

Instead of directly monitoring mouse/keyboard events (which requires permissions), we use **IOHIDSystem idle time**:

- Every 2 seconds, we check system idle time using `ioreg -c IOHIDSystem`
- When idle time **decreases**, it means the user interacted (mouse or keyboard)
- We count these "idle resets" as **input events**

## What's Tracked

- **Input Events**: Number of detected user interactions in the tracking interval (10 seconds)
- **Active Status**: Boolean flag indicating if user was active during the interval
- **Privacy-First**: No actual positions, clicks, or keystrokes are recorded

## Benefits

✅ **No permissions required** - Works out of the box on macOS  
✅ **Detects all input** - Mouse movements, clicks, keyboard activity  
✅ **Privacy-friendly** - Only counts events, no sensitive data  
✅ **Idle detection** - Automatically marks periods when user is away  

## Database Fields

```sql
mouse_movements INTEGER -- Legacy field, now contains input events count
input_events INTEGER    -- Explicit count of detected interactions  
is_user_active INTEGER  -- 1 if active, 0 if idle
```

## Example Output

```
📊 Activity Tracker Database

📋 Last activities:

[2025-11-07 18:30:00] ✅ Google Chrome
  🌐 URL: https://github.com
  🖘️  Input events: 23 | Active: Yes
  CPU: 15.32% | Memory: 45.67%

[2025-11-07 18:29:50] 😴 Terminal
  Window: bash
  🖘️  Input events: 0 | Active: Idle
  CPU: 2.1% | Memory: 45.50%
```

## Use Cases

- **Productivity Analysis**: See actual work time vs idle time
- **Time Tracking**: Accurately bill for active work periods
- **Break Detection**: Identify when user takes breaks
- **Activity Patterns**: Understand work habits and focus periods

## Limitations

- **macOS only**: Uses IOHIDSystem which is macOS-specific
- **Indirect**: Counts idle resets, not actual events (close approximation)
- **2-second polling**: May miss very brief interactions
- **No distinction**: Can't differentiate between mouse and keyboard

## Future Enhancements

If Accessibility permissions are granted, we could add:
- Exact mouse position tracking
- Click and scroll detection
- Keystroke counting (not content!)
- More granular activity metrics
