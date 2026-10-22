# 🍛 Josh Restaurant — Production Online Ordering Platform

> Modern, blazing-fast online ordering platform for **Josh Restaurant** (Authentic South Indian Tiffins, Dosas & Fragrant Dum Biryanis) in Visakhapatnam, Andhra Pradesh, India.

[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-black?logo=next.js)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_&_Realtime-3ECF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS_v4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Unit_Tests-6E9F18?logo=vitest)](https://vitest.dev/)
[![CI](https://github.com/Chaitanya4356/Restaurent-/actions/workflows/ci.yml/badge.svg)](https://github.com/Chaitanya4356/Restaurent-/actions)
[![Live Site](https://img.shields.io/badge/Vercel-Live_Production-000?logo=vercel)](https://joshrestaurent.vercel.app)

---

## 🚀 Live Demo
- **Customer Ordering:** [https://joshrestaurent.vercel.app](https://joshrestaurent.vercel.app)
- **Menu Catalog:** [https://joshrestaurent.vercel.app/menu](https://joshrestaurent.vercel.app/menu)
- **Live Order Tracker:** [https://joshrestaurent.vercel.app/track](https://joshrestaurent.vercel.app/track)
- **Staff Orders Dashboard:** [https://joshrestaurent.vercel.app/admin/orders](https://joshrestaurent.vercel.app/admin/orders)
- **Operations Manual:** [docs/OPERATIONS_MANUAL.md](docs/OPERATIONS_MANUAL.md)

---

## 🌟 Core Features

### 🛍️ Customer Experience
- **Live Operating Hours Engine:** Dynamic status badge calculating `07:00` to `23:00 IST` operating window with a 20-minute order cutoff buffer (`22:40 IST`).
- **Interactive Menu Catalog:** Instant live search, category pills (Tiffins, Biryanis, Beverages), Veg / Non-Veg dietary filters, and sold-out states.
- **Persistent Cart Drawer:** Drawer with live item quantities, customizable cooking notes, subtotal calculations, and free delivery threshold indicator.
- **Validated Checkout:** Validated phone number format (`[6-9]\d{9}`), delivery address verification, and preferred timing selection.
- **Real-Time Order Tracking:** Live order tracker displaying preparation timeline (`new` $\rightarrow$ `confirmed` $\rightarrow$ `preparing` $\rightarrow$ `out_for_delivery` $\rightarrow$ `delivered`).

### 👨‍🍳 Kitchen & Admin Portal
- **Real-Time Orders Stream:** Powered by Supabase Realtime Postgres replication. Orders pop up automatically with zero page refreshes.
- **Web Audio Chime Alert:** Distinctive double chime audio alert on incoming orders for kitchen tablets.
- **1-Click Sold Out Toggle:** Instant shortage management to mark items unavailable on the public menu during peak hours.
- **Dishes & Media Management:** Add dishes, edit descriptions, adjust prices, and upload food photos to Supabase Storage.
- **Optimised Dish Photos:** Uploaded photos are resized and served through `next/image` on the menu, home page, cart and staff manager, with a graceful placeholder when a dish has no photo.
- **Owner-Managed UPI Payments:** Upload your own UPI QR code and set the payee name, UPI ID and phone in settings. Customers paying online see the QR, a copyable UPI ID and an amount-prefilled `upi://pay` link on their tracking page - no payment gateway, no transaction fees.
- **Store Controls:** Configure delivery radius, flat delivery fee, free delivery qualification, and emergency pause switch.
- **Serviceable Pincodes:** An owner-managed allow-list enforced server-side - customers outside your area are offered Counter Pickup instead, so you never accept a delivery you cannot make.
- **"Use My Location" + Delivery ETA:** Customers can share their location at checkout; the site measures the real distance, fills their address, blocks out-of-area orders and shows an estimated delivery time (`prep time + distance ÷ speed`). The kitchen dashboard gets the distance, ETA and a Navigate link.
- **Live Settings Everywhere:** Every value in `/admin/settings` - fees, thresholds, phone, address, opening hours and brand colour - is read from the database and applied across the storefront, so the cart total always matches what the server charges.

### 🛡️ Security & Financial Integrity
- **Staff-Only Portal:** The entire `/admin` area (kitchen dashboard, menu manager, settings) sits behind Supabase Auth. An optimistic gate in `src/proxy.ts` redirects signed-out visitors to the login screen, and a secure `requireStaff()` check in every staff page and server action blocks the underlying data (which uses the RLS-bypassing service-role key).
- **Separate Staff Surface:** Staff screens render in their own layout (`(staff)` route group) with no customer header, cart or footer, and are marked `noindex` + disallowed in `robots.txt`.
- **Paise-Only Math:** All money is represented strictly as integers in **paise** (`₹240` = `24000` paise) to prevent floating-point inaccuracies.
- **Zero Client Trust:** Server action recalculates all subtotals, line items, delivery fees, and order totals directly against database records.
- **Database Row Level Security (RLS):** Strict Postgres RLS policies prevent anonymous scrapers from accessing customer orders or confidential sales data.
- **Privacy-Safe Order Tracking:** Tracking URLs are signed with an HMAC capability token, and looking an order up by number also requires the phone number used at checkout - so order numbers cannot be scraped for customer names, phones or addresses.
- **Payment Signature Verification:** Cryptographic HMAC SHA-256 verification using `crypto.timingSafeEqual` for Razorpay webhook payloads.

---

## 🛠️ Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React 19)
- **Styling:** Tailwind CSS v4, Lucide Icons, Glassmorphism & High-Contrast Design
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security, Storage Buckets, Realtime Channels)
- **Validation:** Zod schemas for checkout and admin forms
- **Testing:** Vitest (Unit tests for pricing & hours logic), Playwright (E2E flows), Axe-core (WCAG 2.1 AA)
- **Emails:** Resend API for transactional receipts
- **Deployment:** Vercel (Edge Serverless) & GitHub Actions (CI)

---

## 💻 Local Development

### 1. Clone & Install
```bash
git clone https://github.com/Chaitanya4356/Restaurent-.git
cd Restaurent-
npm install --legacy-peer-deps
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project URL, Anon Key, and Service Role Key.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing Suite

```bash
# Run Vitest unit tests (hours logic & paise pricing engine)
npm test

# Run TypeScript type check
npx tsc --noEmit

# Run Playwright E2E customer journey tests
npm run test:e2e
```

---

## 📄 License
This project is proprietary software built for **Josh Restaurant, Visakhapatnam**. All rights reserved.
