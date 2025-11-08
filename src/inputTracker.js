const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Tracks user input activity on macOS.
 * Uses IOHIDSystem idle time (no Accessibility permission required).
 */
class InputTracker {
  constructor() {
    this.trackingInterval = null;
    this.checkInterval = 2000; // Check every 2 seconds
    this.isTracking = false;

    this.lastIdleSeconds = null;
    this.inputEvents = 0; // number of idle resets in the interval
    this.mouseMovementCount = 0; // alias of inputEvents for compatibility
    this.keyPressCount = 0; // unavailable without native hooks; approximated as part of inputEvents
  }

  async start() {
    if (process.platform !== 'darwin') {
      console.log('⚠️  Input tracking only implemented on macOS');
      return false;
    }

    this.isTracking = true;
    console.log('🖱️  Input activity tracking (idle-based) enabled');

    this.trackingInterval = setInterval(async () => {
      await this.pollIdleTime();
    }, this.checkInterval);

    return true;
  }

  stop() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    this.isTracking = false;
  }

  async getIdleSeconds() {
    try {
      // Query IOHIDSystem idle time in nanoseconds and convert to seconds
      const { stdout } = await execAsync(
        "ioreg -c IOHIDSystem | awk '/HIDIdleTime/ {print $NF/1000000000; exit}'"
      );
      const seconds = parseFloat(stdout.trim());
      return isNaN(seconds) ? null : seconds;
    } catch (_) {
      return null;
    }
  }

  async pollIdleTime() {
    const idle = await this.getIdleSeconds();
    if (idle == null) return;

    // If idle time decreased, user input occurred (mouse or keyboard)
    if (this.lastIdleSeconds != null && idle < this.lastIdleSeconds) {
      this.inputEvents += 1;
    }
    this.lastIdleSeconds = idle;
  }

  getActivityStats() {
    const isActive = this.inputEvents > 0;

    const stats = {
      mouseMovements: this.inputEvents, // exposed as mouse movements for compatibility
      keyPresses: 0, // not directly tracked without native hooks
      inputEvents: this.inputEvents,
      isActive
    };

    // reset counters
    this.inputEvents = 0;

    return stats;
  }
}

module.exports = InputTracker;
