# RAKSHAK integration review — October 20, 2026

Branch: `develop/rakshak`. Starting HEAD: `c6db3ea`.

## Integrated flow

- PUBLIC users apply from Government Access and can read only their own status/history.
- ADMIN users reach Government Approvals from the Government Dashboard. List,
  details, audit history, approve, reject and revoke use authenticated backend routes.
- Backend middleware obtains identity and current role from Supabase for each
  request. PUBLIC/AUTHORITY cannot use the admin endpoints; request bodies cannot
  substitute an applicant/reviewer identity. Profile updates cannot change roles.
- Approved users receive AUTHORITY access; revoked users return to PUBLIC. The
  shared app rechecks roles on focus, visibility changes and every visible minute.
  Invalid/expired sessions are cleared; network failures retain the session.
  The backend remains the permission boundary between UI refreshes.

## Changes made during this review

- Added shared session/role refresh and ignored responses from replaced sessions.
- Added a mocked cross-client test for application, role lookup, government data
  and admin decision requests sharing the API base and session.
- Removed the SQL test's automatic opt-in: operators must explicitly supply the
  disposable-database setting described in its header. This setting expresses
  operator intent; it does not establish that a target database is disposable.
- Cleaned proposal whitespace and updated deployment notes for the integrated UI.

## Verification

- Frontend: `npm run build` passed, 60 modules.
- Frontend: `node --test tests/*.test.mjs` passed, 2/2.
- Backend: `node --test` passed, 31/31 including the government suite and its
  nine subtests. Loopback HTTP tests needed execution outside the restricted
  sandbox. Supabase is mocked; these checks do not connect to a database.
- Staged files scanned for private keys, common secret tokens, JWTs and quoted
  credential assignments. No credential signatures detected; this is a heuristic
  check, not proof of absence. No environment files staged or overwritten.
- Both stash entries retained. No commit, push, database operation or separate
  original-checkout modification performed.

## Remaining before October 24

1. Rehearse the exact SQL proposal in an isolated database after verifying a backup
   restore. SQL tests were not run: no local PostgreSQL client/database was available.
   Follow all blockers in the proposal deployment review, including existing
   profile permission bypass checks and confirming a usable ADMIN account.
2. Use synthetic PUBLIC, AUTHORITY and ADMIN accounts in a nonproduction environment
   for browser checks: apply, duplicate submit, reject/reapply, approve, revoke,
   expired session, competing reviewers, audit history and role refresh.
   Client flow tests use mocked responses and do not prove actual DB transitions
   or browser behavior. No browser end-to-end test was performed in this review.
3. Review frontend/backend deployment targets and CORS in the intended environment.
   Do not deploy the additive proposal together with the original approval migration.
4. Review the staged diff, obtain permission to commit/push, and publish this branch
   for review. Database rollout remains a separate approved operation.
