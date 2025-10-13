This is a Next.js app with Supabase (Auth, Realtime, Storage) and Stripe integration for auction listings, bidding, and payments.

## Prerequisites

- Node 18+
- Supabase project (project id and API keys)
- Stripe account and secret key

## Environment Variables

Create a `.env.local` in project root:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Database and Schema

Initial schema is stored at `supabase/migrations/init_core.sql`. Apply it via Supabase SQL editor or CLI.

Generate TypeScript types from your Supabase project:

```
npx supabase gen types typescript --project-id <your_project_id> > src/types/supabase.ts
```

Whenever schema changes (new tables, columns, policies, RPCs, triggers, or stored procedures), update a new SQL migration in `supabase/migrations/` and re-run the types generation command.

Enable Realtime on `public.bids` and `public.auctions` in Supabase.

## Development

Install deps and run the dev server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open http://localhost:3000.

## API routes

- `POST /api/stripe/create-intent` — creates a PaymentIntent (manual capture)
- `POST /api/stripe/capture` — captures a PaymentIntent
- `POST /api/stripe/webhook` — Stripe webhook handler
- `POST /api/auctions/finalize` — finalizes ended auctions; captures payments

## Auth

Pages:

- `/auth/login`
- `/auth/signup`

Use the Supabase Dashboard to enable email/password auth.

## Auctions & Bidding

- Create auctions (seller must be authenticated)
- Place bids (authenticated users)
- Highest bid updates via Supabase Realtime
- On auction end, finalize via `/api/auctions/finalize`

## Stripe Flow

- Create PaymentIntent when a user joins or wins an auction (pre-auth)
- Capture upon winning and finalize
- Platform fee is handled at payout time (implement in Stripe connect/payout logic)

## Types and Schema Maintenance

- Keep SQL files in `supabase/migrations/`
- Re-generate `src/types/supabase.ts` when schema changes

```
npx supabase gen types typescript --project-id <your_project_id> > src/types/supabase.ts
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
