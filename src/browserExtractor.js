const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class BrowserExtractor {
  constructor() {
    // List of browsers we support
    this.supportedBrowsers = {
      'Google Chrome': 'chrome',
      'Chrome': 'chrome',
      'Safari': 'safari',
      'Brave Browser': 'brave',
      'Arc': 'arc',
      'Microsoft Edge': 'edge'
    };
  }

  /**
   * Check if the process is a supported browser
   */
  isBrowser(processName) {
    return Object.keys(this.supportedBrowsers).some(browser => 
      processName.toLowerCase().includes(browser.toLowerCase())
    );
  }

  /**
   * Extract URL and tab info from active browser
   */
  async extractBrowserInfo(processName) {
    try {
      // Only works on macOS
      if (process.platform !== 'darwin') {
        return null;
      }

      // Determine which browser
      let browserType = null;
      for (const [name, type] of Object.entries(this.supportedBrowsers)) {
        if (processName.toLowerCase().includes(name.toLowerCase())) {
          browserType = type;
          break;
        }
      }

      if (!browserType) {
        return null;
      }

      // Get URL based on browser type
      let url = null;
      let title = null;

      switch (browserType) {
        case 'chrome':
        case 'brave':
        case 'edge':
          ({ url, title } = await this.getChromeBasedURL(processName));
          break;
        case 'safari':
          ({ url, title } = await this.getSafariURL());
          break;
        case 'arc':
          ({ url, title } = await this.getArcURL());
          break;
      }

      return url ? { url, title, browserType } : null;

    } catch (error) {
      console.error('Error extracting browser info:', error.message);
      return null;
    }
  }

  /**
   * Get URL from Chrome-based browsers (Chrome, Brave, Edge, Arc)
   */
  async getChromeBasedURL(browserName) {
    try {
      const script = `
        tell application "${browserName}"
          if (count of windows) > 0 then
            set currentTab to active tab of front window
            set currentURL to URL of currentTab
            set currentTitle to title of currentTab
            return currentURL & "|||" & currentTitle
          end if
        end tell
      `;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);
      const [url, title] = stdout.trim().split('|||');
      
      return { url: url || null, title: title || null };
    } catch (error) {
      return { url: null, title: null };
    }
  }

  /**
   * Get URL from Safari
   */
  async getSafariURL() {
    try {
      const script = `
        tell application "Safari"
          if (count of windows) > 0 then
            set currentTab to current tab of front window
            set currentURL to URL of currentTab
            set currentTitle to name of currentTab
            return currentURL & "|||" & currentTitle
          end if
        end tell
      `;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);
      const [url, title] = stdout.trim().split('|||');
      
      return { url: url || null, title: title || null };
    } catch (error) {
      return { url: null, title: null };
    }
  }

  /**
   * Get URL from Arc
   */
  async getArcURL() {
    try {
      const script = `
        tell application "Arc"
          if (count of windows) > 0 then
            set currentTab to active tab of front window
            set currentURL to URL of currentTab
            set currentTitle to title of currentTab
            return currentURL & "|||" & currentTitle
          end if
        end tell
      `;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);
      const [url, title] = stdout.trim().split('|||');
      
      return { url: url || null, title: title || null };
    } catch (error) {
      return { url: null, title: null };
    }
  }
}

module.exports = BrowserExtractor;
