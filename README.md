# José Unstoppable — static site

Plain static HTML, no build step. Upload this folder's contents to the repo root.

- index.html — main sales page (ES/EN)
- reserva.html — pre-call qualification form + booking
- masterclass.html — webinar/event registration
- /onboarding — client onboarding (Next.js, app/onboarding). It starts by itself when José confirms a payment (invoice marked paid) or marks a deal Won: the client is emailed their link, COACH_NOTIFY_EMAIL hears about the new client, and the answers land on the deal, the contact and /admin/onboarding. It can also be activated by hand. The generic /onboarding?nombre=Ana link still works.
- dashboard.html — coach CRM (local demo data; leads stored in the visitor's browser only)

## Deploy
GitHub Pages: Settings → Pages → Deploy from branch → main / root.
Or connect the repo to Vercel / Netlify (framework: "Other", no build command).

## Before going live
- Form submissions currently save to the browser only. Connect a backend (e.g. Formspree, Google Sheets, Supabase) so José receives leads.
- Add photos, guarantee terms, legal + privacy pages.
- Add Meta Pixel to <head> of index.html, reserva.html, masterclass.html.
