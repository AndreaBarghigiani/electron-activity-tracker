# Project Constitution: Electron Activity Tracker

## 🎯 Project Vision

Build a cross-platform desktop application that tracks user activity (active windows, browser URLs, input events) and syncs data to a remote API, enabling productivity analytics and time tracking.

## 🏛️ Core Principles

### 1. Privacy First
- **Local Storage Priority**: All data must be stored locally first in SQLite
- **User Control**: Users decide when and what data is synced to remote servers
- **Minimal Data Collection**: Only collect what's necessary for productivity insights
- **No Sensitive Content**: Never capture actual keystrokes, passwords, or personal content
- **Transparency**: Clear logging and feedback about what's being tracked

### 2. Cross-Platform Compatibility
- **Primary Target**: macOS (with full feature support)
- **Secondary Targets**: Windows and Linux (graceful degradation)
- **Feature Detection**: Detect OS capabilities and enable features accordingly
- **Fallback Mechanisms**: When OS-specific features aren't available, degrade gracefully

### 3. Reliability & Performance
- **Background Operation**: Must run silently without disrupting user workflow
- **Resource Efficiency**: Minimal CPU and memory footprint
- **Fault Tolerance**: Handle network failures, permission issues, and API errors gracefully
- **Data Integrity**: Never lose collected data; sync when connection is restored
- **Efficient Storage**: Optimize database queries and minimize disk I/O

### 4. Code Quality Standards

#### Architecture
- **Modular Design**: Separate concerns (tracking, storage, sync, UI)
- **Single Responsibility**: Each module has one clear purpose
- **Dependency Injection**: Pass dependencies explicitly (tracker, sync, database)
- **Event-Driven**: Use events for loose coupling between components

#### Code Style
- **Clear Naming**: Functions and variables should be self-documenting
- **Minimal Comments**: Code should be readable; comments explain "why" not "what"
- **Error Handling**: Always handle errors; never silently fail
- **Logging**: Comprehensive logging for debugging and monitoring

#### Testing Philosophy
- **Manual Testing First**: Given the nature of system-level tracking
- **Integration Testing**: Test full workflows (track → store → sync)
- **Edge Case Coverage**: Test permission denials, network failures, corrupted data
- **Real Environment**: Test on actual macOS/Windows/Linux systems

### 5. User Experience

#### Installation & Setup
- **Simple Setup**: `npm install && npm start` should work
- **Clear Documentation**: README with prerequisites, setup steps, and troubleshooting
- **Permission Guidance**: Help users grant necessary OS permissions
- **Configuration**: Simple `.env` file for API endpoint and settings

#### Operation
- **Background Execution**: No windows, just system tray icon
- **Visual Feedback**: System tray shows status (tracking, syncing, idle)
- **Manual Controls**: User can trigger sync, view stats, or quit from tray
- **Offline Mode**: Full functionality without API endpoint configured

#### Developer Experience
- **Quick Iteration**: Fast startup and reload during development
- **Clear Errors**: Helpful error messages with solutions
- **Debug Tools**: Script to view collected data (`npm run view-data`)
- **Documentation**: Inline code docs for non-obvious logic

### 6. Data Management

#### Local Database
- **SQLite**: Single-file database in user home directory
- **Schema Evolution**: Support migrations for schema changes
- **Sync Tracking**: Mark records as synced/unsynced
- **Query Optimization**: Index frequently queried columns

#### Network Sync
- **Batch Uploads**: Send multiple records in one request
- **Retry Logic**: Automatic retry with exponential backoff
- **Idempotency**: Safe to retry failed requests
- **Payload Size**: Reasonable batch sizes (avoid huge payloads)

### 7. Security

#### Permissions
- **Minimal Permissions**: Only request what's absolutely needed
- **Optional Features**: Advanced features (browser URLs, input tracking) are opt-in via permissions
- **Permission Detection**: Detect when permissions are granted/revoked

#### API Security
- **HTTPS Only**: Never send data over unencrypted connections
- **Token Authentication**: Support Bearer token auth for API
- **No Hardcoded Secrets**: All sensitive values in `.env` file
- **Environment Variables**: Never commit `.env` to git

### 8. Maintainability

#### Dependencies
- **Minimal Dependencies**: Prefer built-in Node.js APIs when possible
- **Pure JavaScript**: Avoid native compilation when alternatives exist (sql.js vs better-sqlite3)
- **Stable Dependencies**: Choose mature, well-maintained packages
- **Dependency Updates**: Regular security updates

#### Documentation
- **README**: Complete setup and usage instructions
- **Code Comments**: Explain non-obvious decisions and workarounds
- **Architecture Docs**: High-level overview of how components interact
- **API Contract**: Document expected API request/response format

## 🚫 Anti-Patterns to Avoid

1. **Silent Failures**: Always log errors and notify users when something fails
2. **Synchronous Blocking**: Use async/await; never block the event loop
3. **Global State**: Pass state explicitly; avoid global variables
4. **Magic Numbers**: Use named constants for intervals, timeouts, batch sizes
5. **Platform Assumptions**: Check `process.platform` before using OS-specific features
6. **Premature Optimization**: Profile before optimizing; readability first

## 🎨 Technology Choices

### Core Stack
- **Runtime**: Electron (for cross-platform desktop apps)
- **Language**: JavaScript (Node.js)
- **Database**: sql.js (pure JS SQLite implementation)
- **HTTP Client**: axios (for API communication)
- **Environment Config**: dotenv (for `.env` file support)

### OS Integration
- **macOS**: AppleScript for browser URLs, ioreg for idle detection
- **Windows**: TBD (PowerShell scripts, WMI queries)
- **Linux**: TBD (X11/Wayland APIs)

### Development Tools
- **Package Manager**: npm
- **Build Tool**: electron-builder (for distribution)
- **Version Control**: Git

## 📊 Success Metrics

1. **Reliability**: Runs continuously for days without crashes
2. **Performance**: < 50MB RAM usage, < 1% CPU when idle
3. **Data Accuracy**: Captures 100% of 10-second intervals when user is active
4. **Sync Success**: > 99% of sync attempts succeed (with retries)
5. **User Satisfaction**: Clear documentation, easy setup, helpful error messages

## 🔄 Evolution Guidelines

As the project evolves:
- **Backward Compatibility**: Support database migrations for existing users
- **Feature Flags**: New experimental features should be opt-in
- **User Feedback**: Listen to real-world usage and pain points
- **Refactoring**: Improve code quality continuously; don't let technical debt accumulate
- **Documentation**: Keep docs in sync with code changes

---

*This constitution guides all development decisions and ensures the project maintains high quality standards while delivering value to users.*
