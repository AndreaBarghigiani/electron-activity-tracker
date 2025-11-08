# Feature Specification: Increase Activity Tracking Resolution

**Feature Branch**: `001-increase-activity-frequency`
**Created**: 2025-11-08
**Status**: Draft
**Input**: User description: "I want to decrease the amount of time that passes between one database write and another to get more real life activity from the app. I would like the activity to be recorded at least every 5 seconds... a. write more frequently b. write more rows"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - High-Resolution Activity Capture (Priority: P1)

As a user, I want the application to save my activity at least every 5 seconds and to record each application or window change as a separate event. This will ensure that even very short activities are captured, providing a highly accurate and granular representation of my work.

**Why this priority**: This is the core of the feature. It directly addresses the user's need for more detailed and real-time activity data, which is fundamental to the app's value.

**Independent Test**: This can be tested by performing a series of rapid actions (e.g., switching between 3 different applications within 10 seconds) and then verifying that the database contains distinct rows for each activity, accurately timestamped.

**Acceptance Scenarios**:

1.  **Given** the application is running and tracking activity,
    **When** I remain active in a single application for 15 seconds,
    **Then** at least three distinct activity records are saved to the database for that period.
2.  **Given** the application is running,
    **When** I switch from Application A to Application B and back to Application A within 5 seconds,
    **Then** the database records three separate entries: one for the initial activity in A, one for the brief activity in B, and one for the return to A.
3.  **Given** the application is running but there is no keyboard or mouse input for 10 seconds,
    **When** I check the database,
    **Then** no new activity rows are written during that period of inactivity.

### Edge Cases

-   **Rapid Switching**: What happens if a user rapidly switches back and forth between two windows dozens of times a minute? The system should handle this without performance degradation, ensuring all distinct activities are logged.
-   **Database Unavailability**: If the database connection is temporarily lost, the system must queue activity events locally and write them in the correct order once the connection is restored to prevent data loss.
-   **System Sleep/Hibernate**: How does the system handle tracking when the computer goes to sleep or hibernates? It should accurately record the end of the last activity before sleep and resume tracking upon waking without logging the inactive period.

## Requirements *(mandatory)*

### Functional Requirements

-   **FR-001**: The system MUST capture user activity (active application, window title) and write it to the database at an interval of no more than 5 seconds.
-   **FR-002**: The system MUST generate a new, distinct database row for each recorded activity interval.
-   **FR-003**: The system MUST generate a new, distinct database row immediately upon detecting a change in the active application or window title.
-   **FR-004**: The system MUST NOT record activity during periods of user inactivity (no mouse or keyboard input).
-   **FR-005**: The increased frequency of data capture and writing MUST NOT introduce noticeable performance degradation for the user's system (e.g., UI lag, high constant CPU usage).

### Key Entities *(include if feature involves data)*

-   **ActivityEvent**: Represents a snapshot of user activity at a point in time.
    -   **Attributes**: `timestamp` (when it occurred), `application_name`, `window_title`, `duration` (time since the last event).

## Success Criteria *(mandatory)*

### Measurable Outcomes

-   **SC-001**: 99% of user activities lasting 5 seconds or longer are successfully recorded in the database.
-   **SC-002**: The time lag between a user switching applications and the new activity being recorded in the database is less than 1 second.
-   **SC-003**: The application's average CPU usage remains below 5% and memory usage below 100MB during normal operation with the new tracking resolution.
-   **SC-004**: The number of database rows generated per hour of continuous user activity should increase by at least 6x compared to the previous 10-second interval implementation, reflecting higher data granularity.