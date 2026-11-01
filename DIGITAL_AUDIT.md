# Ferex Digital audit — 1 November 2026

Follow-up: local fixes and a persisted international billing workflow have now been implemented. See [DIGITAL_IMPLEMENTATION.md](DIGITAL_IMPLEMENTATION.md) for current coverage, validation and deployment requirements. The findings below describe the original audit state.

Scope: source review of Digital admin and project-manager routes, permissions, project assignment, task APIs, and Central task delegation. No production writes or credential login were performed. Live database policy enforcement and browser journeys remain unverified.

## Central admin task assignment

Implemented at `/central/tasks`: create, choose division and assignee, set priority/deadline, reassign, complete/reopen, delete, search and filter. `CentralTasks.tsx` calls `createTask` and `reassignTask`. A Digital assignment is written to both `tasks` and `digital_tasks`. The implementation has the defects below, so the presence of the UI does not establish reliable end-to-end delivery.

## Findings

1. **Critical — browser-side administrator credentials and background login.** `src/lib/adminAuthClient.ts`, `getAdminSupabaseClient`, contains a fixed administrator email/password and signs into a separate persistent session. Shared task APIs use that client instead of the acting user's client. If those credentials work, callers can acquire the administrator session. Remove this path, rotate the embedded credential, and enforce privileged operations on a trusted server using the caller's verified role. Whether the credential currently works was deliberately not tested.

2. **High — false success on central task operations.** `src/lib/api/tasks.ts`, `createTask`, logs both insert failures and still returns a newly constructed task. Subsidiary inserts ignore returned errors. `updateTaskStatus`, `deleteTask`, and `reassignTask` also ignore database error results and return success. The Central screen displays success and updates its local state even if nothing persisted. Require confirmed database writes and propagate errors; make central/subsidiary writes transactional or use one authoritative task record.

3. **High — manager completion does not update the central record.** `src/lib/api/digitalPm.ts`, `updateDigitalTaskStatusDirect`, updates `digital_tasks` and only tries `tasks` if the first query returns an error. For replicated tasks, the first update succeeds and the Central task remains Pending. For a general-only task, an update matching zero Digital rows normally succeeds without an error, so the fallback is also skipped. Explicitly identify the task source and update the authoritative record; verify affected rows.

4. **High — project assignment filter fails open.** `src/lib/api/digitalPm.ts`, `getAssignedDigitalProjects`, returns all projects when identity is absent, and ultimately returns all projects when no assignment matches. It also matches email/name fragments and generic PM/manager labels. Two separate PMs can receive each other's project lists if database access permits it. Use exact stable user IDs, return an empty list for no assignments, and enforce the same scope in database policies. Live RLS was not verified.

5. **High — task visibility depends on email text.** `src/lib/api/digitalPm.ts`, `getAssignedDigitalTasks`, treats any email containing `digital` as a Digital manager, returns all `digital_tasks`, and exits before loading general Central directives. Thus a PM with such an email can see unrelated Digital tasks while missing a Central directive when its subsidiary copy failed. Resolve the verified role independently of supplied identity, use exact assignee IDs, and load authoritative Central assignments consistently.

6. **High — PM task creation can exist only in one browser.** `src/lib/api/digitalPm.ts`, `createDigitalTaskDirect`, writes localStorage before the database insert, retries a reduced payload, then only logs if both inserts fail and returns success. `DigitalPMTasks.tsx` displays a successful creation. Another device/admin will not see the task. Report persistence failures and keep any offline drafts explicitly separate from saved tasks.

7. **Medium — manager/admin permission boundary is inconsistent.** `src/hooks/usePermissions.ts`, `DIGITAL_ADMIN_ROLES`, includes project_manager, pm and digimanager; those identities receive staff/settings/delete/billing permissions. `src/App.tsx`, `DIGITAL_ROLES`, also admits managers to Digital admin routes. The product has a separate PM portal, but that portal alone does not constrain their admin access. Decide the intended manager authority and apply one explicit permission matrix across routes, controls, APIs and RLS.

8. **Medium — PM task delegation flow is missing from the PM task form.** `src/pages/digital/pm/DigitalPMTasks.tsx`, `handleCreateTask`, always assigns the new task to the logged-in PM; the form has no assignee state or staff lookup. Central and Digital admin have staff assignment controls, but this PM form cannot delegate to a developer/designer. Add staff selection and reassignment if manager-to-team delegation is required.

9. **Medium — Central tasks cannot be linked to a Digital project during creation.** `src/pages/central/CentralTasks.tsx` captures division, assignee, deadline, priority and description, but no project ID. The Digital replication in `src/lib/api/tasks.ts` consequently omits project_id. In contrast, the Digital admin task form explicitly requires an associated project. Add an optional project selector for Digital directives, or define an explicit standalone-directive flow so project reporting does not silently omit those tasks.

10. **Medium — Central origin is lost in the replicated Digital task.** `createTask` inserts the Digital replica with task_type `Task`, without created_by. `getAssignedDigitalTasks` infers Central origin from created_by, task_type or words in title/notes, then deduplicates the general task behind the Digital copy. A custom description that does not mention Central Admin can therefore lose its Central Directive label. Store immutable origin/source metadata and preserve it during deduplication.

11. **Critical — migrations grant unrestricted anonymous database access.** `supabase/migrations/20261027000001_fix_digital_attendance_schema_alignment.sql`, section 8 (lines 180–204), creates FOR ALL policies for both authenticated and anon roles using unconditional true checks on Digital projects, tasks, clients, attendance, salaries and payroll tables. If deployed with applicable table grants, these policies permit reading and modifying data without a user login. Earlier Digital migrations also contain open policies. Replace these with explicit role/ownership checks and verify deployed grants and policies. The deployed database was not queried.

12. **High — production type-check gate fails.** Direct `node node_modules/typescript/bin/tsc -b` reports seven errors: missing payment_split_type/advance_percentage properties in `src/lib/api/digitalBilling.ts` (lines 323–326), missing payment_split_type in `src/pages/digital/DigitalProjects.tsx:1075`, and incompatible optional description in `src/pages/digital/DigitalBilling.tsx:263`. The configured build runs TypeScript before Vite, so these errors block the normal build. Align project types and billing form state with the persisted data model.

## Missing or incomplete end-to-end flows

- Reliable Central assignment → recipient visibility → PM progress/completion → Central confirmation is broken by independent task copies and silent errors.
- PM → team-member assignment/reassignment is absent from the PM task creation screen reviewed.
- Central directive → Digital project linkage is absent from the Central task form reviewed.
- A consistent role boundary between Digital admin and PM is not established by the current route and permission lists.
- Task creation, status changes and reassignment in the reviewed API paths dispatch browser events but do not themselves create recipient notifications or a task change-history record. A database-trigger implementation, if deployed, needs separate verification.

## Validation and remaining coverage

The initial `npm run build` and `npm run lint` attempts failed because the installed npm launcher points to a missing npm-cli.js. Direct TypeScript execution then reported seven errors (finding 12). Direct Vite bundling succeeded, with an approximately 3.65 MB main JavaScript chunk before gzip and chunking warnings. The sequential diagnostic command ran Vite even after TypeScript failed; its final zero exit status does not mean the configured build passed. Lint remains unverified.

This is a source audit with confirmed code-path defects, not a claim that every screen or deployed policy has been tested. Live admin/PM login, cross-user RLS, meetings, attendance, lead conversion, deliverable approval, invoice/payment reconciliation, sprint/milestone integration and notification delivery still need authenticated end-to-end checks. No application fixes were made.

Recommended order: remove privileged browser login; fix write/error handling; unify task persistence and completion; enforce exact identity and role boundaries; finish delegation/project linkage; then run authenticated role-by-role regression checks.
