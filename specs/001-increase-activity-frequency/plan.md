# Implementation Plan: Increase Activity Tracking Resolution

**Branch**: `001-increase-activity-frequency` | **Date**: 2025-11-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-increase-activity-frequency/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature will increase the resolution of activity tracking by writing to the database every 5 seconds and creating a new record for each distinct user activity (e.g., window change). This will be achieved by modifying the main application loop to call the tracking logic more frequently. The existing `loginwindow` deduplication logic will be preserved to update the `updated_at` column when the user is away.

## Technical Context

**Language/Version**: JavaScript (Node.js for Electron)
**Primary Dependencies**: `active-win`, `better-sqlite3`, `os-utils`
**Storage**: SQLite (`~/activity.db`)
**Testing**: Manual testing, `npm run view-data` for verification.
**Target Platform**: macOS (primary), with graceful degradation on Windows/Linux.
**Project Type**: Single project (Electron application)
**Performance Goals**: Average CPU usage below 5%, memory usage below 100MB.
**Constraints**: Must not introduce noticeable UI lag or performance degradation for the user.
**Scale/Scope**: This is a local application, so scale is limited to the user's activity. The change will significantly increase the amount of data stored locally.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Privacy First**: The change collects the same type of data, just more frequently. This aligns with the principle.
- **Cross-Platform Compatibility**: The core libraries used (`active-win`, `better-sqlite3`) are cross-platform. The `inputTracker` is macOS-specific, but the constitution allows for graceful degradation. This aligns.
- **Reliability & Performance**: This is the main area of concern. Increased DB writes could impact performance. The implementation must be mindful of this. The success criteria in the spec address this directly.
- **Code Quality Standards**: The changes should adhere to the existing modular and event-driven architecture.
- **Data Management**: The increased data volume is a key consideration. The schema itself doesn't need to change, but the database file will grow much faster. This is an acceptable trade-off for the requested feature.

**Result**: The plan is consistent with the project constitution.

## Project Structure

### Documentation (this feature)

```text
specs/001-increase-activity-frequency/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
# Option 1: Single project (DEFAULT)
src/
├── browserExtractor.js
├── inputTracker.js
├── networkSync.js
└── tracker.js
```

**Structure Decision**: The existing single project structure will be maintained. Changes will be primarily in `main.js` (unseen) and `src/tracker.js`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A                                 |