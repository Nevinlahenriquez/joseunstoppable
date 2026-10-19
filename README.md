# José Unstoppable — static site

Plain static HTML, no build step. Upload this folder's contents to the repo root.

- index.html — main sales page (ES/EN)
- reserva.html — pre-call qualification form + booking
- masterclass.html — webinar/event registration
- /onboarding — client onboarding (Next.js, app/onboarding). José activates a personal link per client from /admin/onboarding or a lead card; answers save to the dashboard and open WhatsApp for the photos. The generic /onboarding?nombre=Ana link still works.
- dashboard.html — coach CRM (local demo data; leads stored in the visitor's browser only)

## Deploy
GitHub Pages: Settings → Pages → Deploy from branch → main / root.
Or connect the repo to Vercel / Netlify (framework: "Other", no build command).

## Before going live
- Form submissions currently save to the browser only. Connect a backend (e.g. Formspree, Google Sheets, Supabase) so José receives leads.
- Add photos, guarantee terms, legal + privacy pages.
- Add Meta Pixel to <head> of index.html, reserva.html, masterclass.html.
