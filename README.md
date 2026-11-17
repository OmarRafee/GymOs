# GymOS

GymOS is a pilot-first gym operations platform. This repository contains a locally run Next.js admin dashboard, an Expo member app, and the Supabase database/functions. No Vercel or third-party app hosting is used.

## Project structure

- `apps/admin` — local Next.js admin dashboard.
- `apps/mobile` — Expo + TypeScript app for iOS and Android; designed for Expo Go.
- `supabase/migrations` — versioned schema, indexes, constraints, RLS, Storage and Realtime setup.
- `supabase/functions` — trusted member-link and QR check-in functions.
- `supabase/seed.sql` — synthetic pilot organization, branch, plans, class types and demo records.
- `prototype` — the original browser-only concept, kept intact for reference. Its local sample data is not connected to Supabase.
- `BUSINESS_AND_LAUNCH.md` — pilot discovery and marketing notes.

## Requirements

- Node.js 22.13 or later (Expo SDK 58 requirement), npm, and Git.
- Expo Go installed on the iPhone.
- Access to the GymOS Supabase project.
- A physical device and computer on the same Wi-Fi for a direct Expo connection, or a working Expo tunnel.

## Configure local environment

The Supabase URL and publishable key are public client configuration. Service-role keys, database passwords, and other secrets must stay on the server and must never be added to either app's environment file.

Copy the examples:

```powershell
Copy-Item apps/admin/.env.example apps/admin/.env.local
Copy-Item apps/mobile/.env.example apps/mobile/.env
```

The project URL and publishable key are supplied in your local environment files. `.env*` files are ignored by Git. Keep the examples committed with placeholders only.

## Install and run

From the repository root:

```powershell
npm install
npm run admin
```

The local admin dashboard opens at `http://localhost:3000`. It signs in with email and password, and reads/writes through Supabase RLS.

In another terminal:

```powershell
npm run mobile -- --lan
```

Expo prints a QR code. Open Expo Go on your iPhone, choose **Scan QR code**, and scan it while the phone and computer are on the same network. If LAN discovery is blocked, run `npm run mobile -- --tunnel` instead. The tunnel is provided by Expo for development; it is not app hosting.

## Supabase Cloud setup

The GymOS Cloud project is in region `eu-central-1`. Migrations and seed data are checked into this repo. The initial foundation migration and seed have already been applied to that project. After changes, authenticate the Supabase CLI and link the project:

```powershell
npx supabase login
npx supabase link --project-ref igzrdlxxwcrpsvphqyiw
npx supabase db push --linked
```

Deploy Edge Functions after linking:

```powershell
npx supabase functions deploy create-member-link-code --project-ref igzrdlxxwcrpsvphqyiw
npx supabase functions deploy member-qr --project-ref igzrdlxxwcrpsvphqyiw
npx supabase functions deploy check-in --project-ref igzrdlxxwcrpsvphqyiw
```

The functions use Supabase-managed `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` inside the Edge runtime. No service-role key belongs in a client or GitHub.

## First staff account

Create an account from the admin sign-in screen using your email. After email confirmation, copy the user UUID from Supabase **Authentication → Users**. Then run this one-time statement in the GymOS SQL Editor to make that user an organization owner and grant access to the pilot branch:

```sql
insert into public.organization_users (organization_id, user_id, role, status, joined_at)
select o.id, 'PASTE_AUTH_USER_UUID_HERE'::uuid, 'owner', 'active', now()
from public.organizations o where o.slug = 'gymos-pilot'
on conflict (organization_id, user_id)
do update set role = 'owner', status = 'active', joined_at = now();
```

Owners and managers can see all branches. Use the admin dashboard to add a member with a seeded membership plan, then generate a 15-minute one-time linking code to sign that member into the mobile app.

## What's implemented

- Email/password authentication and signup for admin and mobile.
- Organization/branch-aware schema, memberships, linked member accounts, attendance, occupancy, classes, class bookings, InBody measurement metadata, private report storage, and audit records.
- RLS policies for staff roles and linked members.
- Admin member creation with a membership in one database transaction.
- One-time member linking codes, expiring member QR credentials, and idempotent check-in through Edge Functions.
- Mobile home, membership, classes, digital membership card, account linking, and staff QR scanner screens.
- Seeded synthetic organization, Downtown Club branch, plans, class types, members, and attendance data.

## Not in the pilot yet

Payment gateway, real gym vendor integrations, NFC hardware, push notifications, waitlist promotion, personal training credits, nutrition plans, and production deployment. QR check-in works through the camera scanner. NFC is not enabled in Expo Go; NFC requires a compatible native module and usually a custom development build, so the app keeps QR as the working option and the database integration path can be added after the gym identifies its access-control vendor.

The `prototype` folder is an offline concept only; do not use its numbers for business decisions.
