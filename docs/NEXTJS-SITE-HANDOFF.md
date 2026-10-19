# Next.js site: handoff

The four public pages are rebuilt as real Next.js pages in `app/(site)/`.
Today the live site still serves the old static files, because `next.config.ts`
rewrites `/`, `/reserva`, `/masterclass` and `/onboarding` to `public/*.html`.
Nothing changes for visitors until the steps below are done.

## What is in this branch
- `app/(site)/page.tsx` + `HomeClient.tsx` + `home.css`: home. Done, matched the original by screenshot.
- `app/(site)/masterclass/`: done, matched.
- `app/(site)/onboarding/`: done, matched (Spanish only, noindex).
- `app/(site)/reserva/`: converted (the 10-question form). It builds, but the side-by-side
  walkthrough against the old page (fit and no-fit paths, ES and EN) was not finished.
- Shared: `lib/site/lang.tsx` (ES/EN switch, saved in localStorage `unstoppable_lang`),
  `lib/site/track.tsx` (`<SiteTrack/>`: ju_src / ju_vid cookies + page view to /api/track),
  `lib/site/post.ts` (form POSTs with attribution), `app/(site)/font.ts` (Plus Jakarta Sans).
- Each page scopes its CSS under a root class (`.pg-home`, `.pg-reserva`, ...).
- Also merged in: the Spanish dashboard branch (`claude/sleepy-pasteur-na86i1`) and the
  links page branch (`claude/project-thread-16lcem`). Conflicts were colour only.

## To finish
1. Walk `/reserva` on a phone and desktop against the old `public/reserva.html`:
   both answer paths, ES and EN, and confirm the lead lands in /admin.
   (Tip: open the new page before step 2 by temporarily renaming the folder, or compare after step 2 on a preview deploy.)
2. In `next.config.ts` remove the four rewrites for `/`, `/reserva`, `/masterclass`, `/onboarding`.
   Keep the `/os/*` -> `/admin/*` redirect.
3. Delete `public/index.html`, `public/reserva.html`, `public/masterclass.html`, `public/onboarding.html`.
   Keep `public/demo-dashboard.html`.
4. `rm -rf .next && npx next build`, open the preview deploy, check all four pages + /admin.
5. Merge to main.

## Before real data goes in
`ADMIN_OPEN=1` turns the /admin password off. Remove it and set the admin login
before José's own Supabase / Resend / PDFShift keys are added.
