# Esca Meals website: notes for the Antigravity agent

The full build brief is `ANTIGRAVITY_BRIEF.md`. The existing pages here are a working placeholder for behaviour only; their design is being replaced.

Plain HTML, CSS and JavaScript. No framework, no build step. Deployed as-is to Vercel (static).

## Files
- `config.js`: the only settings file (Supabase URL + anon key, n8n webhook base, token, WhatsApp number). While it contains `YOUR-PROJECT`, the site runs in DEMO mode using browser storage.
- `assets/data.js`: the data layer (`window.ESCA`). Every page talks to the backend only through it. Demo mode mirrors the database rules.
- `assets/site.js`: header, footer, cart, dish art, Ask Esca chat bubble (`window.Site`).
- `assets/esca.css`: all styles. Colours and fonts are CSS variables at the top (light + dark).
- Pages: `index.html`, `menu.html` (menu, cart, checkout), `pay.html` (return from Bachs), `track.html`, `catering.html`, `admin/` (staff dashboard, `assets/admin.js`).

## Rules: do not break these
1. Prices, fees and totals are calculated in Supabase (`place_order()`), never trusted from the browser. Show prices from the menu data; never hard-code them.
2. Orders, payments, tracking and catering go through n8n webhooks via `ESCA.call(endpoint, body)`. Never write `orders` or `payment_events` from the browser.
3. Only the Supabase **anon** key belongs in the site. Never add the service_role key, the Bachs secret key or the Evolution API key.
4. Payment happens on the Bachs hosted page (`checkout_url`). Never collect card or bank details on the site.
5. Keep demo mode working: when adding a backend call, add the matching function to `DEMO_API` in `data.js`.
6. Keep the page usable at 375 px wide and in dark mode; use the CSS variables, not hard-coded colours.
7. Business details (name, phone, address, socials) come from `ESCA.B` (config.js), not typed into pages.

## Backend contract (n8n, POST, header x-esca-token)
- `place_order` { customer{name,phone,email}, fulfilment 'delivery'|'pickup', delivery_zone, address, landmark, date YYYY-MM-DD, time_slot, notes, items[{menu_item_id, option_id, quantity}] } → { ok, code, total, checkout_url } or { ok:false, error }
- `check_payment` { code } and `order_status` { code | phone } → { ok, orders:[{ code, status, payment_status, date_label, time_slot, total, items, checkout_url }] }
- `catering` { name, phone, email, event_type, event_date, guests, location, budget, service, details } → { ok, request_id }
- `get_menu` (Supabase RPC, `sb.rpc('get_menu', { p_date })`) returns the menu for a date with `portions_left` per dish (null = no limit, 0 = sold out / not on that day).
- Order statuses: awaiting_payment → confirmed → preparing → ready | out_for_delivery → completed, or cancelled.
