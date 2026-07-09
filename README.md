# Overlap

A Next.js + Supabase prototype for link-based group scheduling with project-based participant filtering.

[Use Overlap Now!](https://overlap-phi.vercel.app/)

## Features

- Name-only participant sign-in
- Create a meeting link from selected potential dates
- Each shared link has isolated participants, projects, and availability
- Click-and-drag availability painting in 30-minute blocks
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

Run the schema again after updates. It is written as a migration and will add the event-link tables/columns to an existing prototype database.

Start the app:

```bash
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel as a Next.js project.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel project settings.
4. Deploy.

After deploy, open the site root, select potential dates, create a link, and share the generated `?event=...` URL with the team.

The prototype uses only regular Supabase Postgres tables and client-side reads/writes. No file storage, edge functions, or paid-only services are required.

## Security Note

This intentionally matches the requested no-password flow. The included RLS policies allow anonymous users to read and edit scheduling data, which is suitable for a shareable prototype but not for private or sensitive schedules.
