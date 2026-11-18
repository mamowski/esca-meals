/* Mamoke's Kitchen Pass (Staff Only) */
(function () {
  const { esc, money, admin: A, fmtDate, todayISO, addDays } = ESCA;
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const app = $('#app');

  let CUR = null;
  let tab = ESCA.store.get('esca_admin_tab', 'overview');
  let day = todayISO();

  const NICE_STATUS = {
    awaiting_payment: 'Awaiting payment',
    confirmed: 'Paid · To cook',
    preparing: 'Cooking',
    ready: 'Ready for pickup',
    out_for_delivery: 'Out for delivery',
    completed: 'Delivered',
    cancelled: 'Cancelled'
  };

  const NEXT_STATUS = {
    confirmed: ['preparing', 'Start cooking'],
    preparing: [null, null],
    ready: ['completed', 'Mark collected'],
    out_for_delivery: ['completed', 'Mark delivered']
  };

  // ---------------------------------------------------------------- SVG Icons (Zero Emojis)
  const ICONS = {
    overview: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1"></rect><rect x="14" y="3" width="7" height="5" rx="1"></rect><rect x="14" y="12" width="7" height="9" rx="1"></rect><rect x="3" y="16" width="7" height="5" rx="1"></rect></svg>`,
    orders: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>`,
    // Food Hot Plate with Cloche Dome Cover (Requested: hot plate instead of cup)
    menu: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v2"></path><path d="M4 18h16"></path><path d="M4 18a8 8 0 0 1 16 0"></path><line x1="2" y1="21" x2="22" y2="21"></line></svg>`,
    // Kitchen Cooking Pot with Handles & Lid for Stock & Portions (Requested: cooking pot instead of box)
    portions: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-7z"></path><path d="M6 7h12"></path><path d="M10 4h4"></path><path d="M1 13h2"></path><path d="M21 13h2"></path></svg>`,
    catering: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    feedback: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    settings: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>`,
    team: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    edit: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    plus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    trash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
    pantry: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
    copy: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`
  };

  const toast = msg => {
    let t = $('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2200);
  };

  const guard = async fn => {
    try {
      return await fn();
    } catch (e) {
      toast('Error: ' + (e.message || e));
      console.error(e);
      return null;
    }
  };

  const wa = (phone, text) =>
    `https://wa.me/234${String(phone || '').replace(/\D/g, '').slice(-10)}${text ? '?text=' + encodeURIComponent(text) : ''}`;

  // ---------------------------------------------------------------- Start & Auth
  async function start() {
    initSidebarControls();
    initModalControls();

    CUR = await A.current();
    const P = CUR?.profile;

    if (!CUR) return loginView();

    $('#side-user-name').textContent = P?.full_name || CUR.user.email;
    $('#side-user-role').textContent = P?.role === 'admin' ? 'Kitchen Lead' : 'Staff Member';
    $('#side-user-avatar').textContent = (P?.full_name || CUR.user.email || 'S').charAt(0).toUpperCase();

    $('#side-signout-btn').onclick = async () => {
      await A.signOut();
      location.reload();
    };

    if (!P || !['staff', 'admin'].includes(P.role)) {
      app.innerHTML = `
        <div class="panel stack" style="max-width:540px; margin:40px auto;">
          <h2>Staff Account Pending Approval</h2>
          <p class="muted">Your staff account (<b>${esc(CUR.user.email)}</b>) is waiting for Mamoke to approve it under <b>Team</b>.</p>
          <button class="btn btn-ghost btn-sm" id="btn-recheck" type="button" style="align-self:flex-start;">Check again</button>
        </div>`;
      $('#btn-recheck').onclick = () => location.reload();
      return;
    }

    buildNav();
    updateHorizonDate();
    refreshHorizonTicker();
    render();

    ESCA.onChange('orders', () => {
      refreshHorizonTicker();
      if (tab === 'orders' || tab === 'overview') render();
    });
    ESCA.onChange('catering_requests', () => {
      refreshBadgeCounts();
      if (tab === 'catering' || tab === 'overview') render();
    });
  }

  function loginView() {
    app.innerHTML = `
      <div class="login stack" style="max-width:440px; margin:40px auto; padding:24px; background:#fff; border-radius:16px; border:1px solid var(--canvas-border);">
        <h1 style="font-size:1.6rem; font-weight:700; margin:0;">Kitchen Pass</h1>
        <p class="muted small" style="margin:4px 0 16px;">Sign in to access orders, menu studio, and batch portion limits.</p>
        ${ESCA.DEMO ? '<div class="notice warn small" style="margin-bottom:14px;">Demo credentials: <b style="user-select:all;">owner@escameals.demo</b> / <b style="user-select:all;">EscaDemo123</b></div>' : ''}
        <form class="stack" id="login">
          <div class="field"><label for="l-email">Email</label><input id="l-email" type="email" autocomplete="username" value="${ESCA.DEMO ? 'owner@escameals.demo' : ''}"></div>
          <div class="field"><label for="l-pass">Password</label><input id="l-pass" type="password" autocomplete="current-password" value="${ESCA.DEMO ? 'EscaDemo123' : ''}"></div>
          <div id="l-msg"></div>
          <button class="btn btn-primary" type="submit" style="margin-top:6px;">Sign in to Kitchen</button>
        </form>
        <details style="margin-top:14px;"><summary class="small muted" style="cursor:pointer;">New kitchen staff? Register</summary>
          <form class="stack" id="reg" style="margin-top:12px">
            <div class="field"><label for="r-name">Full name</label><input id="r-name" autocomplete="name"></div>
            <div class="field"><label for="r-email">Email</label><input id="r-email" type="email"></div>
            <div class="field"><label for="r-pass">Password (8+ characters)</label><input id="r-pass" type="password" minlength="8" autocomplete="new-password"></div>
            <div id="r-msg"></div>
            <button class="btn btn-ghost" type="submit">Submit for Approval</button>
          </form>
        </details>
      </div>`;

    $('#login').onsubmit = async e => {
      e.preventDefault();
      const r = await A.signIn($('#l-email').value, $('#l-pass').value);
      if (!r.ok) $('#l-msg').innerHTML = `<div class="notice err" style="margin-top:10px;">${esc(r.error)}</div>`;
      else start();
    };

    $('#reg').onsubmit = async e => {
      e.preventDefault();
      if ($('#r-pass').value.length < 8) {
        $('#r-msg').innerHTML = '<div class="notice err">Use at least 8 characters.</div>';
        return;
      }
      const r = await A.signUp($('#r-email').value, $('#r-pass').value, $('#r-name').value);
      $('#r-msg').innerHTML = r.ok
        ? `<div class="notice ok">Registered. Ask Mamoke to approve your account under Team.</div>`
        : `<div class="notice err">${esc(r.error)}</div>`;
    };
  }

  // ---------------------------------------------------------------- n8n Style Sidebar Retract/Expand Logic
  function initSidebarControls() {
    const sidebar = $('#sidebar');
    const toggleInside = $('#sidebar-toggle');
    const toggleTopbar = $('#topbar-sidebar-toggle');
    const backdrop = $('#sidebar-backdrop');

    // Restore desktop collapsed state
    const saved = localStorage.getItem('esca_admin_sidebar_collapsed');
    if (saved === '1') {
      sidebar.classList.add('collapsed');
    }

    const toggleSidebar = () => {
      const isMobile = window.innerWidth <= 900;
      if (isMobile) {
        const isOpen = sidebar.classList.contains('mobile-open');
        sidebar.classList.toggle('mobile-open', !isOpen);
        backdrop.classList.toggle('active', !isOpen);
      } else {
        sidebar.classList.toggle('collapsed');
        const isCol = sidebar.classList.contains('collapsed');
        localStorage.setItem('esca_admin_sidebar_collapsed', isCol ? '1' : '0');
      }
    };

    if (toggleInside) {
      toggleInside.onclick = e => {
        e.stopPropagation();
        toggleSidebar();
      };
    }

    if (toggleTopbar) {
      toggleTopbar.onclick = e => {
        e.stopPropagation();
        toggleSidebar();
      };
    }

    backdrop.onclick = () => {
      sidebar.classList.remove('mobile-open');
      backdrop.classList.remove('active');
    };
  }

  // ---------------------------------------------------------------- Navigation Builder
  const TABS = [
    ['overview', 'Overview', ICONS.overview],
    ['orders', 'Kitchen orders', ICONS.orders],
    ['menu', 'Menu', ICONS.menu],
    ['pantry', 'Pantry & Market list', ICONS.pantry],
    ['portions', 'Stock & portions', ICONS.portions],
    ['catering', 'Catering', ICONS.catering],
    ['feedback', 'Feedback', ICONS.feedback],
    ['settings', 'Settings', ICONS.settings],
    ['team', 'Team', ICONS.team]
  ];

  function buildNav() {
    const nav = $('#side-nav-links');
    nav.innerHTML = TABS.map(([k, label, icon]) => `
      <button class="side-nav-item ${k === tab ? 'active' : ''}" type="button" data-nav="${k}" title="${label}">
        <span class="side-nav-icon">${icon}</span>
        <span class="side-nav-label">${label}</span>
        <span class="side-nav-badge hidden" data-count="${k}"></span>
      </button>
    `).join('');

    $$('[data-nav]').forEach(btn => {
      btn.onclick = () => {
        tab = btn.dataset.nav;
        ESCA.store.set('esca_admin_tab', tab);
        $$('[data-nav]').forEach(b => b.classList.toggle('active', b === btn));
        $('#sidebar').classList.remove('mobile-open');
        $('#sidebar-backdrop').classList.remove('active');
        render();
      };
    });

    refreshBadgeCounts();
  }

  async function refreshBadgeCounts() {
    guard(async () => {
      const c = (await A.list('catering_requests')).filter(r => r.status === 'new').length;
      const el = $('[data-count="catering"]');
      if (el) {
        el.textContent = c;
        el.classList.toggle('hidden', !c);
      }
    });
  }

  // ---------------------------------------------------------------- Horizon Pulse Ticker
  function updateHorizonDate() {
    const el = $('#horizon-date');
    if (!el) return;
    const now = new Date();
    const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    el.textContent = now.toLocaleDateString('en-GB', opts);
  }

  async function refreshHorizonTicker() {
    guard(async () => {
      const today = todayISO();
      const orders = await A.orders(today, today);
      const paidOrders = orders.filter(o => !['awaiting_payment', 'cancelled'].includes(o.status));
      const revenue = paidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
      const deliveries = paidOrders.filter(o => o.fulfilment === 'delivery').length;
      const pickups = paidOrders.filter(o => o.fulfilment === 'pickup').length;

      // Desktop ticker
      if ($('#stat-orders-today')) $('#stat-orders-today').textContent = paidOrders.length;
      if ($('#stat-revenue-today')) $('#stat-revenue-today').textContent = money(revenue);
      if ($('#stat-deliveries-today')) $('#stat-deliveries-today').textContent = deliveries;
      if ($('#stat-pickups-today')) $('#stat-pickups-today').textContent = pickups;

      // Mobile metric strip for Mamoke's phone
      if ($('#m-stat-orders')) $('#m-stat-orders').textContent = paidOrders.length;
      if ($('#m-stat-revenue')) $('#m-stat-revenue').textContent = money(revenue);
      if ($('#m-stat-deliveries')) $('#m-stat-deliveries').textContent = deliveries;
      if ($('#m-stat-pickups')) $('#m-stat-pickups').textContent = pickups;
    });
  }

  // ---------------------------------------------------------------- Router / View Dispatcher
  async function render() {
    const v = $('#app');
    if (!v) return;

    const titles = {
      overview: 'Overview',
      orders: 'Kitchen orders',
      menu: 'Menu',
      pantry: 'Pantry & Market list',
      portions: 'Stock & portions',
      catering: 'Catering',
      feedback: 'Feedback',
      settings: 'Settings',
      team: 'Team'
    };

    if ($('#horizon-heading')) {
      $('#horizon-heading').textContent = titles[tab] || 'Kitchen orders';
    }

    const views = {
      overview: overviewView,
      orders: ordersView,
      menu: menuView,
      pantry: pantryView,
      portions: portionsView,
      catering: cateringView,
      feedback: feedbackView,
      settings: settingsView,
      team: teamView
    };

    const fn = views[tab];
    if (fn) await guard(() => fn(v));
  }

  // ================================================================
  // 1. OVERVIEW VIEW
  // ================================================================
  async function overviewView(v) {
    const today = todayISO();
    const yesterday = addDays(today, -1);
    const startOfMonth = today.slice(0, 8) + '01';
    const settings = await A.allSettings();
    const targetDay = ESCA.earliestDate(settings);

    const [ordersToday, ordersYesterday, ordersMtd, ordersTarget, attentionList, menu, portionsTarget, allPortions, pantryItems] = await Promise.all([
      A.orders(today, today),
      A.orders(yesterday, yesterday),
      A.orders(startOfMonth, today),
      A.orders(targetDay, targetDay),
      A.attention(),
      ESCA.getMenu(true),
      A.portions(targetDay),
      A.portions(),
      A.pantryList()
    ]);

    const live = ordersToday.filter(o => !['awaiting_payment', 'cancelled'].includes(o.status));
    const revenue = live.reduce((a, o) => a + Number(o.total || 0), 0);
    const toCook = live.filter(o => ['confirmed', 'preparing'].includes(o.status)).length;
    const deliveries = live.filter(o => o.fulfilment === 'delivery').length;
    const pickups = live.filter(o => o.fulfilment === 'pickup').length;

    const liveYesterday = ordersYesterday.filter(o => !['awaiting_payment', 'cancelled'].includes(o.status));
    const revenueYesterday = liveYesterday.reduce((a, o) => a + Number(o.total || 0), 0);

    const liveMtd = ordersMtd.filter(o => !['awaiting_payment', 'cancelled'].includes(o.status));
    const revenueMtd = liveMtd.reduce((a, o) => a + Number(o.total || 0), 0);

    const prep = {};
    live.filter(o => o.status !== 'completed').forEach(o => {
      (o.order_items || []).forEach(i => {
        const k = i.item_name + (i.option_name ? ` (${i.option_name})` : '');
        prep[k] = (prep[k] || 0) + i.quantity;
      });
    });

    const bookedTarget = {};
    ordersTarget.filter(o => o.status !== 'cancelled').forEach(o => {
      (o.order_items || []).forEach(i => {
        bookedTarget[i.menu_item_id] = (bookedTarget[i.menu_item_id] || 0) + i.quantity;
      });
    });

    // Detect sold-out or low portions on next order date (or any active portion day)
    const lowStockDishes = [];
    menu.filter(m => m.is_active).forEach(m => {
      const r = portionsTarget.find(p => p.menu_item_id === m.id) ||
                (allPortions || []).find(p => p.menu_item_id === m.id);
      if (r && r.portions != null) {
        const b = bookedTarget[m.id] || 0;
        const left = Math.max(r.portions - b, 0);
        if (left <= 3) {
          lowStockDishes.push({
            name: m.name,
            left,
            total: r.portions,
            dateLabel: r.avail_date ? fmtDate(r.avail_date) : fmtDate(targetDay)
          });
        }
      }
    });

    // Detect raw pantry ingredients needing restock
    const lowPantryItems = (pantryItems || []).filter(item => item.status === 'to_buy' || item.status === 'running_low');

    const totalAlerts = lowStockDishes.length + lowPantryItems.length;
    const soldOutDishes = lowStockDishes.filter(d => d.left === 0);

    let lowStockLabel = 'All healthy';
    let lowStockColor = '#1f9d55';
    if (soldOutDishes.length > 0) {
      lowStockLabel = `${soldOutDishes.length} sold out`;
      lowStockColor = '#c8361c';
    } else if (lowStockDishes.length > 0) {
      lowStockLabel = `${lowStockDishes.length} low`;
      lowStockColor = '#9a5b00';
    } else if (lowPantryItems.length > 0) {
      lowStockLabel = `${lowPantryItems.length} pantry low`;
      lowStockColor = '#9a5b00';
    }

    v.innerHTML = `
      ${attentionList.length ? `
        <div class="notice warn" style="margin-bottom:8px;">
          <b>Customer Attention Required</b>
          ${attentionList.map(o => `
            <div class="small" style="margin-top:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span><b>${esc(o.code)}</b> (${esc(o.customer_name)}): ${esc(o.needs_attention)}</span>
              <a class="btn btn-wa btn-sm" href="${wa(o.phone)}" target="_blank" rel="noopener">WhatsApp</a>
              <button class="btn btn-ghost btn-sm" type="button" data-clear-attention="${o.id}">Mark resolved</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div style="background:#fff; border:1px solid var(--canvas-border); border-radius:12px; padding:18px 20px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
        <div class="row" style="align-items:center; justify-content:space-between; margin-bottom:14px;">
          <div>
            <span class="small muted" style="font-weight:700; text-transform:uppercase; letter-spacing:0.06em;">Operations Pulse</span>
            <h2 style="margin:2px 0 0; font-size:1.3rem; font-weight:700; color:var(--ink);">Today in the kitchen</h2>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-jump-orders" type="button">Live Orders</button>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:16px; padding-top:10px; border-top:1px solid var(--canvas-border);">
          <div>
            <span class="small muted">Active Kitchen Queue</span>
            <div style="font-size:1.4rem; font-weight:700; color:var(--ink); margin-top:2px;">${toCook} <span style="font-size:0.82rem; font-weight:600; color:var(--muted);">to cook</span></div>
          </div>
          <div>
            <span class="small muted">Fulfillment</span>
            <div style="font-size:1.4rem; font-weight:700; color:var(--ink); margin-top:2px;">${deliveries} <span style="font-size:0.82rem; font-weight:600; color:var(--muted);">deliveries · ${pickups} pickups</span></div>
          </div>
          <div>
            <span class="small muted">Revenue Today</span>
            <div style="font-size:1.4rem; font-weight:700; color:var(--ink); margin-top:2px;">${money(revenue)}</div>
          </div>
          <div>
            <span class="small muted">Low-Stock Watch</span>
            <div style="font-size:1.4rem; font-weight:700; color:${lowStockColor}; margin-top:2px;">
              ${lowStockLabel}
            </div>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:16px; padding-top:14px; margin-top:14px; border-top:1px dashed var(--canvas-border);">
          <div>
            <span class="small muted">Yesterday's Sales</span>
            <div style="font-size:1.18rem; font-weight:700; color:var(--ink); margin-top:2px;">
              ${money(revenueYesterday)} <span style="font-size:0.8rem; font-weight:600; color:var(--muted);">(${liveYesterday.length} orders)</span>
            </div>
          </div>
          <div>
            <span class="small muted">Month to Date (${new Date(today).toLocaleString('en-US', { month: 'short' })})</span>
            <div style="font-size:1.18rem; font-weight:700; color:var(--ink); margin-top:2px;">
              ${money(revenueMtd)} <span style="font-size:0.8rem; font-weight:600; color:var(--muted);">(${liveMtd.length} orders)</span>
            </div>
          </div>
          <div>
            <span class="small muted">Avg Order Value</span>
            <div style="font-size:1.18rem; font-weight:700; color:var(--ink); margin-top:2px;">
              ${money(liveMtd.length ? Math.round(revenueMtd / liveMtd.length) : 0)}
            </div>
          </div>
          <div style="display:flex; align-items:flex-end;">
            <button class="btn btn-ghost btn-sm" id="btn-jump-yesterday" type="button" style="width:100%; justify-content:center; padding:7px 12px; font-weight:600;">View Yesterday</button>
          </div>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:1.2fr 1fr; gap:18px;" class="overview-grid-cols">
        <div style="background:#fff; border:1px solid var(--canvas-border); border-radius:12px; padding:18px; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
          <h3 style="margin:0 0 12px; font-size:1.05rem; font-weight:700;">Today's Prep Summary</h3>
          ${Object.keys(prep).length ? `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(160px, 1fr)); gap:8px;">
              ${Object.entries(prep).sort().map(([k, q]) => `
                <div style="background:#faf7f4; border:1px solid var(--canvas-border); border-radius:8px; padding:8px 10px;">
                  <b style="font-size:1rem; color:var(--ink);">${q} ×</b>
                  <div class="small" style="margin-top:2px; font-weight:600;">${esc(k)}</div>
                </div>
              `).join('')}
            </div>
          ` : `
            <p class="muted small" style="margin:0;">No orders awaiting prep for today.</p>
          `}
        </div>

        <div style="background:#fff; border:1px solid var(--canvas-border); border-radius:12px; padding:18px; box-shadow:0 2px 6px rgba(0,0,0,0.02); display:flex; flex-direction:column; gap:12px;">
          <div class="row" style="align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <h3 style="margin:0; font-size:1.05rem; font-weight:700;">Low-Stock Alerts</h3>
            <div class="row" style="gap:6px;">
              <button class="btn btn-ghost btn-sm" id="btn-jump-stock" type="button">Manage Portions</button>
              <button class="btn btn-ghost btn-sm" id="btn-jump-pantry" type="button">Pantry List</button>
            </div>
          </div>
          ${totalAlerts > 0 ? `
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${lowStockDishes.map(d => `
                <div style="display:flex; align-items:center; justify-content:space-between; background:#faf7f4; padding:8px 10px; border-radius:6px; border:1px solid var(--canvas-border);">
                  <div>
                    <b style="font-size:0.88rem;">${esc(d.name)}</b>
                    <span class="small muted" style="display:block; font-size:0.74rem;">Portions for ${esc(d.dateLabel)}</span>
                  </div>
                  <span class="badge ${d.left === 0 ? 'bad' : 'warn'}">${d.left === 0 ? 'Sold out' : `${d.left} left`}</span>
                </div>
              `).join('')}
              ${lowPantryItems.map(p => `
                <div style="display:flex; align-items:center; justify-content:space-between; background:#faf7f4; padding:8px 10px; border-radius:6px; border:1px solid var(--canvas-border);">
                  <div>
                    <b style="font-size:0.88rem;">${esc(p.name)}</b>
                    <span class="small muted" style="display:block; font-size:0.74rem;">Raw pantry · ${esc(p.quantity || 'Need to restock')}</span>
                  </div>
                  <span class="pantry-status-badge ${p.status}" style="font-size:0.72rem; padding:2px 8px;">${p.status === 'to_buy' ? 'Need to buy' : 'Running low'}</span>
                </div>
              `).join('')}
            </div>
          ` : `
            <p class="muted small" style="margin:0;">No dishes or raw pantry items are currently low on stock.</p>
          `}

          <div style="margin-top:auto; padding-top:10px; border-top:1px solid var(--canvas-border);">
            <div class="row" style="gap:8px;">
              <button class="btn btn-ghost btn-sm" id="btn-quick-new-meal" type="button" style="flex:1;">+ Add Meal</button>
              <button class="btn btn-ghost btn-sm" id="btn-quick-catering" type="button" style="flex:1;">Catering</button>
            </div>
          </div>
        </div>
      </div>
    `;

    $('#btn-jump-orders').onclick = () => switchTab('orders');
    if ($('#btn-jump-yesterday')) {
      $('#btn-jump-yesterday').onclick = () => {
        day = yesterday;
        switchTab('orders');
      };
    }
    $('#btn-jump-stock').onclick = () => switchTab('portions');
    $('#btn-jump-pantry').onclick = () => switchTab('pantry');
    $('#btn-quick-new-meal').onclick = () => openDishModal(null);
    $('#btn-quick-catering').onclick = () => switchTab('catering');

    v.querySelectorAll('[data-clear-attention]').forEach(btn => {
      btn.onclick = async () => {
        await guard(() => A.update('orders', Number(btn.dataset.clearAttention), { needs_attention: null }));
        render();
      };
    });
  }

  // ================================================================
  // 2. LIVE ORDERS VIEW
  // ================================================================
  async function ordersView(v) {
    const orders = (await A.orders(day, day)).sort((a, b) => a.time_slot.localeCompare(b.time_slot) || a.id - b.id);
    const attentionList = await A.attention();
    const yesterday = addDays(todayISO(), -1);
    const tomorrow = addDays(todayISO(), 1);
    const paidOrders = orders.filter(o => !['awaiting_payment', 'cancelled'].includes(o.status));
    const dayRevenue = paidOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const dayDeliveries = paidOrders.filter(o => o.fulfilment === 'delivery').length;
    const dayPickups = paidOrders.filter(o => o.fulfilment === 'pickup').length;

    v.innerHTML = `
      <div class="row" style="align-items:center; gap:8px; margin-bottom:14px; flex-wrap:wrap;">
        <button type="button" class="chip ${day === yesterday ? 'on' : ''}" data-day="${yesterday}">Yesterday</button>
        <button type="button" class="chip ${day === todayISO() ? 'on' : ''}" data-day="${todayISO()}">Today</button>
        <button type="button" class="chip ${day === tomorrow ? 'on' : ''}" data-day="${tomorrow}">Tomorrow</button>
        <input type="date" id="order-day-picker" value="${day}" style="width:auto; padding:6px 10px;">
        <button class="btn btn-primary btn-sm" id="btn-open-new-order" type="button" style="display:inline-flex; align-items:center; gap:6px;">
          ${ICONS.plus} <span>New order</span>
        </button>
        <span class="spacer"></span>
        <div style="text-align:right;">
          <b style="font-size:0.95rem; color:var(--ink);">${esc(fmtDate(day))}</b>
          <div class="small muted" style="font-weight:600; margin-top:1px;">
            ${paidOrders.length} orders · <span style="color:var(--brand-dark); font-weight:700;">${money(dayRevenue)}</span> · ${dayDeliveries} deliv, ${dayPickups} pickup
          </div>
        </div>
      </div>

      ${attentionList.length ? `
        <div class="notice warn" style="margin-bottom:14px;">
          <b>Needs Kitchen Attention</b>
          ${attentionList.map(o => `
            <div class="small" style="margin-top:6px; display:flex; align-items:center; gap:8px;">
              <span><b>${esc(o.code)}</b> · ${esc(o.customer_name)}: ${esc(o.needs_attention)}</span>
              <a href="${wa(o.phone)}" target="_blank" rel="noopener">WhatsApp</a>
              <button class="btn btn-ghost btn-sm" type="button" data-clear-attention="${o.id}">Mark handled</button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="docket-rail">
        ${orders.map(orderDocketCard).join('') || `
          <div style="grid-column:1/-1; padding:40px; text-align:center; background:#fff; border-radius:12px; border:1px solid var(--canvas-border);">
            <p class="muted" style="margin:0;">No orders placed for this date yet.</p>
          </div>
        `}
      </div>
    `;

    v.querySelectorAll('[data-day]').forEach(b => {
      b.onclick = () => {
        day = b.dataset.day;
        render();
      };
    });

    const btnNewOrder = $('#btn-open-new-order');
    if (btnNewOrder) btnNewOrder.onclick = () => openNewOrderModal();

    $('#order-day-picker').onchange = e => {
      day = e.target.value || todayISO();
      render();
    };

    v.querySelectorAll('[data-to-status]').forEach(btn => {
      btn.onclick = async () => {
        await guard(() => A.update('orders', Number(btn.dataset.id), { status: btn.dataset.toStatus }));
        toast(`${btn.dataset.code}: ${NICE_STATUS[btn.dataset.toStatus]}`);
        refreshHorizonTicker();
        render();
      };
    });

    v.querySelectorAll('[data-clear-attention]').forEach(btn => {
      btn.onclick = async () => {
        await guard(() => A.update('orders', Number(btn.dataset.clearAttention), { needs_attention: null }));
        render();
      };
    });

    v.querySelectorAll('[data-confirm-paid]').forEach(btn => {
      btn.onclick = async () => {
        const o = orders.find(x => x.id === Number(btn.dataset.confirmPaid));
        if (btn.dataset.armed !== '1') {
          btn.dataset.armed = '1';
          btn.textContent = `Confirm ${money(o.total)} received?`;
          return;
        }
        await guard(() => A.update('orders', o.id, {
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'manual',
          amount_paid: o.total,
          paid_at: new Date().toISOString(),
          needs_attention: null
        }));
        toast(`Order ${o.code} marked paid.`);
        refreshHorizonTicker();
        render();
      };
    });
  }

  function orderDocketCard(o) {
    const next = NEXT_STATUS[o.status] || [];
    let actionBtn = '';

    if (o.status === 'preparing') {
      actionBtn = o.fulfilment === 'delivery'
        ? `<button class="btn btn-primary btn-sm" type="button" data-to-status="out_for_delivery" data-id="${o.id}" data-code="${esc(o.code)}">Rider dispatched</button>`
        : `<button class="btn btn-primary btn-sm" type="button" data-to-status="ready" data-id="${o.id}" data-code="${esc(o.code)}">Ready for pickup</button>`;
    } else if (next[0]) {
      actionBtn = `<button class="btn btn-primary btn-sm" type="button" data-to-status="${next[0]}" data-id="${o.id}" data-code="${esc(o.code)}">${next[1]}</button>`;
    }

    if (o.status === 'awaiting_payment') {
      actionBtn = `<button class="btn btn-ghost btn-sm" type="button" data-confirm-paid="${o.id}">Paid by transfer / cash</button>`;
    }

    let cancelBtn = '';
    if (!['completed', 'cancelled'].includes(o.status)) {
      cancelBtn = `<button class="btn btn-ghost btn-sm" type="button" data-to-status="cancelled" data-id="${o.id}" data-code="${esc(o.code)}">Cancel</button>`;
    }

    const payBadge = o.payment_status === 'paid'
      ? `<span class="badge ok">Paid ${money(o.amount_paid)}</span>`
      : o.payment_status === 'underpaid'
      ? `<span class="badge bad">Underpaid ${money(o.amount_paid)}</span>`
      : `<span class="badge warn">${esc(o.payment_status)}</span>`;

    const fulInfo = o.fulfilment === 'delivery'
      ? `Delivery (${esc(o.delivery_zone || '')}): ${esc(o.address || '')}${o.landmark ? ` (${esc(o.landmark)})` : ''}`
      : `Kitchen Pickup (${esc(ESCA.B.ADDRESS || 'Kitchen')})`;

    return `
      <div class="order-docket" data-status="${o.status}">
        <div class="docket-head">
          <div>
            <div class="docket-slot">${esc(o.time_slot.replace('-', ' to '))}</div>
            <div class="docket-code">${esc(o.code)}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:1.1rem; font-weight:700; color:var(--ink);">${money(o.total)}</div>
            <div style="margin-top:2px;">${payBadge}</div>
          </div>
        </div>

        <div class="docket-customer">
          <b>${esc(o.customer_name)}</b> · <a href="${wa(o.phone)}" target="_blank" rel="noopener">${esc(o.phone)}</a>
          <div class="small muted" style="margin-top:2px;">${fulInfo}</div>
        </div>

        <div class="docket-items-list">
          ${(o.order_items || []).map(i => `
            <div>
              <b style="color:var(--ink);">${i.quantity} ×</b> ${esc(i.item_name)}
              ${i.option_name ? `<span class="muted" style="font-size:0.8rem;">(${esc(i.option_name)})</span>` : ''}
            </div>
          `).join('')}
        </div>

        ${o.notes ? `<div class="small" style="background:#faf6f2; border:1px solid var(--canvas-border); border-left:3px solid #24140e; padding:7px 10px; border-radius:6px; color:var(--ink); line-height:1.4;"><b>Kitchen Note:</b> ${esc(o.notes)}</div>` : ''}

        <div class="docket-footer">
          <span class="badge">${NICE_STATUS[o.status] || o.status}</span>
          <div class="row" style="gap:6px;">
            ${cancelBtn}
            ${actionBtn}
          </div>
        </div>
      </div>
    `;
  }

  // ================================================================
  // 3. MENU VIEW (Sleek Switch Toggle, No Double Plus)
  // ================================================================
  let menuFilterCategory = 'all';
  let menuSearchTerm = '';

  async function menuView(v) {
    const menu = await ESCA.getMenu(true);
    const categories = [...new Set(menu.map(m => m.category))].filter(Boolean);

    const catList = $('#category-options');
    if (catList) {
      catList.innerHTML = categories.map(c => `<option value="${esc(c)}"></option>`).join('');
    }

    const filtered = menu.filter(m => {
      const matchCat = menuFilterCategory === 'all' || m.category === menuFilterCategory;
      const matchSearch = !menuSearchTerm || m.name.toLowerCase().includes(menuSearchTerm.toLowerCase());
      return matchCat && matchSearch;
    });

    v.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:14px;">
        <div class="row" style="align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <input type="search" id="menu-search-input" placeholder="Search dishes..." value="${esc(menuSearchTerm)}" style="flex:1; min-width:180px; max-width:320px; padding:7px 12px; font-size:0.88rem; border-radius:8px;">
          <button class="btn btn-primary" id="btn-add-meal-modal" type="button" style="display:inline-flex; align-items:center; gap:6px; white-space:nowrap;">
            ${ICONS.plus}
            <span>Add new meal</span>
          </button>
        </div>
        <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; -webkit-overflow-scrolling:touch; scrollbar-width:none;">
          <button type="button" class="chip ${menuFilterCategory === 'all' ? 'on' : ''}" data-cat="all">All (${menu.length})</button>
          ${categories.map(c => `
            <button type="button" class="chip ${menuFilterCategory === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>
          `).join('')}
        </div>
      </div>

      <div class="menu-atelier-table-wrap">
        <table class="menu-table">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Category</th>
              <th>Pricing / Variations</th>
              <th>Days Available</th>
              <th>Status</th>
              <th style="text-align:right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map(m => `
              <tr id="row-dish-${m.id}">
                <td>
                  <div class="dish-cell">
                    <div class="dish-thumb-mini">
                      ${m.image_url ? `<img src="${esc(m.image_url)}" alt="${esc(m.name)}" loading="lazy">` : ''}
                    </div>
                    <div class="dish-name-cell">
                      <b>${esc(m.name)}</b>
                      <span>${esc(m.unit_label || '')}</span>
                    </div>
                  </div>
                </td>
                <td><span class="badge">${esc(m.category)}</span></td>
                <td>
                  ${m.options && m.options.length ? `
                    <div style="font-size:0.84rem; display:flex; flex-direction:column; gap:2px;">
                      <b>${m.options.length} variations</b>
                      <span class="muted small">${m.options.map(o => `${esc(o.option_name)}: ${money(o.price)}`).join(' · ')}</span>
                    </div>
                  ` : (m.price != null ? `<b>${money(m.price)}</b>` : '<span class="muted small">Price on request</span>')}
                </td>
                <td>
                  <div class="day-badge-row">
                    ${renderDayBadges(m.available_days)}
                  </div>
                </td>
                <td>
                  <!-- Sleek On/Off Switch Toggle (Requested: toggle switch instead of giant checkbox) -->
                  <label class="switch-toggle" title="Toggle active on menu">
                    <input type="checkbox" data-quick-active="${m.id}" ${m.is_active ? 'checked' : ''}>
                    <span class="switch-track"></span>
                    <span class="small muted" style="font-size:0.78rem;">${m.is_active ? 'Live' : 'Off'}</span>
                  </label>
                </td>
                <td data-col="actions" style="text-align:right;">
                  <button class="btn btn-ghost btn-sm" type="button" data-edit-dish="${m.id}" style="display:inline-flex; align-items:center; gap:6px;">
                    ${ICONS.edit}
                    <span>Edit</span>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    $('#btn-add-meal-modal').onclick = () => openDishModal(null);

    $('#menu-search-input').oninput = e => {
      menuSearchTerm = e.target.value;
      render();
    };

    v.querySelectorAll('[data-cat]').forEach(b => {
      b.onclick = () => {
        menuFilterCategory = b.dataset.cat;
        render();
      };
    });

    v.querySelectorAll('[data-edit-dish]').forEach(btn => {
      btn.onclick = () => openDishModal(Number(btn.dataset.editDish));
    });

    v.querySelectorAll('[data-quick-active]').forEach(chk => {
      chk.onchange = async () => {
        await guard(() => A.saveDish({ id: Number(chk.dataset.quickActive), is_active: chk.checked }));
        toast('Dish status updated.');
        render();
      };
    });
  }

  function renderDayBadges(daysList) {
    const ALL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeDays = Array.isArray(daysList) && daysList.length ? daysList : ALL;
    if (activeDays.length === 7) {
      return `<span class="day-tag" style="background:#e8f5e9; color:#2e7d32;">Every day</span>`;
    }
    return ALL.map(d => `
      <span class="day-tag ${activeDays.includes(d) ? '' : 'off'}">${d}</span>
    `).join('');
  }

  // ================================================================
  // 4. THE DISH MODAL DIALOG
  // ================================================================
  let currentEditingDish = null;

  function initModalControls() {
    const backdrop = $('#dish-modal-backdrop');
    const closeBtn = $('#modal-close-trigger');
    const cancelBtn = $('#modal-cancel-btn');
    const saveBtn = $('#modal-save-btn');
    const everyDayBtn = $('#btn-every-day-toggle');
    const addOptionBtn = $('#btn-add-option-row');
    const photoFileInput = $('#m-photo-file');
    const photoUrlInput = $('#m-image-url');

    const closeModal = () => {
      backdrop.classList.remove('open');
      currentEditingDish = null;
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    everyDayBtn.onclick = () => {
      const pills = $$('#weekday-pills-wrap .day-toggle-pill');
      const allActive = Array.from(pills).every(p => p.classList.contains('active'));
      pills.forEach(p => {
        p.classList.toggle('active', !allActive);
        p.querySelector('input').checked = !allActive;
      });
    };

    $$('#weekday-pills-wrap .day-toggle-pill').forEach(pill => {
      pill.onclick = e => {
        e.preventDefault();
        pill.classList.toggle('active');
        const chk = pill.querySelector('input');
        chk.checked = pill.classList.contains('active');
      };
    });

    addOptionBtn.onclick = () => {
      appendOptionRow('', '');
    };

    photoUrlInput.oninput = () => {
      updateModalPhotoPreview(photoUrlInput.value);
    };

    photoFileInput.onchange = async () => {
      const file = photoFileInput.files[0];
      if (!file) return;
      toast('Optimizing photo...');
      const url = await guard(() => A.upload(file));
      if (url) {
        photoUrlInput.value = url;
        updateModalPhotoPreview(url);
        toast('Photo added.');
      }
    };

    saveBtn.onclick = async () => {
      await saveDishFromModal(closeModal);
    };
  }

  function updateModalPhotoPreview(url) {
    const img = $('#modal-photo-preview');
    const ph = $('#modal-photo-placeholder');
    if (url && url.trim()) {
      img.src = url.trim();
      img.style.display = 'block';
      ph.style.display = 'none';
    } else {
      img.src = '';
      img.style.display = 'none';
      ph.style.display = 'flex';
    }
  }

  function appendOptionRow(name, price) {
    const list = $('#modal-options-list');
    const row = document.createElement('div');
    row.className = 'option-row-edit';
    row.innerHTML = `
      <input class="option-name-input" placeholder="Option name (e.g. 2 Litres, With Goat Meat)" value="${esc(name || '')}" required>
      <span class="small muted">₦</span>
      <input class="option-price-input" inputmode="numeric" placeholder="Price ₦" value="${price || ''}" required>
      <button type="button" class="option-del-btn" title="Remove option">${ICONS.trash}</button>
    `;
    row.querySelector('.option-del-btn').onclick = () => row.remove();
    list.appendChild(row);
  }

  async function openDishModal(dishId) {
    const menu = await ESCA.getMenu(true);
    const dish = dishId ? menu.find(m => m.id === dishId) : null;
    currentEditingDish = dish;

    $('#m-id').value = dish ? dish.id : '';
    $('#modal-dish-title').textContent = dish ? `Edit ${dish.name}` : 'Add a New Meal';
    $('#m-name').value = dish ? dish.name : '';

    const catSelect = $('#m-category-select');
    const customCatInput = $('#m-category-custom');
    if (catSelect) {
      const cats = [...new Set(menu.map(m => m.category))].filter(Boolean);
      catSelect.innerHTML = `
        <option value="" disabled ${!dish ? 'selected' : ''}>-- Select a category --</option>
        ${cats.map(c => `<option value="${esc(c)}" ${dish && dish.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        <option value="__custom__" ${dish && !cats.includes(dish.category) && dish.category ? 'selected' : ''}>+ Add new category...</option>
      `;
      if (dish && dish.category) {
        if (cats.includes(dish.category)) {
          catSelect.value = dish.category;
          if (customCatInput) {
            customCatInput.value = '';
            customCatInput.style.display = 'none';
          }
        } else {
          catSelect.value = '__custom__';
          if (customCatInput) {
            customCatInput.value = dish.category;
            customCatInput.style.display = 'block';
          }
        }
      } else {
        catSelect.value = '';
        if (customCatInput) {
          customCatInput.value = '';
          customCatInput.style.display = 'none';
        }
      }
      catSelect.onchange = () => {
        if (catSelect.value === '__custom__') {
          if (customCatInput) {
            customCatInput.style.display = 'block';
            customCatInput.focus();
          }
        } else {
          if (customCatInput) {
            customCatInput.style.display = 'none';
          }
        }
      };
    }

    $('#m-description').value = dish ? (dish.description || '') : '';
    $('#m-base-price').value = dish && dish.price != null ? dish.price : '';
    $('#m-unit-label').value = dish ? (dish.unit_label || '') : '';
    $('#m-image-url').value = dish ? (dish.image_url || '') : '';
    updateModalPhotoPreview(dish ? dish.image_url : '');

    $('#m-is-active').checked = dish ? dish.is_active : true;
    $('#m-is-featured').checked = dish ? dish.is_featured : false;

    const ALL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const activeDays = dish && Array.isArray(dish.available_days) && dish.available_days.length ? dish.available_days : ALL;
    $$('#weekday-pills-wrap .day-toggle-pill').forEach(pill => {
      const d = pill.dataset.day;
      const on = activeDays.includes(d);
      pill.classList.toggle('active', on);
      pill.querySelector('input').checked = on;
    });

    const optionsContainer = $('#modal-options-list');
    optionsContainer.innerHTML = '';
    if (dish && dish.options && dish.options.length) {
      dish.options.forEach(o => appendOptionRow(o.option_name, o.price));
    }

    $('#dish-modal-backdrop').classList.add('open');
  }

  async function saveDishFromModal(onSuccess) {
    const idVal = $('#m-id').value;
    const name = $('#m-name').value.trim();
    const catSelect = $('#m-category-select');
    const customCatInput = $('#m-category-custom');
    let category = '';
    if (catSelect) {
      if (catSelect.value === '__custom__' && customCatInput) {
        category = customCatInput.value.trim();
      } else {
        category = catSelect.value.trim();
      }
    }
    const description = $('#m-description').value.trim();
    const rawPrice = $('#m-base-price').value.replace(/\D/g, '');
    const price = rawPrice === '' ? null : Number(rawPrice);
    const unit_label = $('#m-unit-label').value.trim();
    const image_url = $('#m-image-url').value.trim() || null;
    const is_active = $('#m-is-active').checked;
    const is_featured = $('#m-is-featured').checked;

    if (!name) {
      toast('Please provide a dish name.');
      $('#m-name').focus();
      return;
    }
    if (!category) {
      toast('Please choose or enter a category.');
      if (catSelect) catSelect.focus();
      return;
    }

    const days = [];
    $$('#weekday-pills-wrap .day-toggle-pill.active').forEach(p => {
      days.push(p.dataset.day);
    });

    const optionsList = [];
    $$('.option-row-edit').forEach(row => {
      const oName = row.querySelector('.option-name-input').value.trim();
      const oPrice = Number(row.querySelector('.option-price-input').value.replace(/\D/g, '')) || 0;
      if (oName) {
        optionsList.push({ option_name: oName, price: oPrice });
      }
    });

    const dishData = {
      name,
      category,
      description,
      price,
      unit_label,
      image_url,
      is_active,
      is_featured,
      available_days: days.length ? days : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      fulfilment_types: ['delivery', 'pickup']
    };

    if (idVal) dishData.id = Number(idVal);

    toast('Saving meal changes...');
    const saved = await guard(() => A.saveDish(dishData, optionsList));
    if (saved) {
      toast(`${saved.name} saved successfully.`);
      if (onSuccess) onSuccess();
      render();
    }
  }

  // ================================================================
  // 4. PANTRY & RAW FOOD MARKET LIST VIEW
  // ================================================================
  let pantryFilter = 'all';
  let pantrySearch = '';

  async function pantryView(v) {
    const items = await A.pantryList();

    const toBuyCount = items.filter(x => x.status === 'to_buy' || x.status === 'running_low').length;
    const estSpend = items
      .filter(x => x.status === 'to_buy' || x.status === 'running_low')
      .reduce((sum, x) => sum + (Number(x.estimated_cost) || 0), 0);
    const boughtCount = items.filter(x => x.is_bought).length;

    const filtered = items.filter(item => {
      if (pantryFilter === 'shopping_list' && item.status === 'in_stock') return false;
      if (['Proteins & Meat', 'Produce & Peppers', 'Oils, Spices & Staples', 'Packaging & Supplies'].includes(pantryFilter) && item.category !== pantryFilter) return false;
      if (pantrySearch) {
        const q = pantrySearch.toLowerCase();
        return (item.name || '').toLowerCase().includes(q) || (item.market_vendor || '').toLowerCase().includes(q) || (item.category || '').toLowerCase().includes(q);
      }
      return true;
    });

    const statusBadge = (st, id) => {
      const labels = {
        to_buy: 'Need to buy',
        running_low: 'Running low',
        in_stock: 'In stock'
      };
      return `<button class="pantry-status-badge ${st}" type="button" data-cycle-status="${id}" title="Click to cycle status">${labels[st] || st}</button>`;
    };

    v.innerHTML = `
      <div class="row" style="align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="margin:0; font-size:1.35rem; font-weight:700;">Pantry & Raw Food Market List</h2>
          <span class="small muted">Control raw ingredients, track what you are lacking, and check off items while shopping in Aba markets.</span>
        </div>
        <div class="row" style="gap:8px; flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" id="btn-copy-market-list" type="button" style="display:inline-flex; align-items:center; gap:6px;">
            ${ICONS.copy}
            <span>Copy list for WhatsApp</span>
          </button>
          <button class="btn btn-ghost btn-sm" id="btn-reset-pantry-checks" type="button">Reset checks</button>
          <button class="btn btn-primary btn-sm" id="btn-add-pantry-modal" type="button" style="display:inline-flex; align-items:center; gap:6px;">
            ${ICONS.plus}
            <span>Add raw ingredient</span>
          </button>
        </div>
      </div>

      <!-- Quick Operational Metrics Ticker -->
      <div class="horizon-ticker" style="margin-top:4px;">
        <div class="ticker-pill">
          <span class="ticker-title">Tracked Items</span>
          <b class="ticker-num">${items.length}</b>
        </div>
        <div class="ticker-pill">
          <span class="ticker-title">Need to Buy</span>
          <b class="ticker-num" style="color:#c8361c;">${toBuyCount}</b>
        </div>
        <div class="ticker-pill">
          <span class="ticker-title">Est. Market Spend</span>
          <b class="ticker-num">${money(estSpend)}</b>
        </div>
        <div class="ticker-pill">
          <span class="ticker-title">Bought Today</span>
          <b class="ticker-num" style="color:#1f9d55;">${boughtCount} / ${items.length}</b>
        </div>
      </div>

      <!-- Filter Pills & Search -->
      <div class="row" style="gap:8px; flex-wrap:wrap; align-items:center;">
        <input id="pantry-search-input" value="${esc(pantrySearch)}" placeholder="Search ingredient or market vendor..." style="max-width:260px; font-size:0.86rem; padding:6px 12px; border-radius:8px; border:1px solid var(--canvas-border);">
        <div class="weekday-pills">
          <button class="day-toggle-pill ${pantryFilter === 'all' ? 'active' : ''}" type="button" data-pantry-filter="all">All (${items.length})</button>
          <button class="day-toggle-pill ${pantryFilter === 'shopping_list' ? 'active' : ''}" type="button" data-pantry-filter="shopping_list">Shopping list (${toBuyCount})</button>
          <button class="day-toggle-pill ${pantryFilter === 'Proteins & Meat' ? 'active' : ''}" type="button" data-pantry-filter="Proteins & Meat">Proteins & Meat</button>
          <button class="day-toggle-pill ${pantryFilter === 'Produce & Peppers' ? 'active' : ''}" type="button" data-pantry-filter="Produce & Peppers">Produce & Peppers</button>
          <button class="day-toggle-pill ${pantryFilter === 'Oils, Spices & Staples' ? 'active' : ''}" type="button" data-pantry-filter="Oils, Spices & Staples">Oils & Staples</button>
          <button class="day-toggle-pill ${pantryFilter === 'Packaging & Supplies' ? 'active' : ''}" type="button" data-pantry-filter="Packaging & Supplies">Packaging & Utilities</button>
        </div>
      </div>

      <!-- Raw Ingredient Item Cards (Mobile & Desktop Friendly) -->
      <div class="pantry-grid" id="pantry-items-container">
        ${filtered.length ? filtered.map(item => `
          <div class="pantry-card ${item.is_bought ? 'bought' : ''}" id="pantry-row-${item.id}">
            <div class="pantry-lead-col">
              <input type="checkbox" class="pantry-check-box" data-pantry-check="${item.id}" ${item.is_bought ? 'checked' : ''} title="Check off as bought at the market">
              <div class="pantry-item-details">
                <span class="pantry-item-name">${esc(item.name)}</span>
                <div class="pantry-item-meta">
                  <span class="badge" style="font-size:0.7rem; padding:2px 8px;">${esc(item.category)}</span>
                  ${item.market_vendor ? `<span>·</span><span>${esc(item.market_vendor)}</span>` : ''}
                </div>
              </div>
            </div>

            <div class="pantry-qty-col">
              <span class="pantry-qty-value">${esc(item.quantity || '')}</span>
              <span class="pantry-cost-value">${item.estimated_cost ? 'Est. ' + money(item.estimated_cost) : 'No price set'}</span>
            </div>

            <div style="flex-shrink:0;">
              ${statusBadge(item.status, item.id)}
            </div>

            <div class="pantry-actions-col">
              <button class="btn btn-ghost btn-sm" type="button" data-edit-pantry="${item.id}" title="Edit item" style="padding:6px 10px;">
                ${ICONS.edit}
              </button>
              <button class="btn btn-ghost btn-sm" type="button" data-del-pantry="${item.id}" title="Delete item" style="padding:6px 10px; color:#c8361c;">
                ${ICONS.trash}
              </button>
            </div>
          </div>
        `).join('') : `
          <div style="background:#fff; border:1px solid var(--canvas-border); border-radius:12px; padding:32px; text-align:center;">
            <p class="muted" style="margin:0;">No pantry items found matching this filter.</p>
          </div>
        `}
      </div>
    `;

    // Event listeners for pantry
    $('#btn-add-pantry-modal').onclick = () => openPantryModal(null);

    $('#btn-copy-market-list').onclick = () => {
      const shoppingList = items.filter(x => x.status === 'to_buy' || x.status === 'running_low');
      if (!shoppingList.length) {
        toast('No items currently marked to buy!');
        return;
      }
      let text = `${ESCA.B.NAME || "Mamoke's Kitchen"} Market Shopping List (${new Date().toLocaleDateString('en-GB')})\n`;
      text += `Total estimated budget: ${money(estSpend)}\n\n`;
      shoppingList.forEach(x => {
        text += `${x.is_bought ? '[x]' : '[ ]'} ${x.name} (${x.quantity || 'As needed'})${x.estimated_cost ? ' - ' + money(x.estimated_cost) : ''}${x.market_vendor ? ' [' + x.market_vendor + ']' : ''}\n`;
      });
      navigator.clipboard.writeText(text).then(() => {
        toast('Market checklist copied to clipboard!');
      }).catch(() => {
        toast('List ready (select and copy)');
      });
    };

    $('#btn-reset-pantry-checks').onclick = async () => {
      await A.resetPantryChecklist();
      toast('Shopping checks reset for next market run');
      pantryView(v);
    };

    $$('[data-pantry-filter]').forEach(b => {
      b.onclick = () => {
        pantryFilter = b.dataset.pantryFilter;
        pantryView(v);
      };
    });

    const searchInput = $('#pantry-search-input');
    if (searchInput) {
      searchInput.oninput = e => {
        pantrySearch = e.target.value;
        pantryView(v);
      };
    }

    $$('[data-pantry-check]').forEach(chk => {
      chk.onchange = async () => {
        const id = chk.dataset.pantryCheck;
        await A.togglePantryBought(id, chk.checked);
        const card = $(`#pantry-row-${id}`);
        if (card) card.classList.toggle('bought', chk.checked);
      };
    });

    $$('[data-cycle-status]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.cycleStatus;
        const it = items.find(x => x.id === Number(id));
        if (!it) return;
        const cycles = { to_buy: 'running_low', running_low: 'in_stock', in_stock: 'to_buy' };
        it.status = cycles[it.status] || 'to_buy';
        await A.savePantryItem(it);
        toast(`Updated status to: ${it.status.replace('_', ' ')}`);
        pantryView(v);
      };
    });

    $$('[data-edit-pantry]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.editPantry;
        const it = items.find(x => x.id === Number(id));
        openPantryModal(it);
      };
    });

    $$('[data-del-pantry]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.delPantry;
        if (confirm('Delete this raw ingredient from pantry?')) {
          await A.deletePantryItem(id);
          toast('Item removed');
          pantryView(v);
        }
      };
    });
  }

  function openPantryModal(item) {
    const backdrop = $('#pantry-modal-backdrop');
    if (!backdrop) return;
    const isEdit = !!item;
    $('#pantry-modal-title').textContent = isEdit ? 'Edit raw ingredient' : 'Add raw pantry item';
    $('#pantry-item-id').value = isEdit ? item.id : '';
    $('#pantry-input-name').value = isEdit ? (item.name || '') : '';
    $('#pantry-input-category').value = isEdit ? (item.category || 'Proteins & Meat') : 'Proteins & Meat';
    $('#pantry-input-status').value = isEdit ? (item.status || 'to_buy') : 'to_buy';
    $('#pantry-input-quantity').value = isEdit ? (item.quantity || '') : '';
    $('#pantry-input-cost').value = isEdit && item.estimated_cost ? item.estimated_cost : '';
    $('#pantry-input-vendor').value = isEdit ? (item.market_vendor || '') : '';

    backdrop.classList.add('open');

    $('#btn-close-pantry-modal').onclick = () => backdrop.classList.remove('open');
    $('#btn-cancel-pantry-modal').onclick = () => backdrop.classList.remove('open');

    $('#pantry-modal-form').onsubmit = async e => {
      e.preventDefault();
      const payload = {
        name: $('#pantry-input-name').value.trim(),
        category: $('#pantry-input-category').value,
        status: $('#pantry-input-status').value,
        quantity: $('#pantry-input-quantity').value.trim(),
        estimated_cost: Number($('#pantry-input-cost').value) || null,
        market_vendor: $('#pantry-input-vendor').value.trim()
      };
      if ($('#pantry-item-id').value) {
        payload.id = Number($('#pantry-item-id').value);
      }
      await A.savePantryItem(payload);
      backdrop.classList.remove('open');
      toast(isEdit ? 'Ingredient updated' : 'Ingredient added to pantry');
      if (tab === 'pantry') render();
    };
  }

  // ================================================================
  // 5. STOCK & DAILY PORTIONS VIEW
  // ================================================================
  let portionDay = null;

  async function portionsView(v) {
    const earliest = ESCA.earliestDate(await A.allSettings());
    portionDay = portionDay || earliest;

    const [menu, setPortions, orders] = await Promise.all([
      ESCA.getMenu(true),
      A.portions(portionDay),
      A.orders(portionDay, portionDay)
    ]);

    const booked = {};
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      (o.order_items || []).forEach(i => {
        booked[i.menu_item_id] = (booked[i.menu_item_id] || 0) + i.quantity;
      });
    });

    const getSetNumber = id => {
      const r = setPortions.find(x => x.menu_item_id === id);
      return r ? r.portions : null;
    };

    const rows = menu.filter(m => m.is_active);

    v.innerHTML = `
      <div class="row" style="align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 style="margin:0; font-size:1.35rem; font-weight:700;">Portion Limits</h2>
          <span class="small muted">Set daily batch portions for <b>${esc(fmtDate(portionDay))}</b>. Leave blank for no limit.</span>
        </div>
        <div class="row" style="gap:8px;">
          <button type="button" class="chip ${portionDay === earliest ? 'on' : ''}" data-pday="${earliest}">Next order day</button>
          <input type="date" id="portions-day-picker" value="${portionDay}" style="width:auto; padding:6px 10px;">
        </div>
      </div>

      <div style="background:#fff; border:1px solid var(--canvas-border); border-radius:12px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
        <table class="menu-table">
          <thead>
            <tr>
              <th>Dish</th>
              <th>Category</th>
              <th>Booked for ${esc(fmtDate(portionDay))}</th>
              <th>Status Right Now</th>
              <th style="width:160px; text-align:right;">Portion Limit</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(m => {
              const n = getSetNumber(m.id);
              const b = booked[m.id] || 0;
              const left = n == null ? null : Math.max(n - b, 0);
              const statusBadge = left == null
                ? '<span class="muted small">No limit</span>'
                : left === 0
                ? '<span class="badge bad">Sold out</span>'
                : `<span class="badge ${left <= 3 ? 'warn' : 'ok'}">${left} left</span>`;

              return `
                <tr>
                  <td>
                    <b>${esc(m.name)}</b>
                    <span class="small muted" style="display:block;">${esc(m.unit_label || '')}</span>
                  </td>
                  <td><span class="badge">${esc(m.category)}</span></td>
                  <td><b>${b} portions</b></td>
                  <td>${statusBadge}</td>
                  <td style="text-align:right;">
                    <input class="portion-input" data-portion-item="${m.id}" inputmode="numeric" value="${n ?? ''}" placeholder="none" style="width:90px; text-align:center; padding:6px 8px; border:1px solid var(--canvas-border); border-radius:6px; font-weight:700;">
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    v.querySelectorAll('[data-pday]').forEach(b => {
      b.onclick = () => {
        portionDay = b.dataset.pday;
        render();
      };
    });

    $('#portions-day-picker').onchange = e => {
      portionDay = e.target.value || earliest;
      render();
    };

    v.querySelectorAll('[data-portion-item]').forEach(input => {
      input.onchange = async () => {
        const raw = input.value.replace(/\D/g, '');
        const val = raw === '' ? null : Number(raw);
        await guard(() => A.setPortions(Number(input.dataset.portionItem), portionDay, val));
        toast('Portion limit updated.');
        render();
      };
    });
  }

  // ================================================================
  // 6. CATERING ENQUIRIES VIEW (Clean, Unified, No Example Prefix, No AI Label)
  // ================================================================
  async function cateringView(v) {
    const rows = await A.list('catering_requests', 'created_at');

    v.innerHTML = `
      <div class="row" style="align-items:center; justify-content:space-between; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <div>
          <h2 style="margin:0; font-size:1.35rem; font-weight:700;">Catering Enquiries</h2>
          <span class="small muted">Customer event requests, guest counts, and quotes.</span>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-open-new-catering" type="button" style="display:inline-flex; align-items:center; gap:6px;">
          ${ICONS.plus} <span>New enquiry</span>
        </button>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px;">
        ${rows.map(r => {
          const clientName = (r.name || 'Client').replace(/^Example:\s*/i, '');
          const summaryText = r.summary || r.ai_summary || '';

          return `
            <div class="catering-card">
              <div class="catering-card-head">
                <div>
                  <div class="catering-client-name">${esc(clientName)}</div>
                  <div class="catering-event-meta">
                    ${r.event_type ? `<span class="badge">${esc(r.event_type)}</span>` : ''}
                    ${r.guests ? `<span class="badge">${r.guests} guests</span>` : ''}
                    <span class="small muted">${r.event_date ? esc(fmtDate(r.event_date)) : 'Date TBD'} · ${esc(r.location || 'Aba')}</span>
                  </div>
                </div>
                <select class="catering-status-select" data-cat-status="${r.id}">
                  ${['new', 'contacted', 'quoted', 'won', 'lost'].map(s => `
                    <option value="${s}" ${s === r.status ? 'selected' : ''}>${s === 'new' ? 'NEW ENQUIRY' : s.toUpperCase()}</option>
                  `).join('')}
                </select>
              </div>

              <div class="catering-details-box">
                ${r.service ? `<div class="catering-detail-row"><span class="small muted">Requested service</span><b>${esc(r.service)}</b></div>` : ''}
                ${r.budget ? `<div class="catering-detail-row"><span class="small muted">Customer budget</span><b>${esc(r.budget)}</b></div>` : ''}
                ${r.details ? `<div class="catering-detail-row"><span class="small muted">Details</span><span>${esc(r.details)}</span></div>` : ''}
              </div>

              ${summaryText ? `
                <div class="catering-summary-box">
                  <span class="small" style="font-weight:700; color:var(--ink); text-transform:uppercase; letter-spacing:0.04em;">Summary</span>
                  <p style="margin:4px 0 0; font-size:0.86rem; color:var(--ink); line-height:1.45;">${esc(summaryText)}</p>
                </div>
              ` : ''}

              <div class="catering-card-actions">
                <a class="btn btn-wa btn-sm" href="${wa(r.phone, `Hello ${clientName.split(' ')[0]}, this is Mamoke from ${ESCA.B.NAME || "Mamoke's Kitchen"} regarding your catering enquiry.`)}" target="_blank" rel="noopener">
                  WhatsApp ${esc(r.phone)}
                </a>
                <div class="catering-quote-wrap">
                  <span class="small muted">Quote ₦</span>
                  <input id="cat-quote-${r.id}" data-cat-quote="${r.id}" inputmode="numeric" value="${r.quote_amount ?? ''}" placeholder="e.g. 250000">
                  <button class="btn btn-primary btn-sm" type="button" data-save-quote="${r.id}">Save</button>
                </div>
              </div>
            </div>
          `;
        }).join('') || `
          <div style="background:#fff; border:1px solid var(--canvas-border); border-radius:12px; padding:40px; text-align:center;">
            <p class="muted" style="margin:0;">No catering enquiries received yet.</p>
          </div>
        `}
      </div>
    `;

    const btnNewCatering = $('#btn-open-new-catering');
    if (btnNewCatering) btnNewCatering.onclick = () => openNewCateringModal();

    v.querySelectorAll('[data-cat-status]').forEach(sel => {
      sel.onchange = async () => {
        await guard(() => A.update('catering_requests', Number(sel.dataset.catStatus), { status: sel.value }));
        toast('Enquiry status updated.');
        refreshBadgeCounts();
        render();
      };
    });

    v.querySelectorAll('[data-save-quote]').forEach(btn => {
      btn.onclick = async () => {
        const id = Number(btn.dataset.saveQuote);
        const input = $(`#cat-quote-${id}`);
        const raw = input.value.replace(/\D/g, '');
        const val = raw === '' ? null : Number(raw);
        await guard(() => A.update('catering_requests', id, { quote_amount: val }));
        toast('Quote amount saved.');
      };
    });
  }

  // ================================================================
  // 7. FEEDBACK VIEW
  // ================================================================
  async function feedbackView(v) {
    const rows = ESCA.DEMO ? [] : await A.list('feedback', 'created_at');

    v.innerHTML = `
      <div style="margin-bottom:14px;">
        <h2 style="margin:0; font-size:1.35rem; font-weight:700;">Customer WhatsApp Feedback</h2>
        <span class="small muted">Post-meal reviews received via Ask Esca automated WhatsApp check-ins.</span>
      </div>

      <div class="menu-atelier-table-wrap">
        <table class="menu-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Rating</th>
              <th>Customer Comment</th>
              <th>Customer Contact</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="small muted">${esc(ESCA.fmtDateTime(r.created_at))}</td>
                <td><b>${r.rating ? `${r.rating} / 5` : '-'}</b></td>
                <td>${esc(r.comment || '')}</td>
                <td><a href="${wa(r.phone)}" target="_blank" rel="noopener">${esc(r.phone || '')}</a></td>
              </tr>
            `).join('') || `
              <tr>
                <td colspan="4" style="text-align:center; padding:40px; color:var(--muted);">
                  ${ESCA.DEMO ? 'Feedback arrives automatically through WhatsApp once n8n webhook is connected.' : 'No customer feedback recorded yet.'}
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
  }

  // ================================================================
  // 8. SETTINGS VIEW (Full Business Info, About Us & Delivery Fees)
  // ================================================================
  async function settingsView(v) {
    const s = await A.allSettings();
    const b = s.business || {};
    const zones = s.delivery_zones || [];

    v.innerHTML = `
      <div class="row" style="align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:16px;">
        <div>
          <h2 style="margin:0; font-size:1.35rem; font-weight:700;">Kitchen & Business Settings</h2>
          <span class="small muted">Manage your brand story, announcement banner, contact info, operating hours, delivery fees, and order rules.</span>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-save-all-settings" type="button" style="display:inline-flex; align-items:center; gap:6px;">
          <span>Save all settings</span>
        </button>
      </div>

      <div class="settings-grid">
        <!-- 1. Brand Profile & Story -->
        <div class="settings-card" style="grid-column:1/-1;">
          <div class="row" style="align-items:center; justify-content:space-between;">
            <h3>Brand Story & About Us</h3>
            <span class="small muted">Website & Public Info</span>
          </div>
          <div class="stack" style="gap:12px;">
            <div class="grid-2">
              <div class="field" style="margin:0;">
                <label class="small muted" for="set-biz-name">Kitchen / Business name</label>
                <input id="set-biz-name" value="${esc(b.name || (ESCA.B && ESCA.B.NAME) || "Mamoke's Kitchen")}">
              </div>
              <div class="field" style="margin:0;">
                <label class="small muted" for="set-biz-tagline">Tagline</label>
                <input id="set-biz-tagline" value="${esc(b.tagline || '')}" placeholder="Food that looks good and tastes even better">
              </div>
            </div>

            <div class="field" style="margin:0;">
              <label class="small muted" for="set-biz-about">About Mamoke & Kitchen (Public Brand Story)</label>
              <textarea id="set-biz-about" rows="3" style="width:100%; border:1px solid var(--canvas-border); border-radius:8px; padding:10px; font-size:0.86rem; resize:vertical;">${esc(b.about_story || "Mamoke's Kitchen is an online kitchen and boutique catering studio. Every soup bowl, protein pack, and catering tray is prepared from scratch with market-fresh local ingredients, traditional Nigerian flavours, and modern food styling.")}</textarea>
            </div>

            <div class="field" style="margin:0;">
              <label class="small muted" for="set-biz-announcement">Website Announcement Banner</label>
              <input id="set-biz-announcement" value="${esc(b.announcement_banner || '')}" placeholder="e.g. Taking advance catering orders for weekend events · Please order 48 hours ahead">
            </div>

            <label class="switch-toggle" style="align-self:flex-start;">
              <input type="checkbox" id="set-biz-announcement-active" ${b.announcement_active ? 'checked' : ''}>
              <span class="switch-track"></span>
              <span class="small muted" style="font-weight:600;">Show announcement banner on public website</span>
            </label>
          </div>
        </div>

        <!-- 2. Contact & Social Channels -->
        <div class="settings-card">
          <div class="row" style="align-items:center; justify-content:space-between;">
            <h3>Contact & Social Channels</h3>
            <span class="small muted">Orders & Enquiries</span>
          </div>
          <div class="stack" style="gap:10px;">
            <div class="field" style="margin:0;">
              <label class="small muted" for="set-biz-address">Pickup address</label>
              <input id="set-biz-address" value="${esc(b.pickup_address || ESCA.B.ADDRESS || '123 Kitchen Avenue, Victoria Island, Lagos')}">
            </div>
            <div class="grid-2">
              <div class="field" style="margin:0;">
                <label class="small muted" for="set-biz-phone">Kitchen phone</label>
                <input id="set-biz-phone" value="${esc(b.phone || ESCA.B.PHONE || '0905 286 2612')}">
              </div>
              <div class="field" style="margin:0;">
                <label class="small muted" for="set-biz-wa">WhatsApp number</label>
                <input id="set-biz-wa" value="${esc(b.whatsapp || ESCA.B.WHATSAPP || '2349052862612')}">
              </div>
            </div>
            <div class="grid-2">
              <div class="field" style="margin:0;">
                <label class="small muted" for="set-biz-email">Contact email</label>
                <input id="set-biz-email" value="${esc(b.email || 'mamoke@mamokeskitchen.ng')}">
              </div>
              <div class="field" style="margin:0;">
                <label class="small muted" for="set-biz-ig">Instagram handle</label>
                <input id="set-biz-ig" value="${esc(b.instagram || '@mamokes_kitchen')}">
              </div>
            </div>
            <div class="field" style="margin:0;">
              <label class="small muted" for="set-biz-tiktok">TikTok handle</label>
              <input id="set-biz-tiktok" value="${esc(b.tiktok || '@mamokes_kitchen')}">
            </div>
          </div>
        </div>

        <!-- 3. Operating Hours & Service Description -->
        <div class="settings-card">
          <div class="row" style="align-items:center; justify-content:space-between;">
            <h3>Hours & Services</h3>
            <span class="small muted">Kitchen Schedule</span>
          </div>
          <div class="stack" style="gap:10px;">
            <div class="field" style="margin:0;">
              <label class="small muted" for="set-biz-hours">Operating schedule & hours</label>
              <input id="set-biz-hours" value="${esc(b.opening_hours || 'Monday to Saturday: 8:00 AM - 8:00 PM · Sunday: Closed (Advance pre-orders only)')}">
            </div>
            <div class="field" style="margin:0;">
              <label class="small muted" for="set-biz-services">Services & Catering offerings (Feeds Ask Esca)</label>
              <textarea id="set-biz-services" rows="4" style="width:100%; border:1px solid var(--canvas-border); border-radius:8px; padding:10px; font-size:0.86rem; resize:vertical;">${esc(s.services || '')}</textarea>
            </div>
          </div>
        </div>

        <!-- 4. Editable Aba Delivery Zones & Fees -->
        <div class="settings-card">
          <div class="row" style="align-items:center; justify-content:space-between;">
            <h3>Aba Delivery Fees</h3>
            <button class="btn btn-ghost btn-sm" id="btn-add-zone" type="button">+ Add zone</button>
          </div>
          <p class="muted small" style="margin:0;">Adjust delivery fees for different parts of Aba. Customers are charged these rates at checkout.</p>
          <div class="stack" id="delivery-zones-list" style="gap:8px;">
            ${zones.map((z, idx) => `
              <div class="zone-row-edit" data-zone-index="${idx}">
                <input class="zone-name-input" value="${esc(z.name)}" placeholder="Zone area (e.g. Aba central)" style="flex:2;" required>
                <span class="small muted">₦</span>
                <input class="zone-fee-input" inputmode="numeric" value="${z.fee}" placeholder="Fee" style="flex:1;" required>
                <button type="button" class="option-del-btn zone-del-btn" title="Remove zone">${ICONS.trash}</button>
              </div>
            `).join('')}
          </div>
          <button class="btn btn-primary btn-sm" id="btn-save-delivery-zones" type="button" style="align-self:flex-start; margin-top:4px;">Save Delivery Fees</button>
        </div>

        <!-- 5. Kitchen Order Rules -->
        <div class="settings-card">
          <div class="row" style="align-items:center; justify-content:space-between;">
            <h3>Kitchen Order Rules</h3>
            <span class="small muted">Timing & Lead Days</span>
          </div>
          <div class="stack" style="gap:10px;">
            <div class="field" style="margin:0;">
              <label class="small muted" for="set-max-days">Advance order days ahead</label>
              <input id="set-max-days" inputmode="numeric" value="${esc(s.max_days_ahead || 30)}">
            </div>
            <div class="field" style="margin:0;">
              <label class="small muted" for="set-max-orders">Maximum orders per day</label>
              <input id="set-max-orders" inputmode="numeric" value="${esc(s.max_orders_per_day || 25)}">
            </div>
            <div class="field" style="margin:0;">
              <label class="small muted" for="set-cutoff">Next-day order cut-off (24h time, e.g. 20 for 8 PM)</label>
              <input id="set-cutoff" inputmode="numeric" value="${esc(s.cutoff_hour || 20)}">
            </div>
            <button class="btn btn-primary btn-sm" id="btn-save-kitchen-rules" type="button" style="align-self:flex-start; margin-top:4px;">Save Rules</button>
          </div>
        </div>
      </div>
    `;

    // Gather zones helper
    function getZonesFromForm() {
      const updatedZones = [];
      v.querySelectorAll('.zone-row-edit').forEach((row, i) => {
        const name = row.querySelector('.zone-name-input').value.trim();
        const fee = Number(row.querySelector('.zone-fee-input').value.replace(/\D/g, '')) || 0;
        if (name) {
          const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_') || `zone_${i + 1}`;
          updatedZones.push({ id, name, fee });
        }
      });
      return updatedZones;
    }

    // Save All Settings
    const saveAll = async () => {
      const updatedBiz = {
        ...(s.business || {}),
        name: $('#set-biz-name').value.trim(),
        pickup_address: $('#set-biz-address').value.trim(),
        tagline: $('#set-biz-tagline').value.trim(),
        about_story: $('#set-biz-about').value.trim(),
        announcement_banner: $('#set-biz-announcement').value.trim(),
        announcement_active: $('#set-biz-announcement-active').checked,
        phone: $('#set-biz-phone').value.trim(),
        whatsapp: $('#set-biz-wa').value.trim(),
        email: $('#set-biz-email').value.trim(),
        instagram: $('#set-biz-ig').value.trim(),
        tiktok: $('#set-biz-tiktok').value.trim(),
        opening_hours: $('#set-biz-hours').value.trim()
      };

      const maxDays = Number($('#set-max-days').value.replace(/\D/g, '')) || 30;
      const maxOrders = Number($('#set-max-orders').value.replace(/\D/g, '')) || 25;
      const cutoff = Number($('#set-cutoff').value.replace(/\D/g, '')) || 20;
      const servicesText = $('#set-biz-services').value.trim();
      const updatedZones = getZonesFromForm();

      await guard(async () => {
        await A.saveAllSettings({
          business: updatedBiz,
          services: servicesText,
          delivery_zones: updatedZones,
          max_days_ahead: maxDays,
          max_orders_per_day: maxOrders,
          cutoff_hour: cutoff
        });
      });
      toast('All kitchen and business settings saved.');
    };

    $('#btn-save-all-settings').onclick = saveAll;

    // Add Zone row
    $('#btn-add-zone').onclick = () => {
      const list = $('#delivery-zones-list');
      const row = document.createElement('div');
      row.className = 'zone-row-edit';
      row.innerHTML = `
        <input class="zone-name-input" value="" placeholder="Area name (e.g. Osisioma)" style="flex:2;" required>
        <span class="small muted">₦</span>
        <input class="zone-fee-input" inputmode="numeric" value="2500" placeholder="Fee" style="flex:1;" required>
        <button type="button" class="option-del-btn zone-del-btn" title="Remove zone">${ICONS.trash}</button>
      `;
      row.querySelector('.zone-del-btn').onclick = () => row.remove();
      list.appendChild(row);
    };

    // Delete zone handlers
    v.querySelectorAll('.zone-del-btn').forEach(btn => {
      btn.onclick = () => btn.closest('.zone-row-edit').remove();
    });

    // Save Delivery Zones only
    $('#btn-save-delivery-zones').onclick = async () => {
      const updatedZones = getZonesFromForm();
      await guard(async () => {
        await A.setSetting('delivery_zones', updatedZones);
      });
      toast('Delivery fees updated.');
    };

    // Save Kitchen Rules only
    $('#btn-save-kitchen-rules').onclick = async () => {
      const maxDays = Number($('#set-max-days').value.replace(/\D/g, '')) || 30;
      const maxOrders = Number($('#set-max-orders').value.replace(/\D/g, '')) || 25;
      const cutoff = Number($('#set-cutoff').value.replace(/\D/g, '')) || 20;

      await guard(async () => {
        await A.setSetting('max_days_ahead', maxDays);
        await A.setSetting('max_orders_per_day', maxOrders);
        await A.setSetting('cutoff_hour', cutoff);
      });
      toast('Kitchen rules saved.');
    };
  }

  // ================================================================
  // 9. TEAM & STAFF VIEW
  // ================================================================
  async function teamView(v) {
    const list = await A.profiles();

    v.innerHTML = `
      <div style="margin-bottom:14px;">
        <h2 style="margin:0; font-size:1.35rem; font-weight:700;">Team & Staff Approval</h2>
        <span class="small muted">Approve kitchen assistants, dispatch riders, and staff accounts.</span>
      </div>

      <div class="menu-atelier-table-wrap">
        <table class="menu-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Registered</th>
              <th>Role / Status</th>
              <th style="text-align:right;">Access</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(p => `
              <tr>
                <td><b>${esc(p.full_name || 'Staff')}</b></td>
                <td>${esc(p.email)}</td>
                <td class="small muted">${esc(fmtDate(p.created_at))}</td>
                <td><span class="badge ${p.role === 'admin' ? 'ok' : p.role === 'staff' ? '' : 'warn'}">${esc(p.role || 'pending')}</span></td>
                <td style="text-align:right;">
                  ${p.role !== 'admin' ? `
                    <select data-team-role="${p.id}" style="padding:4px 8px; font-size:0.8rem; width:auto;">
                      <option value="pending" ${p.role === 'pending' ? 'selected' : ''}>Pending</option>
                      <option value="staff" ${p.role === 'staff' ? 'selected' : ''}>Staff (Approved)</option>
                      <option value="rejected" ${p.role === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                  ` : '<b class="small">Owner</b>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    v.querySelectorAll('[data-team-role]').forEach(sel => {
      sel.onchange = async () => {
        await guard(() => A.update('profiles', sel.dataset.teamRole, { role: sel.value }));
        toast('Staff role updated.');
      };
    });
  }

  // ================================================================
  // 10. PHONE & MESSAGE DIRECT ORDER ENTRY (Staff Dashboard)
  // ================================================================
  let currentOrderDayMenu = null;

  async function openNewOrderModal() {
    const backdrop = $('#new-order-modal-backdrop');
    if (!backdrop) return;

    const settings = await A.allSettings();
    const earliest = ESCA.earliestDate(settings);
    const dateInput = $('#no-date');
    const timeSlotSelect = $('#no-time-slot');
    const deliveryZoneSelect = $('#no-delivery-zone');
    const itemsContainer = $('#no-items-container');
    const form = $('#new-order-modal-form');
    const successView = $('#new-order-success-view');
    const errorMsg = $('#new-order-error-msg');

    form.style.display = 'flex';
    form.reset();
    successView.style.display = 'none';
    errorMsg.style.display = 'none';
    errorMsg.innerHTML = '';

    dateInput.min = earliest;
    dateInput.value = day && day >= earliest ? day : earliest;

    const slots = settings.time_slots || ['10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00'];
    timeSlotSelect.innerHTML = slots.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');

    const zones = settings.delivery_zones || [];
    deliveryZoneSelect.innerHTML = `
      <option value="" disabled selected>-- Select delivery area --</option>
      ${zones.map(z => `<option value="${esc(z.id)}" data-fee="${Number(z.fee || 0)}">${esc(z.name)} (${money(z.fee)})</option>`).join('')}
    `;

    $('#no-radio-delivery').checked = true;
    $('#no-delivery-fields').style.display = 'flex';

    currentOrderDayMenu = await ESCA.getDayMenu(dateInput.value);

    itemsContainer.innerHTML = '';
    appendNewOrderItemLine();
    updateNewOrderEstTotal();

    backdrop.classList.add('open');

    const closeNewOrderModal = () => {
      backdrop.classList.remove('open');
    };
    $('#btn-close-new-order-modal').onclick = closeNewOrderModal;
    $('#btn-cancel-new-order-modal').onclick = closeNewOrderModal;
    $('#btn-no-done').onclick = () => {
      closeNewOrderModal();
      refreshHorizonTicker();
      render();
    };

    $('#no-radio-delivery').onchange = () => {
      $('#no-delivery-fields').style.display = 'flex';
      updateNewOrderEstTotal();
    };
    $('#no-radio-pickup').onchange = () => {
      $('#no-delivery-fields').style.display = 'none';
      updateNewOrderEstTotal();
    };

    deliveryZoneSelect.onchange = () => {
      updateNewOrderEstTotal();
    };

    dateInput.onchange = async () => {
      if (dateInput.value < earliest) dateInput.value = earliest;
      toast('Loading menu for ' + fmtDate(dateInput.value) + '...');
      currentOrderDayMenu = await ESCA.getDayMenu(dateInput.value);
      refreshAllOrderItemLines();
      updateNewOrderEstTotal();
    };

    $('#btn-no-add-item').onclick = () => {
      appendNewOrderItemLine();
    };

    form.onsubmit = async e => {
      e.preventDefault();
      errorMsg.style.display = 'none';
      errorMsg.innerHTML = '';

      const name = $('#no-name').value.trim();
      const phone = $('#no-phone').value.trim();
      const email = $('#no-email').value.trim();
      const fulfilment = $('#no-radio-delivery').checked ? 'delivery' : 'pickup';
      const delivery_zone = fulfilment === 'delivery' ? deliveryZoneSelect.value : null;
      const address = fulfilment === 'delivery' ? $('#no-address').value.trim() : null;
      const landmark = fulfilment === 'delivery' ? $('#no-landmark').value.trim() : null;
      const chosenDate = dateInput.value;
      const time_slot = timeSlotSelect.value;
      const notes = $('#no-notes').value.trim();

      if (!name) return showNewOrderError('Please enter customer name');
      if (phone.replace(/\D/g, '').length < 10) return showNewOrderError('Please enter a valid WhatsApp phone number (at least 10 digits)');
      if (fulfilment === 'delivery') {
        if (!delivery_zone) return showNewOrderError('Please select a delivery area');
        if (!address) return showNewOrderError('Please enter street address in Aba');
      }
      if (!chosenDate) return showNewOrderError('Please pick a fulfilment date');
      if (!time_slot) return showNewOrderError('Please choose a time window');

      const lines = $$('#no-items-container .no-item-line');
      const itemsPayload = [];
      const menuItems = currentOrderDayMenu?.items || (Array.isArray(currentOrderDayMenu) ? currentOrderDayMenu : []);

      for (const line of lines) {
        const dishSel = line.querySelector('.no-dish-select');
        const optSel = line.querySelector('.no-opt-select');
        const qtyInp = line.querySelector('.no-qty-input');
        const dishId = dishSel?.value;
        const optId = optSel?.value;
        const qty = Number(qtyInp?.value || 1);

        if (!dishId) continue;
        const dish = menuItems.find(m => String(m.menu_item_id || m.id) === dishId);
        if (dish && dish.options && dish.options.length > 0 && !optId) {
          return showNewOrderError(`Please choose a size/portion for ${dish.name}`);
        }
        itemsPayload.push({
          menu_item_id: Number(dishId),
          option_id: optId ? Number(optId) : null,
          quantity: qty
        });
      }

      if (!itemsPayload.length) return showNewOrderError('Please add at least one dish to the order');

      const submitBtn = $('#btn-submit-new-order');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Placing order...';

      const payload = {
        channel: 'dashboard',
        customer: {
          name,
          phone,
          email: email || undefined
        },
        fulfilment,
        delivery_zone: fulfilment === 'delivery' ? delivery_zone : undefined,
        address: fulfilment === 'delivery' ? address : undefined,
        landmark: fulfilment === 'delivery' ? landmark : undefined,
        date: chosenDate,
        time_slot,
        notes: notes || undefined,
        items: itemsPayload
      };

      const r = await ESCA.call('place_order', payload);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Place order';

      if (!r || !r.ok) {
        showNewOrderError(r?.error || 'Failed to place order. Please check inputs and try again.');
        return;
      }

      form.style.display = 'none';
      successView.style.display = 'block';

      $('#no-success-code').textContent = r.code;
      $('#no-success-summary').textContent = `${esc(fmtDate(r.date))} : ${esc(r.time_slot)} : ${r.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}`;
      $('#no-success-total').textContent = money(r.total);
      $('#no-success-customer').textContent = `${esc(r.customer?.name || name)} (${esc(r.customer?.phone || phone)})`;
      $('#no-success-paystatus').className = 'badge warn';
      $('#no-success-paystatus').textContent = 'Awaiting payment';

      const payUrl = r.checkout_url && r.checkout_url.startsWith('http')
        ? r.checkout_url
        : `${location.origin}/${String(r.checkout_url || '').replace(/^\//, '')}`;
      $('#no-success-link').value = payUrl;

      // Button 1: Copy payment link
      $('#btn-no-copy-link').onclick = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payUrl).then(() => toast('Payment link copied')).catch(() => {
            $('#no-success-link').select();
            document.execCommand('copy');
            toast('Payment link copied');
          });
        } else {
          $('#no-success-link').select();
          document.execCommand('copy');
          toast('Payment link copied');
        }
      };

      // Button 2: Send link on WhatsApp
      $('#btn-no-send-wa').onclick = () => {
        const phone10 = String(r.customer?.phone || phone).replace(/\D/g, '').slice(-10);
        const msg = `Hello ${r.customer?.name || name}, your order ${r.code} (${money(r.total)}) from ${ESCA.B.NAME || "Mamoke's Kitchen"} has been created. Here is your secure payment link: ${payUrl}`;
        window.open(`https://wa.me/234${phone10}?text=${encodeURIComponent(msg)}`, '_blank');
      };

      // Button 3: Mark paid (transfer/cash)
      const markPaidBtn = $('#btn-no-mark-paid');
      markPaidBtn.disabled = false;
      markPaidBtn.textContent = 'Mark paid (transfer/cash)';
      markPaidBtn.onclick = async () => {
        markPaidBtn.disabled = true;
        markPaidBtn.textContent = 'Recording payment...';
        await guard(() => A.update('orders', r.order_id, {
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'manual',
          amount_paid: r.total,
          paid_at: new Date().toISOString(),
          needs_attention: null
        }));
        toast(`Order ${r.code} marked paid.`);
        $('#no-success-paystatus').className = 'badge ok';
        $('#no-success-paystatus').textContent = `Paid ${money(r.total)}`;
        markPaidBtn.textContent = 'Paid (transfer/cash) confirmed';
        refreshHorizonTicker();
        render();
      };

      day = r.date;
      refreshHorizonTicker();
      render();
    };
  }

  function showNewOrderError(errText) {
    const errorMsg = $('#new-order-error-msg');
    if (!errorMsg) return;
    errorMsg.innerHTML = `<div class="notice err" style="margin-bottom:12px;">${esc(errText)}</div>`;
    errorMsg.style.display = 'block';
    $('#new-order-modal').scrollTop = 0;
  }

  function appendNewOrderItemLine(selItemId, selOptId, selQty) {
    const container = $('#no-items-container');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'no-item-line';

    const menuItems = currentOrderDayMenu?.items || (Array.isArray(currentOrderDayMenu) ? currentOrderDayMenu : []);
    const dishes = menuItems.filter(m => (m.options && m.options.length > 0) || m.price != null);

    row.innerHTML = `
      <div style="flex:2; min-width:180px;">
        <select class="no-dish-select" required>
          <option value="" disabled ${!selItemId ? 'selected' : ''}>-- Select a dish --</option>
          ${dishes.map(m => {
            const id = m.menu_item_id || m.id;
            const isSoldOut = m.portions_left === 0;
            const leftLabel = m.portions_left != null ? (isSoldOut ? ' (Sold out)' : ` (${m.portions_left} left)`) : '';
            const isSel = selItemId && String(id) === String(selItemId);
            return `<option value="${id}" ${isSoldOut ? 'disabled style="color:#999;"' : ''} ${isSel ? 'selected' : ''}>${esc(m.name)}${leftLabel}</option>`;
          }).join('')}
        </select>
      </div>
      <div style="flex:1.5; min-width:140px;" class="no-opt-wrap">
        <select class="no-opt-select" disabled>
          <option value="">Standard</option>
        </select>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <input type="number" class="no-qty-input" min="1" max="50" value="${selQty || 1}" style="width:65px; padding:6px 8px; text-align:center;">
        <button type="button" class="btn btn-ghost btn-sm no-item-del-btn" title="Remove line" style="padding:6px; color:#c8361c;">
          ${ICONS.trash}
        </button>
      </div>
    `;

    const dishSel = row.querySelector('.no-dish-select');
    const optSel = row.querySelector('.no-opt-select');
    const qtyInp = row.querySelector('.no-qty-input');
    const delBtn = row.querySelector('.no-item-del-btn');

    const updateOptSelect = (chosenDish, targetOptId) => {
      if (chosenDish && chosenDish.options && chosenDish.options.length > 0) {
        optSel.disabled = false;
        optSel.innerHTML = `
          <option value="" disabled ${!targetOptId ? 'selected' : ''}>-- Select size --</option>
          ${chosenDish.options.map(o => {
            const optId = o.option_id || o.id;
            const isOptSel = targetOptId && String(optId) === String(targetOptId);
            return `<option value="${optId}" data-price="${o.price}" ${isOptSel ? 'selected' : ''}>${esc(o.option_name)} (${money(o.price)})</option>`;
          }).join('')}
        `;
        if (chosenDish.options.length === 1) {
          optSel.value = chosenDish.options[0].option_id || chosenDish.options[0].id;
        }
      } else if (chosenDish && chosenDish.price != null) {
        optSel.disabled = true;
        optSel.innerHTML = `<option value="" data-price="${chosenDish.price}">Standard (${money(chosenDish.price)})</option>`;
      } else {
        optSel.disabled = true;
        optSel.innerHTML = `<option value="">Standard</option>`;
      }
    };

    if (selItemId) {
      const initDish = dishes.find(m => String(m.menu_item_id || m.id) === String(selItemId));
      updateOptSelect(initDish, selOptId);
    }

    dishSel.onchange = () => {
      const chosenDish = dishes.find(m => String(m.menu_item_id || m.id) === dishSel.value);
      updateOptSelect(chosenDish, null);
      updateNewOrderEstTotal();
    };

    optSel.onchange = () => {
      updateNewOrderEstTotal();
    };

    qtyInp.oninput = () => {
      updateNewOrderEstTotal();
    };

    delBtn.onclick = () => {
      const allLines = container.querySelectorAll('.no-item-line');
      if (allLines.length > 1) {
        row.remove();
      } else {
        dishSel.value = '';
        optSel.disabled = true;
        optSel.innerHTML = '<option value="">Standard</option>';
        qtyInp.value = 1;
      }
      updateNewOrderEstTotal();
    };

    container.appendChild(row);
  }

  function refreshAllOrderItemLines() {
    const container = $('#no-items-container');
    if (!container) return;
    const lines = container.querySelectorAll('.no-item-line');
    const existing = [];
    lines.forEach(line => {
      const dishId = line.querySelector('.no-dish-select')?.value;
      const optId = line.querySelector('.no-opt-select')?.value;
      const qty = Number(line.querySelector('.no-qty-input')?.value || 1);
      if (dishId) existing.push({ dishId, optId, qty });
    });

    container.innerHTML = '';
    if (existing.length) {
      existing.forEach(item => appendNewOrderItemLine(item.dishId, item.optId, item.qty));
    } else {
      appendNewOrderItemLine();
    }
  }

  function updateNewOrderEstTotal() {
    const estEl = $('#no-est-total');
    if (!estEl) return;
    let subtotal = 0;
    const lines = $$('#no-items-container .no-item-line');
    const menuItems = currentOrderDayMenu?.items || (Array.isArray(currentOrderDayMenu) ? currentOrderDayMenu : []);

    lines.forEach(line => {
      const dishSel = line.querySelector('.no-dish-select');
      const optSel = line.querySelector('.no-opt-select');
      const qtyInp = line.querySelector('.no-qty-input');
      const dishId = dishSel?.value;
      const qty = Math.max(1, Number(qtyInp?.value || 1));
      if (!dishId) return;

      const dish = menuItems.find(m => String(m.menu_item_id || m.id) === dishId);
      if (!dish) return;

      let unitPrice = 0;
      if (dish.options && dish.options.length > 0) {
        const optId = optSel?.value;
        const opt = dish.options.find(o => String(o.option_id || o.id) === optId);
        if (opt && opt.price != null) unitPrice = Number(opt.price);
      } else if (dish.price != null) {
        unitPrice = Number(dish.price);
      }
      subtotal += unitPrice * qty;
    });

    const isDelivery = $('#no-radio-delivery')?.checked;
    let delFee = 0;
    if (isDelivery) {
      const zoneSel = $('#no-delivery-zone');
      const selectedOpt = zoneSel?.selectedOptions[0];
      delFee = Number(selectedOpt?.dataset.fee || 0);
    }

    estEl.textContent = money(subtotal + delFee);
  }

  // ================================================================
  // 11. CATERING ENQUIRY DIRECT ENTRY (Staff Dashboard)
  // ================================================================
  function openNewCateringModal() {
    const backdrop = $('#new-catering-modal-backdrop');
    if (!backdrop) return;

    const form = $('#new-catering-modal-form');
    const errorMsg = $('#new-catering-error-msg');
    form.reset();
    errorMsg.style.display = 'none';
    errorMsg.innerHTML = '';

    $('#nc-date').min = todayISO();

    backdrop.classList.add('open');

    const closeNewCateringModal = () => {
      backdrop.classList.remove('open');
    };
    $('#btn-close-new-catering-modal').onclick = closeNewCateringModal;
    $('#btn-cancel-new-catering-modal').onclick = closeNewCateringModal;

    form.onsubmit = async e => {
      e.preventDefault();
      errorMsg.style.display = 'none';
      errorMsg.innerHTML = '';

      const name = $('#nc-name').value.trim();
      const phone = $('#nc-phone').value.trim();
      const email = $('#nc-email').value.trim();
      const event_type = $('#nc-type').value;
      const event_date = $('#nc-date').value;
      const guests = $('#nc-guests').value.trim();
      const budget = $('#nc-budget').value.trim();
      const location = $('#nc-location').value.trim();
      const service = $('#nc-service').value.trim();
      const details = $('#nc-details').value.trim();

      if (!name) {
        errorMsg.innerHTML = '<div class="notice err" style="margin-bottom:12px;">Please enter client name</div>';
        errorMsg.style.display = 'block';
        return;
      }
      if (phone.replace(/\D/g, '').length < 10) {
        errorMsg.innerHTML = '<div class="notice err" style="margin-bottom:12px;">Please enter a valid phone number (at least 10 digits)</div>';
        errorMsg.style.display = 'block';
        return;
      }

      const submitBtn = $('#btn-submit-new-catering');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving enquiry...';

      const payload = {
        name,
        phone,
        email: email || undefined,
        event_type,
        event_date: event_date || undefined,
        guests: guests || undefined,
        budget: budget || undefined,
        location: location || undefined,
        service: service || undefined,
        details: details || undefined
      };

      const r = await ESCA.call('catering', payload);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Save enquiry';

      if (!r || !r.ok) {
        errorMsg.innerHTML = `<div class="notice err" style="margin-bottom:12px;">${esc(r?.error || 'Could not save catering enquiry')}</div>`;
        errorMsg.style.display = 'block';
        return;
      }

      const ref = r.request_id || r.id || r.reference_id || 'new';
      toast(`Saved, reference #${ref}`);
      backdrop.classList.remove('open');
      refreshBadgeCounts();
      render();
    };
  }

  function switchTab(newTab) {
    tab = newTab;
    ESCA.store.set('esca_admin_tab', tab);
    $$('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === tab));
    render();
  }

  // ---------------------------------------------------------------- Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
