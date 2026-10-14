# Spider-X — Final Shared Backend API + Data Contract

**Version:** 1.0  
**Status:** Team-agreed final contract  
**Purpose:** Common reference for frontend, backend, government dashboard, and Spider-X integration.

---

## 1. Authentication

Use **Supabase Auth** for authentication.

### Endpoints

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
```

### Roles

```text
PUBLIC
AUTHORITY
ADMIN
```

User authentication ID = **Supabase Auth UUID**.

Application-specific user information is stored in:

```text
profiles
```

---

## 2. Users

### Endpoints

```text
GET    /api/users/:id
PATCH  /api/users/:id
```

### Profile fields

```text
user_id
name
phone
role
location
created_at
updated_at
```

---

## 3. Disaster Reports

### Endpoints

```text
POST   /api/reports
GET    /api/reports
GET    /api/reports/:id
GET    /api/reports/my
PATCH  /api/reports/:id
```

### Fields

```text
report_id          UUID
user_id            UUID
disaster_type
severity
description
latitude
longitude
status
created_at
updated_at
```

### Disaster types

```text
FLOOD
EARTHQUAKE
FIRE
LANDSLIDE
CYCLONE
TSUNAMI
DROUGHT
INDUSTRIAL
OTHER
```

### Severity

```text
LOW
MEDIUM
HIGH
CRITICAL
```

### Report status

```text
PENDING
VERIFIED
REJECTED
RESOLVED
```

---

## 4. Alerts

### Endpoints

```text
POST   /api/alerts
GET    /api/alerts
GET    /api/alerts/:id
PATCH  /api/alerts/:id
```

### Fields

```text
alert_id
created_by
disaster_type
severity
title
message
latitude
longitude
status
created_at
updated_at
```

### Alert status

```text
ACTIVE
ACKNOWLEDGED
RESOLVED
CANCELLED
```

---

## 5. Government / Rescue Actions

### Endpoints

```text
POST   /api/actions
GET    /api/actions
GET    /api/actions/:id
PATCH  /api/actions/:id
```

Actions can represent:

- assigning rescue teams
- dispatching resources
- assigning rescue centres
- deploying Spider-X
- responding to a disaster report
- other government response activities

### Suggested fields

```text
action_id
report_id
authority_id
action_type
description
status
assigned_resource
created_at
updated_at
```

---

## 6. Robots / Spider-X

### Endpoints

```text
GET    /api/robots
GET    /api/robots/:id
POST   /api/robots
PATCH  /api/robots/:id

POST   /api/robots/:id/deploy
POST   /api/robots/:id/stop
POST   /api/robots/:id/return
```

### Robot fields

```text
robot_id
name
status
latitude
longitude
created_at
updated_at
```

### Robot status

```text
ONLINE
OFFLINE
MISSION
ERROR
```

---

## 7. Spider-X Sensor Data

### Endpoints

```text
POST   /api/robots/:id/observations
GET    /api/robots/:id/observations
GET    /api/observations/latest
```

### Observation fields

```text
observation_id
robot_id
timestamp
latitude
longitude
sensor data
```

### Example

```json
{
  "robot_id": "uuid",
  "timestamp": "2026-09-20T15:30:00Z",
  "location": {
    "latitude": 16.5,
    "longitude": 80.6
  },
  "sensors": {
    "gas": {
      "value": 120,
      "unit": "ppm",
      "status": "WARNING"
    },
    "temperature": {
      "value": 38.5,
      "unit": "C",
      "status": "NORMAL"
    },
    "obstacle": true
  }
}
```

### Sensor status

```text
NORMAL
WARNING
CRITICAL
```

The sensor structure must remain extensible so additional sensors can be added later without redesigning the entire API.

---

## 8. Notifications

### Endpoints

```text
GET    /api/notifications
PATCH  /api/notifications/:id/read
```

### Suggested fields

```text
notification_id
user_id
title
message
type
is_read
created_at
```

---

## 9. Rescue Centres

### Endpoints

```text
GET    /api/rescue-centers
GET    /api/rescue-centers/:id
POST   /api/rescue-centers
PATCH  /api/rescue-centers/:id
```

### Suggested fields

```text
center_id
name
address
latitude
longitude
capacity
available_capacity
contact
status
created_at
updated_at
```

---

## 10. Resources

### Endpoints

```text
GET    /api/resources
POST   /api/resources
PATCH  /api/resources/:id
```

### Suggested fields

```text
resource_id
name
type
quantity
location
status
updated_at
```

---

## 11. Health Check

```text
GET    /api/health
```

Expected response:

```json
{
  "success": true,
  "status": "healthy"
}
```

---

## 12. Standard API Response

Every API should follow the same response structure.

### Success

```json
{
  "success": true,
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "error": {
    "code": "REPORT_NOT_FOUND",
    "message": "Report not found"
  }
}
```

---

## 13. IDs

Use UUIDs for all primary IDs:

```text
user_id
report_id
alert_id
action_id
robot_id
observation_id
notification_id
center_id
resource_id
```

Use foreign keys between related tables.

Examples:

```text
disaster_reports.user_id → profiles.user_id
actions.report_id → disaster_reports.report_id
observations.robot_id → robots.robot_id
```

---

## 14. Timestamps

Use **ISO 8601 UTC** everywhere:

```text
2026-09-20T15:30:00Z
```

Do not mix different timestamp formats.

---

## 15. Initial Supabase Tables

Create these core database tables:

```text
profiles
disaster_reports
alerts
government_actions
robots
sensor_observations
notifications
rescue_centers
resources
```

Supabase Auth handles authentication user records separately.

---

## 16. Important Integration Rule

Frontend developers should communicate with the backend through the API contract rather than directly depending on database implementation details.

Architecture:

```text
Frontend
   ↓
Backend API
   ↓
Supabase
   ↓
Database
```

Spider-X:

```text
Spider-X
   ↓
Sensor/Robot API
   ↓
Backend
   ↓
Supabase
   ↓
Authority Dashboard
```

---

## 17. Backend Implementation Principles

- Use Node.js + Express + JavaScript.
- Use Supabase Auth for authentication.
- Use Supabase PostgreSQL for application data.
- Keep secrets in environment variables.
- Never expose the Supabase service-role key to frontend code.
- Do not commit `.env` files or secrets.
- Validate request data at the API boundary.
- Enforce authentication and role-based authorization on protected operations.
- Use UUID relationships and foreign keys.
- Keep sensor data extensible.
- Keep the frontend completely independent from database implementation details.
- Do not modify frontend files while implementing the backend/database layer.
