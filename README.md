# EMMADRID Mail Center

Private, server-rendered email operations dashboard for Resend. It uses Next.js App Router, TypeScript, Tailwind CSS, signed HTTP-only sessions, Zod validation, optional Upstash rate limiting, optional Supabase persistence, and Resend webhooks.

## Local setup

1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and set `ADMIN_PASSWORD`, a random `SESSION_SECRET` (at least 32 characters), `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`.
4. For production-grade persistence, create Supabase tables with the SQL below and set the two Supabase variables.
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
```

If upgrading an existing database, run:

```sql
alter table email_records add column if not exists direction text not null default 'sent';
```

The service-role key is server-only. Add RLS policies appropriate to your organization if the database is accessed by anything other than this server.

## Resend webhooks

For inbound email, configure a Resend receiving domain (for example `inbox.example.com`) and direct mail to an address on that domain. Create a webhook pointing to `https://your-domain.vercel.app/api/webhooks/resend`, subscribe to `email.received` plus sent, delivered, delivery delayed, bounced, complained, opened, and clicked events as needed, and store the signing secret as `RESEND_WEBHOOK_SECRET`. The endpoint verifies Svix signatures, fetches the complete inbound message with the official Resend SDK, and saves it idempotently in the protected Inbox.

## Vercel deployment

Import the repository into Vercel, add all required environment variables under Project Settings > Environment Variables, and deploy. Add the production URL to the Resend webhook. For production, configure both Upstash Redis variables so login and daily sending limits persist across serverless instances, and configure Supabase so history is not ephemeral.

## Commands

`npm run dev` starts development, `npm run typecheck` runs TypeScript validation, and `npm run build` creates the production build.

The dashboard only reports accepted records until Resend webhook events confirm delivered, bounced, delayed, complained, or failed states; it never treats an accepted API request as proof of delivery.
