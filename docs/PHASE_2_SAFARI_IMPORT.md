# Phase 2: Safari History Import

Locked Phase 2 baseline approved by Kyle.

## Scope
- Safari desktop export ZIP only (macOS 15.2+)
- One-time manual upload via web app
- Parse only `History.json` from the ZIP
- Ignore all other archive contents (passwords, payment cards, bookmarks, reading list, `__MACOSX/`)
- Delete raw uploaded ZIP immediately after processing
- Imported history used only as lower-confidence profile enrichment

## Implementation Constraints
1. **Streaming-only ingestion:** Never buffer full ZIP or `History.json` in memory. Extract and parse via streams.
2. **Global weight cap:** `HISTORY_IMPORT_DOMAIN_WEIGHT_CAP = 0.5` defined in `src/lib/constants.ts`. Ranking engine reads this constant. No magic numbers.
3. **Schema-version validation:** Validate `metadata.schema_version` on every import. Fail safely on unknown version. Log diagnostic events to track Apple-side schema drift.

## Signal Rules
- Provider: `history_import`
- Signal type: `safari_history_import`
- Topic weights lower than manual topics.
- Max per-domain weight capped by `HISTORY_IMPORT_DOMAIN_WEIGHT_CAP`.
- 90-day cutoff for visits.
- Collapse duplicates by canonical URL + day.

## Data Model
- `history_imports` table: `id`, `user_id`, `status`, `source_type`, `browser`, `raw_file_name`, `visit_count`, `accepted_count`, `rejected_count`, `created_at`, `completed_at`
- `history_import_events` table: `id`, `history_import_id`, `level`, `code`, `message`, `created_at`
- Normalized signals written to `interest_signals`

## API Contracts
- `POST /api/history-imports/upload` — accepts ZIP, parses `History.json`, returns preview + temp import ID
- `POST /api/history-imports/:id/confirm` — commits normalized signals
- `DELETE /api/history-imports/:id` — removes committed imported-history signals for that import
- `GET /api/history-imports` — returns import history/status for settings

## UX
- Upload screen: "Strengthen your profile with Safari history"
- Clear statements: Safari ZIP only, history only, passwords/cards ignored, raw file deleted after processing
- Preview: top inferred topics, top domains, date range, accepted/rejected counts, confirmation before commit
- Settings: re-import, delete signals, view status/summary

## Status
Status: Approved Baseline
Phase: 2
Ready for Implementation: Phase 2 kickoff
