# Tasks for: Increase Activity Tracking Resolution

**Branch**: `001-increase-activity-frequency`
**Specification**: [spec.md](spec.md)
**Implementation Plan**: [plan.md](plan.md)

This document outlines the actionable tasks to implement the feature.

## Phase 1: Setup

- [X] T001 Verify that all dependencies are installed by running `npm install`.

## Phase 2: Core Implementation (User Story 1)

**User Story**: As a user, I want the application to save my activity at least every 5 seconds and to record each application or window change as a separate event.

**Independent Test**: Can be tested by performing a series of rapid actions (e.g., switching between 3 different applications within 10 seconds) and then verifying that the database contains distinct rows for each activity, accurately timestamped using the `npm run view-data` command.

### Implementation Tasks

- [X] T002 [US1] Modify the main tracking loop to run every 5 seconds in `main.js`.

## Phase 3: Polish & Validation

- [X] T003 Manually test the implementation by following the scenarios outlined in `quickstart.md`.
- [X] T004 Verify that the application's performance (CPU/memory) remains within the acceptable limits defined in the success criteria.

## Dependencies & Execution Order

The tasks should be executed in sequential order as numbered (T001 → T004).

- **T002** is the core implementation task.
- **T003** and **T004** can only be performed after the implementation tasks are complete.

## Implementation Strategy

The strategy is to first modify the timing of the tracking loop. Finally, manual testing will validate that the changes work as expected and do not introduce any regressions or performance issues.