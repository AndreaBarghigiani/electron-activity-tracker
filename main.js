const { app, Tray, Menu, nativeImage, nativeTheme } = require('electron');
const path = require('path');
const ActivityTracker = require('./src/tracker');
const NetworkSync = require('./src/networkSync');
const InputTracker = require('./src/inputTracker');
require('dotenv').config();

let tray = null;
let tracker = null;
let networkSync = null;
let inputTracker = null;

const LIGHT_TRAY_ICON = path.join(__dirname, 'src', 'assets', 'light-tray-icon.png');
const DARK_TRAY_ICON = path.join(__dirname, 'src', 'assets', 'dark-tray-icon.png');

// Prevent app from showing in dock (macOS) - runs in background
if (process.platform === 'darwin') {
  app.dock.hide();
}

function getTrayIcon() {
  const useDarkColors = nativeTheme.shouldUseDarkColors;
  const iconPath = useDarkColors ? LIGHT_TRAY_ICON : DARK_TRAY_ICON;
  let icon = nativeImage.createFromPath(iconPath);

  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 16, height: 16 });
    if (process.platform === 'darwin') {
      icon.setTemplateImage(true);
    }
  }

  return icon;
}

app.on('ready', async () => {
  console.log('🚀 Activity Tracker starting...');
  
  // Create system tray icon
  createTray();

  // Initialize input tracker (mouse/keyboard)
  inputTracker = new InputTracker();
  await inputTracker.start();

  // Initialize tracker with SQLite
  tracker = new ActivityTracker();
  tracker.initialize();
  
  // Start tracking with input stats
  tracker.start();
  
  // Update tracker to use input stats
  setInterval(() => {
    const inputStats = inputTracker.getActivityStats();
    tracker.captureActivity(inputStats);
  }, 5000); // Every 5 seconds

  // Initialize network sync (every 30 minutes)
  if (process.env.API_ENDPOINT) {
    networkSync = new NetworkSync(tracker);
    networkSync.startSync();
    console.log('✅ Network sync enabled (every 30 minutes)');
  } else {
    console.log('⚠️  No API_ENDPOINT configured - running in offline mode');
  }

  console.log('✅ Activity Tracker is running in background');
});

function createTray() {
  // Create tray icon that adapts to system theme
  const iconData = getTrayIcon();
  tray = new Tray(iconData);

  updateTrayMenu();

  tray.setToolTip('Activity Tracker - Running');

  // Update tray icon if the OS theme changes
  nativeTheme.on('updated', () => {
    tray.setImage(getTrayIcon());
  });
}

function updateTrayMenu() {
  const stats = tracker ? tracker.getStats() : null;
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '🧠 Activity Tracker',
      enabled: false
    },
    { type: 'separator' },
    {
      label: stats ? `📊 Total Records: ${stats.totalRecords}` : '📊 Loading...',
      enabled: false
    },
    {
      label: stats ? `⏳ Unsynced: ${stats.unsyncedRecords}` : '⏳ Loading...',
      enabled: false
    },
    {
      label: stats ? `💾 DB: ${path.basename(stats.dbPath)}` : '💾 Loading...',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Sync Now',
      click: async () => {
        if (networkSync) {
          console.log('Manual sync triggered...');
          await networkSync.syncNow();
        }
      },
      enabled: !!networkSync
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        console.log('Shutting down...');
        if (tracker) tracker.stop();
        if (networkSync) networkSync.stopSync();
        if (inputTracker) inputTracker.stop();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

// Update tray menu periodically to show current stats
setInterval(() => {
  if (tracker) {
    updateTrayMenu();
  }
}, 30000); // Update every 30 seconds

app.on('window-all-closed', () => {
  // Don't quit - this is a background app
});

app.on('before-quit', () => {
  if (tracker) tracker.stop();
  if (networkSync) networkSync.stopSync();
  if (inputTracker) inputTracker.stop();
});
