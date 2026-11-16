# Build brief: Esca Meals website

Paste this into Antigravity (or keep it in the workspace and tell the agent: "Build the site described in ANTIGRAVITY_BRIEF.md").
The backend already exists and is tested: Supabase (database + rules), n8n (orders, Bachs payments, WhatsApp, emails).
Your job is the customer-facing website. It must be beautiful, photo-led, fast on a phone, and talk to the backend exactly as described in section 5.

---

## 1. The business

- **Name:** Esca Meals
- **Tagline:** Food that looks good and tastes even better
- **What it is:** an online kitchen (no dine-in) on **Umule Road, Aba, Abia State, Nigeria**. Everything is cooked fresh to order for a date the customer picks.
- **Sells:** peppered snail (best seller), soups and stews by the litre, wraps, salads, smoothies, fresh juice, gift platters, seafood boil, party food trays, event catering, **weekly meal plans and meal prep**. The offer grows over time: show the owner's own description from `settings.services` (editable in the dashboard) instead of hard-coding a list. Prices change with market costs, so never hard-code a price anywhere.
- **Owner:** Sonny. **WhatsApp / call:** 0813 794 5084 (`wa.me/2348137945084`). **Instagram & TikTok:** @esca_meals (34K+ likes, 600+ food videos on TikTok).
- **Customers:** people in Aba, mostly on Android phones on mobile data. Design mobile-first, keep pages light.
- **Currency:** Nigerian naira, shown as ₦32,000 (no decimals). **Time zone:** Africa/Lagos.

## 2. Look and feel

Esca Meals gets its **own** look. Do not copy any existing restaurant template, and do not reuse the design of the placeholder pages in this folder: they only show the behaviour, and the client rejected their look.

**Before building every page, propose 2–3 distinct homepage directions** (a screenshot or a quick build of the hero + one dish section each) and wait for the client to pick one. Good starting points:
- *Market energy:* bold, colourful, big type and food close-ups, like a busy Aba food stall made premium.
- *Clean premium:* lots of space, large photography, restrained palette, feels like a high-end delivery brand.
- *Social-first:* built around her TikTok/Instagram content: video and photo grid, "as seen on TikTok", reviews from her posts.

Whatever the direction:

- **Photo-led.** Real food photos are the design: large hero image, a photo on every dish card. Photos go in `images/` (the owner supplies them; file names in section 7). Never use emoji or icons as stand-ins for food. If a photo is missing, show a tasteful neutral placeholder with the dish name.
- **Colours** from the Esca logo (taupe/cocoa plate with fork and spoon, `assets/img/logo.svg` — replace with the real logo file when supplied): warm cocoa brown as the brand colour, a deep near-black brown for text, a warm off-white background, and ONE appetite accent (chilli red or warm orange) for buttons. WhatsApp green only on WhatsApp buttons.
- **Type:** one characterful display face for headings, one clean body face (Google Fonts). Large, confident headings.
- **Avoid:** identical bordered cards everywhere, generic "SaaS" sections, stock icons, filler statistics. Every section must help someone decide to order.
- **Must work at 360 px wide**, light and dark mode optional.

### Home page sections (content to cover; order and layout are yours to design)
1. **Hero:** full-bleed food photo, name, tagline, buttons **Order now** (→ menu), **Plan an event** (→ catering), **WhatsApp us**.
2. **Best sellers:** dishes where `is_featured = true`, with photo, price, "Add" or "View".
3. **Our story:** short, warm: Aba online kitchen, cooked fresh to order, known on TikTok. (Ask the owner for her own words; use a placeholder paragraph marked TODO until then.)
4. **How would you like it?** three paths: **Pickup** (Umule Road), **Delivery** (across Aba, fee by area), **Catering & events** (quote).
5. **How ordering works:** 1. choose food + date, 2. pay securely by card or bank transfer (Bachs), 3. we cook and deliver. Mention: order by 8pm for tomorrow.
6. **Find us / contact:** Umule Road, Aba · WhatsApp button · Google Maps link · TikTok + Instagram links (a real TikTok embed or a grid of photos is welcome).
7. **Footer:** links to Menu, Catering, Track order, WhatsApp, socials, a small "Staff" link to `/admin/`.
8. A floating **WhatsApp button** on every page (`https://wa.me/2348137945084?text=Hello%20Esca%20Meals`).

### Other pages
- `menu.html`: menu + cart + checkout (section 4).
- `pay.html`: where customers return after paying (section 4.4). Must exist at exactly this path.
- `track.html`: track by order code or phone.
- `catering.html`: catering / event quote form.
- `admin/`: keep the existing staff dashboard folder from the package as it is (it already works with the backend). Restyling it is optional and comes last.

## 3. Configuration (one file)

Keep a single `config.js` loaded by every page, so no secret or URL is scattered through the code:

```js
window.ESCA_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-KEY',          // anon key only, never service_role
  N8N_WEBHOOK_BASE: 'https://YOUR-N8N-DOMAIN/webhook/esca',
  ESCA_TOKEN: 'YOUR-ESCA-TOKEN',
  CHAT_WEBHOOK_URL: 'https://YOUR-N8N-DOMAIN/webhook/REPLACE-WITH-CHAT-ID/chat', // optional chat bubble
  BUSINESS: { NAME: 'Esca Meals', WHATSAPP: '2348137945084', PHONE: '0813 794 5084', ADDRESS: 'Umule Road, Aba, Abia State', INSTAGRAM: 'esca_meals', TIKTOK: 'esca_meals' },
  TIMEZONE: 'Africa/Lagos',
};
```

The site is static (Vercel, no server code). Any build tool is fine as long as the output is static files and `pay.html`, `track.html` and `admin/` keep their paths.

## 4. Behaviour

### 4.1 Menu
- Load from Supabase (section 5.1). Group by `category`, in this order: Peppered snail & protein · Food bowls (by the litre) · Wraps & healthy treats · Platters & special requests. Sticky category tabs on mobile.
- Each dish: photo (`image_url` if set, else `images/<slug>.jpg`), name, description, `unit_label` (e.g. "3 litres"), price.
- **Options (sizes/combos):** if a dish has rows in `menu_item_options`, the customer MUST pick one before adding (e.g. Peppered snail: 25 / 50 / 100 pieces; Chicken wrap: Wrap only / Wrap + Chapman). Show "from ₦16,000" until one is picked; the option's `price` is the price.
- **Price on request:** `price` is null AND no options → show "Price on request" with a **Get a quote** button → `catering.html?item=<name>`. It cannot go in the cart.
- **Portions per day:** Sonny sets how many of each dish she makes on a date. Let the customer choose the date first (a "Ordering for: Thursday 12 Nov ▾" picker at the top of the menu, defaulting to the earliest date), then load the menu for that date with `get_menu` (section 5.1). Per dish:
  - `portions_left` null → no badge, no limit.
  - `portions_left` > 0 → badge "Only N left" when N ≤ 5; never let the cart hold more than N for that dish (all sizes together).
  - `portions_left` = 0 → greyed out, "Sold out for Thursday" (or "Not on the menu this day" when `special` is true) and a "See another day" link.
  - Changing the date re-checks the cart and warns about anything no longer available.
- `special: true` dishes only appear on dates Sonny set: hide them when `portions_left` is 0.
- Live updates are a bonus (Supabase realtime on `menu_items` and `dish_date_portions`).

### 4.2 Cart
- Keep in `localStorage` (wrap every access in try/catch). Lines: menu_item_id, option_id, name, option name, unit price, quantity (1–50).
- Floating "View order · N items · ₦total" bar on mobile.

### 4.3 Checkout (inside the cart drawer or its own step)
Fields, in this order:
1. **Pickup / Delivery** toggle. Pickup shows the address. Delivery shows: **Delivery area** (from `settings.delivery_zones`, show each fee), **Address**, **Nearest landmark**.
2. **Date** (date picker): min = earliest date (section 5.2), max = today + `max_days_ahead`; dates in `closed_dates` disabled.
3. **Time window**: chips from `settings.time_slots` (e.g. 10:00–12:00).
4. **Name**, **WhatsApp number** (required, Nigerian format), **Email** (optional, "for a receipt"), **Notes** (allergies, less pepper, gift message).
5. Summary: food subtotal, delivery fee (by area), total.
6. Button **Pay ₦total securely**, small text: "You'll pay by card or bank transfer on the Bachs payment page. We start cooking once payment is confirmed."

On submit → `place_order` (section 5.3). On `ok:true` → save `{code}` to localStorage and **redirect to `checkout_url`**. On `ok:false` → show `error` as-is above the button (it is already a friendly sentence) and keep the form filled. Remember name/phone/address on the device for next time.

### 4.4 `pay.html` (return from Bachs)
URL: `pay.html?code=ESC-XXXXXX` (success) or `pay.html?code=ESC-XXXXXX&cancelled=1`.
Call `check_payment` with the code, then show one of:

| Response (first order in `orders`) | Show |
|---|---|
| `payment_status = 'paid'` and `status != 'cancelled'` | Celebration: "Payment received. We're cooking for you!", order code, date + time window, items, total, buttons Track order / Back to menu. Clear the cart. |
| `payment_status = 'underpaid'` | "We received part of your payment" + WhatsApp button |
| `status = 'cancelled'` | "This order was released, nothing was charged" + Order again |
| `status = 'awaiting_payment'` and `cancelled=1` in the URL | "Payment not finished. We're holding your order for about 30 minutes." + **Return to payment** (`checkout_url`) + Change my order |
| `status = 'awaiting_payment'` otherwise | "Confirming your payment…" and call `check_payment` again every 6 seconds, up to 20 times (bank transfers take a few minutes) |

### 4.5 Track
Inputs: order code OR phone. Call `order_status`. Show each order with a progress bar:
- Delivery: Paid → Cooking → On the way → Delivered (`confirmed` → `preparing` → `out_for_delivery` → `completed`)
- Pickup: Paid → Cooking → Ready → Collected (`confirmed` → `preparing` → `ready` → `completed`)
- `awaiting_payment` → "Waiting for payment" + Finish paying (`checkout_url`); `cancelled` → Cancelled.
Support `track.html?code=ESC-XXXXXX`.

### 4.6 Catering
Title it for everything that needs a quote (events, food trays, meal plans), not only parties. Form: name, WhatsApp number, email (optional), type (Birthday, Wedding / introduction, Office lunch, Church / naming ceremony, Weekly meal plan / meal prep, Gift platter, Other), event date, number of guests, budget, location, what they want (prefill from `?item=`), anything else. → `catering`. On success: "Request received, reference #N. Sonny will message you on WhatsApp with a quote." + WhatsApp button.

## 5. Backend contract (do not change)

### 5.1 Reads from Supabase (supabase-js v2, anon key)
```js
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// menu for a date, with portions left (one call; p_date null = earliest possible day)
const { data: day } = await sb.rpc('get_menu', { p_date: '2026-11-12' });
// day = { earliest_date, date, date_label, time_slots, delivery_zones, services, items: [
//   { menu_item_id, name, category, description, price, unit, healthy, special, portions_left, orderable_online,
//     options: [ { option_id, option_name, price } ] } ] }
// photos: image_url and sort order come from the table read below
const { data: menu } = await sb.from('menu_items').select('*, menu_item_options(*)').eq('is_active', true).order('category').order('sort_order');
const { data: rows } = await sb.from('settings').select('key,value');   // → object by key
```
`menu_items`: `id, name, category, description, price (number|null), unit_label, is_active, is_featured, is_healthy, image_url, sort_order`
`menu_item_options`: `id, menu_item_id, group_name, option_name, price, sort_order`
`settings` (public keys): `business`, `services` (the owner's own description of what she sells), `min_lead_days`, `max_days_ahead`, `order_cutoff` ("20:00"), `time_slots` (["10:00-12:00", …]), `closed_dates` (["2026-12-25"]), `delivery_zones` ([{id, name, fee}]), `max_orders_per_day`.
Row Level Security allows nothing else for the public. Never write to tables from the site.

### 5.2 Earliest date
`earliest = today in Africa/Lagos + min_lead_days + (current Lagos time >= order_cutoff ? 1 : 0)`.
The server checks again (and also checks the daily order limit), so just show its error if it refuses.

### 5.3 n8n endpoints
All: `POST {N8N_WEBHOOK_BASE}/<name>`, headers `Content-Type: application/json`, `x-esca-token: {ESCA_TOKEN}`, `ngrok-skip-browser-warning: 1`.
Every response is JSON: success has `ok: true`; failure is `{ ok: false, code, error }` where `error` is a sentence to show the customer. Network failure → show "We could not reach our ordering service. WhatsApp us on 0813 794 5084."

**place_order**
```json
{ "channel": "website",
  "customer": { "name": "Ada Okafor", "phone": "0803 123 4567", "email": "" },
  "fulfilment": "delivery", "delivery_zone": "aba_central", "address": "12 Faulks Road", "landmark": "Opposite First Bank",
  "date": "2026-11-12", "time_slot": "12:00-14:00", "notes": "",
  "items": [ { "menu_item_id": 1, "option_id": 2, "quantity": 1 }, { "menu_item_id": 5, "quantity": 2 } ] }
```
→ `{ ok, code: "ESC-7K3P9Q", total, subtotal, delivery_fee, date_label, time_slot, items[], checkout_url }`
Error codes you may see: `sold_out`, `not_enough_left`, `missing_customer`, `invalid_zone`, `missing_address`, `too_soon`, `too_far`, `closed`, `fully_booked`, `invalid_time_slot`, `option_required`, `price_on_request`, `unknown_item`, `payment_unavailable`.

**check_payment** `{ "code": "ESC-7K3P9Q" }` and **order_status** `{ "code": "ESC-7K3P9Q" }` or `{ "phone": "08031234567" }`
→ `{ ok, orders: [ { code, status, payment_status, fulfilment, date, date_label, time_slot, total, checkout_url, items: [ { name, option, quantity } ] } ] }`
`status`: `awaiting_payment | confirmed | preparing | ready | out_for_delivery | completed | cancelled`
`payment_status`: `pending | paid | underpaid | expired | failed | refunded`

**catering**
```json
{ "name": "Ngozi", "phone": "08031112222", "email": "", "event_type": "Birthday", "event_date": "2026-12-20",
  "guests": "80", "location": "Ogbor Hill, Aba", "budget": "₦400,000", "service": "Food trays + peppered snail", "details": "" }
```
→ `{ ok, request_id, event_date_label }`

**Chat bubble (optional):** `POST CHAT_WEBHOOK_URL` with `{ "action": "sendMessage", "sessionId": "<random id kept in localStorage>", "chatInput": "<text>" }` → `{ output }`. Turn links in replies into clickable links (payment links arrive this way).

## 6. Rules
1. Never calculate what the customer pays and send it: the server prices everything from the database. Display totals from menu data only.
2. Only the Supabase **anon** key in the site. No service_role key, no Bachs key, no Evolution key, ever.
3. No card or bank details on the site. Payment happens only on the Bachs page (`checkout_url`).
4. Business details come from `config.js`, not typed into pages.
5. Handle slow networks: loading states on every button that calls the backend, disable double-submits.
6. Accessible: real buttons and labels, visible focus, alt text on food photos ("Peppered snail, 50 pieces").

## 7. Photos (owner supplies)
Put them in `images/`, compressed to ≤200 KB each (WebP or JPG, ~1200 px wide for the hero, ~800 px for dishes):
`hero.jpg`, `peppered-snail.jpg`, `chicken-stew.jpg`, `goat-meat-pepper-soup.jpg`, `ogbono-soup.jpg`, `vegetable-soup.jpg`, `chicken-wrap.jpg`, `customised-platter.jpg`, `seafood-boil.jpg`, `food-tray.jpg`, plus any others named after the dish (lowercase, hyphens).
Dish photos can also be uploaded in the dashboard (Menu → photo), which sets `image_url`; prefer `image_url` when present.

## 8. Done when
- [ ] Home, menu, pay, track, catering pages match section 2 and look great at 360 px and on desktop.
- [ ] Menu and prices come from Supabase; editing a price in the dashboard shows on the site after refresh.
- [ ] Snail and chicken wrap can't be added without a size/combo; price-on-request items go to the quote form.
- [ ] Set 3 packs of snail for a date in the dashboard (Portions): the menu for that date shows "Only 3 left", the cart stops at 3, and a 4th is refused.
- [ ] Checkout blocks dates before the earliest date and closed dates, requires a time window, adds the area delivery fee.
- [ ] Pay → redirected to Bachs (sandbox) → back on `pay.html` showing "Payment received"; cart cleared.
- [ ] Cancel on Bachs → "Payment not finished" with a working Return to payment.
- [ ] Track by code and by phone works; progress bar matches the status set in the dashboard.
- [ ] Catering form submits and shows the reference number.
- [ ] Lighthouse mobile performance ≥ 85; no console errors; no secrets other than the anon key and Esca token in the source.
