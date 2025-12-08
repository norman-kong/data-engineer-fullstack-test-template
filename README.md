## Overview

This repository contains two main apps:

- `apps/web`: React frontend (Nx) that emits analytics events to PostHog.
- `apps/api`: NestJS backend that consumes PostHog webhooks and implements:
  - A marketing trigger (“send” a mock email when a feature is used 5 times).
  - A failure-event ingestion path for `generation_failed` events.

The key architectural goal is **separation of concerns**:

- The frontend only **emits events**.
- PostHog acts as an **event router**.
- The backend implements the **business logic** (marketing trigger + failure data ingestion) using those events.

> This keeps the frontend separate from the business logic in the backend. 

## Architecture

### High-level flow

1. **Frontend (React, `apps/web`)**
   - Initializes the PostHog JavaScript SDK.
   - Identifies the current user with a hard-coded `distinct_id=test-user-1` and `email=test-user-1@mail.com`. 
   - Exposes two buttons:
     - **"Simulate Feature Usage"**  
       Sends a `feature_used` event with:  
       `feature_name = "demo_feature"`.
     - **"Simulate Generation Failure"**  
       Sends a `generation_failed` event with dummy data:  
       - `failure_reason = "timeout"`  
       - `input_prompt = "generate a floorplan for a 2-bedroom apartment"`.

2. **PostHog (Cloud)**
   - Receives client events from the frontend.
   - Forwards selected events to the backend via a **Webhook Destination**. Events forwarded: 
     - `feature_used`
     - `generation_failed`

3. **Backend (NestJS, `apps/api`)**
   - Exposes a single webhook endpoint:
     - `POST /api/posthog/webhook`
   - Accepts PostHog webhook payloads and normalizes them.
   - Routes events by `event` name to two services:
     - `MarketingService`: Tracks feature usage counts per user and logs a **mock email** when a threshold is passed.
     - `FailureEventsService`: Sanitizes and stores `generation_failed` events for downstream training/analytics.

### Backend Structure

All PostHog-related logic lives in a dedicated feature module:

```text
apps/api/src/app/posthog/
  posthog.module.ts          # Feature module
  posthog.controller.ts      # POST /api/posthog/webhook
  marketing.service.ts       # Marketing trigger logic
  failure-events.service.ts  # Failure event ingestion
  dto/
    posthog-webhook.dto.ts   # Raw PostHog webhook shape (event + person)
    posthog-event.dto.ts     # Normalized internal event DTO
```

- `PosthogController`:
  - HTTP boundary for `/api/posthog/webhook`
  - Accepts the raw webhook body (`event`, `person`)
  - Normalizes it into a simpler `PosthogEventDto`:
    - `event` (name)
    - `distinct_id`
    - `properties`
    - `timestamp`
  - Routes to the appropriate service based on event name.
- `MarketingService`
  - To simulate a prod DB, this service maintains two in-memory maps: 
    - `usageCounts` maps distinctId:feature_name -> count 
    - `mailedKeys` is a set of `${distinctId}:${featureName}` for which we've already "sent" the email
  - On each `feature_used` event:
    - Increments the counter for `(distinct_id, feature_name)`.
    - When the count reaches ≥ 5 for a given `(distinct_id, feature_name)` and this user has not been emailed for this feature yet, logs a mock email using `EmailService`.
  - In a real system, this would: 
    - Persist counts in a DB/cache. 
    - Call a real `EmailService` that uses SES, SendGrid, etc. 
- `FailureEventsService`
  - Handles generation_failed events.
  - Performs simple sanitization:
    - Whitelisted fields:
      - failure_reason
      - input_prompt
      - distinct_id
      - timestamp
  - Truncates very long strings for safety.
  - Stores the event to a local file named `training_data.jsonl`. 
  - In a production system, these events would be written to a durable store (e.g. Postgres, S3, or a data warehouse).

I've also mocked an email service: 

```text
apps/api/src/app/email/email.service.ts
```

### Frontend Implementation

#### PostHog integration 
- PostHog is initialized once in the React entrypoint (`apps/web/src/main.tsx`).
- The `App` component (`apps/web/src/app/app.tsx`) performs:
  - `posthog.identify("test-user-1", { email: "test-user-1@mail.com" })` inside a `useEffect` with an empty dependency array, so it runs once on app load, attaching a dummy user to the events. 
- In a real system, this would use proper authentication and cookies to identify the current user. 

#### Sending Events
- Two buttons handle the two different events we want to support: 
```ts
posthog.capture('feature_used', { 
    feature_name: 'demo_feature' 
});

posthog.capture('generation_failed', {
  failure_reason: 'timeout',
  input_prompt: 'generate a floorplan for a 2-bedroom apartment',
});
```

This keeps the frontend logic simple and focused on sending analytics events rather than owning marketing or data-pipeline concerns.

## How to Run

### Prerequisites
- Node.js and pnpm are installed. 
- A PostHog Cloud project is created and configured. 
  
### 1. Install dependencies

From the repo root:

```bash
pnpm install
```

### 2. Run tasks

To run the dev server for the frontend: 
```sh
npx nx serve web
```
To run the dev server for the backend: 
```sh
npx nx serve api
```

### 3. Expose the API with Pinggy

To start a Pinggy tunnel: 
```sh
ssh -p 443 -R0:localhost:3000 qr@free.pinggy.io
```

which will return a public URL that passes on traffic to your `http://localhost:3000`. 

### 4. Configure PostHog Webhook Destination

In your PostHog project:
- Go to Data pipeline → Destinations.
- Create a new Webhook destination.
- Set the Webhook URL to your Pinggy URL:
```text
https://<your-pinggy-subdomain>.free.pinggy.link/api/posthog/webhook
```
- Configure filters so that this destination only sends events: `feature_used`, `generation_failed`

### 5. Usage

Clicking the React buttons should now trigger the events, sending them to PostHog, and consequently to your backend! 

## Design Decisions

### Email Trigger: Why I used the Webhook + Mock Email fallback

To solve this problem, a natural feature to leverage for this is PostHog's Workflows. They are good at: 

- Triggering on specific events.
- Branching based on event properties or person properties.
- Sending notifications, emails, or webhooks.

To identify which users have triggered the `feature_name = demo_feature` event at least 5 times, I opted to use a **dynamic cohort**, which does identify the target users. However, dynamic cohorts are recalculated on a batch schedule (on the order of once every 24 hours), not in real-time. That means:

- A user might cross the 5-uses threshold at, say, 10:03.
- They would not necessarily enter the cohort until the next cohort refresh.
- The email timing becomes "some time tomorrow" rather than "when they actually hit 5 uses".

For a batched lifecycle campaign this is fine, but it does not closely match the assignment's requirement of a real-time email when count > 5.

Given the above issue, one might try to avoid using cohorts. However, <b>workflows are event/property-oriented</b>, not count-threshold-oriented. I did not find a clean, no-code way to express the filtering logic purely through the Workflow. In practice, you'd likely need some additional logic to complement the workflow (for example, a small piece of code in a PostHog plugin or a separate service) to maintain per-user count and expose it as a person property. At that point you are back to relying on custom code, which defeats the goal of keeping this trigger purely no-code. 

As a last note, using PostHog's email channel requires non-trivial complexity, like domain verification, control over DNS for a custom domain, etc. This email infrastructure is out of scope for this analytics/architecture problem. 

### Chosen approach: Webhook + backend mock email

Given the above constraints, I chose to use PostHog to forward the `feature_used` events. The backend receives these events through a webhook (`POST /api/posthog/webhook`). The backend also maintains the `MarketingService`, which tracks per-user, per-feature counts in memory (which emulates a DB), and enforces the logic needed for our requirement. 

This design still supports our priority on decoupling while satisfying our functional requirement. 

### Future Work 

In a production system, I would likely:
- Promote the in-memory counters and failure-event storage to durable storage (DB or data lake).
- Introduce a real `EmailService` (SES, SendGrid, etc.).

### Event & Data Schema

This section describes the simplified schema used for analytics and training data in this assignment.

#### User Identity

For this exercise I hard-coded a single test user, represented through a `distinct_id = test-user-1` and `email=test-user-1@mail.com`. 

> **Production note:**  
> In a real system, `distinct_id` would be the authenticated user’s ID, and `email` would come from the user profile (e.g., from the session/JWT or a user service). We would not hard-code it, and we would not query the database solely for analytics; instead we would reuse user information that is already loaded for the request.

#### Frontend Events

The React app emits two events to PostHog: 

- `feature_used`
  - Represents a successful usage of a product feature, with properties: 
    - `feature_name` (string): Name or label of the feature used, e.g. `"demo_feature"`.
  - These events are used by PostHog to drive the marketing flow (e.g., "send an email after 5 uses").
- `generation_failed`
  - Represents a failure in an AI generation flow, which we want to capture for model training, with properties:
      - `failure_reason` (string): High-level reason for failure, e.g. `"timeout"`.
      - `input_prompt` (string): The original user prompt text that led to the failure.
  - These events are routed to the backend for sanitization and storage as training data.

For both events: 
- PostHog attaches its own event timestamp, so we do not send a custom timestamp from the frontend.
- Attached to user `test-user-1`. 

#### Backend Training Data (JSONL)

The NestJS backend receives `generation_failed` events via a PostHog webhook and transforms them into a canonical training record before writing them to a local JSON Lines file: `training_data.jsonl`.

Each line in `training_data.jsonl` is a single JSON object with the following fields:

- `distinctId` (string): The PostHog `distinct_id`, e.g. `"test-user-1"`.
- `failureReason` (string): Sanitized failure reason (stringified, trimmed, truncated to 100 chars).
- `inputPrompt` (string): Sanitized prompt text (stringified, trimmed, truncated to 1000 chars).
- `timestamp` (ISO 8601 string): When the event occurred (using PostHog’s timestamp when available, otherwise the backend processing time).
  
Example JSONL line:

```json
{
    "distinctId":"test-user-9",
    "failureReason":"timeout",
    "inputPrompt":"generate a floorplan for a 2-bedroom apartment",
    "timestamp":"2025-12-04T20:31:11.277000Z"
}
```