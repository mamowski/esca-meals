// =====================================================================
// Esca Meals website + dashboard configuration: the only file you edit.
// While SUPABASE_URL still contains "YOUR-PROJECT", the site runs in DEMO MODE:
// the real menu loads from this browser, payments are simulated, and the
// dashboard works with the demo login shown on admin/.
// =====================================================================
window.ESCA_CONFIG = {
  // Supabase → Project Settings → API. Only the anon (public) key goes here, NEVER the service_role key.
  SUPABASE_URL: 'https://yspnyyxbmsagpiusemfh.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_CGh1hJNZ6dhV8O1k2BnAGA_eFqAspCC',

  // n8n production webhook base for WF1/WF2, ending in /webhook/esca
  N8N_WEBHOOK_BASE: 'https://n8n-medicalflowgrammer.duckdns.org/webhook/esca',
  // Same value as the n8n Header Auth credential "Esca token" (header name: x-esca-token).
  ESCA_TOKEN: 'jzbd6of57u9vgesi4qhy0w1lmctxpr8a3n2k',

  // WF4 → "Website chat" node → Chat URL. Leave as is to use the offline helper.
  CHAT_WEBHOOK_URL: 'https://n8n-medicalflowgrammer.duckdns.org/webhook/34d097c9-7c01-4a31-9b25-a5cf8557cf76/chat',

  // Optional: your Telegram bot username without @ (leave empty to hide)
  TELEGRAM_BOT: '',

  BUSINESS: {
    NAME: 'Esca Meals',
    TAGLINE: 'Food that looks good and tastes even better',
    WHATSAPP: '2349052862612',          // TEST number: change back to 2348137945084 at handover
    PHONE: '0905 286 2612',
    ADDRESS: 'Umule Road, Aba, Abia State',
    INSTAGRAM: 'esca_meals',
    TIKTOK: 'esca_meals',
  },

  TIMEZONE: 'Africa/Lagos',
};
