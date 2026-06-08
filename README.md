# Reusable Standalone SaaS Boilerplate

A credit-based Next.js SaaS template powered by MUAPI. Build, deploy, and monetize custom AI generation products in minutes.

---

## 🏗️ Technical Architecture
* **Frontend**: Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + React Icons
* **Database**: Supabase Shared PostgreSQL pool + Prisma Client
* **Auth**: NextAuth with Google OAuth Provider
* **Billing**: Stripe Checkout (prebuilt webhook configuration for credit additions)
* **Prediction Engine**: Universal async trigger, inline client polling, and webhook prediction completion sync

---

## 📁 Key Features
* **Google Auth & Session Management**: Secure user registration, sign-in state checks, and session persistence.
* **Credit Checkout System**: Dynamic checkout redirection, transaction safety metadata, and automated webhook credit topups.
* **Prediction Webhook Webhooks**: Two-tiered delivery (inline polling for short tasks, and webhook handler for longer predictions).
* **Local Webhook Bypass Pattern**: Automatically polls active generations on creations load (`/api/creations`) to heal state if webhooks fail in local development.
* **Premium Theme (Dark Mode)**: Fully responsive dark-themed workspace with sliding aspect ratio presets, pulsing badges, and guest warning banners.
* **CORS-Safe Downloads**: Server proxy `/api/download` to bypass cross-origin browser behaviors and download images immediately.

---

## 🗄️ Database Safety Warning (Supabase Shared DB)

This application shares a single PostgreSQL database instance with other SaaS tools. **To prevent deleting tables of other applications in the shared pool, you MUST follow the schema synchronization lifecycle:**

1. **Pull first (Introspection)**: Run `npx prisma db pull` to load all database tables into your local `schema.prisma`.
2. **Declare your model**: Write your application's custom tables (e.g. `Creation`, `Enhancement`) and links inside the `User` model.
3. **Push changes**: Run `npx prisma db push`. This adds your models safely without dropping existing ones.
4. **Cleanup schema**: Strip models of other apps out of your `schema.prisma` file so your compiled types remain clean and lightweight.
5. **Generate client**: Run `npx prisma generate` to rebuild the type-safe client.

---

## 🔑 Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
* `DATABASE_URL`: Connection URL of Supabase PostgreSQL database.
* `DIRECT_URL`: Connection URL for database migrations.
* `NEXTAUTH_SECRET`: Random string for encrypting NextAuth sessions.
* `NEXTAUTH_URL`: Canonical root URL of the deployment (e.g. `http://localhost:3000`).
* `GOOGLE_CLIENT_ID`: OAuth Client ID from Google Cloud Console.
* `GOOGLE_CLIENT_SECRET`: OAuth Client Secret from Google Cloud Console.
* `MUAPIAPP_API_KEY`: API Key to connect to the MUAPI services.
* `WEBHOOK_URL`: Target webhook domain (usually maps to `NEXTAUTH_URL`).
* `STRIPE_SECRET_KEY`: Private key from Stripe dashboard.
* `STRIPE_WEBHOOK_SECRET`: Signature key to verify Stripe checkout events.
* `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Public Stripe key.

---

## 🚀 Local Setup & Installation

1. Install dependencies:
   ```bash
   npm install
   ```
2. Dynamic DB sync (Follow the Database Safety lifecycle above):
   ```bash
   npx prisma db pull
   npx prisma generate
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   ```
