@AGENTS.md

# JBJ Time Sheet

Internal timesheet app: employees log hours against projects by week; admins manage
employees, projects, holidays, PTO and meeting minutes, and export PDF/Excel reports.
Next.js 16 (App Router) + TypeScript + Tailwind, Auth.js (credentials), Drizzle ORM on
Neon Postgres, hosted on Vercel. Pushes to `main` on GitHub (Jakoba97/jbj-time-sheet)
auto-deploy to production.

## Production database — read this first

`DATABASE_URL` in `.env.local` is the **live production database**. There is no dev or
staging database, so `npm run dev` and any script also hit real data.

- Never run migrations, `db:push`, `db:migrate`, `db:seed`, or any write query
  (INSERT/UPDATE/DELETE/DDL) without asking the user first.
- Read-only queries are fine.
- For approved additive schema changes, use a one-off raw SQL script
  (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`) rather than `drizzle-kit push`, which
  falsely prompts to drop/recreate an existing constraint on this project.

## Layout

- `app/`: pages and Server Actions. Employee pages are `dashboard`, `timesheets/[weekStart]`,
  `pto` and `meetings`; admin pages live under `admin/*`. `api/` holds the PDF/Excel export
  routes and the Vercel crons (`cron/backup` daily, `cron/drive-sync` weekly).
- `lib/db/schema.ts`: tables `users`, `projects`, `employee_titles`, `weekly_timesheets`,
  `time_entries`, `meeting_minutes`, `meeting_attendees`, `company_holidays`,
  `pto_requests` and `audit_log`. Queries are in `lib/db/queries/`.
- `lib/pdf`, `lib/excel`, `lib/google`: report generation and Drive upload.
- `proxy.ts` gates pages for GET requests only. Every Server Action must call
  `requireUser()` or `requireAdmin()` from `lib/auth/guards.ts` itself.
