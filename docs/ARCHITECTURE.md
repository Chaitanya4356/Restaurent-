# Architecture & Specification Blueprint: Josh Online Ordering

## 1. System Overview & Technology Stack
- **Framework:** Next.js (App Router) + TypeScript (strict mode enabled)
- **Styling & UI:** Tailwind CSS, shadcn/ui components (Radix primitives for full WCAG 2.2 AA accessibility)
- **Database & Realtime:** Supabase (PostgreSQL 15+, Row Level Security, Supabase Storage for photos, Supabase Realtime for instant kitchen notifications)
- **Form Validation:** Zod + React Hook Form (isomorphic: schema shared between client form and server actions)
- **Transactional Email:** Resend (owner notifications on new orders)
- **Payments:** Phase 1–6 launches with Pay on Delivery/Pickup (Cash / UPI QR code on arrival). Phase 7 adds Razorpay hosted checkout with signature-verified webhooks.
- **Testing:** Vitest (unit tests for opening hours & server-side pricing), Playwright + `@axe-core/playwright` (E2E testing & automated accessibility audit).

---

## 1.1 Application Surfaces & Access Control

The product is **one Next.js application** serving two clearly separated surfaces
(route groups keep the public URLs unchanged):

```
src/app/
  layout.tsx            → document shell only (<html>/<body>, fonts, JSON-LD)
  (site)/               → PUBLIC CUSTOMER SITE
    layout.tsx            Header + CartDrawer + Footer + CartProvider
    page.tsx              Home
    menu/ checkout/ track/ contact/ order-confirmation/ privacy/ terms/ refund/
  (staff)/              → STAFF & OWNER PORTAL (login required)
    layout.tsx            StaffShell chrome + `noindex` metadata
    admin/                login/ orders/ menu/ settings/
  api/webhooks/razorpay/   machine endpoint (HMAC verified)
src/proxy.ts            → Next.js 16 Proxy: optimistic staff gate + session refresh
src/lib/auth/require-staff.ts → staff Data Access Layer (secure check)
```

**Three layers of protection for the staff portal:**

| Layer | Mechanism | Scope |
|---|---|---|
| 1. Optimistic | `src/proxy.ts` reads the session cookie, redirects signed-out visitors to `/admin/login`, and refreshes expiring Supabase sessions | `/admin/:path*` only |
| 2. Secure | `requireStaff()` in every staff page and `assertStaff()` in every staff server action — validates the JWT with the Supabase Auth server before any service-role (RLS-bypassing) query runs | all staff reads & writes |
| 3. Database | Postgres RLS allows `orders` / `order_items` only to `authenticated` roles; anonymous users have no direct table access | database |

**Visibility rules:**
- The staff surface renders with **no customer chrome** (no header, cart drawer, footer).
- The staff surface is `noindex, nofollow` and is disallowed in `robots.txt`; it is absent from `sitemap.xml`.
- Customer PII (names, phone numbers, delivery addresses) is only ever loaded through a service-role query that runs **after** the staff guard has passed.
- Order receipts are `noindex` and reachable only through a signed URL.

### 1.2 Order Tracking Security

Order numbers are short and sequential-looking (`JOSH-20261022-4921`), so the
order number alone must never be enough to read an order.

```
checkout ──► placeOrder() ──► /order-confirmation/<order-number>/<HMAC token>
                                        │
                                        ▼
                        verifyTrackingToken(order.id, token)
                        (timingSafeEqual, signed with TRACKING_TOKEN_SECRET)

/track ──► order number + phone ──► server action ──► tokens only if both match
```

The token is `HMAC-SHA256(secret, "order-tracking:<order uuid>")`, truncated to
24 base64url characters. It requires no database column, is unguessable without
the server secret, and is never returned by any endpoint until the caller has
proved they know both the order number and the checkout phone number.

**Live updates:** anonymous visitors cannot subscribe to Supabase Realtime for
`orders` (RLS denies them SELECT), so the tracking page polls a token-verified
route (`GET /api/orders/[orderNumber]/status?token=…`) every 15 seconds. That
route returns only `status`, `paymentStatus` and `updatedAt` - never PII - and
the poll stops once the order reaches `completed` or `cancelled`.

---

## 2. Order Lifecycle & State Machine

```
                   ┌──────────────┐
                   │  New Order   │
                   └──────┬───────┘
                          │ (Owner accepts order)
                          ▼
                   ┌──────────────┐
                   │  Preparing   │
                   └──────┬───────┘
                          │ (Kitchen finishes cooking)
                          ▼
           ┌──────────────────────────────┐
           │ Ready for Pickup / Delivery  │
           └──────────────┬───────────────┘
                          │ (Customer receives order)
                          ▼
                   ┌──────────────┐
                   │  Completed   │
                   └──────────────┘

* From 'New' or 'Preparing', an order may transition to:
                   ┌──────────────┐
                   │  Cancelled   │
                   └──────────────┘
```

### Transition Rules:
1. **New Order (`new`)**: Created strictly by a secure server action after validating:
   - Store is currently open (Asia/Kolkata time between 07:00 and 22:40).
   - "Accepting Orders" switch in settings is `true`.
   - All items exist, are active, and are not marked `is_sold_out`.
   - Subtotal is computed from database prices (never from browser input).
   - Delivery minimum (₹100 / 10000 paise) and delivery fee (₹40 or free if subtotal >= ₹500 / 50000 paise) are strictly computed.
2. **Preparing (`preparing`)**: Staff clicks "Accept & Cook". Order chime stops.
3. **Ready (`ready`)**: Staff marks dish ready. If delivery, dispatched to driver; if pickup, customer sees "Ready for pickup at counter".
4. **Completed (`completed`)**: Staff confirms payment received (Cash or UPI) and handoff finished.
5. **Cancelled (`cancelled`)**: Staff cancels order with optional reason (customer notified on tracking page).

---

## 3. Database Schema Design (PostgreSQL / Supabase)

All monetary amounts are integers in **paise** (1 INR = 100 paise).

### 3.1 `categories`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Unique category identifier |
| `name` | `text` | `not null` | e.g. "Tiffins", "Biryanis", "Beverages" |
| `slug` | `text` | `unique, not null` | URL-friendly slug e.g. "tiffins" |
| `display_order` | `integer` | `not null, default 0` | Sort order on the menu |
| `is_active` | `boolean` | `not null, default true` | Hide category if inactive |
| `created_at` | `timestamptz` | `default now()` | Audit timestamp |

### 3.2 `menu_items`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Item ID |
| `category_id` | `uuid` | `references categories(id) on delete restrict` | Category relation |
| `name` | `text` | `not null` | Dish name (e.g. "Ghee Podi Idli") |
| `description` | `text` | | Ingredients & details |
| `price_paise` | `integer` | `not null, check (price_paise > 0)` | Price in paise (e.g., ₹60 = 6000) |
| `image_url` | `text` | | Supabase storage public URL |
| `dietary_type` | `text` | `check (dietary_type in ('veg', 'non-veg'))` | Food preference tag |
| `is_sold_out` | `boolean` | `not null, default false` | If true, visible but disabled in cart |
| `is_active` | `boolean` | `not null, default true` | If false, hidden from public menu |
| `display_order` | `integer` | `not null, default 0` | Sorting within category |
| `created_at` | `timestamptz` | `default now()` | Audit timestamp |
| `updated_at` | `timestamptz` | `default now()` | Modification timestamp |

### 3.3 `orders`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Order ID |
| `order_number` | `text` | `unique, not null` | Human-readable ID (e.g. `JOSH-20261020-001`) |
| `status` | `text` | `not null, default 'new'` | `new`, `preparing`, `ready`, `completed`, `cancelled` |
| `order_type` | `text` | `not null, check (order_type in ('pickup', 'delivery'))` | Fulfillment type |
| `customer_name` | `text` | `not null` | Customer's full name |
| `customer_phone` | `text` | `not null` | 10-digit Indian phone number |
| `delivery_address`| `text` | | Required if `order_type = 'delivery'` |
| `preferred_time` | `text` | `not null` | "ASAP" or specified slot |
| `customer_notes` | `text` | | Cooking/delivery instructions |
| `subtotal_paise` | `integer` | `not null` | Recalculated by server |
| `delivery_fee_paise`| `integer`| `not null, default 0` | Recalculated by server |
| `total_paise` | `integer` | `not null` | `subtotal_paise + delivery_fee_paise` |
| `payment_method` | `text` | `not null, check (payment_method in ('cash_on_delivery', 'upi_on_delivery', 'online_razorpay'))` | Payment method |
| `payment_status` | `text` | `not null, default 'pending'` | `pending`, `paid`, `failed`, `refunded` |
| `payment_id` | `text` | | Razorpay payment/order ID when integrated |
| `created_at` | `timestamptz` | `default now()` | Order timestamp |
| `updated_at` | `timestamptz` | `default now()` | Status change timestamp |

### 3.4 `order_items` (Historical Snapshot)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | Primary Key, `default gen_random_uuid()` | Item row ID |
| `order_id` | `uuid` | `references orders(id) on delete cascade` | Parent order |
| `menu_item_id` | `uuid` | `references menu_items(id) on delete set null` | Reference to original item |
| `item_name_snapshot` | `text` | `not null` | Snapshot of name at order time |
| `item_price_paise`| `integer` | `not null` | Snapshot of item price in paise at order time |
| `quantity` | `integer` | `not null, check (quantity > 0)` | Ordered quantity |
| `subtotal_paise` | `integer` | `not null` | `quantity * item_price_paise` |
| `item_notes` | `text` | | e.g. "Less spicy", "Extra sambar" |

### 3.5 `restaurant_settings` (Singleton Row)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `integer` | Primary Key, `check (id = 1)` | Enforces singleton pattern |
| `restaurant_name`| `text` | `not null, default 'Josh'` | Restaurant title |
| `phone_number` | `text` | `not null` | Click-to-call number |
| `address` | `text` | `not null` | Display address |
| `city` | `text` | `not null, default 'Visakhapatnam'` | City |
| `time_zone` | `text` | `not null, default 'Asia/Kolkata'` | Time zone |
| `opening_time` | `time` | `not null, default '07:00:00'` | 7:00 AM |
| `closing_time` | `time` | `not null, default '23:00:00'` | 11:00 PM |
| `order_cutoff_minutes`| `integer`| `not null, default 20` | Orders stop at 10:40 PM |
| `is_accepting_orders`| `boolean`| `not null, default true` | Emergency master switch |
| `delivery_fee_paise`| `integer`| `not null, default 4000` | ₹40.00 |
| `free_delivery_threshold_paise`| `integer`| `not null, default 50000` | Free delivery if >= ₹500.00 |
| `min_delivery_order_paise`| `integer`| `not null, default 10000`| ₹100.00 minimum for delivery |
| `brand_color_primary`| `text`| `not null, default '#E65100'` | Dynamic brand color |
| `brand_logo_url` | `text` | | Uploadable logo URL |

---

## 4. Row Level Security (RLS) Policies
1. `categories`: Public `SELECT` where `is_active = true`. Authenticated staff full CRUD.
2. `menu_items`: Public `SELECT` where `is_active = true`. Authenticated staff full CRUD.
3. `restaurant_settings`: Public `SELECT` for public configuration. Authenticated staff `UPDATE`.
4. `orders`:
   - Anonymous/Public: **NO DIRECT SELECT, INSERT, UPDATE, OR DELETE**.
   - Server Actions use Supabase Service Role Key on the server side to insert orders and retrieve order confirmation by secure token/ID.
   - Authenticated Staff (`auth.role() = 'authenticated'`): Full `SELECT`, `UPDATE` (status changes).
5. `order_items`:
   - Anonymous/Public: **NO DIRECT ACCESS**.
   - Authenticated Staff: Full access.
   - Server side retrieves items via secure join for confirmation receipt.

---

## 5. UI Wireframes (Mobile-First)

### 5.1 Home Page
```
+--------------------------------------------------------+
|  [Logo] Josh                      (Cart: 0 items) [🛒] |
+--------------------------------------------------------+
|  [BADGE: 🟢 Open Now • Taking Orders until 10:40 PM]   |
|                                                        |
|  Authentic South Indian Flavors                        |
|  Traditional Tiffins & Fragrant Dum Biryanis           |
|                                                        |
|  [ 🍱 Order Online Now ]        [ 📞 Call: +91 98... ] |
+--------------------------------------------------------+
|  Why Order With Us:                                    |
|  ⚡ Fast 20km Vizag Delivery | 🍲 100% Fresh Daily     |
+--------------------------------------------------------+
|  Hours: 7:00 AM - 11:00 PM (Daily)                     |
|  Location: Siripuram Beach Road, Vizag                 |
+--------------------------------------------------------+
```

### 5.2 Menu Page
```
+--------------------------------------------------------+
|  [Logo] Josh                      (Cart: 2 items) [🛒] |
+--------------------------------------------------------+
|  🔍 [Search Masala Dosa, Biryani...]                   |
|  Filter: [ All ] [ 🟢 Veg ] [ 🔴 Non-Veg ]             |
|                                                        |
|  Categories: [ Tiffins ] [ Biryanis ] [ Beverages ]    |
+--------------------------------------------------------+
|  TIFFINS                                               |
|  +--------------------------------------------------+  |
|  | [🟢] Masala Dosa                         ₹70     |  |
|  | Crispy golden crepe with potato masala & chutney |  |
|  | [Image]                          [ + ADD TO CART ] |
|  +--------------------------------------------------+  |
|  | [🟢] Ghee Podi Idli                      ₹60     |  |
|  | Steamed button idlis tossed in spiced podi & ghee|  |
|  | [Image]                          [ SOLD OUT ] 🔒  |
|  +--------------------------------------------------+  |
|                                                        |
|  BIRY ANIS                                             |
|  +--------------------------------------------------+  |
|  | [🔴] Special Chicken Biryani             ₹240    |  |
|  | Fragrant basmati rice dum-cooked with tender     |  |
|  | marinated chicken, served with salan & raita     |  |
|  | [Image]                          [ + ADD TO CART ] |
|  +--------------------------------------------------+  |
+--------------------------------------------------------+
```

### 5.3 Cart Drawer / Modal
```
+--------------------------------------------------------+
|  Your Cart (2 items)                               [X] |
+--------------------------------------------------------+
|  🎉 Add ₹260 more for FREE delivery!                   |
|  [████████░░░░░░░░░░░░] ₹240 / ₹500                   |
+--------------------------------------------------------+
|  1. Special Chicken Biryani                  ₹240      |
|     Qty: [-] 1 [+]     [🗑️ Remove]                     |
|     Note: [Extra spicy, salan separately]              |
|                                                        |
|  2. Masala Dosa                              ₹70       |
|     Qty: [-] 1 [+]     [🗑️ Remove]                     |
|     Note: [Extra crispy]                               |
+--------------------------------------------------------+
|  Subtotal:                                   ₹310      |
|  Est. Delivery:                              ₹40       |
|  Total:                                      ₹350      |
+--------------------------------------------------------+
|  [ Proceed to Checkout -> ]                            |
+--------------------------------------------------------+
```

### 5.4 Checkout Page
```
+--------------------------------------------------------+
|  <- Back to Menu | Checkout                            |
+--------------------------------------------------------+
|  1. Order Type:                                        |
|     (•) Delivery (Vizag 20km)     ( ) Pickup at Counter|
|                                                        |
|  2. Contact Details:                                   |
|     Full Name:  [ Chaitanya                     ]      |
|     Phone (+91):[ 9876543210                    ]      |
|                                                        |
|  3. Delivery Address:                                  |
|     Flat/Door, Street, Landmark:                       |
|     [ Flat 402, Sea View Apts, Siripuram        ]      |
|                                                        |
|  4. Timing & Notes:                                    |
|     Preferred Time: [ As soon as possible (30-45m) ]   |
|     Drop-off note:  [ Ring the bell twice ]            |
|                                                        |
|  5. Payment Method:                                    |
|     (•) Cash on Delivery                               |
|     ( ) UPI QR Code Scan on Delivery                   |
+--------------------------------------------------------+
|  Summary:                                              |
|  Items (2):                                  ₹310      |
|  Delivery Fee:                               ₹40       |
|  Grand Total:                                ₹350      |
+--------------------------------------------------------+
|  [ 🔒 Place Order (₹350) ]                             |
+--------------------------------------------------------+
```

### 5.5 Order Confirmation & Live Tracking Page
```
+--------------------------------------------------------+
|  ✅ Order Placed Successfully!                         |
|  Order ID: #JOSH-20261020-001                          |
+--------------------------------------------------------+
|  Status: [ 🟡 PREPARING IN KITCHEN ]                   |
|  Estimated Ready Time: 25 - 35 mins                    |
|                                                        |
|  Progress:                                             |
|  [✓] Order Received -> [●] Cooking -> [ ] Out -> [ ]   |
+--------------------------------------------------------+
|  Delivery To: Chaitanya (+91 9876543210)               |
|  Address: Flat 402, Sea View Apts, Siripuram           |
|  Payment: UPI on Delivery (₹350 to be paid)            |
+--------------------------------------------------------+
|  Order Items:                                          |
|  - 1x Special Chicken Biryani                ₹240      |
|  - 1x Masala Dosa                            ₹70       |
|  Delivery Fee:                               ₹40       |
|  Total:                                      ₹350      |
+--------------------------------------------------------+
|  Need help? Call restaurant: [ 📞 +91 98765 43210 ]    |
+--------------------------------------------------------+
```

### 5.6 Staff Live Kitchen Dashboard
```
+--------------------------------------------------------+
|  JOSH KITCHEN DASHBOARD | [🔴 Live 🔊 Sound ON] [Logout]|
+--------------------------------------------------------+
|  Tabs: [ All (4) ] [ New (1) ] [ Cooking (2) ] [ Ready (1)]|
+--------------------------------------------------------+
|  CARD: #JOSH-20261020-001 [NEW ORDER - 2 mins ago]     |
|  Customer: Chaitanya (Delivery - Siripuram)            |
|  Phone: +91 9876543210                                 |
|  Items:                                                |
|  - 1x Special Chicken Biryani (Note: Extra spicy)      |
|  - 1x Masala Dosa (Note: Extra crispy)                 |
|  Total: ₹350 (UPI on Delivery)                         |
|                                                        |
|  Actions:                                              |
|  [ 👨‍🍳 Start Cooking ]      [ ❌ Cancel Order ]         |
+--------------------------------------------------------+
```
