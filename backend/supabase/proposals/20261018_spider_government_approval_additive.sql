BEGIN;

-- PROPOSAL ONLY: additive production deployment for spider (qstdadrtpoifnqivysif).
-- Never run the initial/core schema migration against an existing project.
-- Verify the connection target externally; database name is not a project guard.
-- Execute the complete file as one transaction using a trusted postgres owner.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DO $preflight$
BEGIN
    IF current_user <> 'postgres' THEN
        RAISE EXCEPTION 'Reviewed deployment requires current_user postgres';
    END IF;
    IF to_regclass('public.profiles') IS NULL
       OR to_regtype('public.user_role') IS NULL
       OR to_regprocedure('public.set_updated_at()') IS NULL
       OR to_regprocedure('pg_catalog.gen_random_uuid()') IS NULL THEN
        RAISE EXCEPTION 'Required core schema, timestamp trigger or UUID function missing';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_enum
        WHERE enumtypid = 'public.user_role'::regtype
          AND enumlabel IN ('PUBLIC', 'AUTHORITY', 'ADMIN')) <> 3 THEN
        RAISE EXCEPTION 'Required user_role labels missing';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute
        WHERE attrelid = 'public.profiles'::regclass AND attname = 'user_id'
          AND atttypid = 'uuid'::regtype AND NOT attisdropped
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute
        WHERE attrelid = 'public.profiles'::regclass AND attname = 'role'
          AND atttypid = 'public.user_role'::regtype AND NOT attisdropped
    ) OR (SELECT prorettype FROM pg_catalog.pg_proc
          WHERE oid = 'public.set_updated_at()'::regprocedure) <> 'trigger'::regtype THEN
        RAISE EXCEPTION 'Core profile columns or timestamp trigger signature differ';
    END IF;
    IF (SELECT count(*) FROM pg_catalog.pg_roles
        WHERE rolname IN ('anon', 'authenticated', 'service_role')) <> 3
       OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles
                      WHERE rolname = 'service_role' AND rolbypassrls) THEN
        RAISE EXCEPTION 'Expected Supabase roles/BYPASSRLS missing';
    END IF;
    IF to_regclass('public.government_applications') IS NOT NULL
       OR to_regclass('public.government_approval_audit') IS NOT NULL
       OR EXISTS (
         SELECT 1 FROM pg_catalog.pg_proc p
         JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname IN (
           'submit_government_application', 'approve_government_application',
           'reject_government_application', 'revoke_government_application')) THEN
        RAISE EXCEPTION 'Approval objects already exist; stop and review, do not replace';
    END IF;
END;
$preflight$;

-- Rakshak: Government registration and approval
-- Adds tables, functions and permissions. Does not change existing user roles.

CREATE TABLE public.government_applications (
    application_id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(user_id) ON DELETE RESTRICT,

    department TEXT NOT NULL CHECK (length(btrim(department)) BETWEEN 1 AND 200),
    designation TEXT NOT NULL CHECK (length(btrim(designation)) BETWEEN 1 AND 200),
    official_email TEXT NOT NULL CHECK (length(official_email) <= 254 AND official_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
    employee_id TEXT NOT NULL CHECK (length(btrim(employee_id)) BETWEEN 1 AND 100),

    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED')),

    reviewed_by UUID
        REFERENCES public.profiles(user_id) ON DELETE RESTRICT,

    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT government_application_review_check
    CHECK (
        (
            status = 'PENDING'
            AND reviewed_by IS NULL
            AND reviewed_at IS NULL
            AND rejection_reason IS NULL
        )
        OR
        (
            status = 'APPROVED'
            AND reviewed_by IS NOT NULL
            AND reviewed_at IS NOT NULL
            AND rejection_reason IS NULL
        )
        OR
        (
            status = 'REJECTED'
            AND reviewed_by IS NOT NULL
            AND reviewed_at IS NOT NULL
            AND NULLIF(TRIM(rejection_reason), '') IS NOT NULL
        )
        OR
        (
            status = 'REVOKED'
            AND reviewed_by IS NOT NULL
            AND reviewed_at IS NOT NULL
            AND NULLIF(TRIM(rejection_reason), '') IS NOT NULL
        )
    )
);

-- Allow only one active Government application per user.
-- Rejected and revoked applications remain in history.
CREATE UNIQUE INDEX government_one_active_application
ON public.government_applications(user_id)
WHERE status IN ('PENDING', 'APPROVED');

CREATE INDEX government_applications_status_idx
ON public.government_applications(status);

CREATE INDEX government_applications_user_history_idx
ON public.government_applications(user_id, created_at DESC);

CREATE TABLE public.government_approval_audit (
    audit_id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),

    application_id UUID NOT NULL
        REFERENCES public.government_applications(application_id)
        ON DELETE RESTRICT,

    admin_id UUID NOT NULL
        REFERENCES public.profiles(user_id) ON DELETE RESTRICT,

    action TEXT NOT NULL
        CHECK (action IN ('APPROVED', 'REJECTED', 'REVOKED')),

    reason TEXT,
    CONSTRAINT government_audit_reason_check CHECK (
        (action = 'APPROVED' AND reason IS NULL)
        OR (action IN ('REJECTED', 'REVOKED') AND reason IS NOT NULL
            AND length(btrim(reason)) BETWEEN 1 AND 2000)
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX government_approval_audit_application_idx
ON public.government_approval_audit(application_id);

-- Automatically maintain application updated_at.
CREATE TRIGGER government_applications_updated_at
BEFORE UPDATE ON public.government_applications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Restrict direct client access.
-- Access is through authenticated backend routes and service-only functions.
ALTER TABLE public.government_applications
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.government_approval_audit
ENABLE ROW LEVEL SECURITY;
-- Approve a pending Government application atomically.
-- Only the backend service role may execute this function.

CREATE FUNCTION public.approve_government_application(
    p_application_id UUID,
    p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_applicant_id UUID;
    v_applicant_role public.user_role;
BEGIN
    -- Verify the reviewer is an Admin.
    PERFORM 1 FROM public.profiles WHERE user_id = p_admin_id AND role = 'ADMIN' FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin authorization required' USING ERRCODE = '42501';
    END IF;

    -- Lock the application to prevent simultaneous decisions.
    SELECT user_id
    INTO v_applicant_id
    FROM public.government_applications
    WHERE application_id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
    END IF;
    IF (SELECT status FROM public.government_applications WHERE application_id = p_application_id) <> 'PENDING' THEN
        RAISE EXCEPTION 'Invalid application state';
    END IF;
    -- Prevent an Admin from reviewing their own application.
    IF v_applicant_id = p_admin_id THEN
        RAISE EXCEPTION 'Self-approval is not permitted';
    END IF;

    -- Prevent approving an existing Admin or Authority.
    SELECT role
    INTO v_applicant_role
    FROM public.profiles
    WHERE user_id = v_applicant_id
    FOR UPDATE;

    IF v_applicant_role IS DISTINCT FROM 'PUBLIC'::public.user_role THEN
        RAISE EXCEPTION 'Applicant must have PUBLIC role';
    END IF;

    -- Approve the application.
    UPDATE public.government_applications
    SET status = 'APPROVED',
        reviewed_by = p_admin_id,
        reviewed_at = NOW(),
        rejection_reason = NULL
    WHERE application_id = p_application_id;

    -- Grant Government access.
    UPDATE public.profiles
    SET role = 'AUTHORITY'
    WHERE user_id = v_applicant_id;

    -- Record the approval.
    INSERT INTO public.government_approval_audit (
        application_id,
        admin_id,
        action
    )
    VALUES (
        p_application_id,
        p_admin_id,
        'APPROVED'
    );
END;
$$;

-- Prevent public or ordinary authenticated clients from executing it.
REVOKE ALL ON FUNCTION public.approve_government_application(UUID, UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.approve_government_application(UUID, UUID)
TO service_role;
-- Reject a pending Government application atomically.
CREATE FUNCTION public.reject_government_application(
    p_application_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_applicant_id UUID;
    v_applicant_role public.user_role;
BEGIN
    -- Verify the reviewer is an Admin.
    PERFORM 1 FROM public.profiles WHERE user_id = p_admin_id AND role = 'ADMIN' FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin authorization required' USING ERRCODE = '42501';
    END IF;

    -- Require a meaningful rejection reason.
    IF NULLIF(btrim(p_reason), '') IS NULL OR length(btrim(p_reason)) > 2000 THEN
        RAISE EXCEPTION 'A reason of 1 to 2000 characters is required' USING ERRCODE = '22023';
    END IF;

    -- Lock the application and verify its status.
    SELECT user_id
    INTO v_applicant_id
    FROM public.government_applications
    WHERE application_id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
    END IF;
    IF (SELECT status FROM public.government_applications WHERE application_id = p_application_id) <> 'PENDING' THEN
        RAISE EXCEPTION 'Invalid application state';
    END IF;

    -- Prevent self-review.
    IF v_applicant_id = p_admin_id THEN
        RAISE EXCEPTION 'Self-review is not permitted';
    END IF;
    -- Lock the applicant's profile and check their role.
    SELECT role
    INTO v_applicant_role
    FROM public.profiles
    WHERE user_id = v_applicant_id
    FOR UPDATE;

    IF v_applicant_role IS DISTINCT FROM 'PUBLIC'::public.user_role THEN
        RAISE EXCEPTION 'Applicant must have PUBLIC role';
    END IF;

    -- Reject the application.
    UPDATE public.government_applications
    SET status = 'REJECTED',
        reviewed_by = p_admin_id,
        reviewed_at = NOW(),
        rejection_reason = TRIM(p_reason)
    WHERE application_id = p_application_id;

    -- Record the rejection.
    INSERT INTO public.government_approval_audit (
        application_id,
        admin_id,
        action,
        reason
    )
    VALUES (
        p_application_id,
        p_admin_id,
        'REJECTED',
        TRIM(p_reason)
    );
END;
$$;

-- Restrict execution to the backend service role.
REVOKE ALL ON FUNCTION public.reject_government_application(UUID, UUID, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reject_government_application(UUID, UUID, TEXT)
TO service_role;

-- Revoke a previously approved Government application.
CREATE FUNCTION public.revoke_government_application(
    p_application_id UUID,
    p_admin_id UUID,
    p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_applicant_id UUID;
    v_applicant_role public.user_role;
BEGIN
    -- Verify Admin authorization.
    PERFORM 1 FROM public.profiles WHERE user_id = p_admin_id AND role = 'ADMIN' FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin authorization required' USING ERRCODE = '42501';
    END IF;

    -- Require a reason for revocation.
    IF NULLIF(btrim(p_reason), '') IS NULL OR length(btrim(p_reason)) > 2000 THEN
        RAISE EXCEPTION 'A reason of 1 to 2000 characters is required' USING ERRCODE = '22023';
    END IF;

    -- Lock the approved application.
    SELECT user_id
    INTO v_applicant_id
    FROM public.government_applications
    WHERE application_id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
    END IF;
    IF (SELECT status FROM public.government_applications WHERE application_id = p_application_id) <> 'APPROVED' THEN
        RAISE EXCEPTION 'Invalid application state';
    END IF;

    -- Prevent self-review.
    IF v_applicant_id = p_admin_id THEN
        RAISE EXCEPTION 'Self-revocation is not permitted';
    END IF;

    -- Lock the applicant's profile.
    SELECT role
    INTO v_applicant_role
    FROM public.profiles
    WHERE user_id = v_applicant_id
    FOR UPDATE;

    IF v_applicant_role IS DISTINCT FROM 'AUTHORITY'::public.user_role THEN
        RAISE EXCEPTION 'Applicant must have AUTHORITY role';
    END IF;

    -- Revoke the approval.
    UPDATE public.government_applications
    SET status = 'REVOKED',
        rejection_reason = BTRIM(p_reason),
        reviewed_by = p_admin_id,
        reviewed_at = NOW()
    WHERE application_id = p_application_id;

    -- Remove Government access.
    UPDATE public.profiles
    SET role = 'PUBLIC'
    WHERE user_id = v_applicant_id;

    -- Preserve the revocation reason in the audit history.
    INSERT INTO public.government_approval_audit (
        application_id,
        admin_id,
        action,
        reason
    )
    VALUES (
        p_application_id,
        p_admin_id,
        'REVOKED',
        BTRIM(p_reason)
    );
END;
$$;

-- Restrict execution to the backend service role.
REVOKE ALL ON FUNCTION public.revoke_government_application(UUID, UUID, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.revoke_government_application(UUID, UUID, TEXT)
TO service_role;

-- Privileges apply ONLY to these newly created tables. Writes use RPCs.
REVOKE ALL ON public.government_applications, public.government_approval_audit
FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.government_applications, public.government_approval_audit TO service_role;
-- Lock the profile to serialize submission with role changes; the partial
-- unique index is the final guard against concurrent active applications.
CREATE FUNCTION public.submit_government_application(
    p_user_id UUID, p_department TEXT, p_designation TEXT,
    p_official_email TEXT, p_employee_id TEXT
)
RETURNS public.government_applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_role public.user_role;
    v_application public.government_applications;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE user_id = p_user_id FOR UPDATE;
    IF v_role IS DISTINCT FROM 'PUBLIC'::public.user_role THEN
        RAISE EXCEPTION 'Applicant must have PUBLIC role' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.government_applications
        (user_id, department, designation, official_email, employee_id)
    VALUES (p_user_id, btrim(p_department), btrim(p_designation),
            lower(btrim(p_official_email)), btrim(p_employee_id))
    RETURNING * INTO v_application;
    RETURN v_application;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_government_application(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_government_application(UUID, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- Fail closed if custom default privileges granted another role access to NEW
-- objects. Review defaults separately; do not change existing/global grants here.
DO $acl_check$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) a
    WHERE n.nspname = 'public'
      AND c.relname IN ('government_applications', 'government_approval_audit')
      AND a.grantee <> c.relowner
      AND a.grantee <> (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'service_role')
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(p.proacl) a
    WHERE n.nspname = 'public' AND p.proname IN (
      'submit_government_application', 'approve_government_application',
      'reject_government_application', 'revoke_government_application')
      AND a.grantee <> p.proowner
      AND a.grantee <> (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'service_role')
  ) THEN
    RAISE EXCEPTION 'Unexpected default ACL on approval objects; review before deployment';
  END IF;
END;
$acl_check$;
-- Request PostgREST schema refresh only when this transaction commits.
NOTIFY pgrst, 'reload schema';

COMMIT;
