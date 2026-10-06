# Loop

A mobile-first social app (photos, clips, videos) backed by **Supabase**: username + password accounts,
onboarding, customizable profiles (avatar, banner, bio, pronouns, link, accent colour, interests),
follows and people search. Plain HTML/CSS/JS, no build step, hosted on GitHub Pages.

Live: https://h42506916-web.github.io/loop/

## Files
- `index.html` - page shell (auth screen, onboarding, app)
- `styles.css` - styles (local fonts in `assets/fonts`)
- `app.js` - the whole app: auth, onboarding, feed, profiles, search, edit profile
- `config.js` - Supabase URL + publishable (anon) key. Never put a secret / service_role key here.
- `supabase/001_init.sql`, `supabase/002_storage.sql` - database schema, RLS, trigger, RPCs, storage buckets
- `tests/` - Playwright checks with a mocked Supabase (`node tests/shoot.js`) and a read-only smoke test against the real project (`node tests/smoke-real.js`). Not loaded by the site.

## Supabase setup
1. SQL Editor: run `supabase/001_init.sql`, then `supabase/002_storage.sql` (both safe to re-run).
2. Authentication -> Sign In / Providers -> Email: keep **Confirm email OFF**. Accounts are
   `username + password`; the app signs in with the synthetic email `<username>@loop.local`, which is never emailed.
   There is no email password reset for these accounts.
3. Put the project URL and publishable key in `config.js`, bump the `?v=` cache-busters in `index.html`, push.

supabase-js is loaded from jsDelivr pinned to `@supabase/supabase-js@2.117.2`.
