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
- **Store Controls:** Configure delivery radius (20 km), flat delivery fee (₹40), free delivery qualification (₹500), and emergency pause switch.

### 🛡️ Security & Financial Integrity
- **Paise-Only Math:** All money is represented strictly as integers in **paise** (`₹240` = `24000` paise) to prevent floating-point inaccuracies.
- **Zero Client Trust:** Server action recalculates all subtotals, line items, delivery fees, and order totals directly against database records.
- **Database Row Level Security (RLS):** Strict Postgres RLS policies prevent anonymous scrapers from accessing customer orders or confidential sales data.
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
