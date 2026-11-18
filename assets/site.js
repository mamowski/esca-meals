/* Esca Meals: Shared site chrome (Header, Footer, Cart, Dish Art, Floating WhatsApp)
   Clean Premium Direction 2 styling: No em dashes, no emojis, mobile-first. */
(function () {
  const { esc, B, store, money } = ESCA;

  // ---------- Cart Layer (localStorage) ----------
  const Cart = {
    items() { return store.get('esca_cart', []); },
    save(items) {
      store.set('esca_cart', items);
      Cart.render();
      document.dispatchEvent(new CustomEvent('cart-changed'));
    },
    add(item, opt, qty = 1) {
      const items = Cart.items();
      const mid = item.menu_item_id || item.id;
      const oid = opt ? (opt.option_id || opt.id) : null;
      const key = mid + ':' + (oid || '');
      const ex = items.find(i => i.key === key);
      const totalDishQty = items.filter(i => (i.menu_item_id || i.id) === mid).reduce((a, b) => a + b.qty, 0);

      if (item.portions_left != null && (totalDishQty + qty) > item.portions_left) {
        toast(`Only ${item.portions_left} portion${item.portions_left === 1 ? '' : 's'} available for this day.`);
        return false;
      }

      if (ex) {
        ex.qty = Math.min(50, ex.qty + qty);
      } else {
        items.push({
          key,
          menu_item_id: mid,
          id: mid,
          name: item.name,
          option_id: oid,
          option_name: opt ? opt.option_name : null,
          unit: Number(opt ? opt.price : item.price),
          qty
        });
      }
      Cart.save(items);
      toast(`Added ${item.name}${opt ? ' (' + opt.option_name + ')' : ''}`);
      return true;
    },
    setQty(key, qty) {
      const items = Cart.items();
      const it = items.find(i => i.key === key);
      if (!it) return;
      it.qty = Math.min(50, qty);
      Cart.save(items.filter(i => i.qty > 0));
    },
    clear() { Cart.save([]); },
    count() { return Cart.items().reduce((a, i) => a + i.qty, 0); },
    total() { return Cart.items().reduce((a, i) => a + (i.qty * i.unit), 0); },
    render() {
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        const n = Cart.count();
        el.textContent = n;
        el.classList.toggle('hidden', !n);
      });
    }
  };

  // ---------- Toast Notification ----------
  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  // ---------- Dish Photo Art (Section 7 mapping; never emoji) ----------
  const DISH_PHOTOS = {
    'peppered-snail': 'images/peppered-snail.jpg',
    'fried-snail': 'images/peppered-snail.jpg',
    'chicken-stew': 'images/chicken-stew.jpg',
    'goat-meat-pepper-soup': 'images/goat-meat-pepper-soup.jpg',
    'ogbono-soup': 'images/ogbono-soup.jpg',
    'vegetable-soup': 'images/vegetable-soup.jpg',
    'okro-soup': 'images/ogbono-soup.jpg',
    'chicken-wrap': 'images/chicken-wrap.jpg',
    'beef-wrap': 'images/chicken-wrap.jpg',
    'turkey-wrap': 'images/chicken-wrap.jpg',
    'customised-platter': 'images/customised-platter.jpg',
    'seafood-boil': 'images/seafood-boil.jpg',
    'food-tray': 'images/food-tray.jpg',
    'basmati-fried-rice': 'images/food-tray.jpg',
    'white-rice': 'images/chicken-stew.jpg',
    'village-spaghetti': 'images/food-tray.jpg',
    'fried-plantain': 'images/food-tray.jpg',
    'swallow': 'images/vegetable-soup.jpg',
    'peppered-chicken': 'images/chicken-stew.jpg',
    'peppered-turkey': 'images/customised-platter.jpg',
    'salad-bowl': 'images/chicken-wrap.jpg',
    'smoothie': 'images/customised-platter.jpg',
    'fresh-fruit-juice': 'images/customised-platter.jpg'
  };

  function getPhoto(m) {
    if (m.image_url) return m.image_url;
    const slug = String(m.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return DISH_PHOTOS[slug] || `images/${slug}.jpg`;
  }

  function art(item, big) {
    const unit = item.unit_label ? `<span class="unit">${esc(item.unit_label.replace(/ litres?$/, 'L').replace(/^(\d+)L$/, '$1 L'))}</span>` : '';
    const src = getPhoto(item);
    return `<div class="art">
      <img src="${esc(src)}" alt="${esc(item.name)}" loading="lazy" onerror="this.parentElement.classList.add('no-img');this.remove();">
      <div class="art-fallback">${esc(item.name)}</div>
      ${unit}
    </div>`;
  }

  function priceLabel(m) {
    if (m.options && m.options.length) {
      const ps = m.options.map(o => Number(o.price));
      const lo = Math.min(...ps);
      return (ps.length > 1 && Math.max(...ps) !== lo ? 'from ' : '') + money(lo);
    }
    return m.price == null ? 'Price on request' : money(m.price);
  }

  // ---------- Header, Footer & Floating WhatsApp Chrome ----------
  function chrome() {
    const page = document.body.dataset.page || '';
    const nav = [
      ['index.html', 'Home', 'home'],
      ['menu.html', 'Menu', 'menu'],
      ['index.html#services', 'Our Services', 'services'],
      ['catering.html', 'Catering & Events', 'catering'],
      ['track.html', 'Track Order', 'track'],
      ['chat.html', 'Ask Esca', 'chat']
    ];

    const header = document.createElement('div');
    header.innerHTML = `
      <div class="announcement-bar">
        ${esc(B.ADDRESS ? B.ADDRESS.split(',')[0] : 'Online Kitchen')} · <b>Order by 8:00 PM for next-day delivery</b> · WhatsApp: ${esc(B.PHONE)}
      </div>
      ${ESCA.DEMO ? '<div class="demo-banner">Demo mode: orders are saved in this browser and payment is simulated. Add your Supabase and n8n details in <b>config.js</b> to go live.</div>' : ''}
      <header class="site-header">
        <div class="wrap">
          <a class="brand" href="index.html">
            <img src="assets/img/logo.svg" alt="${esc(B.NAME)}" width="38" height="38">
            <span>
              <b>${esc(B.NAME)}</b>
              <small>${esc(B.ADDRESS ? B.ADDRESS.split(',')[0] : 'Online Kitchen')}</small>
            </span>
          </a>
          <div style="display:flex; align-items:center; gap:8px; margin-left:auto;">
            <a href="menu.html#cart" class="cart-btn" data-open-cart aria-label="View shopping cart" title="View order">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span class="cart-count hidden" data-cart-count>0</span>
            </a>
            <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="main-nav" aria-label="Toggle Navigation">
              <span class="menu-label">Menu</span>
              <svg class="menu-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
          <nav class="nav" id="main-nav" aria-label="Main Navigation">
            ${nav.map(([h, t, p]) => `<a href="${h}" class="${p === page ? 'active' : ''}">${t}</a>`).join('')}
            <a href="${ESCA.waLink('Hello ' + (B.NAME || 'Kitchen') + '!')}" target="_blank" rel="noopener" style="color:#25D366; font-weight:700;">
              Chat on WhatsApp
            </a>
          </nav>
        </div>
      </header>`;
    document.body.prepend(header);

    const tg = header.querySelector('.menu-toggle');
    const lbl = tg.querySelector('.menu-label');
    const nv = header.querySelector('.nav');
    tg.onclick = () => {
      const o = nv.classList.toggle('open');
      tg.setAttribute('aria-expanded', o);
      lbl.textContent = o ? 'Close' : 'Menu';
      tg.classList.toggle('is-open', o);
    };

    // Close menu when a link inside it is clicked
    nv.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        nv.classList.remove('open');
        tg.setAttribute('aria-expanded', 'false');
        lbl.textContent = 'Menu';
        tg.classList.remove('is-open');
      });
    });

    // Single Floating WhatsApp Button (bottom right on all pages)
    const wa = document.createElement('a');
    wa.className = 'wa-fab';
    wa.href = ESCA.waLink('Hello ' + (B.NAME || 'Kitchen') + '! I would like to order.');
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'Chat with Mamoke on WhatsApp');
    wa.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
    document.body.appendChild(wa);

    // Clean Site Footer
    const f = document.createElement('footer');
    f.className = 'site-footer';
    f.innerHTML = `
      <div class="wrap cols">
        <div>
          <div class="brand" style="color:inherit">
            <img src="assets/img/logo.svg" alt="" width="38" height="38">
            <span><b>${esc(B.NAME)}</b></span>
          </div>
          <p class="small" style="margin-top:12px; max-width:32em;">
            ${esc(B.TAGLINE)}. Home cooked food bowls, peppered snail, rich soups and stews by the litre, chicken wraps, weekly meal plans and party trays, cooked fresh to order.
          </p>
        </div>
        <div>
          <h3>Quick Links</h3>
          <p class="small">
            <a href="menu.html">Order Online</a><br>
            <a href="index.html#services">Our Services</a><br>
            <a href="catering.html">Catering & Events</a><br>
            <a href="track.html">Track Your Order</a><br>
            <a href="chat.html">Ask Assistant</a>
          </p>
        </div>
        <div>
          <h3>Visit & Contact</h3>
          <p class="small">
            ${esc(B.ADDRESS)}<br>
            WhatsApp or call: <span style="user-select:all; font-weight:700;">${esc(B.PHONE)}</span><br>
            <a href="${ESCA.waLink('Hello ' + (B.NAME || 'Kitchen') + '!')}" target="_blank" rel="noopener">Open WhatsApp Chat →</a>
          </p>
        </div>
        <div>
          <h3>Follow</h3>
          <p class="small">
            <a href="https://www.tiktok.com/@${esc(B.TIKTOK)}" target="_blank" rel="noopener">TikTok @${esc(B.TIKTOK)}</a><br>
            <a href="https://www.instagram.com/${esc(B.INSTAGRAM)}" target="_blank" rel="noopener">Instagram @${esc(B.INSTAGRAM)}</a><br>
            ${ESCA.C.TELEGRAM_BOT ? `<a href="https://t.me/${esc(ESCA.C.TELEGRAM_BOT)}" target="_blank" rel="noopener">Ask on Telegram</a><br>` : ''}
            <a href="admin/" style="opacity:0.75;">Staff Dashboard</a>
          </p>
        </div>
      </div>
      <div class="wrap tiny" style="margin-top:28px; opacity:0.65; border-top:1px solid rgba(255,255,255,0.12); padding-top:16px;">
        Prices in Nigerian naira (₦). Payments processed securely by card or bank transfer. Please tell us about allergies in the order notes.
      </div>`;
    document.body.appendChild(f);

    Cart.render();
    syncSettingsToDom();
  }

  async function syncSettingsToDom() {
    try {
      const s = await ESCA.getSettings();
      if (!s) return;
      const b = s.business || {};

      const bar = document.querySelector('.announcement-bar');
      if (bar) {
        if (b.announcement_active && b.announcement_banner) {
          bar.innerHTML = `Notice: ${esc(b.announcement_banner)} · WhatsApp: ${esc(b.phone || B.PHONE)}`;
          bar.style.background = '#24140e';
          bar.style.color = '#fff';
        } else {
          bar.innerHTML = `${esc(b.pickup_address || B.ADDRESS || 'Online Kitchen')} · <b>Order by 8:00 PM for next-day delivery</b> · WhatsApp: ${esc(b.phone || B.PHONE)}`;
        }
      }

      const storyEl = document.querySelector('#brand-story-text');
      if (storyEl && b.about_story) {
        storyEl.textContent = b.about_story;
      }

      const phoneEl = document.querySelector('#contact-phone');
      if (phoneEl && (b.phone || B.PHONE)) phoneEl.textContent = b.phone || B.PHONE;
      const waLink = document.querySelector('#wa-contact-link');
      if (waLink && (b.whatsapp || B.WHATSAPP)) {
        waLink.href = `https://wa.me/${String(b.whatsapp || B.WHATSAPP).replace(/\D/g, '')}?text=${encodeURIComponent('Hello ' + (B.NAME || 'Kitchen') + '!')}`;
      }
    } catch (e) {}
  }

  window.Site = { Cart, toast, art, priceLabel, getPhoto };
  document.addEventListener('DOMContentLoaded', () => { chrome(); });
})();
