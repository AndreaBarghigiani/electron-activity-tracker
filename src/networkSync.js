const axios = require('axios');

class NetworkSync {
  constructor(tracker) {
    this.tracker = tracker;
    this.syncInterval = null;
    this.syncIntervalMs = 30 * 60 * 1000; // 30 minutes
    this.apiEndpoint = process.env.API_ENDPOINT;
    this.apiKey = process.env.API_KEY;
  }

  startSync() {
    console.log('🔄 Network sync initialized (every 30 minutes)');
    
    // Sync immediately on start if there's unsynced data
    setTimeout(() => this.syncNow(), 5000); // Wait 5 seconds after startup
    
    // Then sync every 30 minutes
    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, this.syncIntervalMs);
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('🛑 Network sync stopped');
  }

  async syncNow() {
    try {
      const unsyncedData = this.tracker.getUnsyncedActivities();
      
      if (unsyncedData.length === 0) {
        console.log('✅ No data to sync');
        return { success: true, synced: 0 };
      }

      console.log(`📤 Syncing ${unsyncedData.length} records...`);

      // Prepare payload
      const payload = {
        activities: unsyncedData.map(record => ({
          id: record.id,
          timestamp: record.timestamp,
          window_title: record.window_title,
          process_name: record.process_name,
          process_path: record.process_path,
          cpu_usage: parseFloat(record.cpu_usage),
          memory_usage: parseFloat(record.memory_usage),
          platform: record.platform,
          browser_url: record.browser_url,
          browser_tab_title: record.browser_tab_title,
          mouse_movements: record.mouse_movements || 0,
          input_events: record.input_events || record.mouse_movements || 0,
          is_user_active: record.is_user_active === 1,
          created_at: record.created_at
        })),
        metadata: {
          total_records: unsyncedData.length,
          sync_timestamp: new Date().toISOString(),
          device_platform: process.platform
        }
      };

      // Send to API endpoint
      const headers = {
        'Content-Type': 'application/json'
      };

      // Add API key if configured
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.post(this.apiEndpoint, payload, {
        headers,
        timeout: 30000 // 30 second timeout
      });

      if (response.status >= 200 && response.status < 300) {
        // Mark as synced in local database
        const ids = unsyncedData.map(r => r.id);
        this.tracker.markAsSynced(ids);
        
        console.log(`✅ Successfully synced ${unsyncedData.length} records`);
        return { success: true, synced: unsyncedData.length };
      } else {
        console.error(`❌ Sync failed with status: ${response.status}`);
        return { success: false, error: `HTTP ${response.status}` };
      }

    } catch (error) {
      console.error('❌ Network sync error:', error.message);
      
      // Log more details for debugging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      } else if (error.request) {
        console.error('No response received from server');
      }
      
      return { success: false, error: error.message };
    }
  }
}

module.exports = NetworkSync;
