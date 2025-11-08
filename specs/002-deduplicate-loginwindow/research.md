# Research: Consecutive Login Window Deduplication

## Database Migration Strategy

**Decision**: Use SQLite ALTER TABLE to add `updated_at` column with backward compatibility  
**Rationale**: SQLite supports ALTER TABLE ADD COLUMN, and existing records will have `updated_at` set to `created_at` via migration  
**Alternatives considered**: 
- Create new table and migrate data (more complex, unnecessary)
- Use trigger-based approach (over-engineering for this use case)

## Activity Capture Logic Modification

**Decision**: Modify `captureActivity()` method in `src/tracker.js` to check previous record before insert  
**Rationale**: The method already has database access and is called every 10 seconds, making it the ideal place for deduplication logic  
**Alternatives considered**:
- Create separate deduplication service (adds unnecessary complexity)
- Use database triggers (less flexible for debugging and metrics)

## Query Performance

**Decision**: Use `SELECT * FROM activities ORDER BY id DESC LIMIT 1` to get previous record  
**Rationale**: Primary key lookup is O(1) and already indexed, no additional indexes needed  
**Alternatives considered**:
- Add timestamp index (unnecessary overhead)
- Use window functions (overkill for single record lookup)

## Data Display Enhancement

**Decision**: Modify `view-data.js` to calculate and display duration when `updated_at != created_at`  
**Rationale**: Simple duration calculation provides clear user feedback on session length  
**Alternatives considered**:
- Store duration separately (redundant data)
- Use complex time window logic (unnecessary)

## Edge Cases Handling

**Decision**: Handle empty database, tracker restarts, and process switches naturally  
**Rationale**: The "check previous record" approach naturally handles all edge cases without special logic  
**Alternatives considered**:
- Complex session tracking (over-engineering)
- Time-based window detection (less reliable than consecutive check)

## Testing Approach

**Decision**: Use Node.js built-in assert module for unit tests  
**Rationale**: Lightweight, no additional dependencies, sufficient for this feature's testing needs  
**Alternatives considered**:
- External testing frameworks (adds dependency overhead)
- No testing (risky for database modifications)
