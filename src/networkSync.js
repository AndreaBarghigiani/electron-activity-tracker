const axios = require('axios');
const { aggregateActivitiesToSessions } = require('./sessionAggregator');

class NetworkSync {
  constructor(tracker, authManager = null) {
    this.tracker = tracker;
    this.authManager = authManager;
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

      // Aggregate raw samples into higher-level sessions
      const { sessions, sourceIds } =
        aggregateActivitiesToSessions(unsyncedData);

      if (sessions.length === 0) {
        console.log('⚠️ Aggregation produced no sessions; skipping sync');
        return {
          success: false,
          synced: 0,
          error: 'No sessions after aggregation',
        };
      }

      console.log(
        `📤 Syncing ${sessions.length} aggregated sessions from ${unsyncedData.length} raw records...`
      );

      // Batch syncing to avoid timeouts with large datasets
      const batchSize = 100; // 100 sessions per batch
      if (sessions.length > batchSize) {
        console.log(`📦 Breaking into batches of ${batchSize} sessions...`);
        return await this.syncInBatches(sessions, sourceIds, batchSize);
      }

      // Optional: include authenticated user ID if authManager is provided
      let userId = null;
      let authHeadersConfig = {};

      if (this.authManager) {
        const user = this.authManager.getUser?.();
        if (user && user.id) {
          userId = user.id;
        }

        authHeadersConfig = this.authManager.getAuthHeaders?.() || {};
      }

      const payload = {
        userId,
        activities: sessions.map((session) => ({
          // Time and duration
          timestamp: session.startTimestamp,
          start_timestamp: session.startTimestamp,
          end_timestamp: session.endTimestamp,
          duration_seconds: session.durationSeconds,

          // App/window/browser data
          window_title: session.window_title,
          process_name: session.process_name,
          process_path: session.process_path,
          platform: session.platform,
          browser_url: session.browser_url,
          browser_tab_title: session.browser_tab_title,

          // Aggregated metrics
          cpu_usage: session.cpu_usage_avg,
          memory_usage: session.memory_usage_avg,
          mouse_movements: session.mouse_movements_total,
          input_events: session.input_events_total,
          is_user_active: session.is_user_active,

          // Debug/analytics fields (optional on server)
          sample_count: session.sample_count,
        })),
        metadata: {
          total_records: unsyncedData.length,
          total_sessions: sessions.length,
          sync_timestamp: new Date().toISOString(),
          device_platform: process.platform,
        },
      };

      // Send to API endpoint
      const headers = {
        'Content-Type': 'application/json',
        ...(authHeadersConfig.headers || {}),
      };

      // Add API key if configured (overrides any Authorization from auth headers)
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await axios.post(this.apiEndpoint, payload, {
        headers,
        timeout: 30000, // 30 second timeout
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(
          `✅ Server accepted ${sessions.length} sessions (${sourceIds.length} raw records)`
        );
        console.log(
          `🔍 sourceIds to mark as synced:`,
          sourceIds.slice(0, 10),
          sourceIds.length > 10 ? `... and ${sourceIds.length - 10} more` : ''
        );

        // Mark all underlying raw records as synced in local database
        this.tracker.markAsSynced(sourceIds);

        console.log(`✅ Successfully completed sync`);
        return {
          success: true,
          synced: sessions.length,
          rawSynced: sourceIds.length,
        };
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

  async syncInBatches(sessions, sourceIds, batchSize) {
    let totalSynced = 0;
    let totalRawSynced = 0;

    // Create a map of session index to source IDs
    const sessionSourceMap = new Map();
    sessions.forEach((session, idx) => {
      sessionSourceMap.set(idx, session.source_ids || []);
    });

    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(sessions.length / batchSize);

      // Collect source IDs for this batch
      const batchSourceIds = [];
      for (let j = i; j < i + batch.length; j++) {
        const sessionSources = sessionSourceMap.get(j) || [];
        batchSourceIds.push(...sessionSources);
      }

      console.log(
        `📦 Syncing batch ${batchNum}/${totalBatches} (${batch.length} sessions, ${batchSourceIds.length} raw records)...`
      );

      try {
        const result = await this.syncBatch(batch, batchSourceIds);
        if (result.success) {
          totalSynced += result.synced || 0;
          totalRawSynced += result.rawSynced || 0;
        } else {
          console.error(`❌ Batch ${batchNum} failed:`, result.error);
          // Continue with next batch instead of failing completely
        }
      } catch (error) {
        console.error(`❌ Batch ${batchNum} error:`, error.message);
        // Continue with next batch
      }

      // Small delay between batches to avoid overwhelming the server
      if (i + batchSize < sessions.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    console.log(
      `✅ Batch sync complete: ${totalSynced} sessions (${totalRawSynced} raw records)`
    );
    return { success: true, synced: totalSynced, rawSynced: totalRawSynced };
  }

  async syncBatch(sessions, batchSourceIds) {
    let userId = null;
    let authHeadersConfig = {};

    if (this.authManager) {
      const user = this.authManager.getUser?.();
      if (user && user.id) {
        userId = user.id;
      }

      authHeadersConfig = this.authManager.getAuthHeaders?.() || {};
    }

    const payload = {
      userId,
      activities: sessions.map((session) => ({
        timestamp: session.startTimestamp,
        start_timestamp: session.startTimestamp,
        end_timestamp: session.endTimestamp,
        duration_seconds: session.durationSeconds,
        window_title: session.window_title,
        process_name: session.process_name,
        process_path: session.process_path,
        platform: session.platform,
        browser_url: session.browser_url,
        browser_tab_title: session.browser_tab_title,
        cpu_usage: session.cpu_usage_avg,
        memory_usage: session.memory_usage_avg,
        mouse_movements: session.mouse_movements_total,
        input_events: session.input_events_total,
        is_user_active: session.is_user_active,
        sample_count: session.sample_count,
      })),
      metadata: {
        total_records: batchSourceIds.length,
        total_sessions: sessions.length,
        sync_timestamp: new Date().toISOString(),
        device_platform: process.platform,
      },
    };

    const headers = {
      'Content-Type': 'application/json',
      ...(authHeadersConfig.headers || {}),
    };

    // Add API key if configured (overrides any Authorization from auth headers)
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await axios.post(this.apiEndpoint, payload, {
      headers,
      timeout: 30000,
    });

    if (response.status >= 200 && response.status < 300) {
      console.log(
        `✅ Server accepted ${sessions.length} sessions (${batchSourceIds.length} raw records)`
      );
      console.log(
        `🔍 sourceIds to mark as synced:`,
        batchSourceIds.slice(0, 10),
        batchSourceIds.length > 10
          ? `... and ${batchSourceIds.length - 10} more`
          : ''
      );

      // Mark all underlying raw records as synced in local database
      this.tracker.markAsSynced(batchSourceIds);

      console.log(`✅ Successfully completed sync`);
      return {
        success: true,
        synced: sessions.length,
        rawSynced: batchSourceIds.length,
      };
    } else {
      console.error(`❌ Sync failed with status: ${response.status}`);
      return { success: false, error: `HTTP ${response.status}` };
    }
  }
}

module.exports = NetworkSync;
