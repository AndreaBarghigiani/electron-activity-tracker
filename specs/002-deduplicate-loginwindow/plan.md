# Implementation Plan: Consecutive Login Window Deduplication

**Branch**: `feature/002-deduplicate-loginwindow` | **Date**: 2025-11-08 | **Spec**: `/specs/002-deduplicate-loginwindow/specification.md`
**Input**: Feature specification from `/specs/002-deduplicate-loginwindow/specification.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement consecutive login window deduplication by adding an `updated_at` column to track session duration and modifying the activity capture logic to update existing `loginwindow` records instead of inserting duplicates when the previous record is also `loginwindow`.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: JavaScript (Node.js)
**Primary Dependencies**: sql.js, node-mac-app-notifier
**Storage**: SQLite database
**Testing**: Node.js built-in assert or NEEDS CLARIFICATION
**Target Platform**: macOS
**Project Type**: single
**Performance Goals**: <10ms activity capture, <100MB memory usage
**Constraints**: Offline-capable, minimal storage overhead
**Scale/Scope**: Single user desktop application

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

⚠️ **Constitution is template-only - no active gates found**
- No specific principles defined for this project
- Proceeding with implementation based on feature specification requirements

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# Single project structure (current)
src/
├── main.js              # Main application entry point
├── view-data.js         # Data viewing utility
└── (existing files)

# Database files
memory/
└── activities.db        # SQLite database

# Package management
package.json
package-lock.json
```

**Structure Decision**: Single project JavaScript application with SQLite database. The feature will be implemented by modifying the existing `main.js` activity capture logic and adding database migration support.

## Complexity Tracking

> **No constitutional violations - implementation follows specification requirements**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | Implementation is straightforward and follows existing patterns | N/A |

## Implementation Status

✅ **Phase 0 Complete**: Research conducted - all technical decisions documented
✅ **Phase 1 Complete**: Data model, contracts, and quickstart generated
✅ **Agent Context Updated**: Technology stack recorded in `.windsurf/rules/specify-rules.md`

## Next Steps

Ready for implementation using `/speckit.tasks` command to generate actionable tasks based on this plan.

## Generated Artifacts

- `research.md` - Technical decisions and rationale
- `data-model.md` - Database schema and entity relationships
- `contracts/api.md` - Internal API contracts and query specifications
- `quickstart.md` - Implementation guide with code examples
