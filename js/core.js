// Da3wa core: pure functions, no DOM. Tested with node:test.

export const MAX_PAYLOAD = 6000;
export const FIELDS = ['t', 'a', 'l', 'h', 'ti', 'd', 'v', 'ad', 'm', 'n', 'p', 'c', 'rb', 'hj'];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function toBase64(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function fromBase64(str) {
  const bin = atob(str);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

export function encodeInvite(inv) {
  const slim = {};
  for (const k of FIELDS) {
    const v = inv[k];
    if (v !== undefined && v !== null && v !== '' && v !== false) slim[k] = v;
  }
  const bytes = new TextEncoder().encode(JSON.stringify(slim));
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeInvite(payload) {
  if (typeof payload !== 'string' || !payload || payload.length > MAX_PAYLOAD) return null;
  try {
    let s = payload.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const obj = JSON.parse(new TextDecoder().decode(fromBase64(s)));
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    return normalize(obj);
  } catch { return null; }
}

const TEMPLATES = ['wedding', 'iftar', 'graduation'];

export function normalize(o) {
  const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const t = TEMPLATES.includes(o.t) ? o.t : 'wedding';
  return {
    t,
    a: [0, 1, 2].includes(Number(o.a)) ? Number(o.a) : 0,
    l: o.l === 'en' ? 'en' : 'ar',
    h: str(o.h, 80),
    ti: str(o.ti, 60),
    d: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(o.d || '') ? o.d : '',
    v: str(o.v, 80),
    ad: str(o.ad, 120),
    m: safeUrl(o.m),
    n: str(o.n, 280),
    p: str(o.p, 20),
    c: Math.min(20, Math.max(0, parseInt(o.c, 10) || 0)),
    rb: /^\d{4}-\d{2}-\d{2}$/.test(o.rb || '') ? o.rb : '',
    hj: !!o.hj
  };
}

export function safeUrl(u) {
  if (typeof u !== 'string') return '';
  const s = u.trim();
  if (!s) return '';
  try {
    const url = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) return '';
    return url.href.slice(0, 300);
  } catch { return ''; }
}

export function validate(inv) {
  const errs = [];
  if (!inv.h || inv.h.length < 2) errs.push('h');
  if (!inv.d) errs.push('d');
  if (!inv.v) errs.push('v');
  if (inv.p && !normalizePhone(inv.p)) errs.push('p');
  return errs;
}

// Egyptian-friendly: 01xxxxxxxxx -> 201xxxxxxxxx. Accepts +, 00, spaces, dashes, Arabic digits.
export function normalizePhone(raw) {
  if (!raw) return '';
  const ar = '٠١٢٣٤٥٦٧٨٩';
  let s = String(raw).replace(/[٠-٩]/g, d => ar.indexOf(d)).replace(/[^\d+]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  else if (s.startsWith('00')) s = s.slice(2);
  else if (/^01[0125]\d{8}$/.test(s)) s = '2' + s;
  if (!/^[1-9]\d{9,14}$/.test(s)) return '';
  return s;
}

export function waLink(phone, text) {
  const p = normalizePhone(phone);
  return 'https://wa.me/' + p + '?text=' + encodeURIComponent(text);
}

export const STATUS = { yes: 'yes', no: 'no', maybe: 'maybe' };

export function rsvpMessage(inv, { name, status, guests, note }) {
  const en = inv.l === 'en';
  const ev = inv.ti || '';
  const who = (name || '').trim() || (en ? 'A guest' : 'ضيف');
  let line;
  if (status === 'yes') {
    line = en
      ? `${who}: I will attend ${ev ? '"' + ev + '"' : 'your event'}${guests > 1 ? ` with ${guests} guests in total` : ''}. Thank you for the invitation!`
      : `${who}: إن شاء الله هحضر ${ev ? '"' + ev + '"' : 'المناسبة'}${guests > 1 ? ` وعددنا ${guests} أفراد` : ''}. شكرا على الدعوة!`;
  } else if (status === 'maybe') {
    line = en
      ? `${who}: I am not sure yet if I can make it ${ev ? 'to "' + ev + '"' : ''}. I will confirm soon.`
      : `${who}: لسه مش متأكد هقدر أحضر ${ev ? '"' + ev + '"' : ''} ولا لأ، هأكد لحضرتك قريب.`;
  } else {
    line = en
      ? `${who}: Sorry, I cannot attend ${ev ? '"' + ev + '"' : 'the event'}. Wishing you all the best!`
      : `${who}: للأسف مش هقدر أحضر ${ev ? '"' + ev + '"' : 'المناسبة'}. ربنا يسعدكم!`;
  }
  if (note && note.trim()) line += '\n' + note.trim();
  return line;
}

export function guestLink(base, inv, name) {
  const link = base.split('#')[0] + '#/i/' + encodeInvite(inv);
  return name && name.trim() ? link + '?to=' + encodeURIComponent(name.trim()) : link;
}

export function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '');
  const [path, query = ''] = h.split('?');
  const params = {};
  for (const part of query.split('&')) {
    if (!part) continue;
    const [k, v = ''] = part.split('=');
    try { params[decodeURIComponent(k)] = decodeURIComponent(v); } catch { /* ignore */ }
  }
  const segs = path.split('/').filter(Boolean);
  return { route: segs[0] || '', arg: segs[1] || '', params };
}

export function invitationMessage(inv, link, guestName) {
  const en = inv.l === 'en';
  const hello = guestName ? (en ? `Dear ${guestName},\n` : `عزيزي ${guestName}،\n`) : '';
  const t = inv.ti || (en ? 'our event' : 'مناسبتنا');
  return en
    ? `${hello}You are invited to ${t} hosted by ${inv.h}. Details and RSVP here:\n${link}`
    : `${hello}يشرفنا دعوتكم لـ ${t} - ${inv.h}. التفاصيل وتأكيد الحضور من هنا:\n${link}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

export function icsEscape(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function toICS(inv, now = new Date()) {
  if (!inv.d) return '';
  const [date, time] = inv.d.split('T');
  const start = date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
  const s = new Date(inv.d + ':00');
  const e = new Date(s.getTime() + 3 * 3600 * 1000);
  const end = `${e.getFullYear()}${pad(e.getMonth() + 1)}${pad(e.getDate())}T${pad(e.getHours())}${pad(e.getMinutes())}00`;
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  let uid = 0;
  for (const ch of inv.h + inv.d) uid = (uid * 31 + ch.charCodeAt(0)) >>> 0;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Da3wa//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${uid}@da3wa`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:${icsEscape((inv.ti ? inv.ti + ' - ' : '') + inv.h)}`,
    `LOCATION:${icsEscape([inv.v, inv.ad].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${icsEscape(inv.n)}`, 'END:VEVENT', 'END:VCALENDAR'
  ];
  return lines.join('\r\n') + '\r\n';
}

export function countdown(dateStr, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr || '')) return null;
  const diff = new Date(dateStr + ':00').getTime() - now.getTime();
  if (Number.isNaN(diff)) return null;
  if (diff <= 0) return { past: true, days: 0, hours: 0, minutes: 0 };
  const m = Math.floor(diff / 60000);
  return { past: false, days: Math.floor(m / 1440), hours: Math.floor((m % 1440) / 60), minutes: m % 60 };
}

export function formatParts(dateStr, lang, hijri = false) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateStr || '')) return null;
  const d = new Date(dateStr + ':00');
  if (Number.isNaN(d.getTime())) return null;
  const loc = lang === 'en' ? 'en-GB' : 'ar-EG';
  const f = (opts, l = loc) => new Intl.DateTimeFormat(l, opts).format(d);
  const out = {
    day: f({ day: 'numeric' }),
    month: f({ month: 'long' }),
    year: f({ year: 'numeric' }),
    weekday: f({ weekday: 'long' }),
    time: f({ hour: 'numeric', minute: '2-digit', hour12: true })
  };
  if (hijri) {
    try {
      out.hijri = new Intl.DateTimeFormat(lang === 'en' ? 'en-u-ca-islamic-umalqura' : 'ar-SA-u-ca-islamic-umalqura-nu-arab',
        { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    } catch { /* ignore */ }
  }
  return out;
}

// Guest list helpers
export function summarize(guests) {
  const s = { total: guests.length, yes: 0, no: 0, maybe: 0, pending: 0, heads: 0 };
  for (const g of guests) {
    if (g.status === 'yes') { s.yes++; s.heads += Math.max(1, g.count || 1); }
    else if (g.status === 'no') s.no++;
    else if (g.status === 'maybe') s.maybe++;
    else s.pending++;
  }
  return s;
}

export function guestsToCSV(guests) {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [['name', 'phone', 'status', 'count'].map(q).join(',')];
  for (const g of guests) {
    // neutralize spreadsheet formula injection
    const name = /^[=+\-@]/.test(g.name) ? "'" + g.name : g.name;
    rows.push([q(name), q(g.phone), q(g.status || 'pending'), q(g.count || '')].join(','));
  }
  return '\ufeff' + rows.join('\n');
}

export function parseGuestLines(text) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    const m = l.match(/^(.*?)[\s,;\t]+([+\d٠-٩][\d٠-٩\s\-+]{7,})$/);
    const name = (m ? m[1] : l).replace(/[,;]+$/, '').trim().slice(0, 60);
    if (!name) continue;
    out.push({ name, phone: m ? m[2].trim() : '' });
  }
  return out.slice(0, 300);
}
