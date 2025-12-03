
## Run tasks

To run the dev server for your app, use:

```sh
npx nx serve web
```

To create a production bundle:

```sh
npx nx build web
```

To see all available targets to run for a project, run:

```sh
npx nx show project web
```

---

## Event & Data Schema

This section describes the simplified schema used for analytics and training data in this assignment.

### User Identity

For this exercise we use a single hard-coded test user:

- **distinct_id**: `"test-user-1"`

In PostHog, this `distinct_id` maps to a "person" with the following property:

- **email**: a test email address used for the marketing flow demo.

> **Production note:**  
> In a real system, `distinct_id` would be the authenticated user’s ID, and `email` would come from the user profile (e.g., from the session/JWT or a user service). We would not hard-code it, and we would not query the database solely for analytics; instead we would reuse user information that is already loaded for the request.

### Frontend Events

The React app emits two types of analytics events to PostHog.

#### `feature_used` event

Represents a successful usage of a product feature.

- **Event name:** `feature_used`
- **Properties:**
  - `feature_name` (string): Name or label of the feature used, e.g. `"feature1"`.
  - `source` (string, optional): Where the event originates, e.g. `"assignment_demo"`.

All `feature_used` events are associated with the user via `distinct_id = "test-user-1"`.

These events are used by PostHog to drive the marketing flow (e.g., "send an email after 5 uses").

#### `generation_failed` event

Represents a failure in an AI generation flow, which we want to capture for model training.

- **Event name:** `generation_failed`
- **Properties:**
  - `failure_reason` (string): High-level reason for failure, e.g. `"timeout"`, `"validation_error"`.
  - `input_prompt` (string): The original user prompt text that led to the failure.

PostHog attaches its own event timestamp, so we do not send a custom timestamp from the frontend.

These events are routed to the backend for sanitization and storage as training data.

### Backend Training Data (JSONL)

The NestJS backend receives `generation_failed` events via a PostHog webhook and transforms them into a canonical training record before writing them to a local JSON Lines file: `training_data.jsonl`.

Each line in `training_data.jsonl` is a single JSON object with (at minimum) the following fields:

- `user_id` (string): The PostHog `distinct_id`, e.g. `"test-user-1"`.
- `failure_reason` (string): Copied from the event payload.
- `input_prompt` (string): Sanitized prompt text (trimmed, ensured to be a string, and optionally filtered if empty).
- `event_timestamp` (ISO 8601 string): When the event occurred (based on the timestamp from PostHog).
- `ingested_at` (ISO 8601 string): When the backend wrote the record to the training file.

Example JSONL line:

```json
{ 
    "user_id":"test-user-1",
    "failure_reason":"timeout",
    "input_prompt":"Generate a floorplan for a 2-bedroom apartment",
    "event_timestamp":"2025-12-03T11:45:00Z",
    "ingested_at":"2025-12-03T11:45:02Z"
}
```
