# Project Progress: Josh Online Food Ordering Platform

## Project Overview
- **Restaurant Name:** Josh
- **Cuisine:** South Indian Vegetarian & Non-Vegetarian
- **Location & Time Zone:** Vizag, India (`Asia/Kolkata`)
- **Currency:** INR (₹), all monetary values stored as integers in **paise** (1 INR = 100 paise)
- **Order Types:** Pickup and Delivery (within 20 km radius)
- **Delivery Fee:** ₹40 (free for orders above ₹500)
- **Minimum Order for Delivery:** ₹100
- **Operating Hours:** 07:00 AM to 11:00 PM (orders cut off at 10:40 PM, 20 mins prior to close)
- **Initial Payment Methods:** Pay on Delivery / Pickup (Cash or UPI QR upon arrival); Razorpay online payments in Phase 7
- **Tech Stack:** Next.js (App Router, TS strict mode), Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth, Storage, Realtime), Zod + React Hook Form, Resend, Vitest, Playwright.

---

## Phases Status
- [x] **Pre-flight Q&A:** Completed
- [x] **Phase 1 – Plan:** Completed
  - Order flow & state transitions defined
  - Database schema & RLS security model drafted
  - Wireframes created for Home, Menu, Cart, Checkout, Confirmation, Staff Dashboard
- [x] **Phase 2 – Setup:** Completed
  - Next.js 16 (App Router) + TypeScript + Tailwind CSS initialized
  - Core libraries installed (@supabase/supabase-js, @supabase/ssr, zod, react-hook-form, lucide-react, resend)
  - Supabase client, server, and admin helpers configured
  - .env.example created with placeholders; .env.local created (git-ignored)
  - Successfully deployed to Vercel at `joshrestaurent.vercel.app`
- [x] **Phase 3 – Database & RLS:** Completed
  - PostgreSQL schema created (categories, menu_items, restaurant_settings, orders, order_items)
  - Row Level Security (RLS) active and verified with automated test
  - `dish-photos` storage bucket provisioned
  - Supabase Realtime publication configured on `orders`
  - Seed menu catalog populated with authentic Tiffins, Biryanis, and Beverages
- [x] **Phase 4 – Menu Pages & Browsing:** Completed
  - Responsive header with branding, click-to-call, and live cart counter
  - Operating hours & open/closed badge computed in `Asia/Kolkata`
  - Accessible slide-out Cart Drawer with item notes and free delivery meter
  - High-impact Home page with popular dishes preview and delivery perks
  - Live Menu page with category grouping, instant search, Veg/Non-Veg toggles, and sold-out states
- [x] **Phase 5 – Cart, Server-side Pricing & Checkout:** Completed
  - Persistent cart state in local storage surviving refresh
  - Validated checkout form with Zod schema (pickup vs 20km delivery, preferred time, cash/UPI payment)
  - Strict server action pricing recalculation from Supabase database (never trusts browser prices)
  - Historical snapshot of dishes and prices in `order_items`
  - Live order confirmation page with real-time status tracker and receipt
  - Fast order lookup page at `/track`
- [x] **Phase 6 – Owner Live Dashboard & Menu Manager:** Completed
  - Staff login screen at `/admin/login` using Supabase Auth
  - Real-time kitchen orders display (`/admin/orders`) with Web Audio API chime notifications
  - Quick status changer: New ➔ Preparing ➔ Ready ➔ Completed (or Cancelled)
  - Payment toggle to mark cash/UPI orders as Paid
  - Menu Manager (`/admin/menu`) with 1-click sold-out switch, edit price, and photo upload
  - Settings manager (`/admin/settings`) with emergency order switch, hours, fees, and brand color
- [/] **Phase 7 – Email Notifications & Payment:** In Progress
  - Resend transactional email integration sending instant order notification to owner (`bchaitanya096@gmail.com`)
  - Optional Razorpay checkout & signature-verified webhook architecture ready
- [ ] **Phase 8 – Polish, SEO & Accessibility:** Not Started
- [ ] **Phase 9 – Testing (Unit, E2E, Axe, RLS, CI):** Not Started
- [ ] **Phase 10 – Production Deployment & Launch:** Not Started
- [ ] **Phase 11 – Handover & Documentation:** Not Started

---

## Key Decisions
1. **Host:** Vercel for serverless edge deployment with Next.js App Router.
2. **Pricing Integrity:** Server computes all subtotals, delivery fees, and grand totals directly against Supabase database items. Browser never dictates prices.
3. **Database Security:** Strict Postgres Row Level Security (RLS). Anonymous users can only read active categories, available menu items, and public store settings. Orders can only be inserted by server actions via service role / authenticated backend logic, and only authenticated staff can read/update orders.
4. **Money Units:** Integer paise representation (e.g., ₹100.00 = `10000` paise).
5. **Brand Customization:** Dynamic theme tokens (primary brand color, logo) stored in `settings` table so the owner can configure brand identity anytime without redeploying.

---

## Open TODO Placeholders
- [ ] **TODO: Real Address:** Currently using placeholder: *Josh Restaurant, Siripuram Beach Road, Visakhapatnam, AP 530003*
- [ ] **TODO: Real Contact Number:** Currently using placeholder: *+91 98765 43210*
- [ ] **TODO: Logo File:** Owner to provide final SVG/PNG logo during Phase 3/4 (or upload via dashboard).
- [ ] **TODO: Menu Catalog Details:** Full dish list with exact prices and descriptions to be populated in Phase 3 seed file.
