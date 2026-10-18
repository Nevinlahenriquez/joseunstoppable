# José Unstoppable — static site

Plain static HTML, no build step. Upload this folder's contents to the repo root.

- index.html — main sales page (ES/EN)
- reserva.html — pre-call qualification form + booking
- masterclass.html — webinar/event registration
- onboarding.html — client onboarding after payment; answers go to José on WhatsApp. Personalise with ?nombre=Ana
- dashboard.html — coach CRM (local demo data; leads stored in the visitor's browser only)

## Deploy
GitHub Pages: Settings → Pages → Deploy from branch → main / root.
Or connect the repo to Vercel / Netlify (framework: "Other", no build command).

## Before going live
- Form submissions currently save to the browser only. Connect a backend (e.g. Formspree, Google Sheets, Supabase) so José receives leads.
- Add photos, guarantee terms, legal + privacy pages.
- Add Meta Pixel to <head> of index.html, reserva.html, masterclass.html.
