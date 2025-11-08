> [!TIP]
> This entire application is actively developed with [Spec Kit](https://github.com/github/spec-kit) to help me define the application's behavior and structure since I am not a master of Electron 😅
> It is configured to work with [Windsurf](https://windsurf.com/) out of the box. This will not stop you from using Spec Kit via CLI and you're free to add config for other editors (dunno if it is possible, read the [docs](https://github.com/github/spec-kit?tab=readme-ov-file#-get-started) ).

> [!CAUTION]
> This project is a work in progress and is not yet ready for production use.

# 🧠 Electron Activity Tracker

An Electron-based background application that tracks your computer activity and syncs data to a remote server every 30 minutes.

## 🚀 Features

- **Active Window Tracking**: Captures the currently active window and process every 10 seconds
- **Browser URL Tracking**: Extracts actual URLs from Chrome, Safari, Brave, Arc, and Edge (macOS only)
- **Mouse & Keyboard Activity**: Tracks mouse movements to detect idle vs active time (macOS only)
- **System Metrics**: Records CPU and memory usage
- **Local SQLite Storage**: All data is stored locally in `~/activity.db`
- **Periodic Network Sync**: Sends collected data to your API endpoint every 30 minutes
- **Background Operation**: Runs silently in the background with system tray integration
- **Offline Support**: Continues tracking even when network is unavailable

## 📋 Requirements

- Node.js ≥ 16.x
- macOS (primary), Linux or Windows
- An API endpoint to receive the activity data

> [!IMPORTANT]
> On macOS you must grant both **Automation** and **Accessibility** permissions the first time you run the tracker, otherwise URL capture and idle detection will be disabled.

## ⚙️ Installation

1. **Clone or download this project**:

   ```bash
   cd /path/to/ai-tracker
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure environment variables**:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set your API endpoint:

   ```
   API_ENDPOINT=https://your-api.com/api/activities
   API_KEY=your-api-key-here  # Optional
   ```

## 🎯 Usage

### Development Mode

Run the app in development mode:

```bash
npm start
```

The app will:

- Start tracking activity every 10 seconds
- Store data in `~/activity.db`
- Sync data to your API every 30 minutes
- Run in the background with a system tray icon

### Manual Sync

Right-click the system tray icon and select "Sync Now" to manually trigger a sync.

### Stop the App

Right-click the system tray icon and select "Quit".

### View Collected Data (Testing Without API)

You can test the tracker without an API endpoint. Simply don't configure `API_ENDPOINT` in `.env` and the app will run in offline mode.

To view the collected data:

```bash
npm run view-data
```

This will show:

- Total and unsynced records
- Last 10 activities (including URLs for browsers)
- Top 5 most used applications

## 📦 Building Executable

Build a standalone application for your platform:

```bash
# macOS
npm run package:mac

# Windows
npm run package:win

# Linux
npm run package:linux
```

The executable will be in the `dist/` directory.

## 📊 Data Structure

### Local SQLite Database

Location: `~/activity.db`

Schema:

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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Network Payload

Every 30 minutes, the app sends a POST request to your API endpoint with this structure:

```json
{
  "activities": [
    {
      "id": 1,
      "timestamp": "2025-11-07 17:30:00",
      "window_title": "GitHub - Activity Tracker",
      "process_name": "Google Chrome",
      "process_path": "/Applications/Google Chrome.app",
      "cpu_usage": 15.32,
      "memory_usage": 45.67,
      "platform": "darwin",
      "browser_url": "https://github.com/yourusername/ai-tracker",
      "browser_tab_title": "GitHub - Activity Tracker",
      "mouse_movements": 45,
      "is_user_active": true,
      "created_at": "2025-11-07 17:30:00"
    }
  ],
  "metadata": {
    "total_records": 180,
    "sync_timestamp": "2025-11-07T18:00:00.000Z",
    "device_platform": "darwin"
  }
}
```

## 🔐 API Endpoint Requirements

Your API endpoint should:

- Accept POST requests
- Accept `application/json` content type
- Return 2xx status code on success
- Optionally support Bearer token authentication via `Authorization` header

Example response:

```json
{
  "success": true,
  "received": 180
}
```

## 🌐 Browser URL Tracking

On **macOS**, the app can extract actual URLs from browsers using AppleScript:

**Supported Browsers:**

- Google Chrome
- Safari
- Brave Browser
- Microsoft Edge
- Arc

**First Time Setup:**

When you first run the app, macOS will ask for permission to control your browser. You must **Allow** this for URL tracking to work.

If you denied permission, you can fix it:

1. Open **System Settings** > **Privacy & Security** > **Automation**
2. Find your terminal app (e.g., Terminal, Warp, iTerm)
3. Enable control for your browsers

**Note:** URL tracking only works on macOS. On Windows/Linux, only window titles are captured.

## 🖱️ Mouse & Keyboard Activity Tracking

On **macOS**, the app tracks mouse movements to determine if you're actively using the computer:

**What's Tracked:**

- Mouse movements (checked every 2 seconds)
- User activity status (Active vs Idle)

**Privacy Note:** The app only tracks **movement counts**, not specific positions, keystrokes, or clicked content.

**Accessibility Permissions Required:**

When you first run the app, macOS will ask for **Accessibility** permission:

1. Go to **System Settings** → **Privacy & Security** → **Accessibility**
2. Click the "+" button or toggle on your terminal app (Warp, Terminal, iTerm, etc.)
3. Restart the tracker

Without this permission, the app will still track windows and URLs but won't detect idle time.

## 🛠️ Configuration

- **Tracking Interval**: Edit `intervalMs` in `src/tracker.js` (default: 10 seconds)
- **Sync Interval**: Edit `syncIntervalMs` in `src/networkSync.js` (default: 30 minutes)
- **Database Location**: Edit `dbPath` in `src/tracker.js` (default: `~/activity.db`)

## 📝 Logs

The app logs to stdout. To save logs when running in background:

```bash
npm start > tracker.log 2>&1
```

## 🔒 Privacy Note

This app tracks your active windows and processes. All data is stored locally and only sent to the endpoint you configure. Make sure you trust the API endpoint you're sending data to.

## 📄 License

MIT
