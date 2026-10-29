# docs/api/ — API Documentation

## What belongs here

Reference documentation for every API endpoint, written as the endpoints are built.

### Template for each endpoint

```
## METHOD /path

**Auth required:** yes / no  
**Purpose:** One sentence.

### Request

Headers:
- `Content-Type: application/json`
- `Cookie: session=...` (if auth required)

Body (if POST/PATCH):
```json
{ "field": "value" }
```

### Responses

**Success** `200/201/204`
```json
{ "data": "..." }
```

**Errors**
- `400` — validation error: `{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }`
- `401` — not authenticated
- `404` — not found
```

---

## Conventions

- Base path: `/api`. JSON in, JSON out. Local base URL: `http://localhost:4000`.
- Auth: signed HttpOnly cookie `dt_session` (set by login/register). All `/api/logs` routes require it; the curl examples use `-b cookies.txt` (a cookie jar saved with `-c cookies.txt` on login).
- Timestamps are ISO 8601 strings in UTC.

### Error format (every endpoint)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed.", "details": [{ "field": "minutes", "message": "Number must be less than or equal to 1440" }] } }
```

`details` is present only for validation errors.

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Bad body/query, or malformed JSON |
| `UNAUTHENTICATED` | 401 | Missing/invalid/expired session |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `NOT_FOUND` | 404 | Unknown route or resource (also used for other users' resources) |
| `CONFLICT` | 409 | e.g. duplicate email |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error (no internals leaked) |

### Types

- `activity`: `SOCIAL_MEDIA | CODING | STUDY | EXERCISE | OTHER`
- `Log`: `{ id, userId, activity, minutes (int 1..1440), note (string|null, max 280), loggedAt, createdAt }`

## GET /health

**Auth required:** no. Returns `200 {"status":"ok","env":"development"}`.

## POST /api/logs

**Auth required:** yes
**Purpose:** Record time spent on an activity.

### Request

Body: `activity` and `minutes` required; `note` and `loggedAt` (ISO 8601, defaults to now) optional.

```bash
curl -X POST http://localhost:4000/api/logs -b cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"activity":"CODING","minutes":45,"note":"API work"}'
```

### Responses

**Success** `201`
```json
{
  "id": "0b1f6c7e-5a52-4c0e-9d0e-3f2f1d0a9c11",
  "userId": "user-id",
  "activity": "CODING",
  "minutes": 45,
  "note": "API work",
  "loggedAt": "2026-01-02T10:00:00.000Z",
  "createdAt": "2026-01-02T10:00:00.000Z"
}
```

**Errors**
- `400` `VALIDATION_ERROR` — unknown activity, `minutes` not an integer in 1..1440, `note` over 280 chars, invalid `loggedAt`, missing fields
- `401` `UNAUTHENTICATED`

## GET /api/logs

**Auth required:** yes
**Purpose:** List the current user's logs, newest `loggedAt` first.

Query (both optional, ISO 8601, inclusive): `from`, `to`. `from` must not be after `to`.

```bash
curl "http://localhost:4000/api/logs?from=2026-01-01T00:00:00Z&to=2026-01-31T23:59:59Z" -b cookies.txt
```

**Success** `200`
```json
{ "logs": [ { "id": "...", "userId": "...", "activity": "CODING", "minutes": 45, "note": null, "loggedAt": "2026-01-02T10:00:00.000Z", "createdAt": "2026-01-02T10:00:00.000Z" } ] }
```

**Errors**
- `400` `VALIDATION_ERROR` — invalid date or `from` after `to`
- `401` `UNAUTHENTICATED`

## DELETE /api/logs/:id

**Auth required:** yes
**Purpose:** Delete one of your logs.

```bash
curl -X DELETE http://localhost:4000/api/logs/0b1f6c7e-5a52-4c0e-9d0e-3f2f1d0a9c11 -b cookies.txt -i
```

**Success** `204` (empty body)

**Errors**
- `401` `UNAUTHENTICATED`
- `404` `NOT_FOUND` — id does not exist or belongs to another user (deliberately indistinguishable):
```json
{ "error": { "code": "NOT_FOUND", "message": "Log not found." } }
```

---

## Authentication

Session is a signed JWT in the `dt_session` cookie (`HttpOnly`; production: `Secure; SameSite=None`, local: `SameSite=Lax`). The browser must send requests with `credentials: 'include'`. Every `/api/*` route except `/api/auth/*` requires it and returns `401 UNAUTHENTICATED` without a valid cookie. See `docs/decisions/001-auth.md`.

Auth responses never contain the password or hash. Email is trimmed and lowercased.

### POST /api/auth/register

**Auth required:** no. **Rate limited:** 10 requests / 15 min / IP (`429 RATE_LIMITED`).

Body: `{ "email": "a@b.com", "password": "min 8, max 72 chars" }`

- `201` `{ "user": { "id": "...", "email": "a@b.com" } }` and sets `dt_session` (user is logged in).
- `400` VALIDATION_ERROR (bad email, short/long password)
- `409` CONFLICT (email already registered)

### POST /api/auth/login

**Auth required:** no. **Rate limited:** same as register.

Body: `{ "email": "...", "password": "..." }`

- `200` `{ "user": { "id", "email" } }` and sets `dt_session`.
- `400` VALIDATION_ERROR
- `401` UNAUTHENTICATED, message always `Invalid email or password` (same for unknown email and wrong password).

### POST /api/auth/logout

**Auth required:** no (idempotent). `204` no body; clears the cookie.

### GET /api/auth/me

**Auth required:** yes. `200` `{ "user": { "id", "email" } }`, or `401` UNAUTHENTICATED.

### Ownership

Logs (and goals, analytics) are scoped to the logged-in user. Requesting or deleting another user's resource returns `404 NOT_FOUND` (not 403) so existence is not revealed.

---

## Phase 8-9 endpoints (dashboard, goals, focus timer, analytics)

All require auth (401 otherwise) and are scoped to the logged-in user. Another user's resource gives 404. Errors use the standard `{ "error": { code, message, details? } }` shape.

`tz` is an IANA timezone (e.g. `Asia/Kolkata`); invalid values give `400 VALIDATION_ERROR`; default `UTC`. Day boundaries are computed in `tz` (ADR 004).

### GET /api/dashboard?date=YYYY-MM-DD&tz=<IANA>

`date` optional (default: today in `tz`).
```json
{
  "date": "2024-05-10",
  "totals": { "SOCIAL_MEDIA": 0, "CODING": 45, "STUDY": 0, "EXERCISE": 0, "OTHER": 0 },
  "goals": [{ "goalId": "...", "activity": "CODING", "type": "TARGET", "minutes": 60, "progressMinutes": 45, "met": false }],
  "streak": { "current": 2, "longest": 5 }
}
```
`met`: TARGET = progress >= minutes, LIMIT = progress <= minutes. Streak rules: `docs/notes/phase-8-streaks.md`.

### Goals
- `GET /api/goals` -> `200 { "goals": [{ id, activity, type, minutes, createdAt }] }`
- `POST /api/goals` body `{ activity, type: "TARGET"|"LIMIT", minutes: 1..1440 }` -> `201 { "goal": {...} }`; duplicate (activity, type) -> `409 CONFLICT`
- `DELETE /api/goals/:id` -> `204`; unknown or not yours -> `404`

### Focus timer (timestamps are server-side only)
- `POST /api/sessions/start` body `{ activity }` -> `201 { "session": { id, activity, startedAt } }`; already running -> `409`
- `GET /api/sessions/active` -> `200 { "session": {...} | null }`
- `POST /api/sessions/stop` -> `200 { "session": { id, activity, startedAt, endedAt, minutes }, "log": Log }`; none active -> `404`. `minutes = max(1, round(elapsed))`, capped at 1440; a log is created automatically.

### GET /api/analytics/summary?range=week|month&tz=<IANA>
`week` = last 7 days, `month` = last 30 days, ending today (inclusive). Days with no logs are zero-filled.
```json
{ "range": "week", "days": [{ "date": "2024-05-04", "totalsByActivity": { "SOCIAL_MEDIA": 0, "CODING": 0, "STUDY": 0, "EXERCISE": 0, "OTHER": 0 } }] }
```
