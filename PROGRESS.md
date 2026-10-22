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
- [x] **Phase 7 – Email Notifications & Payment:** Completed
  - Resend transactional email notification wired into `placeOrder` server action
  - Rich HTML order receipts dispatched to owner email (`bchaitanya096@gmail.com`)
  - Razorpay cryptographic webhook signature verification helper implemented (`crypto.timingSafeEqual`)
  - Webhook route `/api/webhooks/razorpay` active; strictly marks orders paid only upon verified payment webhook
- [x] **Phase 8 – Polish, SEO & Accessibility:** Completed
  - OpenGraph social cards, meta tags, and Restaurant JSON-LD structured schema
  - robots.txt & dynamic sitemap.xml
  - Legal & trust pages: Privacy Policy, Terms of Service, Cancellation & Refund Policy, Contact Page
  - WCAG 2.2 AA accessibility focus rings, high contrast, and keyboard navigation
- [x] **Phase 9 – Testing (Unit, E2E, Axe, RLS, CI):** Completed
  - 23 Vitest unit tests passing in 330ms (opening hours in IST, 22:40 cutoff, emergency toggle, paise calculations, ₹40 delivery fee, ₹500 free threshold, ₹100 minimum order)
  - Playwright E2E test suite covering customer ordering journey (`tests/e2e/order-flow.spec.ts`)
  - AxeBuilder accessibility audit suite for WCAG 2.1 AA compliance with 0 critical violations (`tests/e2e/accessibility.spec.ts`)
  - Dedicated pricing calculation engine in `src/lib/pricing.ts`
  - GitHub Actions CI pipeline (`.github/workflows/ci.yml`) validating lint, typecheck, Vitest, and production build
- [x] **Phase 10 – Production Deployment & Launch:** Completed
  - Deployed to Vercel production at `https://joshrestaurent.vercel.app`
  - Production environment variables wired (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`)
  - Live production menu verified fetching all 10 dishes directly from Supabase
  - Live IST opening hours & order cutoff dynamic status validated in production
- [x] **Phase 11 – Handover & Documentation:** Completed
  - Comprehensive operations guide created in `docs/OPERATIONS_MANUAL.md` (daily opening checklist, live order management with audio chime, 1-click Sold Out toggle, price & menu updates, delivery controls, and Supabase backup instructions)
  - Full production README.md created with badges, live URLs, feature breakdown, testing commands, and local development setup
- [x] **Phase 12 – Access Control & Surface Separation:** Completed
  - Customer storefront and staff portal split into `(site)` and `(staff)` route groups with independent layouts (staff screens no longer render the customer header, cart drawer or footer)
  - Next.js 16 `src/proxy.ts` added: optimistic staff gate + automatic Supabase session refresh, scoped to `/admin/:path*`
  - New staff Data Access Layer (`src/lib/auth/require-staff.ts`): `requireStaff()` for pages, `assertStaff()` for server actions — secure JWT validation before any service-role query
  - All three staff server-action modules (`admin-orders.ts`, `admin-menu.ts`) now reject unauthenticated callers
  - Staff area marked `noindex` / `nofollow` and excluded from the sitemap
  - Login flow returns staff to the originally requested page and validates the `next` parameter against open-redirect abuse
  - 7 new unit tests for the access-control layer (30 Vitest tests passing)
- [x] **Phase 13 – Live Settings Wiring & CI Hygiene:** Completed
  - Storefront now loads `restaurant_settings` once in the `(site)` layout and passes live values to the header, footer, cart and pages (no more hardcoded fees, phone, address or hours)
  - Cart pricing now uses the shared `calculateOrderTotals()` engine with the database delivery fee, free-delivery threshold and minimum order, so the cart can no longer quote a total different from the one the server charges
  - Owner-configurable brand colour applied through a `--brand` CSS variable (`bg-brand` utilities)
  - Menu shows an "ordering paused" notice and disables add-to-cart when the emergency switch is off
  - `contact`, `home` and `footer` contact details, hours and delivery policy all read from the database
  - Customer pages are rendered per request (`force-dynamic` on the `(site)` layout) so settings changes take effect immediately
  - Fixed the 3 ESLint errors (`useSyncExternalStore` for the cart store and the store-hours clock, typed form errors) - `npm run lint` now exits 0
- [x] **Phase 14 – Dish Photos:** Completed
  - `DishImage` component: optimised `next/image` rendering with a branded placeholder when no photo exists or the URL breaks
  - Photos now appear on the menu cards, the home page featured dishes, the cart drawer line items and the staff menu manager
  - Fixed the storage upload path (files were being written to a nested `dish-photos/dish-photos/` folder)
  - Upload validation: image MIME type check, 5 MB limit, unique collision-safe filenames, inline preview and remove-photo action
  - `next.config.ts` now allows Supabase Storage through `images.remotePatterns`
  - Featured dishes on the home page are chosen as a deterministic spread across categories instead of arbitrary rows
- [x] **Phase 15 – Private Order Tracking & Checkout Fix:** Completed
  - Order tracking URLs are now signed with an HMAC capability token (`/order-confirmation/<order-number>/<token>`); the order number alone no longer exposes customer name, phone or address
  - `/track` requires the order number **and** the checkout phone number, and returns one generic error so orders cannot be enumerated
  - Legacy order-number-only URLs render a verification prompt instead of the receipt
  - 7 unit tests for token creation/verification/tampering + 12 end-to-end checks
  - **Critical fix:** checkout rejected the seeded menu item ids because `z.string().uuid()` enforces RFC-4122 version/variant bits that Postgres does not. Switched to `z.guid()`, which matches the database; added 5 regression tests
  - Temporary order + settings used for verification were deleted/restored
- [x] **Phase 16 – Live Tracking, Form Validation & E2E Suite:** Completed
  - Customer tracking now genuinely updates: a token-verified `/api/orders/[orderNumber]/status` endpoint is polled every 15s (anonymous visitors cannot use Supabase Realtime because RLS blocks `orders`); polling stops once the order is completed or cancelled
  - Status endpoint exposes only `status`, `paymentStatus`, `updatedAt` - no customer PII - and rejects missing/forged tokens
  - Added an explicit status pill ("Cooking", "Ready", ...) to the tracking page
  - **Critical fix:** `@hookform/resolvers@3` was incompatible with Zod 4 (peer dep `zod ^3.23.8`), so checkout form validation threw a raw `ZodError` instead of showing messages. Upgraded to `@hookform/resolvers@6` and verified validation in a real browser
  - Removed the last hardcoded fees/hours/phone from the footer, checkout, home, terms and refund pages
  - Store-hours badge text is now derived from the configured opening/closing times instead of "7:00 AM / 10:40 PM"
  - Rewrote the Playwright suite against the real UI (20 tests: storefront, cart, checkout validation, tracking privacy, staff access control, axe audits) and installed Chromium to actually run it - 20/20 passing
- [x] **Phase 17 – Dynamic UPI Payments (No Gateway):** Completed
  - Owner can upload their own UPI QR image and set payee name, UPI ID and UPI phone from `/admin/settings` - no hardcoded payment details
  - Customers choosing **Pay Online (UPI)** see the QR, UPI ID (with copy button), UPI number and exact amount on their confirmation page, plus a `upi://pay` deep link with the amount pre-filled
  - Cash orders are unaffected; staff confirm the payment with **Mark as Paid** on the kitchen dashboard
  - New shared `uploadPublicImage()` helper (MIME + 5 MB validation) used for payment assets
  - `supabase/migrations/001_upi_payment_settings.sql` adds the `upi_*` columns (idempotent); `updateRestaurantSettings()` degrades gracefully and still saves every other setting until the migration is applied
- [x] **Phase 18 – Delivery Area Control:** Completed
  - Delivery radius is now a setting (`delivery_radius_km`) and every "20 km" string across home, menu, cart, checkout, contact, footer, receipt and terms reads it live
  - New `delivery_pincodes` table + `/admin/settings` manager (add/remove chips with area names): delivery orders are rejected server-side for pincodes outside the list, and the customer is offered Counter Pickup
  - Checkout gained a required pincode field with an instant serviceability hint (the server re-checks authoritatively)
  - Empty allow-list means "deliver anywhere", so deploying cannot take delivery offline before configuration
  - `supabase/migrations/002_delivery_pincodes.sql`, `003_delivery_radius.sql` and a combined `RUN_ALL_PENDING.sql` (all idempotent)
  - Orders insert falls back automatically if `orders.delivery_pincode` is missing, so the feature can ship before the migration without blocking checkouts
  - 6 new unit tests (serviceability + pincode validation) and 1 new E2E test - 48 unit + 21 E2E passing
- [x] **Phase 19 – "Use My Location" Distance Gating & Delivery ETA:** Completed
  - Checkout gains a **Use my location** button: the customer's device shares its coordinates, the address (and pincode) are filled in automatically via reverse geocoding, and the site shows the real distance from the kitchen
  - Distance-based serviceability: inside the radius -> accepted with an estimated delivery time; outside -> rejected with a friendly message and a Counter Pickup suggestion
  - ETA = kitchen prep time + (distance / average speed), both owner-configurable, shown to the customer and stored on the order
  - Kitchen dashboard shows distance, ETA and a **Navigate** link (Google Maps) for the driver
  - `checkDeliveryServiceability()` is shared by the browser and the server, so the customer is never told one thing and given another; pincodes remain the fallback when no location is shared
  - Outlet location is set by pasting a Google Maps link or coordinates (`parseCoordinates`); no API key needed
  - Reverse geocoding uses OpenStreetMap Nominatim server-side (free, no key) with a graceful fallback to manual entry
  - `supabase/migrations/004_delivery_eta.sql` (+ folded into `RUN_ALL_PENDING.sql`)
  - 16 new unit tests (haversine, ETA maths, coordinate parsing, serviceability precedence) - 69 unit tests passing

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
