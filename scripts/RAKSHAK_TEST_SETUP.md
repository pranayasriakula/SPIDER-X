# Local RAKSHAK test launch

No existing environment file is changed. Production launch settings are unchanged.

1. In Supabase, verify project ref `uqwadqaztdplxujulbon` with its owner. Confirm
   this is isolated from production and approved for synthetic accounts and records.
   Its name alone is not sufficient. Inspect existing data/dependencies read-only.
2. Inspect its schema read-only: `profiles`, PUBLIC/AUTHORITY/ADMIN role enum,
   government application/audit tables, and submit/approve/reject/revoke approval
   functions. Verify service-only RPC permissions, browser role-write restrictions,
   and a synthetic ADMIN account. Do not run decision RPCs just to inspect them.
   If the project is empty and approved for testing, review/apply the initial schema
   and approval migrations in order; if partially configured, review drift first
   rather than rerunning CREATE migrations. Never target production spider.
3. Create a NEW `backend/.env.rakshak-test.local` (already ignored by backend Git
   rules) containing the following keys. Obtain the keys from this test project
   securely; never paste credentials into chat or source code:

   ```dotenv
   SUPABASE_URL=https://uqwadqaztdplxujulbon.supabase.co
   SUPABASE_ANON_KEY=<test-project anon/publishable key>
   SUPABASE_SERVICE_ROLE_KEY=<test-project server-only key>
   RAKSHAK_TEST_ENV_VERIFIED=yes
   ```

   Set the verification flag only after completing steps 1 and 2. The flag records
   operator verification; the launcher cannot establish data disposability itself.
4. From the repository root run `node scripts/start-rakshak-test.cjs`. Backend uses
   port 5001; frontend uses port 5173. A port collision fails instead of choosing
   a different frontend port. Open http://127.0.0.1:5173 and check
   http://localhost:5001/api/health. Then test with synthetic PUBLIC/ADMIN accounts.

Local verification completed against the confirmed test project: synthetic login,
application submission, approval/revocation APIs, role changes, dashboard rendering,
and permission boundaries passed. Approval audit history was checked in the UI.
Signup testing encountered email validation and rate limits; confirmed synthetic
fixtures were provisioned separately for the workflow checks. Browser submission
of approval/revocation decisions and automatic background-tab refresh timing remain
unverified. Local credentials and fixture details are deliberately excluded from Git.
Each operator must still complete the verification steps above for their setup.
