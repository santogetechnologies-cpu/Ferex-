# Ferex Digital Supabase deployment

Deployed on 1 November 2026 to `ouvezsfvdkecpugzuhuk` using the authenticated Supabase connector. This records the backend deployment; the frontend remains a local build.

## Applied migrations

All eleven migrations were applied successfully. Local filenames now match the versions returned by Supabase, so future CLI deployments will recognize these migrations as applied.

| Version | Migration |
|---|---|
| 20261101150534 | digital_operational_schema |
| 20261101150543 | digital_security_and_commerce |
| 20261101150551 | digital_operations_integrity |
| 20261101150559 | digital_directory_and_refunds |
| 20261101150607 | digital_scope_amendments |
| 20261101150616 | digital_validation_and_leave |
| 20261101150624 | digital_approval_and_origin_guards |
| 20261101150632 | digital_commercial_consistency |
| 20261101152453 | digital_rpc_execution_hardening |
| 20261101152653 | digital_registered_assignees |
| 20261101152815 | digital_commerce_table_grants |

The three additional deployment fixes pin legacy function search paths, remove anonymous execution privileges and unnecessary ledger grants, and require real Auth accounts for Digital assignees. Central Digital assignments reject orphan profiles. Existing records were preserved; the database has six Digital clients and no Digital projects/tasks. No legacy browser billing records were imported.

## Edge Functions

`send-digital-document` and `provision-digital-user` are ACTIVE, version 1, with `verify_jwt=true`. Both returned HTTP 401 to unauthenticated POST requests. The same JWT settings are recorded in `supabase/config.toml` for future CLI deployments.

The user confirmed that `RESEND_API_KEY`, `DIGITAL_FROM_EMAIL` and `APP_URL` are already configured. Their values were not inspected or changed. No client emails or invitations were sent; the new outbox is empty. Provider acceptance and actual delivery still need a signed-in smoke test.

Staff provisioning now assigns the department from the selected division role instead of assigning every Central-created account to Digital.

## Verification

- All eleven migrations passed locally against an exported copy of the live public schema, including its actual constraints, policies and legacy functions. Runtime checks against that schema passed for real-account directory filtering, lead conversion, mixed service taxes, partial collections/refunds, Central task status synchronization, attendance and role escalation prevention. These fixtures ran locally, not on production.
- The separate database integration suite passed all 28 checks after all eleven migrations, including the final table-grant changes. The domain/security suite passed all 19 checks, and TypeScript plus the production Vite build passed. The existing large-bundle warnings remain.
- Live metadata checks: zero Digital tables without RLS; zero Digital tables with anonymous SELECT grants; zero public SECURITY DEFINER functions executable by anonymous users; zero direct authenticated INSERT/UPDATE/DELETE grants on the financial ledger tables; all five commerce RPCs installed.
- Security advisor: mutable search path and anonymous SECURITY DEFINER execution findings were resolved. Signed-in execution warnings remain for intentional role-checked/scoped RPCs. [Supabase guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Leaked-password protection remains disabled in Auth. [Enable password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Performance advisories still report pre-existing/shared-schema policy duplication and missing foreign-key indexes; they were not treated as resolved by this deployment.

The local `.local-backups` directory contains a schema snapshot and migration history, with an ignore file preventing accidental Git inclusion. It does not contain a full database backup. Automatic approval review rejected a proposed export of complete user/business records because deployment authorization did not explicitly cover that sensitive-data export; the export was not retried. Transactional schema migrations proceeded without exporting business records.

## Remaining rollout work

Publish the updated frontend through its existing hosting project, rotate the administrator password previously embedded in frontend code and revoke existing sessions, and rotate any private provider keys previously embedded in public builds. Export/reconcile legacy browser-only billing records before users sign out of the updated frontend, because sign-out clears those caches. Reconcile orphan staff profiles through authenticated account provisioning; do not delete them automatically.

Verify real Central, Digital admin, PM, second PM and client sessions, and one proposal, partial receipt and credit note with an authorized test recipient. Actual email delivery, background retries, delivery/bounce webhooks and frontend production deployment have not been verified by these backend checks.
