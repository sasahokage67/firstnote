# firstnote — FTC Team Workspace

TanStack Start + React 19 + Tailwind 4 + Supabase. Ready to deploy on Vercel.

## Local development

```sh
npm install
npm run dev        # http://localhost:3000
```

## Deploy to Vercel

1. Push this repo to your GitHub.
2. On vercel.com → **Add New → Project** → import the repo. Framework preset can stay on auto
   (Nitro detects Vercel during the build and outputs `.vercel/output`).
3. **Environment Variables** (Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key |
   | `SUPABASE_URL` | same as above |
   | `SUPABASE_PUBLISHABLE_KEY` | same as above |
   | `VITE_ENABLE_GOOGLE_AUTH` | `true` to show "Continue with Google" (only after enabling Google in Supabase) |

   `.env` is not committed — use `.env.example` as a template.
4. Deploy.

## Own Supabase database (optional)

To run on your own Supabase project instead of the original backend:

1. Create a project at supabase.com.
2. Open SQL Editor and run, in order:
   `drizzle/migrations/0000_migration.sql`, then `drizzle/migrations/0001_restrict_profiles_select.sql`.
3. Put the new URL and publishable key into `.env` and the Vercel env vars.
4. Authentication → URL Configuration: set **Site URL** to your Vercel domain and add
   `https://<your-domain>/**` to Redirect URLs.
5. For "Continue with Google": Authentication → Providers → Google (needs a Google OAuth client).
