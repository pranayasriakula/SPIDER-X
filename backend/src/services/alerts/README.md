# Alerts integration layer

This directory is Person 4's isolated alert-source integration layer. It has no Express routes, controllers, database access, authentication, or external network calls.

## Contract

Every alert returned by `AlertIntegrationService#collectValidatedAlerts()` has exactly these fields:

`alert_id`, `created_by`, `disaster_type`, `severity`, `title`, `message`, `latitude`, `longitude`, `status`, `created_at`, `updated_at`.

The allowed enum values are defined in `alertContract.js` and match the shared team contract exactly.

## Source adapters

A future approved official-source adapter should extend `OfficialAlertSource` and implement `fetchRawAlerts()`. Pass it to `AlertIntegrationService`, together with a `fieldMap` when its raw field names differ from the shared contract. The service normalizes and validates records before returning them.

`MockOfficialAlertSource` and the records in `fixtures/` are DEVELOPMENT/TEST DATA ONLY. They are fictional, make no external calls, and must never be displayed or represented as live government alerts.

## Future backend handoff

Person 3 can call `collectValidatedAlerts()` from their own alert controller or background job, then persist or submit each returned object through their existing `/api/alerts` implementation. This layer intentionally does not call that endpoint, write to Supabase, or implement authentication.

## Tests

Run with Node 18 or later:

```sh
node --test src/services/alerts/__tests__/*.test.js
```
