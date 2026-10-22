# 📖 Josh Restaurant — Owner & Staff Operations Manual

Welcome to the **Josh Restaurant Online Ordering & Kitchen Operations System**. This guide provides staff and restaurant managers with clear, practical instructions for daily operations, managing orders, updating the menu, and handling emergency situations.

---

## 🔗 Quick Access Links
- **Public Customer Website:** [https://joshrestaurent.vercel.app](https://joshrestaurent.vercel.app)
- **Customer Online Menu:** [https://joshrestaurent.vercel.app/menu](https://joshrestaurent.vercel.app/menu)
- **Live Order Tracker:** [https://joshrestaurent.vercel.app/track](https://joshrestaurent.vercel.app/track)
- **🔒 Kitchen & Owner Management Portal:** [https://joshrestaurent.vercel.app/admin/orders](https://joshrestaurent.vercel.app/admin/orders)
- **Admin Login:** [https://joshrestaurent.vercel.app/admin/login](https://joshrestaurent.vercel.app/admin/login)

---

## 🕒 Store Operating Hours & Ordering Rules (Asia/Kolkata)

| Setting | Default Value | Notes |
| :--- | :--- | :--- |
| **Opening Time** | `07:00 AM IST` | Menu opens for breakfast orders |
| **Closing Time** | `11:00 PM IST` | Restaurant doors close |
| **Order Cutoff** | `20 minutes before closing` (`10:40 PM IST`) | Online checkout automatically disables to give the kitchen time to prepare and pack before closing |
| **Emergency Mode** | Master toggle in Admin Settings | Immediately pauses new orders if the kitchen is overwhelmed |

---

## 💰 Pricing & Financial Integrity Rules

All monetary values are calculated in **paise** (1 INR = 100 paise) to prevent floating-point rounding errors:
- **Delivery Fee:** Flat ₹40 (`4000` paise) across the 20 km Vizag delivery radius.
- **Free Delivery Threshold:** Orders $\ge$ ₹500 (`50000` paise) automatically receive **FREE delivery** (₹0 delivery fee).
- **Minimum Delivery Order:** ₹100 (`10000` paise) minimum subtotal required for delivery.
- **Pickup Orders:** Always have **₹0 delivery fee** with no minimum order restriction.
- **Price Security:** Prices are **never** trusted from the customer's browser. When an order is placed, the backend recalculates all item prices, subtotals, delivery fees, and grand totals directly from the database.

---

## 🍳 Daily Kitchen Operations Checklist

### 1. Morning Opening (07:00 AM)
1. Open the [Staff Orders Portal](https://joshrestaurent.vercel.app/admin/orders) on the kitchen counter tablet/laptop.
2. Click anywhere on the screen once to enable the **Web Audio sound chime alert**.
3. Check the **Menu Manager** (`/admin/menu`):
   - Ensure all breakfast tiffins (Idli, Dosa, Vada) are toggled **Available**.
   - If any dish ingredients didn't arrive, click the toggle to mark it **Sold Out**.

### 2. Live Order Workflow (When a New Order Arrives)
When a customer places an order:
1. **Audio Alert:** The kitchen tablet plays a high-clarity **double chime alert** (`587 Hz -> 880 Hz`).
2. **Order Appears Instantly:** The order appears at the top of the **New Orders** column in real time without refreshing the page.
3. **Review Details:**
   - Order Number (e.g. `JOSH-20261020-4921`)
   - Order Type (Takeaway/Pickup vs. Doorstep Delivery)
   - Customer Name, Phone, and Landmark Delivery Address
   - Item list with any special cooking notes (e.g. *"Extra crispy", "Less spicy"*)
4. **Update Status with 1-Click:**
   - `Confirm Order` $\rightarrow$ Sends confirmation, customer tracking status updates.
   - `Mark Preparing` $\rightarrow$ Kitchen cooks the food.
   - `Out for Delivery` / `Ready for Pickup` $\rightarrow$ Food packed, delivery agent departs or bag placed on pickup counter.
   - `Complete Order` $\rightarrow$ Food handed over; order moves to completed archive.

### 3. Managing Sold Out Dishes (Rush Hours)
If an item sells out during peak hours:
1. Navigate to **Menu Management** (`/admin/menu`).
2. Find the dish (e.g., *Josh Special Chicken Biryani*).
3. Toggle the switch to **Sold Out**.
4. The dish immediately displays a red **"Sold Out"** badge on the public menu and the "Add to Order" button is instantly disabled.
5. When a fresh batch is prepared, toggle it back to **Available**.

---

## 🛠️ Administrative Settings & Customization

Navigate to [Admin Settings](https://joshrestaurent.vercel.app/admin/settings) to configure:
1. **Emergency Online Ordering Switch:** Toggle ON/OFF to instantly pause all incoming online orders without shutting down the site.
2. **Delivery Fee:** Change the standard delivery fee (default: ₹40).
3. **Free Delivery Threshold:** Change the free delivery qualifying amount (default: ₹500).
4. **Minimum Order Amount:** Change the minimum cart value for delivery (default: ₹100).
5. **Operating Hours:** Adjust opening time, closing time, or order cutoff buffer (default: 20 minutes).

> **Live settings:** every value above (plus the phone number, address and brand
> colour) is read from the database by the customer website on each visit. After
> saving, refresh the customer site to confirm - the cart, checkout button, menu,
> footer and contact page all use the same values, so the price the customer sees
> always matches the price the kitchen receives.

---

## 🔐 Staff Portal Access (Owner & Kitchen Staff)

The staff portal (`/admin`) is **login-protected**. Staff must sign in with the
Supabase account issued by the owner before any kitchen screen, dish, price or
setting becomes visible or editable.

| Rule | Behaviour |
| :--- | :--- |
| Signed out | Any `/admin/*` URL redirects to `/admin/login` and no order, customer or pricing data is sent to the browser |
| Signed in | After login you are returned to the exact page you requested (e.g. `/admin/orders`) |
| Already signed in | Opening `/admin/login` sends you straight to the kitchen dashboard |
| Session expiry | Supabase refreshes the staff session automatically, so a long shift never drops out mid-order; if the session does expire, sign in again |
| Search engines | The whole `/admin` area is marked `noindex` and is blocked in `robots.txt` |

**Owner checklist:**
1. Change the default staff password on first use (Supabase Dashboard $\rightarrow$ Authentication $\rightarrow$ Users).
2. Create one separate account per staff member so the audit trail stays meaningful.
3. Sign out on the shared kitchen tablet at the end of every shift.

---

## 🔐 Database Security & Backups (Supabase)

- **Row Level Security (RLS):** All tables are protected by Postgres RLS. Anonymous customers can only read active dishes and public store settings. Orders can **only** be read and updated by authenticated staff members.
- **Automated Backups:** Daily automated backups are maintained by Supabase.
- **Manual Backups:** To export a database snapshot, navigate to your Supabase Project Dashboard $\rightarrow$ Database $\rightarrow$ Backups $\rightarrow$ Download.

---

## 📞 Technical Support & Escalation
- **Platform Developer:** bchaitanya096@gmail.com
- **Hosting:** Vercel Serverless
- **Database:** Supabase Cloud (Project: `bfquucetvupeetrbaxwu`)
