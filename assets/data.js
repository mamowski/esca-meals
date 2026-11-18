/* Esca Meals data layer.
 * LIVE mode: menu + settings read from Supabase (anon key, Row Level Security);
 *            orders, payments, tracking and catering go through n8n (WF1 / WF2);
 *            staff sign in with Supabase Auth and edit tables directly (RLS checks is_staff()).
 * DEMO mode: used while config.js still has placeholders. Same API, same rules, stored in
 *            this browser; payments go to a simulated checkout page.
 */
(function () {
  const C = window.ESCA_CONFIG || {};
  const DEMO = !C.SUPABASE_URL || C.SUPABASE_URL.includes('YOUR-PROJECT') || !C.SUPABASE_ANON_KEY || C.SUPABASE_ANON_KEY.includes('YOUR-') || !C.N8N_WEBHOOK_BASE || C.N8N_WEBHOOK_BASE.includes('YOUR-N8N');
  const TZ = C.TIMEZONE || 'Africa/Lagos';
  const B = C.BUSINESS || {};

  // ---------------------------------------------------------------- helpers
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => '₦' + Number(n || 0).toLocaleString('en-NG', { maximumFractionDigits: 0 });
  function lagosParts(d = new Date()) {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  }
  const todayISO = () => lagosParts().date;
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const fmtDate = (iso, opts = { weekday: 'long', day: 'numeric', month: 'short' }) => iso ? new Date(String(iso).slice(0, 10) + 'T12:00:00Z').toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' }) : '';
  const fmtDateTime = ts => ts ? new Date(ts).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
  const digits = s => String(s || '').replace(/\D/g, '');
  const phoneKey = s => digits(s).slice(-10);
  const err = (code, error, extra = {}) => ({ ok: false, code, error, ...extra });
  const waLink = (text, number = B.WHATSAPP) => `https://wa.me/${number}${text ? '?text=' + encodeURIComponent(text) : ''}`;
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } },
  };
  function earliestDate(s) {
    const now = lagosParts().time;
    return addDays(todayISO(), Number(s.min_lead_days ?? 1) + (now >= String(s.order_cutoff || '20:00') ? 1 : 0));
  }

  // ---------------------------------------------------------------- demo data (mirrors 03_seed.sql)
  const SEED_SETTINGS = {
    business: {
      name: B.NAME || "Mamoke's Kitchen",
      tagline: B.TAGLINE || 'Food that looks good and tastes even better',
      city: 'Lagos',
      pickup_address: B.ADDRESS || '123 Kitchen Avenue, Victoria Island, Lagos',
      whatsapp: B.WHATSAPP || '2349052862612',
      phone: B.PHONE || '0905 286 2612',
      email: 'mamoke@mamokeskitchen.ng',
      instagram: B.INSTAGRAM || 'mamokes_kitchen',
      tiktok: B.TIKTOK || 'mamokes_kitchen',
      about_story: "Mamoke's Kitchen is an online kitchen and boutique catering studio. Every soup bowl, protein pack, and catering tray is prepared from scratch with market-fresh local ingredients, traditional Nigerian flavours, and modern food styling.",
      announcement_banner: 'Taking advance catering orders for weekend events · Please order 48 hours ahead',
      announcement_active: false,
      opening_hours: 'Monday to Saturday: 8:00 AM - 8:00 PM · Sunday: Closed (Advance pre-orders only)',
    },
    timezone: TZ, currency: 'NGN', min_lead_days: 1, max_days_ahead: 30, order_cutoff: '20:00',
    time_slots: ['10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00'],
    max_orders_per_day: 25, closed_dates: [], payment_minutes: 30,
    services: 'Online kitchen and caterer. Pre-ordered meals, weekly meal plans and meal prep, event catering, party food trays, small chops, peppered snail, food bowls by the litre (rich soups, stews, jollof and fried rice, village spaghetti, beans), wraps, salads, smoothies, juice, gift platters, seafood boil on request. Prices follow market costs; Mamoke confirms every quote.',
    feedback_delay_minutes: 60, whatsapp: { owner_number: '', handover_minutes: 60 }, site_url: '', bachs_api_base: 'https://sandbox-api.bachs.io',
    delivery_zones: [
      { id: 'aba_central', name: 'Aba (within town)', fee: 2000 },
      { id: 'aba_outer', name: 'Aba outskirts (Osisioma, Ogbor Hill, Eziama...)', fee: 3500 },
      { id: 'umuahia', name: 'Umuahia / outside Aba (by arrangement)', fee: 8000 }
    ],
  };

  const INITIAL_PANTRY = [
    { id: 1, name: 'Fresh big snails', category: 'Proteins & Meat', status: 'to_buy', quantity: '50 pieces', estimated_cost: 32000, market_vendor: 'Ariaria Market (Snail line)', is_bought: false },
    { id: 2, name: 'Goat meat (assorted chunks)', category: 'Proteins & Meat', status: 'running_low', quantity: '5 kg', estimated_cost: 26000, market_vendor: 'Ariaria meat section', is_bought: false },
    { id: 3, name: 'Hard chicken (layers)', category: 'Proteins & Meat', status: 'in_stock', quantity: '4 cartons', estimated_cost: 48000, market_vendor: 'Faulks cold room', is_bought: false },
    { id: 4, name: 'Smoked catfish', category: 'Proteins & Meat', status: 'running_low', quantity: '20 pieces', estimated_cost: 16000, market_vendor: 'Ahia Ohuru market', is_bought: false },
    { id: 5, name: 'Scotch bonnet (fresh pepper / atarodo)', category: 'Produce & Peppers', status: 'to_buy', quantity: '1 paint bucket', estimated_cost: 7500, market_vendor: 'Cemetery Market', is_bought: false },
    { id: 6, name: 'Red onions', category: 'Produce & Peppers', status: 'in_stock', quantity: 'Half bag', estimated_cost: 22000, market_vendor: 'Ariaria vegetable line', is_bought: false },
    { id: 7, name: 'Fresh Uziza leaves', category: 'Produce & Peppers', status: 'to_buy', quantity: '5 bunches', estimated_cost: 2500, market_vendor: 'Umule local market', is_bought: false },
    { id: 8, name: 'Ogbono seeds (unmilled)', category: 'Produce & Peppers', status: 'in_stock', quantity: '2 paint buckets', estimated_cost: 18000, market_vendor: 'Ahia Ohuru', is_bought: false },
    { id: 9, name: 'Pure palm oil', category: 'Oils, Spices & Staples', status: 'running_low', quantity: '1 container (25L)', estimated_cost: 34000, market_vendor: 'Cemetery oil depot', is_bought: false },
    { id: 10, name: 'Ground crayfish (Derica)', category: 'Oils, Spices & Staples', status: 'to_buy', quantity: '4 dericas', estimated_cost: 9000, market_vendor: 'Ariaria wholesale', is_bought: false },
    { id: 11, name: 'Seasoning cubes & spices', category: 'Oils, Spices & Staples', status: 'in_stock', quantity: '3 cartons', estimated_cost: 14000, market_vendor: 'Faulks wholesale', is_bought: false },
    { id: 12, name: '1-Litre soup plastic bowls & lids', category: 'Packaging & Supplies', status: 'to_buy', quantity: '2 packs (100 pcs)', estimated_cost: 11500, market_vendor: 'Cemetery packaging store', is_bought: false },
    { id: 13, name: 'Greaseproof wrap paper & foil rolls', category: 'Packaging & Supplies', status: 'in_stock', quantity: '3 rolls', estimated_cost: 8000, market_vendor: 'Aba central store', is_bought: false },
    { id: 14, name: 'Cooking gas refill (50kg)', category: 'Packaging & Supplies', status: 'running_low', quantity: '1 cylinder', estimated_cost: 48000, market_vendor: 'Umule gas station', is_bought: false }
  ];
  const SEED_MENU = [
    ['Peppered snail', 'Peppered snail & protein', 'Our best seller: big, juicy snails cooked in rich, spicy pepper sauce. Ideal for parties and gifting.', null, 'per pack', 1, 0, 10, [['Pack size', '25 pieces', 16000], ['Pack size', '50 pieces', 32000], ['Pack size', '100 pieces', 64000]]],
    ['Fried snail', 'Peppered snail & protein', 'Crunchy fried snail, tossed in pepper. Made to order.', 24000, 'per tray', 0, 0, 20],
    ['Peppered chicken', 'Peppered snail & protein', 'Well-seasoned chicken, fried and coated in our pepper sauce.', null, 'per pack', 0, 0, 30, [['Portion', '2 pieces', 4500], ['Portion', '4 pieces', 8500], ['Portion', '10 pieces (party pack)', 20000]]],
    ['Peppered turkey', 'Peppered snail & protein', 'Tender turkey wings in spicy pepper sauce.', null, 'per pack', 0, 0, 40, [['Portion', '2 pieces', 6500], ['Portion', '4 pieces', 12500], ['Portion', '8 pieces (party pack)', 24000]]],
    ['Chicken stew', 'Food bowls (by the litre)', 'Rich tomato and pepper stew loaded with chicken. Freezer friendly.', 32000, '3 litres', 1, 0, 10],
    ['Goat meat pepper soup', 'Food bowls (by the litre)', 'Hot, aromatic pepper soup with plenty of goat meat.', 23000, '2 litres', 1, 0, 20],
    ['Ogbono soup', 'Food bowls (by the litre)', 'Thick, drawy ogbono soup with assorted meat.', 27000, '2 litres', 0, 0, 30],
    ['Vegetable soup', 'Food bowls (by the litre)', 'Vegetable soup with goat meat, stockfish, dry catfish and kpomo.', 27000, '2 litres', 0, 0, 40],
    ['Okro soup', 'Food bowls (by the litre)', 'Fresh okro soup with assorted proteins.', 25000, '2 litres', 0, 0, 50],
    ['Basmati fried rice', 'Food bowls (by the litre)', 'Colourful basmati fried rice with vegetables.', 22000, '3 litres', 0, 0, 60],
    ['White rice', 'Food bowls (by the litre)', 'Fluffy white rice to go with any stew.', 12000, '2 litres', 0, 0, 70],
    ['Village spaghetti', 'Food bowls (by the litre)', 'Rich native spaghetti tossed in smoked fish, dried prawns, and pepper sauce.', 18500, '2 litres', 0, 0, 75],
    ['Fried plantain', 'Food bowls (by the litre)', 'Sweet, golden dodo.', 8500, 'jumbo pack', 0, 0, 80],
    ['Swallow', 'Food bowls (by the litre)', 'Wraps of swallow (fufu, garri, semo or pounded yam) to go with your soup.', null, 'per 3 wraps', 0, 0, 90, [['Type', 'Eba / Garri (3 wraps)', 2500], ['Type', 'Fufu / Akpu (3 wraps)', 2500], ['Type', 'Semo (3 wraps)', 3500], ['Type', 'Pounded yam (3 wraps)', 4500]]],
    ['Chicken wrap', 'Wraps & healthy treats', '"The best chicken wrap in the city of Aba." Grilled chicken, fresh veg and creamy sauce, wrapped and toasted.', null, 'per wrap', 1, 1, 10, [['Combo', 'Wrap only', 7000], ['Combo', 'Wrap + Chapman', 9500]]],
    ['Beef wrap', 'Wraps & healthy treats', 'Spiced beef strips with fresh vegetables in a toasted wrap.', null, 'per wrap', 0, 1, 20, [['Combo', 'Wrap only', 7500], ['Combo', 'Wrap + Chapman', 10000]]],
    ['Turkey wrap', 'Wraps & healthy treats', 'Smoky turkey with fresh vegetables in a toasted wrap.', null, 'per wrap', 0, 1, 30, [['Combo', 'Wrap only', 8500], ['Combo', 'Wrap + Chapman', 11000]]],
    ['Salad bowl', 'Wraps & healthy treats', 'Fresh, crunchy salad bowl. Add chicken, beef or turkey.', null, 'per bowl', 0, 1, 40, [['Option', 'Classic salad bowl', 6500], ['Option', 'Salad + Grilled chicken', 9000]]],
    ['Smoothie', 'Wraps & healthy treats', 'Blended fresh fruit smoothie.', 4000, 'per bottle', 0, 1, 50],
    ['Fresh fruit juice', 'Wraps & healthy treats', '100% fresh fruit juice, no added sugar.', 3500, 'per bottle', 0, 1, 60],
    ['Customised platter', 'Platters & special requests', 'As seen on our page: 8 peppered turkey, 4 Ensure shakes, clementines, apples and grapes, beautifully packed. Ideal as a gift.', 89000, 'per platter', 1, 0, 10],
    ['Seafood boil', 'Platters & special requests', 'On special request: prawns, crabs, calamari, shrimps, snails, oysters, boiled eggs, hot dogs, plantain, potatoes and sweet corn.', null, 'per tray', 1, 0, 20],
    ['Food tray', 'Platters & special requests', 'Party food trays for birthdays, office lunches and events. Tell us your guest count for a quote.', null, 'per tray', 0, 0, 30],
  ];
  const KEY = 'esca_demo_v11';
  let demoCache = null;
  function seedDemo() {
    ['esca_demo_v1', 'esca_demo_v2', 'esca_demo_v3', 'esca_demo_v4', 'esca_demo_v5', 'esca_demo_v6', 'esca_demo_v7', 'esca_demo_v8', 'esca_demo_v9', 'esca_demo_v10'].forEach(k => {
      try { localStorage.removeItem(k); } catch (e) {}
    });
    const s = {
      settings: JSON.parse(JSON.stringify(SEED_SETTINGS)),
      menu_items: [],
      menu_item_options: [],
      orders: [],
      order_items: [],
      catering_requests: [],
      pantry_items: JSON.parse(JSON.stringify(INITIAL_PANTRY)),
      profiles: [],
      users: [],
      seq: {}
    };
    SEED_MENU.forEach(([name, category, description, price, unit_label, feat, healthy, sort, opts], i) => {
      const id = i + 1;
      s.menu_items.push({ id, name, category, description, price, unit_label, is_active: true, is_featured: !!feat, is_healthy: !!healthy, image_url: null, sort_order: sort, available_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], fulfilment_types: ['delivery', 'pickup'] });
      (opts || []).forEach(([group_name, option_name, p], j) => s.menu_item_options.push({ id: s.menu_item_options.length + 1, menu_item_id: id, group_name, option_name, price: p, sort_order: (j + 1) * 10 }));
    });
    s.seq = { menu_items: s.menu_items.length, menu_item_options: s.menu_item_options.length, orders: 0, order_items: 0, catering_requests: 0 };
    s.users = [{ id: 'demo-owner', email: 'owner@escameals.demo', password: 'EscaDemo123' }];
    s.profiles = [{ id: 'demo-owner', email: 'owner@escameals.demo', full_name: 'Mamoke', role: 'admin', created_at: new Date().toISOString() }];

    const today = todayISO();
    const rawOrdersToday = [
      {
        code: 'ESC-7K2M9P',
        customer_name: 'Dr. Chinedu Eze',
        phone: '0803 234 5678',
        email: 'dr.eze@abahealth.org',
        fulfilment: 'delivery',
        delivery_zone: 'Aba Central',
        address: '14 Hospital Road, Aba Central',
        landmark: 'Beside General Hospital entrance',
        time_slot: '12:00-14:00',
        notes: 'Please pack hot. Extra pepper sauce if available.',
        subtotal: 38000,
        delivery_fee: 1500,
        total: 39500,
        status: 'confirmed',
        items: [
          { menu_item_id: 1, item_name: 'Egusi soup', option_name: '4 litres', quantity: 1, unit_price: 28000 },
          { menu_item_id: 20, item_name: 'Beef wrap', option_name: 'Wrap + Chapman', quantity: 1, unit_price: 10000 }
        ]
      },
      {
        code: 'ESC-4B9X2R',
        customer_name: 'Mrs. Ngozi Okeke',
        phone: '0812 345 6789',
        email: 'ngozi.okeke@outlook.com',
        fulfilment: 'delivery',
        delivery_zone: 'Ogbor Hill',
        address: '42 Pepples Street, Ogbor Hill',
        landmark: 'Near waterside bridge',
        time_slot: '12:00-14:00',
        notes: 'Call before arriving at the gate.',
        subtotal: 44000,
        delivery_fee: 2500,
        total: 46500,
        status: 'preparing',
        items: [
          { menu_item_id: 2, item_name: 'Ofe Owerri', option_name: '3 litres', quantity: 1, unit_price: 36000 },
          { menu_item_id: 23, item_name: 'Smoothie', option_name: null, quantity: 2, unit_price: 4000 }
        ]
      },
      {
        code: 'ESC-8V3L5T',
        customer_name: 'Engr. Obinna Nwosu',
        phone: '0802 888 1234',
        email: 'obinna@geoconsult.ng',
        fulfilment: 'pickup',
        delivery_zone: null,
        address: null,
        landmark: null,
        time_slot: '12:00-14:00',
        notes: 'Will pick up in my silver Corolla.',
        subtotal: 26000,
        delivery_fee: 0,
        total: 26000,
        status: 'ready',
        items: [
          { menu_item_id: 11, item_name: 'Smoky party jollof rice', option_name: 'Portion with peppered turkey', quantity: 2, unit_price: 9000 },
          { menu_item_id: 24, item_name: 'Fresh fruit juice', option_name: null, quantity: 2, unit_price: 3500 },
          { menu_item_id: 17, item_name: 'Fried plantain', option_name: 'per portion', quantity: 1, unit_price: 1000 }
        ]
      },
      {
        code: 'ESC-2M6W9J',
        customer_name: 'Amaka Kalu',
        phone: '0818 765 4321',
        email: 'amaka.kalu@fashionhub.com',
        fulfilment: 'delivery',
        delivery_zone: 'Abayi / GRA',
        address: '7 Brass Road, Aba',
        landmark: 'Opposite Abia State Polytechnic junction',
        time_slot: '12:00-14:00',
        notes: 'Leave with the front desk receptionist.',
        subtotal: 31000,
        delivery_fee: 2000,
        total: 33000,
        status: 'out_for_delivery',
        items: [
          { menu_item_id: 14, item_name: 'Native jollof rice', option_name: 'With dry fish, kpomo and goat meat', quantity: 2, unit_price: 11000 },
          { menu_item_id: 22, item_name: 'Salad bowl', option_name: 'Salad + Grilled chicken', quantity: 1, unit_price: 9000 }
        ]
      },
      {
        code: 'ESC-5P1R8D',
        customer_name: 'Chief Emeka Ibe',
        phone: '0803 555 7788',
        email: 'chief.ibe@ibeholdings.com',
        fulfilment: 'delivery',
        delivery_zone: 'Aba Central',
        address: '28 Faulks Road, Aba Central',
        landmark: 'Near Ariaria junction',
        time_slot: '12:00-14:00',
        notes: 'Call Chief driver on arrival.',
        subtotal: 46000,
        delivery_fee: 1500,
        total: 47500,
        status: 'completed',
        items: [
          { menu_item_id: 4, item_name: 'Seafood okro', option_name: '2 litres', quantity: 1, unit_price: 38000 },
          { menu_item_id: 23, item_name: 'Smoothie', option_name: null, quantity: 2, unit_price: 4000 }
        ]
      },
      {
        code: 'ESC-9Q4H3N',
        customer_name: 'Blessing Chukwu',
        phone: '0703 111 2233',
        email: '',
        fulfilment: 'pickup',
        delivery_zone: null,
        address: null,
        landmark: null,
        time_slot: '14:00-16:00',
        notes: 'Walking in from Umule junction.',
        subtotal: 18500,
        delivery_fee: 0,
        total: 18500,
        status: 'confirmed',
        items: [
          { menu_item_id: 21, item_name: 'Turkey wrap', option_name: 'Wrap + Chapman', quantity: 1, unit_price: 11000 },
          { menu_item_id: 20, item_name: 'Beef wrap', option_name: 'Wrap only', quantity: 1, unit_price: 7500 }
        ]
      },
      {
        code: 'ESC-3X7K1S',
        customer_name: 'Barrister Ikenna Adele',
        phone: '0806 999 4455',
        email: 'i.adele@adelelegal.ng',
        fulfilment: 'delivery',
        delivery_zone: 'Aba Central',
        address: '5 Jubilee Road, Commercial Area',
        landmark: 'Next to First Bank main branch',
        time_slot: '14:00-16:00',
        notes: 'Deliver to second floor law chambers.',
        subtotal: 39000,
        delivery_fee: 1500,
        total: 40500,
        status: 'preparing',
        items: [
          { menu_item_id: 3, item_name: 'Afang soup', option_name: '3 litres', quantity: 1, unit_price: 32000 },
          { menu_item_id: 24, item_name: 'Fresh fruit juice', option_name: null, quantity: 2, unit_price: 3500 }
        ]
      },
      {
        code: 'ESC-6F8Y4W',
        customer_name: 'Somtochukwu Ani',
        phone: '0813 444 8899',
        email: 'somto.ani@gmail.com',
        fulfilment: 'delivery',
        delivery_zone: 'Eziama / Umungasi',
        address: '18 Factory Road, Eziama',
        landmark: 'Opposite Star Paper Mill',
        time_slot: '14:00-16:00',
        notes: 'Call when you reach Factory road gate.',
        subtotal: 28000,
        delivery_fee: 2000,
        total: 30000,
        status: 'ready',
        items: [
          { menu_item_id: 12, item_name: 'Fried rice', option_name: 'Portion with peppered turkey', quantity: 2, unit_price: 9000 },
          { menu_item_id: 20, item_name: 'Beef wrap', option_name: 'Wrap + Chapman', quantity: 1, unit_price: 10000 }
        ]
      },
      {
        code: 'ESC-1L5Z7V',
        customer_name: 'Uchechi Nwafor',
        phone: '0809 123 9900',
        email: '',
        fulfilment: 'pickup',
        delivery_zone: null,
        address: null,
        landmark: null,
        time_slot: '14:00-16:00',
        notes: 'Mamoke knows my taste, mild pepper please.',
        subtotal: 22000,
        delivery_fee: 0,
        total: 22000,
        status: 'confirmed',
        items: [
          { menu_item_id: 6, item_name: 'Oha soup', option_name: '2 litres', quantity: 1, unit_price: 22000 }
        ]
      },
      {
        code: 'ESC-4T9J2K',
        customer_name: 'Kelechi Madu',
        phone: '0814 777 3322',
        email: 'k.madu@gmail.com',
        fulfilment: 'delivery',
        delivery_zone: 'Osisioma',
        address: 'Plot 9 Osisioma Industrial Layout',
        landmark: 'Near flyover toll junction',
        time_slot: '16:00-18:00',
        notes: 'Delivery van should ask for warehouse manager.',
        subtotal: 35000,
        delivery_fee: 3000,
        total: 38000,
        status: 'preparing',
        items: [
          { menu_item_id: 7, item_name: 'Bitterleaf soup', option_name: '3 litres', quantity: 1, unit_price: 28000 },
          { menu_item_id: 24, item_name: 'Fresh fruit juice', option_name: null, quantity: 2, unit_price: 3500 }
        ]
      },
      {
        code: 'ESC-8D3M6P',
        customer_name: 'Nneka Onyekwere',
        phone: '0805 666 1122',
        email: 'nneka@solardrive.ng',
        fulfilment: 'pickup',
        delivery_zone: null,
        address: null,
        landmark: null,
        time_slot: '16:00-18:00',
        notes: 'Coming by 4:30 PM sharp.',
        subtotal: 17500,
        delivery_fee: 0,
        total: 17500,
        status: 'ready',
        items: [
          { menu_item_id: 21, item_name: 'Turkey wrap', option_name: 'Wrap only', quantity: 1, unit_price: 8500 },
          { menu_item_id: 22, item_name: 'Salad bowl', option_name: 'Salad + Grilled chicken', quantity: 1, unit_price: 9000 }
        ]
      },
      {
        code: 'ESC-7H1N4R',
        customer_name: 'Okey Agwu',
        phone: '0816 333 4411',
        email: 'agwu.okey@timbermart.com',
        fulfilment: 'delivery',
        delivery_zone: 'Over Rail',
        address: '22 Over Rail Road, Aba',
        landmark: 'Near rail crossing line',
        time_slot: '16:00-18:00',
        notes: 'Call before dispatching rider.',
        subtotal: 29000,
        delivery_fee: 2000,
        total: 31000,
        status: 'out_for_delivery',
        items: [
          { menu_item_id: 13, item_name: 'White rice', option_name: null, quantity: 1, unit_price: 12000 },
          { menu_item_id: 18, item_name: 'Peppered snail', option_name: '10 pcs (budget pack)', quantity: 1, unit_price: 17000 }
        ]
      },
      {
        code: 'ESC-2V8C5Y',
        customer_name: 'Chinyere Dim',
        phone: '0706 777 8899',
        email: '',
        fulfilment: 'pickup',
        delivery_zone: null,
        address: null,
        landmark: null,
        time_slot: '16:00-18:00',
        notes: 'Pickup on way home from office.',
        subtotal: 18000,
        delivery_fee: 0,
        total: 18000,
        status: 'confirmed',
        items: [
          { menu_item_id: 11, item_name: 'Smoky party jollof rice', option_name: 'Portion with peppered turkey', quantity: 2, unit_price: 9000 }
        ]
      },
      {
        code: 'ESC-5K9L2T',
        customer_name: 'Pastor Samuel Eke',
        phone: '0803 444 5566',
        email: 'samueleke@gracefellowship.org',
        fulfilment: 'delivery',
        delivery_zone: 'Aba Central',
        address: '33 Pound Road, Aba Central',
        landmark: 'Opposite post office',
        time_slot: '18:00-20:00',
        notes: 'Deliver to church guest house.',
        subtotal: 33000,
        delivery_fee: 1500,
        total: 34500,
        status: 'confirmed',
        items: [
          { menu_item_id: 8, item_name: 'Banga soup', option_name: '3 litres', quantity: 1, unit_price: 33000 }
        ]
      },
      {
        code: 'ESC-3W6P8Q',
        customer_name: 'Joy Uchenna',
        phone: '0815 222 3344',
        email: 'joy.uchenna@gmail.com',
        fulfilment: 'delivery',
        delivery_zone: 'Aba Central',
        address: '15 Azikiwe Road, Aba Central',
        landmark: 'Near Christ the King Church',
        time_slot: '18:00-20:00',
        notes: 'Gate code 4021.',
        subtotal: 26000,
        delivery_fee: 1500,
        total: 27500,
        status: 'ready',
        items: [
          { menu_item_id: 14, item_name: 'Native jollof rice', option_name: 'With dry fish, kpomo and hard chicken', quantity: 2, unit_price: 9000 },
          { menu_item_id: 23, item_name: 'Smoothie', option_name: null, quantity: 2, unit_price: 4000 }
        ]
      },
      {
        code: 'ESC-9B4X7M',
        customer_name: 'Ifeanyi Okoro',
        phone: '0802 111 9988',
        email: 'ifeanyi@okorosteel.com',
        fulfilment: 'delivery',
        delivery_zone: 'Ogbor Hill',
        address: '11 Opobo Road, Ogbor Hill',
        landmark: 'Near slaughter market junction',
        time_slot: '18:00-20:00',
        notes: 'Family dinner, deliver promptly.',
        subtotal: 69000,
        delivery_fee: 2500,
        total: 71500,
        status: 'completed',
        items: [
          { menu_item_id: 1, item_name: 'Egusi soup', option_name: '3 litres', quantity: 1, unit_price: 22000 },
          { menu_item_id: 5, item_name: 'Nsala (white) soup', option_name: '4 litres', quantity: 1, unit_price: 33000 },
          { menu_item_id: 24, item_name: 'Fresh fruit juice', option_name: null, quantity: 4, unit_price: 3500 }
        ]
      },
      {
        code: 'ESC-1F7J9N',
        customer_name: 'Chioma Obi',
        phone: '0811 888 7766',
        email: 'chioma.obi@yahoo.com',
        fulfilment: 'pickup',
        delivery_zone: null,
        address: null,
        landmark: null,
        time_slot: '18:00-20:00',
        notes: 'Will collect in food warmer bags.',
        subtotal: 51500,
        delivery_fee: 0,
        total: 51500,
        status: 'completed',
        items: [
          { menu_item_id: 2, item_name: 'Ofe Owerri', option_name: '4 litres', quantity: 1, unit_price: 44000 },
          { menu_item_id: 20, item_name: 'Beef wrap', option_name: 'Wrap only', quantity: 1, unit_price: 7500 }
        ]
      }
    ];

    function commitOrder(ro, targetDate) {
      const oid = ++s.seq.orders;
      const o = {
        id: oid,
        code: ro.code,
        customer_name: ro.customer_name,
        phone: ro.phone,
        email: ro.email || null,
        fulfilment: ro.fulfilment,
        delivery_zone: ro.delivery_zone || null,
        address: ro.address || null,
        landmark: ro.landmark || null,
        fulfil_date: targetDate,
        time_slot: ro.time_slot,
        notes: ro.notes || '',
        subtotal: ro.subtotal,
        delivery_fee: ro.delivery_fee,
        total: ro.total,
        status: ro.status,
        payment_status: 'paid',
        payment_method: 'bachs',
        amount_paid: ro.total,
        paid_at: targetDate + 'T08:00:00.000Z',
        bachs_checkout_id: 'chk_demo_' + oid,
        bachs_checkout_url: 'pay.html?code=' + ro.code + '&demo_checkout=1',
        needs_attention: null,
        channel: 'website',
        created_at: targetDate + 'T07:30:00.000Z'
      };
      s.orders.push(o);
      ro.items.forEach(it => {
        s.order_items.push({
          id: ++s.seq.order_items,
          order_id: oid,
          menu_item_id: it.menu_item_id,
          option_id: it.option_id || null,
          item_name: it.item_name,
          option_name: it.option_name,
          quantity: it.quantity,
          unit_price: it.unit_price
        });
      });
    }

    rawOrdersToday.forEach(ro => commitOrder(ro, today));

    // Realistic historical orders for Yesterday (completed kitchen service)
    const rawOrdersYesterday = [
      {
        code: 'ESC-Y1A9K4', customer_name: 'Barrister Nnamdi Kanu', phone: '0803 555 7788', email: 'nnamdi@abachambers.ng',
        fulfilment: 'delivery', delivery_zone: 'Abayi / GRA', address: '18 Brass Road, Aba', landmark: 'Near high court gate',
        time_slot: '12:00-14:00', notes: 'Deliver to chambers reception.', subtotal: 44000, delivery_fee: 2000, total: 46000, status: 'completed',
        items: [{ menu_item_id: 2, item_name: 'Ofe Owerri', option_name: '4 litres', quantity: 1, unit_price: 44000 }]
      },
      {
        code: 'ESC-Y2B8M3', customer_name: 'Kelechi Maduka', phone: '0812 666 4433', email: 'kelechi@madukatrading.com',
        fulfilment: 'pickup', time_slot: '12:00-14:00', notes: 'Picking up at lunch break.', subtotal: 27000, delivery_fee: 0, total: 27000, status: 'completed',
        items: [
          { menu_item_id: 11, item_name: 'Smoky party jollof rice', option_name: 'Portion with peppered turkey', quantity: 2, unit_price: 9000 },
          { menu_item_id: 21, item_name: 'Turkey wrap', option_name: 'Wrap only', quantity: 1, unit_price: 8500 },
          { menu_item_id: 17, item_name: 'Fried plantain', option_name: 'per portion', quantity: 1, unit_price: 1000 }
        ]
      },
      {
        code: 'ESC-Y3C7P2', customer_name: 'Dr. (Mrs) Ify Anya', phone: '0802 999 1122', email: 'ify.anya@gmail.com',
        fulfilment: 'delivery', delivery_zone: 'Aba Central', address: '5 Georges Street, Aba Central', landmark: 'Opposite First Bank',
        time_slot: '12:00-14:00', notes: 'Please pack in leak-proof containers.', subtotal: 35000, delivery_fee: 1500, total: 36500, status: 'completed',
        items: [
          { menu_item_id: 7, item_name: 'Seafood okro', option_name: '2 litres', quantity: 1, unit_price: 26000 },
          { menu_item_id: 22, item_name: 'Salad bowl', option_name: 'Salad + Grilled chicken', quantity: 1, unit_price: 9000 }
        ]
      },
      {
        code: 'ESC-Y4D6Q1', customer_name: 'Obioma Nwankwo', phone: '0703 111 8899', email: 'obioma@textiles.com.ng',
        fulfilment: 'delivery', delivery_zone: 'Ogbor Hill', address: '8 Ikot Ekpene Road, Ogbor Hill', landmark: 'Near timber market',
        time_slot: '12:00-14:00', notes: 'Deliver to main warehouse entrance.', subtotal: 51000, delivery_fee: 2500, total: 53500, status: 'completed',
        items: [
          { menu_item_id: 1, item_name: 'Egusi soup', option_name: '4 litres', quantity: 1, unit_price: 28000 },
          { menu_item_id: 14, item_name: 'Native jollof rice', option_name: 'With dry fish, kpomo and goat meat', quantity: 2, unit_price: 11000 },
          { menu_item_id: 24, item_name: 'Fresh fruit juice', option_name: null, quantity: 1, unit_price: 3500 }
        ]
      },
      {
        code: 'ESC-Y5E5R9', customer_name: 'Adaeze Chukwu', phone: '0816 444 2233', email: 'adaeze@zenithbank.com',
        fulfilment: 'pickup', time_slot: '14:00-16:00', notes: 'Will pick up in blue RAV4.', subtotal: 19000, delivery_fee: 0, total: 19000, status: 'completed',
        items: [
          { menu_item_id: 20, item_name: 'Beef wrap', option_name: 'Wrap + Chapman', quantity: 1, unit_price: 10000 },
          { menu_item_id: 22, item_name: 'Salad bowl', option_name: 'Salad + Grilled chicken', quantity: 1, unit_price: 9000 }
        ]
      },
      {
        code: 'ESC-Y6F4S8', customer_name: 'Chief Kenneth Igwe', phone: '0803 777 0011', email: 'kenneth.igwe@igweholdings.ng',
        fulfilment: 'delivery', delivery_zone: 'Abayi / GRA', address: '14 Old GRA Road, Aba', landmark: 'Beside Catholic Secretariat',
        time_slot: '14:00-16:00', notes: 'Gate buzzer 2.', subtotal: 59000, delivery_fee: 2000, total: 61000, status: 'completed',
        items: [
          { menu_item_id: 5, item_name: 'Nsala (white) soup', option_name: '4 litres', quantity: 1, unit_price: 33000 },
          { menu_item_id: 18, item_name: 'Peppered snail', option_name: '15 pcs (family tray)', quantity: 1, unit_price: 26000 }
        ]
      },
      {
        code: 'ESC-Y7G3T7', customer_name: 'Somtochukwu Eze', phone: '0814 888 6655', email: 'somto@zephyrtech.ng',
        fulfilment: 'delivery', delivery_zone: 'Aba Central', address: '27 St. Michaels Road, Aba Central', landmark: 'Opposite post office',
        time_slot: '14:00-16:00', notes: 'Deliver to office floor 2.', subtotal: 25500, delivery_fee: 1500, total: 27000, status: 'completed',
        items: [
          { menu_item_id: 11, item_name: 'Smoky party jollof rice', option_name: 'Portion with peppered beef', quantity: 2, unit_price: 7500 },
          { menu_item_id: 23, item_name: 'Smoothie', option_name: null, quantity: 2, unit_price: 4000 },
          { menu_item_id: 17, item_name: 'Fried plantain', option_name: 'per portion', quantity: 1, unit_price: 1000 }
        ]
      },
      {
        code: 'ESC-Y8H2U6', customer_name: 'Mrs. Vivian Okoro', phone: '0806 333 9988', email: 'vivian@diamondhair.com',
        fulfilment: 'pickup', time_slot: '16:00-18:00', notes: 'Pickup on way from salon.', subtotal: 22000, delivery_fee: 0, total: 22000, status: 'completed',
        items: [{ menu_item_id: 1, item_name: 'Egusi soup', option_name: '3 litres', quantity: 1, unit_price: 22000 }]
      },
      {
        code: 'ESC-Y9J1V5', customer_name: 'Engr. David Ndukwe', phone: '0802 444 8877', email: 'ndukwe.david@mow.ab.gov.ng',
        fulfilment: 'delivery', delivery_zone: 'Over Rail', address: '15 Railway Road, Aba', landmark: 'Beside old railway station',
        time_slot: '16:00-18:00', notes: 'Security will collect at the barrier.', subtotal: 33000, delivery_fee: 2000, total: 35000, status: 'completed',
        items: [{ menu_item_id: 8, item_name: 'Banga soup', option_name: '3 litres', quantity: 1, unit_price: 33000 }]
      },
      {
        code: 'ESC-Y0K9W4', customer_name: 'Grace Ibeh', phone: '0818 222 1199', email: 'grace.ibeh@schoolboard.ng',
        fulfilment: 'delivery', delivery_zone: 'Ogbor Hill', address: '54 Ehere Road, Ogbor Hill', landmark: 'Near Ehere community school',
        time_slot: '16:00-18:00', notes: 'Call 5 minutes ahead.', subtotal: 32000, delivery_fee: 2500, total: 34500, status: 'completed',
        items: [
          { menu_item_id: 14, item_name: 'Native jollof rice', option_name: 'With dry fish, kpomo and hard chicken', quantity: 2, unit_price: 9000 },
          { menu_item_id: 20, item_name: 'Beef wrap', option_name: 'Wrap only', quantity: 1, unit_price: 7500 },
          { menu_item_id: 23, item_name: 'Smoothie', option_name: null, quantity: 1, unit_price: 4000 }
        ]
      },
      {
        code: 'ESC-YAL8X3', customer_name: 'Uchechukwu Oji', phone: '0706 888 3344', email: '',
        fulfilment: 'pickup', time_slot: '16:00-18:00', notes: 'Walking in from nearby store.', subtotal: 18500, delivery_fee: 0, total: 18500, status: 'completed',
        items: [
          { menu_item_id: 21, item_name: 'Turkey wrap', option_name: 'Wrap + Chapman', quantity: 1, unit_price: 11000 },
          { menu_item_id: 20, item_name: 'Beef wrap', option_name: 'Wrap only', quantity: 1, unit_price: 7500 }
        ]
      },
      {
        code: 'ESC-YBM7Y2', customer_name: 'Chidinma Osuji', phone: '0805 111 4455', email: 'chidinma.osuji@fmcaba.ng',
        fulfilment: 'delivery', delivery_zone: 'Aba Central', address: '8 Park Road, Aba Central', landmark: 'Near Aba recreation club',
        time_slot: '18:00-20:00', notes: 'Doctor on duty call before coming up.', subtotal: 44000, delivery_fee: 1500, total: 45500, status: 'completed',
        items: [
          { menu_item_id: 2, item_name: 'Ofe Owerri', option_name: '3 litres', quantity: 1, unit_price: 36000 },
          { menu_item_id: 24, item_name: 'Fresh fruit juice', option_name: null, quantity: 2, unit_price: 3500 }
        ]
      },
      {
        code: 'ESC-YCN6Z1', customer_name: 'Princewell Amadi', phone: '0813 999 2211', email: 'amadi.princewell@oilservice.com',
        fulfilment: 'delivery', delivery_zone: 'Abayi / GRA', address: '11 Factory Road, Aba', landmark: 'Beside Guinness depot',
        time_slot: '18:00-20:00', notes: 'Evening dinner.', subtotal: 54000, delivery_fee: 2000, total: 56000, status: 'completed',
        items: [
          { menu_item_id: 1, item_name: 'Egusi soup', option_name: '4 litres', quantity: 1, unit_price: 28000 },
          { menu_item_id: 18, item_name: 'Peppered snail', option_name: '15 pcs (family tray)', quantity: 1, unit_price: 26000 }
        ]
      },
      {
        code: 'ESC-YDP5A9', customer_name: 'Onyinyechi Kalu', phone: '0802 777 5566', email: 'onyinye@kalugroup.ng',
        fulfilment: 'pickup', time_slot: '18:00-20:00', notes: 'Pick up on way home.', subtotal: 28000, delivery_fee: 0, total: 28000, status: 'completed',
        items: [{ menu_item_id: 1, item_name: 'Egusi soup', option_name: '4 litres', quantity: 1, unit_price: 28000 }]
      }
    ];
    rawOrdersYesterday.forEach(ro => commitOrder(ro, addDays(today, -1)));

    // Realistic historical orders for 2 days ago
    const rawOrders2DaysAgo = [
      {
        code: 'ESC-2D1A11', customer_name: 'Hon. Justice Chima Uba', phone: '0803 123 9900', email: 'justice.uba@courts.ng',
        fulfilment: 'delivery', delivery_zone: 'Abayi / GRA', address: '2 Judiciary Close, GRA, Aba', landmark: 'Opposite judges quarters',
        time_slot: '12:00-14:00', notes: 'Official residence deliver with care.', subtotal: 62000, delivery_fee: 2000, total: 64000, status: 'completed',
        items: [
          { menu_item_id: 5, item_name: 'Nsala (white) soup', option_name: '4 litres', quantity: 1, unit_price: 33000 },
          { menu_item_id: 11, item_name: 'Smoky party jollof rice', option_name: 'Portion with peppered turkey', quantity: 2, unit_price: 9000 },
          { menu_item_id: 23, item_name: 'Smoothie', option_name: null, quantity: 2, unit_price: 4000 }
        ]
      },
      {
        code: 'ESC-2D2B22', customer_name: 'Lady Beatrice Nwosu', phone: '0812 777 8811', email: '',
        fulfilment: 'pickup', time_slot: '12:00-14:00', notes: 'Family Sunday prep.', subtotal: 33000, delivery_fee: 0, total: 33000, status: 'completed',
        items: [{ menu_item_id: 8, item_name: 'Banga soup', option_name: '3 litres', quantity: 1, unit_price: 33000 }]
      },
      {
        code: 'ESC-2D3C33', customer_name: 'Emeka Onyema', phone: '0703 444 5522', email: 'emeka@onyematex.ng',
        fulfilment: 'delivery', delivery_zone: 'Aba Central', address: '19 Market Road, Aba Central', landmark: 'Beside Post Office',
        time_slot: '12:00-14:00', notes: 'Shop front 4B.', subtotal: 31000, delivery_fee: 1500, total: 32500, status: 'completed',
        items: [
          { menu_item_id: 14, item_name: 'Native jollof rice', option_name: 'With dry fish, kpomo and goat meat', quantity: 2, unit_price: 11000 },
          { menu_item_id: 22, item_name: 'Salad bowl', option_name: 'Salad + Grilled chicken', quantity: 1, unit_price: 9000 }
        ]
      },
      {
        code: 'ESC-2D4D44', customer_name: 'Ngozi Alajemba', phone: '0818 333 6677', email: 'alajemba.n@gmail.com',
        fulfilment: 'delivery', delivery_zone: 'Ogbor Hill', address: '30 Waterside Road, Ogbor Hill', landmark: 'Near waterside market',
        time_slot: '14:00-16:00', notes: 'Deliver to clinic reception.', subtotal: 44000, delivery_fee: 2500, total: 46500, status: 'completed',
        items: [{ menu_item_id: 2, item_name: 'Ofe Owerri', option_name: '4 litres', quantity: 1, unit_price: 44000 }]
      },
      {
        code: 'ESC-2D5E55', customer_name: 'Ikechukwu Nwoye', phone: '0802 666 1144', email: 'ike@fastprints.com',
        fulfilment: 'pickup', time_slot: '14:00-16:00', notes: 'Quick pickup.', subtotal: 21000, delivery_fee: 0, total: 21000, status: 'completed',
        items: [
          { menu_item_id: 20, item_name: 'Beef wrap', option_name: 'Wrap + Chapman', quantity: 1, unit_price: 10000 },
          { menu_item_id: 21, item_name: 'Turkey wrap', option_name: 'Wrap + Chapman', quantity: 1, unit_price: 11000 }
        ]
      },
      {
        code: 'ESC-2D6F66', customer_name: 'Stella Madu', phone: '0806 888 2211', email: 'stella.madu@heritage.ng',
        fulfilment: 'delivery', delivery_zone: 'Aba Central', address: '44 Azikiwe Road, Aba Central', landmark: 'Beside union bank',
        time_slot: '14:00-16:00', notes: 'Office floor 1.', subtotal: 36000, delivery_fee: 1500, total: 37500, status: 'completed',
        items: [
          { menu_item_id: 1, item_name: 'Egusi soup', option_name: '4 litres', quantity: 1, unit_price: 28000 },
          { menu_item_id: 23, item_name: 'Smoothie', option_name: null, quantity: 2, unit_price: 4000 }
        ]
      },
      {
        code: 'ESC-2D7G77', customer_name: 'Pastor Caleb Agbo', phone: '0813 444 8833', email: 'pastor.agbo@apostolic.org',
        fulfilment: 'delivery', delivery_zone: 'Over Rail', address: '8 Eziama Road, Aba', landmark: 'Near railway bridge',
        time_slot: '16:00-18:00', notes: 'Parsonage lodge.', subtotal: 33000, delivery_fee: 2000, total: 35000, status: 'completed',
        items: [{ menu_item_id: 5, item_name: 'Nsala (white) soup', option_name: '4 litres', quantity: 1, unit_price: 33000 }]
      },
      {
        code: 'ESC-2D8H88', customer_name: 'Chidiebere Kalu', phone: '0805 777 3399', email: 'chidi.kalu@transport.ng',
        fulfilment: 'pickup', time_slot: '16:00-18:00', notes: 'Pickup on evening drive.', subtotal: 26000, delivery_fee: 0, total: 26000, status: 'completed',
        items: [{ menu_item_id: 7, item_name: 'Seafood okro', option_name: '2 litres', quantity: 1, unit_price: 26000 }]
      },
      {
        code: 'ESC-2D9I99', customer_name: 'Gloria Nweke', phone: '0814 111 6644', email: 'gloria@nwekegroup.com',
        fulfilment: 'delivery', delivery_zone: 'Abayi / GRA', address: '9 Aba-Owerri Road, Abayi', landmark: 'Near Abayi girls secondary school',
        time_slot: '16:00-18:00', notes: 'Security check at estate gate.', subtotal: 37000, delivery_fee: 2000, total: 39000, status: 'completed',
        items: [
          { menu_item_id: 11, item_name: 'Smoky party jollof rice', option_name: 'Portion with peppered turkey', quantity: 2, unit_price: 9000 },
          { menu_item_id: 18, item_name: 'Peppered snail', option_name: '10 pcs (budget pack)', quantity: 1, unit_price: 17000 },
          { menu_item_id: 17, item_name: 'Fried plantain', option_name: 'per portion', quantity: 2, unit_price: 1000 }
        ]
      },
      {
        code: 'ESC-2D0J00', customer_name: 'Victor Ezeji', phone: '0706 222 9911', email: 'victor.ezeji@motors.ng',
        fulfilment: 'delivery', delivery_zone: 'Aba Central', address: '12 Milverton Avenue, Aba Central', landmark: 'Luxury bus park',
        time_slot: '18:00-20:00', notes: 'Main terminal office.', subtotal: 25000, delivery_fee: 1500, total: 26500, status: 'completed',
        items: [
          { menu_item_id: 20, item_name: 'Beef wrap', option_name: 'Wrap only', quantity: 1, unit_price: 7500 },
          { menu_item_id: 14, item_name: 'Native jollof rice', option_name: 'With dry fish, kpomo and goat meat', quantity: 1, unit_price: 11000 },
          { menu_item_id: 24, item_name: 'Fresh fruit juice', option_name: null, quantity: 1, unit_price: 3500 },
          { menu_item_id: 23, item_name: 'Smoothie', option_name: null, quantity: 1, unit_price: 4000 }
        ]
      },
      {
        code: 'ESC-2D1K11', customer_name: 'Amarachi Okoro', phone: '0803 888 4400', email: '',
        fulfilment: 'pickup', time_slot: '18:00-20:00', notes: 'Collect after shop closure.', subtotal: 22000, delivery_fee: 0, total: 22000, status: 'completed',
        items: [{ menu_item_id: 1, item_name: 'Egusi soup', option_name: '3 litres', quantity: 1, unit_price: 22000 }]
      },
      {
        code: 'ESC-2D2L22', customer_name: 'Franklin Ihedioha', phone: '0812 999 5533', email: 'franklin@ihediohapharm.com',
        fulfilment: 'delivery', delivery_zone: 'Ogbor Hill', address: '21 Opobo Road, Ogbor Hill', landmark: 'Near Opobo junction',
        time_slot: '18:00-20:00', notes: 'Deliver to pharmacy.', subtotal: 36000, delivery_fee: 2500, total: 38500, status: 'completed',
        items: [
          { menu_item_id: 2, item_name: 'Ofe Owerri', option_name: '3 litres', quantity: 1, unit_price: 36000 }
        ]
      }
    ];
    rawOrders2DaysAgo.forEach(ro => commitOrder(ro, addDays(today, -2)));

    // Historical batches across earlier November dates (3, 5, 7, 10, 12 days ago)
    const earlierDates = [-3, -5, -7, -10, -12];
    earlierDates.forEach((offset, idx) => {
      const histDate = addDays(today, offset);
      const sampleNames = [
        ['Chukwuma Obi', '0803 111 2233', 'delivery', 'Abayi / GRA', '4 Brass Road', 44000, 2000, 'Ofe Owerri', 2, '4 litres'],
        ['Anayo Nnamdi', '0812 444 5566', 'pickup', null, null, 28000, 0, 'Egusi soup', 1, '4 litres'],
        ['Mrs. Joy Ahamba', '0703 777 8899', 'delivery', 'Aba Central', '18 Faulks Road', 33000, 1500, 'Nsala (white) soup', 5, '4 litres'],
        ['Engr. Collins Uche', '0818 555 4422', 'delivery', 'Ogbor Hill', '12 Pepples St', 34500, 2500, 'Banga soup', 8, '3 litres'],
        ['Nkechi Duru', '0806 222 3311', 'pickup', null, null, 19000, 0, 'Beef wrap & Salad', 20, 'Wrap + Chapman'],
        ['Chief Okey Agu', '0802 999 0088', 'delivery', 'Abayi / GRA', '7 Old GRA Rd', 52000, 2000, 'Seafood okro & Snails', 7, '2 litres'],
        ['Miracle Eze', '0814 666 7755', 'delivery', 'Aba Central', '9 Hospital Road', 27000, 1500, 'Smoky party jollof', 11, 'Portion with peppered turkey'],
        ['Daniel Opara', '0805 333 1122', 'pickup', null, null, 26000, 0, 'Native jollof & Juice', 14, 'With dry fish, kpomo and goat meat']
      ];
      sampleNames.forEach(([cname, cphone, cful, czone, caddr, csub, cdfee, dname, mid, opt], sidx) => {
        commitOrder({
          code: `ESC-H${idx}${sidx}D${Math.abs(offset)}`,
          customer_name: cname,
          phone: cphone,
          fulfilment: cful,
          delivery_zone: czone,
          address: caddr,
          time_slot: sidx % 2 === 0 ? '12:00-14:00' : '16:00-18:00',
          notes: 'Completed order.',
          subtotal: csub,
          delivery_fee: cdfee,
          total: csub + cdfee,
          status: 'completed',
          items: [{ menu_item_id: mid, item_name: dname, option_name: opt, quantity: 1, unit_price: csub }]
        }, histDate);
      });
    });

    // Sample upcoming orders for tomorrow
    const tomorrow = earliestDate(s.settings);
    demoCache = s;
    const a = DEMO_API.place_order({ customer: { name: 'Ada Okafor', phone: '0803 123 4567', email: 'ada@example.com' }, fulfilment: 'delivery', delivery_zone: 'aba_central', address: '12 Faulks Road', landmark: 'Opposite the pharmacy', date: tomorrow, time_slot: '12:00-14:00', items: [{ menu_item_id: 1, option_id: 2, quantity: 1 }, { menu_item_id: 5, quantity: 1 }] }, true);
    demoMarkPaid(a.code);
    DEMO_API.place_order({ customer: { name: 'Chidi Eze', phone: '0812 555 0101', email: '' }, fulfilment: 'pickup', date: tomorrow, time_slot: '16:00-18:00', items: [{ menu_item_id: 15, option_id: 14, quantity: 2 }] }, true);

    // 10 realistic catering enquiries across Aba
    const cateringData = [
      {
        name: 'Ngozi Umeh',
        phone: '0803 222 3344',
        email: 'ngozi.umeh@gmail.com',
        event_type: 'Traditional Wedding',
        event_date: addDays(today, 18),
        guests: 150,
        location: 'Aba Sports Club GRA',
        budget: '₦1,250,000',
        service: 'Food trays + peppered snail',
        details: 'Jollof and fried rice trays, peppered chicken, 150 pcs peppered snail, swallow with Egusi soup tubs.',
        status: 'new',
        quote_amount: null,
        ai_summary: 'Traditional wedding for 150 guests at Aba Sports Club GRA, budget ₦1,250,000. Large buffet setup with soup tubs, rice trays, and peppered snails.'
      },
      {
        name: 'Dr. Ikenna Nwosu',
        phone: '0812 555 9090',
        email: 'inwosu@abamed.org',
        event_type: 'Medical AGM & Dinner',
        event_date: addDays(today, 10),
        guests: 80,
        location: 'Enitona Hotel, GRA, Aba',
        budget: '₦650,000',
        service: 'Executive buffet lunch & dinner',
        details: 'Executive lunch buffet: Native jollof, Fried rice, Grilled fish portions, Salads, Chapman drinks.',
        status: 'quoted',
        quote_amount: 620000,
        ai_summary: 'Executive medical AGM at Enitona Hotel for 80 doctors. Quoted ₦620,000 with premium fish and chicken packs.'
      },
      {
        name: 'Amaka Kalu',
        phone: '0818 765 4321',
        email: 'amaka.kalu@fashionhub.com',
        event_type: '50th Golden Jubilee Birthday',
        event_date: addDays(today, 25),
        guests: 120,
        location: 'Umungasi Event Hall, Aba',
        budget: '₦900,000',
        service: 'Soup tubs + swallows + protein packs',
        details: '4L tubs of Oha, Afang, and Egusi soup, semovita, pounded yam, assorted meats, and drinks.',
        status: 'new',
        quote_amount: null,
        ai_summary: '50th Golden Jubilee birthday for 120 guests at Umungasi. Focused on luxury soup tubs and assorted swallow.'
      },
      {
        name: 'Chief Emeka Okoye',
        phone: '0803 555 7788',
        email: 'chief.okoye@okoyegroup.ng',
        event_type: 'Chieftaincy Title Celebration',
        event_date: addDays(today, 14),
        guests: 250,
        location: 'Eziama, Aba',
        budget: '₦2,200,000',
        service: 'Full banquet catering',
        details: 'Premium banquet: Seafood okro, Ofe Owerri, whole roasted goat, jollof trays, dessert smoothies.',
        status: 'confirmed',
        quote_amount: 2100000,
        ai_summary: 'Chieftaincy celebration for 250 dignitaries in Eziama. Deposit received and menu schedule locked.'
      },
      {
        name: 'Blessing Chinedu',
        phone: '0703 111 2233',
        email: 'blessing.chinedu@gmail.com',
        event_type: 'Baby Dedication & Thanksgiving',
        event_date: addDays(today, 8),
        guests: 50,
        location: 'Factory Road, Aba',
        budget: '₦350,000',
        service: 'Rice trays + chicken + fruit platters',
        details: 'Party jollof, fried rice trays, crispy chicken, meat pies, and sliced fruit platters.',
        status: 'new',
        quote_amount: null,
        ai_summary: 'Intimate thanksgiving celebration for 50 guests along Factory Road.'
      },
      {
        name: 'Engr. Obinna Adele',
        phone: '0802 888 1234',
        email: 'o.adele@adeleengineering.com',
        event_type: 'Corporate End of Year Dinner',
        event_date: addDays(today, 21),
        guests: 100,
        location: 'Golf Course Road, GRA, Aba',
        budget: '₦1,100,000',
        service: 'Three-course corporate dinner',
        details: 'Three-course sit-down Nigerian dinner, signature Chapman bar, peppered turkey platters.',
        status: 'new',
        quote_amount: null,
        ai_summary: 'Corporate dinner for 100 company staff and directors at GRA Golf Course venue.'
      },
      {
        name: 'Chinyere Nwachukwu',
        phone: '0813 444 8899',
        email: 'chinyere.n@gmail.com',
        event_type: 'Bridal Shower',
        event_date: addDays(today, 6),
        guests: 35,
        location: 'Brass Road, Aba',
        budget: '₦220,000',
        service: 'Platters + wraps + cocktails',
        details: 'Customised finger food platters, wraps, chicken wings, fresh smoothies, and cocktails.',
        status: 'quoted',
        quote_amount: 215000,
        ai_summary: 'Chic outdoor bridal shower on Brass Road for 35 guests. Quoted ₦215,000.'
      },
      {
        name: 'Pastor David Onyeama',
        phone: '0803 444 5566',
        email: 'pastor.david@livingwordaba.org',
        event_type: 'Church Anniversary Workers Feast',
        event_date: addDays(today, 12),
        guests: 90,
        location: 'Jubilee Road, Aba',
        budget: '₦500,000',
        service: 'Rice combos + pepper soup pots',
        details: 'Smoky jollof and fried rice combos, goat meat pepper soup pots, Chapman bottles.',
        status: 'new',
        quote_amount: null,
        ai_summary: 'Church workers appreciation lunch for 90 church ministers and workers.'
      },
      {
        name: 'Kalu Eze',
        phone: '0814 777 3322',
        email: 'kalu.eze@transwest.ng',
        event_type: 'Housewarming Party',
        event_date: addDays(today, 15),
        guests: 70,
        location: 'Osisioma, Aba',
        budget: '₦550,000',
        service: 'Soups + swallows + drinks',
        details: 'Bitterleaf soup, Egusi soup with semo and pounded yam, fried fish, soft drinks.',
        status: 'new',
        quote_amount: null,
        ai_summary: 'New house opening celebration at Osisioma for 70 guests.'
      },
      {
        name: 'Somtochukwu Obi',
        phone: '0809 123 9900',
        email: 'somto.obi@aba-devs.org',
        event_type: 'Tech Meetup Aba',
        event_date: addDays(today, 9),
        guests: 45,
        location: 'St. Michaels Road, Aba',
        budget: '₦280,000',
        service: 'Wraps + chops + chapman bar',
        details: 'Beef & turkey wraps, chapman bottles, meat snacks, small chops trays for developers.',
        status: 'new',
        quote_amount: null,
        ai_summary: 'Afternoon developers conference on St. Michaels Road for 45 tech attendees.'
      }
    ];

    cateringData.forEach(cd => {
      s.catering_requests.push({
        id: ++s.seq.catering_requests,
        name: cd.name,
        phone: cd.phone,
        email: cd.email || null,
        event_type: cd.event_type,
        event_date: cd.event_date,
        guests: cd.guests,
        location: cd.location,
        budget: cd.budget,
        service: cd.service,
        details: cd.details,
        status: cd.status,
        quote_amount: cd.quote_amount,
        summary: cd.ai_summary,
        created_at: new Date().toISOString()
      });
    });

    saveDemo();
    return s;
  }
  function demo() {
    if (!demoCache) {
      demoCache = store.get(KEY, null);
      const isComplete = demoCache &&
                         Array.isArray(demoCache.menu_items) &&
                         Array.isArray(demoCache.pantry_items) &&
                         demoCache.menu_items.filter(m => m.is_featured).length === 6 &&
                         demoCache.menu_items.some(m => m.name === 'White rice' && m.price === 12000) &&
                         Array.isArray(demoCache.orders) &&
                         demoCache.orders.filter(o => o.fulfil_date === todayISO()).length >= 17 &&
                         Array.isArray(demoCache.catering_requests) &&
                         demoCache.catering_requests.length >= 10;
      if (!isComplete) seedDemo();
    }
    return demoCache;
  }
  function saveDemo() { store.set(KEY, demoCache); }
  function reloadDemo() { demoCache = store.get(KEY, null) || demoCache; }
  const nextId = t => { const s = demo(); s.seq[t] = (s.seq[t] || 0) + 1; return s.seq[t]; };
  const newCode = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c; do { c = 'ESC-' + Array.from({ length: 6 }, () => a[Math.floor(Math.random() * a.length)]).join(''); } while (demo().orders.some(o => o.code === c)); return c; };
  const optionsFor = (s, id) => s.menu_item_options.filter(o => o.menu_item_id === id).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const ordersOn = (s, d) => s.orders.filter(o => o.fulfil_date === d && o.status !== 'cancelled').length;
  // portions set for a date: null = no limit; a "special" (date_only) with no number that day = 0
  const portionsSet = (s, id, d) => { const r = (s.dish_date_portions ||= []).find(p => p.menu_item_id === id && p.avail_date === d); if (r) return r.portions; return s.menu_items.find(m => m.id === id)?.date_only ? 0 : null; };
  const portionsBooked = (s, id, d) => s.order_items.filter(i => i.menu_item_id === id && s.orders.some(o => o.id === i.order_id && o.fulfil_date === d && o.status !== 'cancelled')).reduce((a, i) => a + i.quantity, 0);
  const portionsLeft = (s, id, d) => { const set = portionsSet(s, id, d); return set == null ? null : Math.max(set - portionsBooked(s, id, d), 0); };
  function checkDate(s, d) {
    const st = s.settings;
    if (!d) return err('missing_date', 'Please choose a date');
    if (d < earliestDate(st)) return err('too_soon', 'The earliest date we can cook for is ' + fmtDate(earliestDate(st)), { earliest_date: earliestDate(st) });
    if (d > addDays(todayISO(), Number(st.max_days_ahead || 30))) return err('too_far', `We take orders up to ${st.max_days_ahead} days ahead. For events further out, send a catering request.`);
    if ((st.closed_dates || []).includes(d)) return err('closed', `The kitchen is closed on ${fmtDate(d)}. Please pick another date.`);
    if (ordersOn(s, d) >= Number(st.max_orders_per_day || 999)) return err('fully_booked', `${fmtDate(d)} is fully booked. Please pick another date.`);
    return { ok: true, date: d, time_slots: st.time_slots, places_left: Number(st.max_orders_per_day) - ordersOn(s, d) };
  }
  function demoMarkPaid(code) {
    const s = demo(); const o = s.orders.find(x => x.code === code); if (!o) return null;
    if (o.payment_status === 'paid') return o;
    if (o.status === 'cancelled') { o.payment_status = 'paid'; o.needs_attention = 'Paid AFTER the order was released. Reinstate it (set status to Confirmed) or refund in Bachs.'; }
    else { o.status = 'confirmed'; o.payment_status = 'paid'; o.needs_attention = null; }
    o.amount_paid = o.total; o.paid_at = new Date().toISOString(); saveDemo(); return o;
  }
  function demoExpire() {
    const s = demo(); const limit = Date.now() - (Number(s.settings.payment_minutes || 30) + 15) * 60000; let n = 0;
    s.orders.forEach(o => { if (o.status === 'awaiting_payment' && o.payment_status === 'pending' && new Date(o.created_at) < limit) { o.status = 'cancelled'; o.payment_status = 'expired'; n++; } });
    if (n) saveDemo();
  }
  const statusRow = (s, o) => ({ code: o.code, status: o.status, payment_status: o.payment_status, fulfilment: o.fulfilment, date: o.fulfil_date, date_label: fmtDate(o.fulfil_date), time_slot: o.time_slot, total: o.total,
    checkout_url: o.status === 'awaiting_payment' ? o.bachs_checkout_url : null,
    items: s.order_items.filter(i => i.order_id === o.id).map(i => ({ name: i.item_name, option: i.option_name, quantity: i.quantity })) });

  const DEMO_API = {
    menu({ date } = {}) {
      const s = demo();
      const ed = earliestDate(s.settings);
      const d = date && date >= ed ? date : ed;
      return {
        ok: true,
        earliest_date: ed,
        date: d,
        date_label: fmtDate(d),
        time_slots: s.settings.time_slots,
        delivery_zones: s.settings.delivery_zones,
        pickup_address: s.settings.business.pickup_address,
        services: s.settings.services,
        items: s.menu_items.filter(m => m.is_active).map(m => {
          const pl = portionsLeft(s, m.id, d);
          return {
            ...m,
            menu_item_id: m.id,
            options: optionsFor(s, m.id),
            portions_left: pl,
            special: !!m.date_only,
            orderable_online: ((optionsFor(s, m.id).length > 0) || m.price != null) && pl !== 0
          };
        })
      };
    },
    place_order(p, quiet) {
      const s = demo(); const st = s.settings; const cu = p.customer || {};
      const name = String(cu.name || '').trim(), phone = String(cu.phone || '').trim(), email = String(cu.email || '').trim().toLowerCase();
      if (!name || digits(phone).length < 10) return err('missing_customer', 'Please give your name and a valid phone number (e.g. 0905 286 2612)');
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err('invalid_email', 'That email address does not look right');
      if (!['delivery', 'pickup'].includes(p.fulfilment)) return err('invalid_fulfilment', 'Choose delivery or pickup');
      let zone = null, fee = 0;
      if (p.fulfilment === 'delivery') {
        zone = (st.delivery_zones || []).find(z => z.id === p.delivery_zone); if (!zone) return err('invalid_zone', 'Please choose your delivery area');
        if (!String(p.address || '').trim()) return err('missing_address', 'A delivery address is required'); fee = Number(zone.fee || 0);
      }
      const dc = checkDate(s, p.date); if (!dc.ok) return dc;
      if (!(st.time_slots || []).includes(p.time_slot)) return err('invalid_time_slot', 'Please choose one of these times: ' + st.time_slots.join(', '));
      if (!Array.isArray(p.items) || !p.items.length) return err('empty_order', 'Your order has no items');
      const lines = [];
      for (const l of p.items) {
        const m = s.menu_items.find(x => l.menu_item_id ? x.id === Number(l.menu_item_id) : x.name.toLowerCase() === String(l.name || '').trim().toLowerCase());
        if (!m || !m.is_active) return err('unknown_item', 'This item is not on the menu right now: ' + (l.name || l.menu_item_id));
        const q = Number(l.quantity || 1); if (!Number.isInteger(q) || q < 1 || q > 50) return err('invalid_quantity', `Quantity for ${m.name} must be between 1 and 50`);
        const opts = optionsFor(s, m.id); let opt = null, unit;
        if (opts.length) {
          opt = opts.find(o => (l.option_id && o.id === Number(l.option_id)) || (l.option_name && o.option_name.toLowerCase() === String(l.option_name).trim().toLowerCase()));
          if (!opt && opts.length === 1) {
            opt = opts[0];
          } else if (!opt && l.unit_price) {
            opt = opts.find(o => Number(o.price) === Number(l.unit_price)) || opts[0];
          } else if (!opt) {
            opt = opts[0];
          }
          unit = Number(opt.price);
        } else {
          if (m.price == null) return err('price_on_request', `${m.name} is priced on request. Please send a catering request or WhatsApp us for a quote.`);
          unit = Number(m.price);
        }
        lines.push({ menu_item_id: m.id, option_id: opt?.id || null, name: m.name, option: opt?.option_name || null, quantity: q, unit_price: unit, line_total: unit * q });
      }
      const want = {}; lines.forEach(l => { want[l.menu_item_id] = (want[l.menu_item_id] || 0) + l.quantity; });
      for (const [id, q] of Object.entries(want)) {
        const left = portionsLeft(s, Number(id), p.date); const nm = s.menu_items.find(m => m.id === Number(id)).name;
        if (left != null && left < q) {
          const hasRow = (s.dish_date_portions || []).some(r => r.menu_item_id === Number(id) && r.avail_date === p.date);
          return left === 0 ? err('sold_out', `${nm} is ${hasRow ? 'sold out' : 'not on the menu'} for ${fmtDate(p.date)}. Please choose another day.`) : err('not_enough_left', `Only ${left} of ${nm} left for ${fmtDate(p.date)}.`);
        }
      }
      const sub = lines.reduce((a, l) => a + l.line_total, 0);
      const o = { id: nextId('orders'), code: newCode(), customer_name: name, phone, email: email || null, fulfilment: p.fulfilment, delivery_zone: zone?.name || null, address: String(p.address || '').trim() || null, landmark: String(p.landmark || '').trim() || null,
        fulfil_date: p.date, time_slot: p.time_slot, notes: String(p.notes || '').trim() || null, subtotal: sub, delivery_fee: fee, total: sub + fee, status: 'awaiting_payment', payment_status: 'pending', payment_method: 'bachs',
        amount_paid: 0, paid_at: null, bachs_checkout_id: null, bachs_checkout_url: null, needs_attention: null, channel: p.channel || 'website', created_at: new Date().toISOString() };
      o.bachs_checkout_id = 'chk_demo_' + o.id; o.bachs_checkout_url = `pay.html?code=${o.code}&demo_checkout=1`;
      s.orders.push(o);
      lines.forEach(l => s.order_items.push({ id: nextId('order_items'), order_id: o.id, menu_item_id: l.menu_item_id, option_id: l.option_id, item_name: l.name, option_name: l.option, quantity: l.quantity, unit_price: l.unit_price }));
      if (!quiet) saveDemo();
      return { ok: true, order_id: o.id, code: o.code, status: o.status, customer: { name, phone, email }, fulfilment: o.fulfilment, delivery_zone: o.delivery_zone, address: o.address, date: o.fulfil_date, date_label: fmtDate(o.fulfil_date), time_slot: o.time_slot, items: lines, subtotal: sub, delivery_fee: fee, total: sub + fee, currency: 'NGN', payment_minutes: st.payment_minutes, checkout_url: o.bachs_checkout_url };
    },
    order_status({ code, phone }) {
      demoExpire(); const s = demo();
      if (!String(code || '').trim() && digits(phone).length < 10) return err('missing_input', 'Enter your order code (e.g. ESC-7K3P9Q) or the phone number you ordered with');
      const c = String(code || '').trim().toUpperCase();
      const rows = s.orders.filter(o => c ? o.code === c : (phoneKey(o.phone) === phoneKey(phone) && Date.now() - new Date(o.created_at) < 14 * 864e5)).sort((a, b) => b.id - a.id);
      if (!rows.length) return err('not_found', 'We could not find that order. Check the code, or WhatsApp us.');
      return { ok: true, orders: rows.map(o => statusRow(s, o)) };
    },
    check_payment({ code }) { return DEMO_API.order_status({ code }); },
    catering(p) {
      const s = demo();
      if (!String(p.name || '').trim() || digits(p.phone).length < 10) return err('missing_customer', 'Please give your name and a valid phone number');
      if (p.event_date && p.event_date < todayISO()) return err('invalid_date', 'The event date is in the past');
      const r = { id: nextId('catering_requests'), name: p.name.trim(), phone: p.phone.trim(), email: p.email || null, event_type: p.event_type || null, event_date: p.event_date || null, guests: Number(digits(p.guests)) || null, location: p.location || null, budget: p.budget || null, service: p.service || null, details: p.details || null, status: 'new', quote_amount: null, ai_summary: '(Demo mode: in the live system Claude writes a short brief here for the owner.)', created_at: new Date().toISOString() };
      s.catering_requests.push(r); saveDemo();
      return { ok: true, request_id: r.id, event_date_label: r.event_date ? fmtDate(r.event_date, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : null };
    },
  };

  // ---------------------------------------------------------------- live clients
  let sb = null;
  function supa() { if (DEMO) return null; if (!sb) sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true } }); return sb; }
  async function call(endpoint, body) {
    if (DEMO) { await new Promise(r => setTimeout(r, 350)); return DEMO_API[endpoint](JSON.parse(JSON.stringify(body || {}))); }
    try {
      const res = await fetch(`${C.N8N_WEBHOOK_BASE}/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-esca-token': C.ESCA_TOKEN, 'ngrok-skip-browser-warning': '1' }, body: JSON.stringify(body || {}) });
      const txt = await res.text();
      try { return JSON.parse(txt); } catch (e) { return err('bad_response', `Our ordering service returned an unexpected response (${res.status}). Please try again, or WhatsApp us on ${B.PHONE}.`); }
    } catch (e) { return err('network', `We could not reach our ordering service. Check your connection, or WhatsApp us on ${B.PHONE}.`); }
  }

  async function getSettings() {
    if (DEMO) return demo().settings;
    const { data, error } = await supa().from('settings').select('key,value'); if (error) throw error;
    return Object.fromEntries(data.map(r => [r.key, r.value]));
  }
  const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const ALL_FULFILMENT = ['delivery', 'pickup'];
  function normDish(m, opts) {
    return {
      ...m,
      options: opts || [],
      available_days: Array.isArray(m.available_days) && m.available_days.length ? m.available_days : ALL_DAYS,
      fulfilment_types: Array.isArray(m.fulfilment_types) && m.fulfilment_types.length ? m.fulfilment_types : ALL_FULFILMENT
    };
  }
  async function getMenu(includeInactive) {
    if (DEMO) { const s = demo(); return s.menu_items.filter(m => includeInactive || m.is_active).map(m => normDish(m, optionsFor(s, m.id))).sort((a, b) => a.category.localeCompare(b.category) || a.sort_order - b.sort_order || a.id - b.id); }
    let q = supa().from('menu_items').select('*, menu_item_options(*)').order('category').order('sort_order').order('id');
    if (!includeInactive) q = q.eq('is_active', true);
    const { data, error } = await q; if (error) throw error;
    return data.map(m => normDish(m, (m.menu_item_options || []).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)));
  }
  async function getDayMenu(date) {
    if (DEMO) return DEMO_API.menu({ date });
    const { data, error } = await supa().rpc('get_menu', { p_date: date || null });
    if (error) throw error;
    if (data && Array.isArray(data.items)) {
      data.items = data.items.map(m => ({
        ...m,
        id: m.menu_item_id || m.id,
        menu_item_id: m.menu_item_id || m.id,
        options: (m.options || []).map(o => ({
          ...o,
          id: o.option_id || o.id,
          option_id: o.option_id || o.id
        }))
      }));
    }
    return data;
  }
  function onChange(table, cb) {
    if (DEMO) { window.addEventListener('storage', e => { if (e.key === KEY) { reloadDemo(); cb(); } }); return; }
    supa().channel('rt-' + table + Math.random()).on('postgres_changes', { event: '*', schema: 'public', table }, () => cb()).subscribe();
  }

  // ---------------------------------------------------------------- Ask Esca chat
  async function chat(sessionId, text) {
    if (DEMO || !C.CHAT_WEBHOOK_URL || C.CHAT_WEBHOOK_URL.includes('REPLACE')) return demoChat(text);
    const res = await fetch(C.CHAT_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'sendMessage', sessionId, chatInput: text }) });
    const j = await res.json().catch(() => ({}));
    return (Array.isArray(j) ? j[0]?.output : j.output) || j.text || 'Sorry, I had trouble answering. Please try again, or WhatsApp us.';
  }
  async function demoChat(text) {
    await new Promise(r => setTimeout(r, 450)); const t = text.toLowerCase(); const s = demo(); const st = s.settings;
    if (/snail/.test(t)) return 'Our peppered snail comes in packs of 25 pieces (₦16,000), 50 pieces (₦32,000) and 100 pieces (₦64,000). Add it on the Menu page and choose your date.';
    if (/wrap|healthy|salad|smoothie|juice/.test(t)) return 'Our chicken wrap is ₦7,000, or ₦9,500 with Chapman. Beef and turkey wraps, salads, smoothies and fresh fruit juice are available on the Menu page.';
    if (/deliver|zone|area|fee/.test(t)) return 'We deliver locally:\n' + st.delivery_zones.map(z => `• ${z.name}: ${money(z.fee)}`).join('\n') + `\n\nOr pick up at ${B.ADDRESS}.`;
    if (/when|today|tomorrow|date|time|slot/.test(t)) return `Everything is cooked fresh to order. The earliest date you can order for is ${fmtDate(earliestDate(st))}, in these time slots: ${st.time_slots.join(', ')}.`;
    if (/pay|bank|card|transfer/.test(t)) return 'You pay online through a secure payment page, by card or bank transfer. We start cooking once payment is confirmed.';
    if (/cater|party|event|wedding|tray|birthday/.test(t)) return 'We cater parties, weddings and office events with food trays, small chops and platters. Send the details on the Catering page and Mamoke will reply with a quote.';
    if (/where|address|location|contact|phone|whatsapp/.test(t)) return `We are on ${B.ADDRESS}. WhatsApp or call ${B.PHONE}. Instagram & TikTok: @${B.INSTAGRAM}.`;
    if (/order|status|track/.test(t)) return 'You can track an order on the Track page with your order code (ESC-...) or your phone number.';
    return `Hi! I am Ask Mamz. Ask me about our peppered snail, food bowls, wraps, delivery areas, dates, or catering quotes.`;
  }

  // ---------------------------------------------------------------- staff dashboard
  const admin = {
    async signIn(email, password) {
      if (DEMO) { const u = demo().users.find(x => x.email === email.trim().toLowerCase() && x.password === password); if (!u) return { ok: false, error: 'Wrong email or password.' }; store.set('esca_demo_session', u.id); return { ok: true }; }
      const { error } = await supa().auth.signInWithPassword({ email, password }); return error ? { ok: false, error: error.message } : { ok: true };
    },
    async signUp(email, password, full_name) {
      if (DEMO) { const s = demo(); email = email.trim().toLowerCase(); if (s.users.some(u => u.email === email)) return { ok: false, error: 'That email is already registered.' }; const id = 'u' + Date.now(); s.users.push({ id, email, password }); s.profiles.push({ id, email, full_name, role: 'pending', created_at: new Date().toISOString() }); saveDemo(); return { ok: true }; }
      const { error } = await supa().auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo: location.href } }); return error ? { ok: false, error: error.message } : { ok: true, confirm: true };
    },
    async signOut() { if (DEMO) { store.del('esca_demo_session'); return; } await supa().auth.signOut(); },
    async current() {
      if (DEMO) { const id = store.get('esca_demo_session', null); const p = id && demo().profiles.find(x => x.id === id); return p ? { user: { id, email: p.email }, profile: p } : null; }
      const { data } = await supa().auth.getSession(); if (!data.session) return null;
      const { data: prof } = await supa().from('profiles').select('*').eq('id', data.session.user.id).maybeSingle();
      return { user: data.session.user, profile: prof };
    },
    async orders(fromDate, toDate) {
      if (DEMO) { demoExpire(); const s = demo(); return s.orders.filter(o => o.fulfil_date >= fromDate && o.fulfil_date <= toDate).map(o => ({ ...o, order_items: s.order_items.filter(i => i.order_id === o.id) })); }
      const { data, error } = await supa().from('orders').select('*, order_items(*)').gte('fulfil_date', fromDate).lte('fulfil_date', toDate).order('time_slot').order('id'); if (error) throw error; return data;
    },
    async attention() {
      if (DEMO) return demo().orders.filter(o => o.needs_attention && o.status !== 'completed');
      const { data, error } = await supa().from('orders').select('*, order_items(*)').not('needs_attention', 'is', null).neq('status', 'completed'); if (error) throw error; return data;
    },
    async update(table, id, patch) {
      if (DEMO) { const r = demo()[table].find(x => x.id === id); Object.assign(r, patch); saveDemo(); return r; }
      const { data, error } = await supa().from(table).update(patch).eq('id', id).select().single(); if (error) throw error; return data;
    },
    async insert(table, row) {
      if (DEMO) { const r = { id: nextId(table), created_at: new Date().toISOString(), ...row }; demo()[table].push(r); saveDemo(); return r; }
      const { data, error } = await supa().from(table).insert(row).select().single(); if (error) throw error; return data;
    },
    async remove(table, id) {
      if (DEMO) { const s = demo(); s[table] = s[table].filter(x => x.id !== id); saveDemo(); return; }
      const { error } = await supa().from(table).delete().eq('id', id); if (error) throw error;
    },
    async list(table, order = 'id') {
      if (DEMO) return [...demo()[table]].sort((a, b) => (b[order] > a[order] ? 1 : -1));
      const { data, error } = await supa().from(table).select('*').order(order, { ascending: false }); if (error) throw error; return data;
    },
    async setSetting(key, value) {
      if (DEMO) { demo().settings[key] = value; saveDemo(); return; }
      const { error } = await supa().from('settings').update({ value }).eq('key', key); if (error) throw error;
    },
    async allSettings() {
      if (DEMO) return demo().settings;
      const { data, error } = await supa().from('settings').select('key,value'); if (error) throw error; return Object.fromEntries(data.map(r => [r.key, r.value]));
    },
    async saveAllSettings(settingsObj) {
      if (DEMO) {
        const s = demo();
        Object.assign(s.settings, settingsObj);
        saveDemo();
        return;
      }
      for (const [k, v] of Object.entries(settingsObj)) {
        await admin.setSetting(k, v);
      }
    },
    async pantryList() {
      if (DEMO) {
        const s = demo();
        if (!Array.isArray(s.pantry_items)) {
          s.pantry_items = JSON.parse(JSON.stringify(INITIAL_PANTRY));
          saveDemo();
        }
        return s.pantry_items;
      }
      try {
        const { data, error } = await supa().from('pantry_items').select('*').order('category').order('name');
        if (!error && data) return data;
      } catch (e) {}
      const s = await admin.allSettings();
      return s.pantry_items || [];
    },
    async savePantryItem(item) {
      if (DEMO) {
        const s = demo();
        s.pantry_items = s.pantry_items || [];
        if (item.id) {
          const idx = s.pantry_items.findIndex(x => x.id === Number(item.id));
          if (idx !== -1) s.pantry_items[idx] = { ...s.pantry_items[idx], ...item };
          else s.pantry_items.push(item);
        } else {
          item.id = Date.now();
          item.is_bought = false;
          s.pantry_items.push(item);
        }
        saveDemo();
        return item;
      }
      try {
        const { data, error } = await supa().from('pantry_items').upsert(item).select().single();
        if (!error && data) return data;
      } catch (e) {}
      const s = await admin.allSettings();
      const list = s.pantry_items || [];
      const idx = list.findIndex(x => x.id === item.id);
      if (idx !== -1) list[idx] = { ...list[idx], ...item };
      else { item.id = item.id || Date.now(); list.push(item); }
      await admin.setSetting('pantry_items', list);
      return item;
    },
    async deletePantryItem(id) {
      if (DEMO) {
        const s = demo();
        s.pantry_items = (s.pantry_items || []).filter(x => x.id !== Number(id));
        saveDemo();
        return;
      }
      try {
        await supa().from('pantry_items').delete().eq('id', id);
      } catch (e) {}
      const s = await admin.allSettings();
      const list = (s.pantry_items || []).filter(x => x.id !== Number(id));
      await admin.setSetting('pantry_items', list);
    },
    async togglePantryBought(id, is_bought) {
      if (DEMO) {
        const s = demo();
        const item = (s.pantry_items || []).find(x => x.id === Number(id));
        if (item) {
          item.is_bought = is_bought !== undefined ? is_bought : !item.is_bought;
          saveDemo();
        }
        return;
      }
      try {
        await supa().from('pantry_items').update({ is_bought }).eq('id', id);
      } catch (e) {}
    },
    async resetPantryChecklist() {
      if (DEMO) {
        const s = demo();
        (s.pantry_items || []).forEach(x => { x.is_bought = false; });
        saveDemo();
        return;
      }
      try {
        await supa().from('pantry_items').update({ is_bought: false }).neq('id', 0);
      } catch (e) {}
    },
    async upload(file) {
      if (!file) return null;
      // Client-side auto-resizing: shrinks 15MB+ phone photos to ~70KB in milliseconds so phone never hangs
      const compress = (f) => new Promise((resolve) => {
        try {
          if (!f.type.startsWith('image/')) return resolve(null);
          const img = new Image();
          const objectUrl = URL.createObjectURL(f);
          img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const max = 900;
            let w = img.width, h = img.height;
            if (w > max || h > max) {
              if (w > h) { h = Math.round((h * max) / w); w = max; }
              else { w = Math.round((w * max) / h); h = max; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          };
          img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.readAsDataURL(f);
          };
          img.src = objectUrl;
        } catch (e) {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.readAsDataURL(f);
        }
      });

      if (DEMO) {
        return await compress(file);
      }
      const compressedDataUrl = await compress(file);
      let uploadPayload = file;
      if (compressedDataUrl && compressedDataUrl.startsWith('data:image/jpeg')) {
        const bin = atob(compressedDataUrl.split(',')[1]);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        uploadPayload = new Blob([arr], { type: 'image/jpeg' });
      }
      const path = Date.now() + '-' + file.name.replace(/[^a-z0-9.]+/gi, '-').toLowerCase().replace(/\.[^.]+$/, '') + '.jpg';
      const { error } = await supa().storage.from('menu-images').upload(path, uploadPayload, { contentType: 'image/jpeg' });
      if (error) throw error;
      return supa().storage.from('menu-images').getPublicUrl(path).data.publicUrl;
    },
    async profiles() { return admin.list('profiles', 'created_at'); },
    // portions set for one date: [{ menu_item_id, portions, avail_date }]
    async portions(date) {
      if (DEMO) return (demo().dish_date_portions || []).filter(r => !date || r.avail_date === date);
      let q = supa().from('dish_date_portions').select('menu_item_id, portions, avail_date');
      if (date) q = q.eq('avail_date', date);
      const { data, error } = await q; if (error) throw error; return data;
    },
    async setPortions(menu_item_id, date, portions) {   // portions null = no limit (removes the number)
      if (DEMO) { const s = demo(); s.dish_date_portions = (s.dish_date_portions || []).filter(r => !(r.menu_item_id === menu_item_id && r.avail_date === date)); if (portions != null) s.dish_date_portions.push({ menu_item_id, avail_date: date, portions }); saveDemo(); return; }
      if (portions == null) { const { error } = await supa().from('dish_date_portions').delete().eq('menu_item_id', menu_item_id).eq('avail_date', date); if (error) throw error; return; }
      const { error } = await supa().from('dish_date_portions').upsert({ menu_item_id, avail_date: date, portions }); if (error) throw error;
    },
    async saveDish(dishData, optionsList) {
      if (DEMO) {
        const s = demo();
        let dish;
        if (dishData.id) {
          dish = s.menu_items.find(x => x.id === Number(dishData.id));
          if (!dish) throw new Error('Dish not found');
          Object.assign(dish, dishData);
        } else {
          dish = { id: nextId('menu_items'), is_active: true, sort_order: (s.menu_items.length + 1) * 10, ...dishData };
          s.menu_items.push(dish);
        }
        if (Array.isArray(optionsList)) {
          s.menu_item_options = (s.menu_item_options || []).filter(o => o.menu_item_id !== dish.id);
          optionsList.forEach((opt, idx) => {
            s.menu_item_options.push({
              id: nextId('menu_item_options'),
              menu_item_id: dish.id,
              group_name: opt.group_name || 'Size',
              option_name: opt.option_name,
              price: Number(opt.price) || 0,
              sort_order: (idx + 1) * 10
            });
          });
        }
        saveDemo();
        return dish;
      }
      let dish;
      if (dishData.id) {
        const { data, error } = await supa().from('menu_items').update(dishData).eq('id', dishData.id).select().single();
        if (error) throw error;
        dish = data;
      } else {
        const { data, error } = await supa().from('menu_items').insert(dishData).select().single();
        if (error) throw error;
        dish = data;
      }
      if (Array.isArray(optionsList)) {
        await supa().from('menu_item_options').delete().eq('menu_item_id', dish.id);
        if (optionsList.length) {
          const rows = optionsList.map((opt, idx) => ({
            menu_item_id: dish.id,
            group_name: opt.group_name || 'Size',
            option_name: opt.option_name,
            price: Number(opt.price) || 0,
            sort_order: (idx + 1) * 10
          }));
          const { error: optErr } = await supa().from('menu_item_options').insert(rows);
          if (optErr) throw optErr;
        }
      }
      return dish;
    },
    async deleteDish(id) {
      if (DEMO) {
        const s = demo();
        s.menu_items = (s.menu_items || []).filter(x => x.id !== Number(id));
        s.menu_item_options = (s.menu_item_options || []).filter(x => x.menu_item_id !== Number(id));
        saveDemo();
        return;
      }
      await supa().from('menu_item_options').delete().eq('menu_item_id', id);
      const { error } = await supa().from('menu_items').delete().eq('id', id);
      if (error) throw error;
    },
    resetDemo() { store.del(KEY); demoCache = null; demo(); },
  };

  window.ESCA = { DEMO, C, B, TZ, esc, money, todayISO, addDays, fmtDate, fmtDateTime, digits, waLink, store, earliestDate,
    getSettings, getMenu, getDayMenu, onChange, call, chat, admin, demoPay: code => demoMarkPaid(code), demoCancel: code => { const s = demo(); const o = s.orders.find(x => x.code === code); if (o && o.status === 'awaiting_payment') { o.status = 'cancelled'; o.payment_status = 'expired'; saveDemo(); } } };
})();
