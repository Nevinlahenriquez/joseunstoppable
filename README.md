# José Unstoppable

Next.js app: the public site plus José's sales dashboard (`/admin`), all in Spanish.

## Public pages
- `/` main sales page (ES/EN), `/reserva` call booking form, `/masterclass` webinar sign-up, `/onboarding?nombre=Ana` client onboarding (static HTML in `public/`)
- `/links` link-in-bio, `/events/<slug>` public event page with sign-up
- `/proposal/<token>`, `/invoice/<id>`, `/receipt/<id>` client documents

## Dashboard (`/admin`)
Leads pipeline, calls, events, contacts, link in bio, traffic stats, ads attribution, offers, proposals, invoices and payment links.

## Environment (Vercel)
Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` (then press "Preparar base de datos" on `/admin`), admin login secrets (see `lib/auth.ts`).
Optional: `RESEND_API_KEY` (emails), `STRIPE_SECRET_KEY` (card payments and payment links), `PDFSHIFT_API_KEY` (PDFs), `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (calendar), `NEXT_PUBLIC_BANK_IBAN`, `NEXT_PUBLIC_BANK_SWIFT`, `NEXT_PUBLIC_BUSINESS_ADDRESS`, `NEXT_PUBLIC_TAX_ID`, `NEXT_PUBLIC_EVENT_WHATSAPP_URL`.

## Develop
`npm install`, `npm run dev`, `npm run build`.
