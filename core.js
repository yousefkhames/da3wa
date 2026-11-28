/* MIT · Copyright (c) 2026 Yousef Khames · da3wa core: invitation data, URL encoding, calendar file, card HTML (browser and Node). */
(function (root) {
  'use strict';
  const TYPES = ['wedding', 'engagement', 'birthday', 'graduation', 'aqiqa', 'generic'];
  const THEMES = { gold: { ar: 'ذهبي كلاسيكي', en: 'Classic gold', bg: '#FBF6EA', ink: '#3B2A10', accent: '#8A6A1F', line: '#D9C79A' }, rose: { ar: 'وردي', en: 'Rose', bg: '#FFF1F3', ink: '#4A1D2A', accent: '#A3304E', line: '#F0B7C3' }, night: { ar: 'ليلي', en: 'Midnight', bg: '#101A33', ink: '#F4F1E8', accent: '#E3C070', line: '#3A4A78' }, garden: { ar: 'أخضر', en: 'Garden', bg: '#F1F7F0', ink: '#1E3A24', accent: '#2F6B3A', line: '#B8D6BC' }, plain: { ar: 'بسيط', en: 'Plain', bg: '#FFFFFF', ink: '#111111', accent: '#1F4FD8', line: '#D0D5DD' } };
  const L = {
    ar: { intro: { wedding: 'ندعوكم لحضور حفل زفاف', engagement: 'ندعوكم لحضور حفل خطوبة', birthday: 'ندعوكم لحضور حفل عيد ميلاد', graduation: 'ندعوكم لحضور حفل تخرج', aqiqa: 'ندعوكم لحضور عقيقة', generic: 'ندعوكم لحضور مناسبتنا' }, guest: 'دعوة خاصة لـ {g}', dress: 'الزي: {d}', maps: 'افتح الموقع في الخرائط', ics: 'أضف إلى التقويم', rsvp: 'تأكيد الحضور', yourName: 'اسمك', guests: 'عدد الحضور', send: 'أرسل ردك على واتساب', rsvpText: 'أنا {name}، سأحضر بإذن الله. عدد الحضور: {n}', d: 'متبقي {d} يوم و{h} ساعة و{m} دقيقة (حسب ساعة جهازك)', past: 'بدأت المناسبة أو انتهت', demo: 'تجريبي', until: 'حتى {t}', locale: 'ar-EG', tpl: 'ملاحظة: الوقت بتوقيت مكان المناسبة وقد يختلف عن توقيت جهازك' },
    en: { intro: { wedding: 'You are invited to the wedding of', engagement: 'You are invited to the engagement of', birthday: 'You are invited to the birthday of', graduation: 'You are invited to the graduation of', aqiqa: 'You are invited to the aqiqa of', generic: 'You are invited to our event' }, guest: 'A personal invitation for {g}', dress: 'Dress code: {d}', maps: 'Open the location in Maps', ics: 'Add to calendar', rsvp: 'RSVP', yourName: 'Your name', guests: 'Number of guests', send: 'Send your reply on WhatsApp', rsvpText: 'This is {name}. I will attend. Guests: {n}', d: '{d} days, {h} hours and {m} minutes to go (by your device clock)', past: 'The event has started or passed', demo: 'Demo', until: 'until {t}', locale: 'en-GB', tpl: 'Note: the time is local to the venue and may differ from your device time' }
  };
  const clip = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, n);
  const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/, TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  function mapsUrl(u) {
    try { const x = new URL(String(u).trim()); if (x.protocol !== 'https:') return ''; const h = x.hostname; if ((h === 'maps.google.com') || (h === 'www.google.com' && x.pathname.startsWith('/maps')) || h === 'maps.app.goo.gl' || (h === 'goo.gl' && x.pathname.startsWith('/maps'))) return x.href; } catch (e) { /* not a URL */ }
    return '';
  }
  /* Phone digits for wa.me. Local Egyptian 0-prefixed numbers become +20. */
  function phone(raw, cc) {
    let d = String(raw || '').replace(/[٠-٩]/g, (x) => '٠١٢٣٤٥٦٧٨٩'.indexOf(x)).replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0')) d = (cc || '20') + d.slice(1);
    return /^[1-9]\d{9,14}$/.test(d) ? d : '';
  }
  function sanitize(o) {
    o = o || {}; const h = (Array.isArray(o.h) ? o.h : []).map((x) => clip(x, 40)).filter(Boolean).slice(0, 2);
    return { v: 1, ty: TYPES.includes(o.ty) ? o.ty : 'generic', h, d: DATE_RE.test(o.d || '') ? o.d : '', e: TIME_RE.test(o.e || '') ? o.e : '', vn: clip(o.vn, 80), ad: clip(o.ad, 160), mp: mapsUrl(o.mp), dc: clip(o.dc, 60), msg: clip(o.msg, 400),
      wa: phone(o.wa), th: THEMES[o.th] ? o.th : 'gold', lg: o.lg === 'en' ? 'en' : 'ar', demo: o.demo ? 1 : 0 };
  }
  function validate(o) {
    const e = []; if (!o.h.length) e.push('hosts');
    const m = DATE_RE.exec(o.d); if (!m) e.push('date'); else { const dt = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]); if (dt.getMonth() !== +m[2] - 1 || dt.getDate() !== +m[3]) e.push('date'); }
    return e;
  }
  const b64u = {
    enc: (s) => { const b = typeof Buffer !== 'undefined' ? Buffer.from(s, 'utf8').toString('base64') : btoa(String.fromCharCode(...new TextEncoder().encode(s))); return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
    dec: (s) => { const p = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4); return typeof Buffer !== 'undefined' ? Buffer.from(p, 'base64').toString('utf8') : new TextDecoder().decode(Uint8Array.from(atob(p), (c) => c.charCodeAt(0))); }
  };
  const encode = (o) => b64u.enc(JSON.stringify(sanitize(o)));
  function decode(s) { try { const o = sanitize(JSON.parse(b64u.dec(String(s)))); return validate(o).length ? null : o; } catch (e) { return null; } }
  const decodeGuest = (s) => { try { return clip(b64u.dec(String(s)), 40); } catch (e) { return ''; } };
  const link = (base, o, guest) => base + '#/i/' + encode(o) + (guest ? '/g/' + b64u.enc(clip(guest, 40)) : '');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* ---- calendar file: floating local time, optional end time, escaped and folded to 75 bytes ---- */
  function foldLine(line) {
    const enc = new TextEncoder(); let out = '', cur = '', bytes = 0, first = true;
    for (const ch of line) { const b = enc.encode(ch).length, lim = first ? 75 : 74; if (bytes + b > lim) { out += cur + '\r\n '; cur = ''; bytes = 0; first = false; } cur += ch; bytes += b; }
    return out + cur;
  }
  const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  function title(o) { const l = L[o.lg]; return l.intro[o.ty] + ' ' + o.h.join(' & '); }
  function ics(o, nowMs) {
    const m = DATE_RE.exec(o.d), ds = m[1] + m[2] + m[3] + 'T' + m[4] + m[5] + '00', st = new Date(nowMs == null ? Date.now() : nowMs).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    let hash = 0; const key = o.d + o.h.join() + o.vn; for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//da3wa//Yousef Khames//EN', 'BEGIN:VEVENT', 'UID:' + (hash >>> 0).toString(16) + '-' + ds + '@da3wa', 'DTSTAMP:' + st, 'DTSTART:' + ds];
    if (o.e) lines.push('DTEND:' + m[1] + m[2] + m[3] + 'T' + o.e.replace(':', '') + '00');
    lines.push('SUMMARY:' + icsEsc(title(o)));
    const loc = [o.vn, o.ad].filter(Boolean).join(', '); if (loc) lines.push('LOCATION:' + icsEsc(loc));
    const desc = [o.msg, o.dc ? L[o.lg].dress.replace('{d}', o.dc) : '', o.mp].filter(Boolean).join('\n'); if (desc) lines.push('DESCRIPTION:' + icsEsc(desc));
    lines.push('END:VEVENT', 'END:VCALENDAR'); return lines.map(foldLine).join('\r\n') + '\r\n';
  }
  function whenText(o) {
    const m = DATE_RE.exec(o.d), dt = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), l = L[o.lg];
    const date = dt.toLocaleDateString(l.locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), tm = dt.toLocaleTimeString(l.locale, { hour: '2-digit', minute: '2-digit' });
    let end = ''; if (o.e) { const [h, mi] = o.e.split(':').map(Number); end = ' ' + l.until.replace('{t}', new Date(+m[1], +m[2] - 1, +m[3], h, mi).toLocaleTimeString(l.locale, { hour: '2-digit', minute: '2-digit' })); }
    return date + ' · ' + tm + end;
  }
  function cardHtml(o, guest) {
    const l = L[o.lg], t = THEMES[o.th], g = clip(guest, 40), hosts = o.h.map(esc).join('<span class="amp"> &amp; </span>');
    const icsHref = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics(o));
    const cd = JSON.stringify({ d: l.d, past: l.past });
    return '<article class="inv" dir="' + (o.lg === 'ar' ? 'rtl' : 'ltr') + '" lang="' + o.lg + '" data-theme="' + o.th + '">' + (o.demo ? '<p class="demotag">' + esc(l.demo) + '</p>' : '') +
      '<p class="kicker">' + esc(l.intro[o.ty]) + '</p><h1 class="hosts" id="inv-hosts">' + hosts + '</h1>' + (g ? '<p class="guest" id="inv-guest">' + esc(l.guest.replace('{g}', g)) + '</p>' : '') +
      '<p class="when" id="inv-when">' + esc(whenText(o)) + '</p><p class="note">' + esc(l.tpl) + '</p>' +
      (o.vn || o.ad ? '<p class="where">' + (o.vn ? '<strong>' + esc(o.vn) + '</strong>' : '') + (o.vn && o.ad ? '<br>' : '') + esc(o.ad) + '</p>' : '') +
      (o.mp ? '<p><a class="lnk" href="' + esc(o.mp) + '" target="_blank" rel="noopener">' + esc(l.maps) + '</a></p>' : '') +
      (o.dc ? '<p class="dress">' + esc(l.dress.replace('{d}', o.dc)) + '</p>' : '') + (o.msg ? '<p class="msg">' + esc(o.msg).replace(/\n/g, '<br>') + '</p>' : '') +
      '<p class="count" id="inv-count" data-countdown data-d="' + esc(o.d) + '" data-l="' + esc(cd) + '"></p>' +
      '<p><a class="lnk" id="inv-ics" download="invitation.ics" href="' + icsHref + '">' + esc(l.ics) + '</a></p>' +
      (o.wa ? '<section class="rsvp"><h2>' + esc(l.rsvp) + '</h2><label>' + esc(l.yourName) + '<input data-rsvp-name value="' + esc(g) + '" maxlength="40"></label><label>' + esc(l.guests) + '<input data-rsvp-n type="number" min="1" max="20" value="1"></label><button type="button" data-rsvp data-wa="' + o.wa + '" data-text="' + esc(l.rsvpText) + '">' + esc(l.send) + '</button></section>' : '') + '</article>';
  }
  /* Runs in the page (also embedded as text in the downloaded file), so it uses nothing from outside. */
  function activate(doc) {
    var c = doc.querySelector('[data-countdown]');
    if (doc.__t) clearInterval(doc.__t);
    if (c) { var p = c.getAttribute('data-d').split(/[-T:]/).map(Number), ts = new Date(p[0], p[1] - 1, p[2], p[3], p[4]).getTime(), K = JSON.parse(c.getAttribute('data-l'));
      var tick = function () { var s = Math.floor((ts - Date.now()) / 1000); if (s <= 0) { c.textContent = K.past; return; } c.textContent = K.d.replace('{d}', Math.floor(s / 86400)).replace('{h}', Math.floor(s % 86400 / 3600)).replace('{m}', Math.floor(s % 3600 / 60)); }; tick(); doc.__t = setInterval(tick, 30000); }
    var b = doc.querySelector('[data-rsvp]');
    if (b) b.addEventListener('click', function () { var n = doc.querySelector('[data-rsvp-name]').value.trim(), g = doc.querySelector('[data-rsvp-n]').value || '1'; window.open('https://wa.me/' + b.getAttribute('data-wa') + '?text=' + encodeURIComponent(b.getAttribute('data-text').replace('{name}', n).replace('{n}', g)), '_blank', 'noopener'); });
  }
  const css = (o) => { const t = THEMES[o.th]; return ':root{--bg:' + t.bg + ';--ink:' + t.ink + ';--ac:' + t.accent + ';--ln:' + t.line + '}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:Cairo,system-ui,Segoe UI,Tahoma,sans-serif;line-height:1.7}.inv{max-width:520px;margin:0 auto;padding:32px 22px;text-align:center}.inv{border:3px double var(--ln);margin:18px auto}.kicker{color:var(--ac);font-weight:700}.hosts{font-size:2.3rem;margin:.2em 0;line-height:1.3}.amp{color:var(--ac)}.when{font-weight:800;font-size:1.15rem}.note,.small{font-size:.78rem;opacity:.8}.lnk{color:var(--ac);font-weight:700}.count{font-weight:700;color:var(--ac)}.demotag{display:inline-block;border:1px dashed var(--ink);padding:0 10px;border-radius:99px;font-size:.8rem}.rsvp{border-top:1px solid var(--ln);margin-top:16px;padding-top:12px}.rsvp label{display:block;text-align:start;font-weight:700;margin:8px 0}.rsvp input{display:block;width:100%;padding:10px;border:1px solid var(--ln);border-radius:10px;font:inherit;background:#fff;color:#111}.rsvp button{margin-top:10px;padding:12px 18px;border:0;border-radius:99px;background:var(--ac);color:var(--bg);font:inherit;font-weight:800;cursor:pointer}.by{text-align:center;font-size:.75rem;opacity:.7;padding:8px}@media print{.rsvp,.lnk,.by{display:none}}'; };
  function standalone(o, guest) {
    const l = L[o.lg];
    return '<!doctype html><html lang="' + o.lg + '" dir="' + (o.lg === 'ar' ? 'rtl' : 'ltr') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' + esc(title(o)) + '</title><style>' + css(o) + '</style></head><body>' + cardHtml(o, guest) + '<p class="by">By Yousef Khames · من تطوير يوسف خميس</p><script>(' + activate.toString() + ')(document);</script></body></html>';
  }
  const demo = () => ({ v: 1, ty: 'wedding', h: ['Demo Host A', 'Demo Host B'], d: '2027-01-15T20:00', e: '23:00', vn: 'Demo Hall (fictional)', ad: 'Demo Street, Demo City', mp: '', dc: 'Smart casual', msg: 'This is a demo invitation with fictional names.', wa: '', th: 'gold', lg: 'en', demo: 1 });
  const api = { TYPES, THEMES, L, sanitize, validate, encode, decode, decodeGuest, link, ics, foldLine, cardHtml, standalone, activate, css, demo, phone, mapsUrl, esc, title, b64u };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Da3waCore = api;
})(globalThis);
