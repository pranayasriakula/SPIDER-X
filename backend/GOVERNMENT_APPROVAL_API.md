# Government registration and approval

All endpoints require `Authorization: Bearer <Supabase access token>`. Use the
existing registration/login APIs first. New accounts start as `PUBLIC`; submitting
an application does not grant Government access. Existing `AUTHORITY` users keep
their access and do not need to apply.

Responses use `{ success: true, data: ... }` and the existing error envelope.
Application records include `application_id`, `user_id`, the four submitted fields,
`status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, and timestamps.

| Method | Endpoint | Access / result |
| --- | --- | --- |
| POST | `/api/government/applications` | PUBLIC only; submit application; 201 with PENDING record |
| GET | `/api/government/applications/me` | Latest own application, or `null` if none |
| GET | `/api/government/applications/me/history` | All own applications, newest first, including rejected/revoked records |
| GET | `/api/admin/government-applications` | ADMIN only; list, newest first |
| POST | `/api/admin/government-applications/:id/approve` | ADMIN only; PENDING → APPROVED; PUBLIC → AUTHORITY |
| POST | `/api/admin/government-applications/:id/reject` | ADMIN only; PENDING → REJECTED; role remains PUBLIC |
| POST | `/api/admin/government-applications/:id/revoke` | ADMIN only; APPROVED → REVOKED; AUTHORITY → PUBLIC |
| GET | `/api/admin/government-applications/:id/audit` | ADMIN only; decisions oldest first; 404 for missing application |

Submission JSON:

```json
{
  "department": "Disaster Management",
  "designation": "District Officer",
  "official_email": "officer@example.gov",
  "employee_id": "EMP-123"
}
```

All four fields are required nonempty strings. Maximum lengths: department and
designation 200, official_email 254, employee_id 100. Values are trimmed; email is
lowercased and checked for syntax. Email ownership/employment must be verified by
the reviewer; submission alone does not verify these claims.

Reject and revoke require `{ "reason": "Meaningful reason" }` (1–2000 trimmed
characters). Approval needs no body. Client role, user ID, Admin ID, status, and
review metadata are never used. Profile updates continue to accept only name,
phone, and location, including when requested by an Admin.

Admin listing supports `status=PENDING|APPROVED|REJECTED|REVOKED`, `limit` (1–100,
default 50), and `offset` (0–1000000, default 0). Applicant endpoints always scope
to the authenticated user. History remains readable after approval or revocation.
`rejection_reason` holds the latest rejection/revocation reason; immutable decision
history is available to Admins through the audit endpoint.

Validation errors return 400; missing/invalid authentication 401; insufficient role
403; missing application 404; duplicate active application or stale/ineligible
decision 409. A user can reapply after rejection/revocation. Concurrent submissions
are guarded by a unique partial index. Decisions lock the reviewer, application,
and applicant and update state, role, and audit in one database transaction.

## Migration and deployment prerequisites

1. Review and apply `supabase/migrations/20260920140000_initial_spider_x_schema.sql`
   before `supabase/migrations/20261012000000_government_approval.sql` to a disposable
   local Supabase database. The second migration depends on profiles, user_role,
   pgcrypto, and set_updated_at from the first. It is an all-or-nothing migration.
2. This edits the existing **unapplied** approval migration. If an earlier version
   has been applied anywhere, prepare a separate forward migration against that
   schema; do not rerun this CREATE TABLE migration or replace production history.
3. Keep SUPABASE_SERVICE_ROLE_KEY exclusively in the backend environment. Configure
   the existing SUPABASE_URL and SUPABASE_ANON_KEY as usual. No frontend changes or
   credentials are included in this work.
4. Provision the first ADMIN through a trusted database/operator process. No API
   can grant ADMIN. Confirm existing browser grants/policies match the original
   backend-only access model before applying the profile permission restriction.
5. Verify API and database tests locally, then obtain deployment approval before
   applying migrations or releasing the backend. No live migration, deployment,
   or production data update was performed during implementation.

The migration grants service-only RPC execution, denies browser table access, and
prevents browser role writes. Audit UPDATE/DELETE/TRUNCATE are denied to the service
role; the database owner remains trusted. Revocation only applies to approvals
created by this workflow, so legacy Government users are never demoted by migration.

## Tests

From `backend`, run:

```powershell
node --test src/__tests__/*.test.js src/services/__tests__/*.test.js src/services/alerts/__tests__/*.test.js
```

HTTP tests mock only Supabase and exercise real routing/authentication/controller
behavior. Actual role transitions, audit writes, permission checks, and failed
decision rollback are checked by `supabase/tests/government_approval.sql`, which
must be run against a **disposable local Supabase database**, after both migrations:

```powershell
$env:PGOPTIONS = '-c rakshak.test_database=on'
psql $env:LOCAL_TEST_DATABASE_URL -v ON_ERROR_STOP=1 -f supabase/tests/government_approval.sql
```

The SQL test inserts isolated fixtures inside a rolled-back transaction. Never set
LOCAL_TEST_DATABASE_URL to a production/shared database. Before deployment, also
exercise parallel submissions and competing decisions against the local database:
expect one active application, one successful decision/audit event, and conflicts
for losing requests. Database execution/concurrency cannot be established by HTTP
mocks alone.
