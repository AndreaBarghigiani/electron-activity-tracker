# 🚀 Quick Start Guide

## Testing the Tracker (Without API Endpoint)

### 1. Start the Tracker

```bash
npm start
```

The app will:
- ✅ Run in the background
- ✅ Create a system tray icon
- ✅ Track activity every 10 seconds
- ✅ Store data in `~/activity.db`
- ⚠️  Run in offline mode (no API configured)

### 2. Let It Track

Open some apps and browse the web. The tracker will capture:
- Window titles
- Process names
- **Browser URLs** (Chrome, Safari, Brave, Arc, Edge)
- **Mouse movements** (to detect idle time)
- CPU & memory usage

### 3. View Collected Data

In a new terminal (keep the tracker running):

```bash
npm run view-data
```

You'll see:
- Total records collected
- Last 10 activities (with URLs for browsers!)
- Top 5 most used applications

### 4. Stop the Tracker

Right-click the system tray icon and select **"Quit"**

---

## Permissions (macOS)

### Browser URL Tracking

When you first run the tracker with a browser active, **macOS will ask for permission**:

```
"Warp" would like to control "Google Chrome"
```

**Click "OK"** to enable URL tracking.

If you denied it:
1. **System Settings** → **Privacy & Security** → **Automation**
2. Find your terminal app (Warp, Terminal, iTerm, etc.)
3. Enable control for your browsers

### Mouse Activity Tracking

The app will also need **Accessibility** permissions to track mouse movements:

1. **System Settings** → **Privacy & Security** → **Accessibility**
2. Click "+" and add your terminal app
3. Restart the tracker

**Privacy:** Only movement counts are tracked, not positions or keystrokes.

---

## Database Location

All data is stored locally:
```
~/activity.db
```

You can inspect it directly with any SQLite browser, or use the `npm run view-data` command.

---

## Next Steps

Once you have an API endpoint ready:

1. Edit `.env`:
   ```
   API_ENDPOINT=https://your-api.com/api/activities
   API_KEY=your-optional-key
   ```

2. Restart the tracker:
   ```bash
   npm start
   ```

3. The tracker will:
   - Send unsynced data immediately after 5 seconds
   - Then sync every 30 minutes
   - Continue working offline if network fails

---

## Troubleshooting

**No data appearing?**
- Check if database exists: `ls -la ~/activity.db`
- Check logs in the terminal where you ran `npm start`

**Browser URLs not showing?**
- Make sure you granted automation permissions (see above)
- Only works on macOS
- Only works for: Chrome, Safari, Brave, Arc, Edge

**Want more frequent tracking?**
- Edit `src/tracker.js` line 13: `this.intervalMs = 5000` (5 seconds)
- Edit `src/networkSync.js` line 7: `this.syncIntervalMs = 10 * 60 * 1000` (10 minutes)
