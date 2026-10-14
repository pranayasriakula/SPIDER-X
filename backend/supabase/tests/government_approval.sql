-- LOCAL DISPOSABLE SUPABASE ONLY. Apply both migrations first. Everything rolls
-- back. Run with psql -v ON_ERROR_STOP=1 -f government_approval.sql after setting
-- PGOPTIONS='-c rakshak.test_database=on' for the disposable database connection.
BEGIN;
SET LOCAL rakshak.test_database = 'on';

DO $$
BEGIN
    IF current_setting('rakshak.test_database', true) IS DISTINCT FROM 'on' THEN
        RAISE EXCEPTION 'Explicit disposable test database opt-in required';
    END IF;
END;
$$;

CREATE FUNCTION pg_temp.assert_true(value boolean, message text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %', message; END IF;
END;
$$;

CREATE FUNCTION pg_temp.fail_audit_for_test() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    IF current_setting('rakshak.fail_audit', true) = 'on' THEN
        RAISE EXCEPTION 'Simulated audit failure' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER test_government_audit_failure
BEFORE INSERT ON public.government_approval_audit
FOR EACH ROW EXECUTE FUNCTION pg_temp.fail_audit_for_test();

DO $$
DECLARE
    applicant uuid := gen_random_uuid();
    reviewer uuid := gen_random_uuid();
    legacy_authority uuid := gen_random_uuid();
    app public.government_applications;
    next_app public.government_applications;
BEGIN
    -- The initial migration's auth trigger creates PUBLIC profiles.
    INSERT INTO auth.users(id) VALUES (applicant), (reviewer), (legacy_authority);
    UPDATE public.profiles SET role = 'ADMIN' WHERE user_id = reviewer;
    UPDATE public.profiles SET role = 'AUTHORITY' WHERE user_id = legacy_authority;

    app := public.submit_government_application(applicant, 'Department', 'Officer', 'officer@example.gov', 'E1');
    PERFORM pg_temp.assert_true(app.status = 'PENDING', 'submission is pending');
    PERFORM pg_temp.assert_true((SELECT role = 'PUBLIC' FROM public.profiles WHERE user_id = applicant), 'submission retains PUBLIC');
    BEGIN
        PERFORM public.submit_government_application(applicant, 'Department', 'Officer', 'officer@example.gov', 'E1');
        RAISE EXCEPTION 'Duplicate submission succeeded';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        PERFORM public.submit_government_application(legacy_authority, 'Department', 'Officer', 'officer@example.gov', 'E1');
        RAISE EXCEPTION 'Existing authority submitted';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.approve_government_application(app.application_id, applicant);
        RAISE EXCEPTION 'Non-admin approval succeeded';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.reject_government_application(app.application_id, reviewer, ' ');
        RAISE EXCEPTION 'Blank rejection succeeded';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    PERFORM public.reject_government_application(app.application_id, reviewer, ' Documents incomplete ');
    PERFORM pg_temp.assert_true((SELECT role = 'PUBLIC' FROM public.profiles WHERE user_id = applicant), 'rejection retains PUBLIC');
    PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.government_approval_audit WHERE application_id = app.application_id AND action = 'REJECTED' AND reason = 'Documents incomplete' AND admin_id = reviewer), 'rejection audit');

    next_app := public.submit_government_application(applicant, 'Department', 'Officer', 'officer@example.gov', 'E2');
    PERFORM set_config('rakshak.fail_audit', 'on', true);
    BEGIN
        PERFORM public.approve_government_application(next_app.application_id, reviewer);
        RAISE EXCEPTION 'Approval succeeded despite audit failure';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    PERFORM set_config('rakshak.fail_audit', 'off', true);
    PERFORM pg_temp.assert_true((SELECT role = 'PUBLIC' FROM public.profiles WHERE user_id = applicant), 'audit failure rolls back role change');
    PERFORM pg_temp.assert_true((SELECT status = 'PENDING' FROM public.government_applications WHERE application_id = next_app.application_id), 'audit failure rolls back state change');
    PERFORM pg_temp.assert_true((SELECT count(*) = 0 FROM public.government_approval_audit WHERE application_id = next_app.application_id), 'audit failure leaves no partial audit');
    PERFORM public.approve_government_application(next_app.application_id, reviewer);
    PERFORM pg_temp.assert_true((SELECT role = 'AUTHORITY' FROM public.profiles WHERE user_id = applicant), 'approval promotes to AUTHORITY');
    PERFORM pg_temp.assert_true((SELECT status = 'APPROVED' FROM public.government_applications WHERE application_id = next_app.application_id), 'approval state');
    PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.government_approval_audit WHERE application_id = next_app.application_id AND action = 'APPROVED' AND reason IS NULL AND admin_id = reviewer), 'approval audit');
    BEGIN
        PERFORM public.approve_government_application(next_app.application_id, reviewer);
        RAISE EXCEPTION 'Repeated approval succeeded' USING ERRCODE = 'XX000';
    EXCEPTION WHEN raise_exception THEN NULL;
    END;
    PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.government_approval_audit WHERE application_id = next_app.application_id), 'failed decision creates no audit');
    BEGIN
        PERFORM public.revoke_government_application(next_app.application_id, reviewer, ' ');
        RAISE EXCEPTION 'Blank revocation succeeded';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    PERFORM public.revoke_government_application(next_app.application_id, reviewer, ' Credentials expired ');
    PERFORM pg_temp.assert_true((SELECT role = 'PUBLIC' FROM public.profiles WHERE user_id = applicant), 'revocation returns PUBLIC');
    PERFORM pg_temp.assert_true((SELECT status = 'REVOKED' AND rejection_reason = 'Credentials expired' FROM public.government_applications WHERE application_id = next_app.application_id), 'revocation state and reason');
    PERFORM pg_temp.assert_true((SELECT count(*) = 1 FROM public.government_approval_audit WHERE application_id = next_app.application_id AND action = 'REVOKED' AND reason = 'Credentials expired' AND admin_id = reviewer), 'revocation audit');
    PERFORM pg_temp.assert_true((SELECT role = 'AUTHORITY' FROM public.profiles WHERE user_id = legacy_authority), 'legacy authority unchanged');
    BEGIN
        PERFORM public.submit_government_application(applicant, ' ', 'Officer', 'officer@example.gov', 'E1');
        RAISE EXCEPTION 'Invalid application succeeded';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    PERFORM pg_temp.assert_true((SELECT count(*) = 2 FROM public.government_applications WHERE user_id = applicant), 'invalid insert rolled back and history retained');

    PERFORM pg_temp.assert_true(NOT has_function_privilege('authenticated', 'public.approve_government_application(uuid,uuid)', 'EXECUTE'), 'browser cannot approve');
    PERFORM pg_temp.assert_true(NOT has_function_privilege('anon', 'public.submit_government_application(uuid,text,text,text,text)', 'EXECUTE'), 'anonymous cannot submit RPC');
    PERFORM pg_temp.assert_true(NOT has_table_privilege('authenticated', 'public.government_applications', 'INSERT'), 'browser cannot insert applications');
    PERFORM pg_temp.assert_true(NOT has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE'), 'browser cannot promote profiles');
    PERFORM pg_temp.assert_true(NOT has_table_privilege('service_role', 'public.government_approval_audit', 'UPDATE'), 'service cannot rewrite audit');
END;
$$;
ROLLBACK;
