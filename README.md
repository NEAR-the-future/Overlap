# Overlap

A Next.js + Supabase prototype for group scheduling with project-based participant filtering.

## Features

- Name-only participant sign-in
- Click-and-drag availability painting in weekday 30-minute blocks
- Group heatmap that recalculates from the currently checked participants
- Project creation and participant assignment
- Project filter that checks only the members of a selected project
- Supabase persistence with a local demo mode when env vars are absent

## Local Setup

Install dependencies:

```bash
npm install
```

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

In Supabase, open the SQL editor and run:

```sql
-- paste supabase/schema.sql
```

Start the app:

```bash
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel as a Next.js project.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings.
4. Deploy.

The prototype uses only regular Supabase Postgres tables and client-side reads/writes. No file storage, edge functions, or paid-only services are required.

## Security Note

This intentionally matches the requested no-password flow. The included RLS policies allow anonymous users to read and edit scheduling data, which is suitable for a shareable prototype but not for private or sensitive schedules.
