# Government Approval production proposal

Status: proposal only. No SQL executed and neither project inspected or changed.
Target: spider (`qstdadrtpoifnqivysif`). Development: rakshak-test
(`uqwadqaztdplxujulbon`). A project ref cannot reliably be verified from the normal
database name; the operator must verify the connection/project in the deployment tool.

Use `20261018_spider_government_approval_additive.sql` only after review. Do not
apply the original approval migration or initial schema migration to production.
This is deliberately outside the automatic migrations directory. Do not include
both approval migrations in a deployment. Coordinate migration bookkeeping with
the deployment process before promoting this proposal.

## Scope and protections

- Creates two tables, their indexes/constraints, one application timestamp trigger
  using the existing helper, RLS on the two new tables, and exactly four new RPCs.
- No existing table, enum, function, policy, grant, role or row is altered by the
  migration. Existing profile permissions are deliberately preserved. Function
  bodies update applicant roles only when an authorized decision is later invoked.
- Uses CREATE, never CREATE OR REPLACE / IF NOT EXISTS: any approval name collision,
  including a function overload, aborts the transaction instead of adopting drift.
- Trusted postgres owner, empty function search_path, qualified relations/types,
  service-only RPC execution, fresh database reviewer-role checks and no self-review.
  Locks serialize competing decisions; application, role and audit changes are atomic.
- Browser roles have no access to the new objects; no browser RLS policies are
  created. service_role requires BYPASSRLS and has SELECT only on the new tables.
  All new-table writes go through the owner-executed RPCs. This is narrower than the
  old migration's direct service INSERT/UPDATE grants and matches current controllers.
- Unexpected custom default ACLs on the new objects abort deployment. Existing
  default privileges are not modified. Owners/superusers remain trusted and can
  modify audit records; append-only protection applies to normal application access.
- Strengthens audit reason validation: rejected/revoked audit rows require an
  explicit nonblank reason of 1–2000 trimmed characters. The source CHECK allowed
  SQL NULL results to pass. Backend signatures, response columns and SQLSTATE
  mappings remain unchanged.
- Transaction-local 5-second lock timeout and 60-second statement timeout limit
  deployment waits; failures abort the transaction. New foreign keys can briefly
  lock profiles. No existing team data is backfilled or scanned for role changes.

## Dependencies / mandatory review blockers

1. Full backup restore has not been tested. Restore the readable dump into an
   isolated database, verify core data/schema, then rehearse this proposal there.
   Do not treat readability as proof of recovery. No production rollout yet.
2. Verify actual production schema: profiles(user_id UUID unique/primary key,
   role public.user_role), enum labels PUBLIC/AUTHORITY/ADMIN,
   public.set_updated_at() returning trigger with the expected timestamp body,
   pg_catalog.gen_random_uuid(), plpgsql, and Supabase roles. Preflight checks
   signatures; inspect existing triggers, RLS/FORCE RLS, owner rights, memberships,
   column grants and schema privileges too. No live schema parity was verified.
3. Audit existing profile write paths: table/column grants, RLS policies, role
   memberships, SECURITY DEFINER functions and older backend deployments must not
   let ordinary users grant themselves AUTHORITY/ADMIN. The additive migration
   cannot close an existing bypass without violating the preservation requirement.
   Stop rollout if a bypass exists; review any remediation separately.
4. Confirm a usable production ADMIN already exists. This proposal never provisions
   or promotes one. RPC p_admin_id/p_user_id are trusted only because execution is
   restricted to the backend service role; backend must derive them from verified
   tokens. Never expose the service key or call RPCs directly from P1/P2.
5. Review custom default ACLs and trusted role memberships. All objects are owned
   by postgres; inspect production profile triggers for side effects when a future
   decision changes role. Trigger code is reused, not replaced.
6. Validate SQL syntax and behavior in an isolated rehearsal. Only textual/static
   checks were performed while preparing the proposal; no SQL parser/database
   execution, permission, concurrency or restore validation has been performed.

## Impact on P1/P2

No existing users, AUTHORITY accounts or team records change at deployment. Existing
dashboards continue with their existing permissions. New FKs prevent deleting a
profile referenced by application/audit records (and can therefore block an auth
user deletion that cascades into that profile); approve this retention behavior.

Future successful approval changes only the applicant PUBLIC -> AUTHORITY;
revocation of an approved workflow application changes AUTHORITY -> PUBLIC.
Legacy authorities without workflow applications cannot be revoked through this
workflow. P1/P2 should re-fetch /api/auth/me after observing status changes or 403s.
The integrated Public Dashboard includes application submission/status/history;
the Government Dashboard includes the ADMIN-only approval workspace. The shared
app refreshes account roles on focus/visibility and every minute while visible.
Backend/frontend targets and API ports
must be checked independently; this proposal changes no environment settings.

## Deployment plan (operator actions; not executed)

1. Review the blockers above, verify/restore the backup in isolation, rehearse the
   exact proposal and local permission/concurrency tests using synthetic users.
   Include missing token, PUBLIC/AUTHORITY denial, duplicate submission, competing
   decisions, reason validation, role refresh, audit integrity and rollback checks.
2. Obtain production deployment approval; verify spider project ref externally,
   capture pre-deployment core schema/grant/policy/role snapshots and a fresh backup.
   Use the reviewed postgres owner; schedule for low traffic. No core migration.
3. Run the entire proposal once with the SQL client's stop-on-error enabled, as
   one transaction. On any error issue ROLLBACK and investigate; do not run fragments
   or delete/recreate existing objects to get past preflight checks.
4. Read-only verify new tables/indexes/RLS, RPC signatures/owner/search_path/ACLs,
   and unchanged core snapshots. NOTIFY requests PostgREST schema reload at commit.
   Release only the compatible backend/frontend after checks. Production smoke
   testing starts with authenticated list/status/history reads; real decisions
   require separately authorized test records/actions.

## Rollback plan

- Before COMMIT: ROLLBACK removes all proposed objects and ACL changes atomically.
- After COMMIT: first disable the approval UI/routes via deployment rollback and
  quiesce/drain in-flight calls. A reviewed access rollback can revoke service_role
  EXECUTE on the four exact new RPC signatures, retaining tables and audit evidence.
  Revoke service SELECT on the two new tables too if all approval reads must stop.
  Existing core grants/policies need no restoration because they were never changed.
- Prefer leaving additive objects installed. If removal is required and there are
  no workflow records/decisions, separately review dropping the four functions,
  then audit table, then application table with RESTRICT, never CASCADE. The table
  drop removes only its own indexes/trigger/constraints. This proposal deliberately
  does not ship an automatically executable destructive down migration.
- If decisions have occurred, dropping objects does not undo role changes. Export
  and preserve application/audit records; reconcile affected users against current
  roles, concurrent administrative actions and audit history under a separate
  approved recovery plan. Never blanket-demote authorities or restore the full
  production dump over newer team data.
