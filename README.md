# EMMADRID Mail Center

Private, server-rendered email operations dashboard for Resend. It uses Next.js App Router, TypeScript, Tailwind CSS, signed HTTP-only sessions, Zod validation, optional Upstash rate limiting, optional Supabase persistence, and Resend webhooks.

## Local setup

1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and set `ADMIN_PASSWORD`, a random `SESSION_SECRET` (at least 32 characters), `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`.
4. For production-grade persistence, create Supabase tables with the SQL below and set the two Supabase variables. Set `EMAIL_FORWARD_TO=emmanueldevopsinc@gmail.com`, `EMAIL_FORWARD_FROM=ceo@vendari.name.ng`, and `EMAIL_FORWARD_ENABLED=true` to enable inbound forwarding.
5. Run `npm run dev`, then open `http://localhost:3000`.

### Supabase schema

```sql
create table email_records (
  id uuid primary key default gen_random_uuid(), resend_id text unique not null,
  direction text not null default 'sent' check (direction in ('sent', 'received')),
  "to" text[] not null, subject text not null, "from" text not null,
  status text not null default 'accepted', html text, text text,
  created_at timestamptz not null default now()
);
create table email_templates (
  id uuid primary key default gen_random_uuid(), name text not null,
  subject text not null, html text not null, text text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table forwarding_settings (
  id text primary key, enabled boolean not null default true,
  source text not null, destination text not null, status text not null,
  last_forwarded_at timestamptz
);
create table email_forwarding_events (
  email_id text primary key, event_id text not null, status text not null,
  forwarded_id text, error text, updated_at timestamptz not null default now()
);
```

If upgrading an existing database, run:

```sql
alter table email_records add column if not exists direction text not null default 'sent';
```

The service-role key is server-only. Add RLS policies appropriate to your organization if the database is accessed by anything other than this server.

### Creating the Supabase tables

1. Open your Supabase project at `https://supabase.com/dashboard`.
2. Select the project connected to this application.
3. In the left sidebar, open **SQL Editor**, then choose **New query**.
4. Paste the complete schema above and click **Run**.
5. Open **Table Editor** and confirm that `email_records`, `email_templates`, `forwarding_settings`, and `email_forwarding_events` exist.
6. In **Project Settings > API**, copy the project URL to `NEXT_PUBLIC_SUPABASE_URL` and the `service_role` key to `SUPABASE_SERVICE_ROLE_KEY` in Vercel. Never expose the service-role key in browser code.
7. In Vercel, open **Settings > Environment Variables**, update those variables for **Production**, then redeploy.

If the first schema was already run, execute this migration instead:

```sql
create table if not exists forwarding_settings (
  id text primary key, enabled boolean not null default true,
  source text not null, destination text not null, status text not null,
  last_forwarded_at timestamptz
);
create table if not exists email_forwarding_events (
  email_id text primary key, event_id text not null, status text not null,
  forwarded_id text, error text, updated_at timestamptz not null default now()
);
```

## Resend webhooks

For inbound email, configure a Resend receiving domain (for example `inbox.example.com`) and direct mail to an address on that domain. Create a webhook pointing to `https://your-domain.vercel.app/api/webhooks/resend`, subscribe to `email.received` plus sent, delivered, delivery delayed, bounced, complained, opened, and clicked events as needed, and store the signing secret as `RESEND_WEBHOOK_SECRET`. The endpoint verifies Svix signatures using Resend's official SDK, fetches the complete inbound message, downloads every inbound attachment, and forwards matching messages addressed to `ceo@vendari.name.ng` to `emmanueldevopsinc@gmail.com`. Forwarding is enabled or disabled from Settings. The forwarding event table prevents duplicate sends; a failed attachment download or size-limit violation returns a retryable error instead of silently dropping the attachment. Attachments are limited to 10 MB per file and 25 MB total.

## Vercel deployment

Import the repository into Vercel, add all required environment variables under Project Settings > Environment Variables, and deploy. Add the production URL to the Resend webhook. For production, configure both Upstash Redis variables so login and daily sending limits persist across serverless instances, and configure Supabase so history is not ephemeral.

## Commands

`npm run dev` starts development, `npm run typecheck` runs TypeScript validation, and `npm run build` creates the production build.

The dashboard only reports accepted records until Resend webhook events confirm delivered, bounced, delayed, complained, or failed states; it never treats an accepted API request as proof of delivery.
