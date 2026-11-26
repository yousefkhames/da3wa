import {
  esc, encodeInvite, decodeInvite, normalize, validate, normalizePhone, waLink, rsvpMessage, guestLink,
  parseHash, invitationMessage, toICS, countdown, formatParts, summarize, guestsToCSV, parseGuestLines
} from './core.js';
import { TEMPLATES } from './templates.js';
import { UI, CARD } from './i18n.js';

const KEY = 'da3wa.v1';
const $ = (s, r = document) => r.querySelector(s);
const app = $('#app');

// ---------- storage ----------
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && Array.isArray(s.invites)) return s;
  } catch { /* ignore */ }
  return { invites: [], ui: '', draft: null };
}
let store = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { toast('Storage is full or blocked'); } };

let ui = store.ui || ((navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en');
const t = k => UI[ui][k] ?? k;
const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(5)), b => b.toString(16).padStart(2, '0')).join('');

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('on'), 2200);
}

function applyLang() {
  document.documentElement.lang = ui;
  document.documentElement.dir = ui === 'ar' ? 'rtl' : 'ltr';
  document.title = ui === 'ar' ? 'دعوة | Da3wa' : 'Da3wa | Invitations';
  $('#top').innerHTML = `<a class="brand" href="#/"><img src="logo.svg" alt="" width="34" height="34"><span>${esc(t('brand'))}</span></a>
    <nav><a class="nav-link" href="#/mine">${esc(t('mine'))}${store.invites.length ? ` <b class="count">${store.invites.length}</b>` : ''}</a>
    <button class="chip" id="langBtn" type="button">${esc(t('lang'))}</button></nav>`;
  $('#foot').textContent = t('foot');
  $('#langBtn').onclick = () => { ui = ui === 'ar' ? 'en' : 'ar'; store.ui = ui; save(); applyLang(); route(); };
}

// ---------- invitation card ----------
function cardStyle(inv) {
  const p = TEMPLATES[inv.t].palettes[inv.a];
  return `--bg:${p.bg};--ink:${p.ink};--ac:${p.ac};--soft:${p.soft}`;
}

function cardHTML(inv, { guestName = '', live = false } = {}) {
  const tpl = TEMPLATES[inv.t];
  const copy = tpl.copy[inv.l];
  const cc = CARD[inv.l];
  const dir = inv.l === 'ar' ? 'rtl' : 'ltr';
  const parts = formatParts(inv.d, inv.l, inv.hj);
  const hosts = inv.h || copy.ph;
  const title = inv.ti || copy.title;
  const venue = inv.v || (inv.l === 'ar' ? 'اسم المكان' : 'Venue name');
  return `<article class="card t-${inv.t}" dir="${dir}" lang="${inv.l}" style="${cardStyle(inv)}">
    <div class="card-in">
      <div class="art">${tpl.art}</div>
      ${guestName ? `<p class="dear">${esc(cc.dear)} ${esc(guestName)}</p>` : ''}
      <p class="kicker">${esc(copy.kicker)}</p>
      <h2 class="hosts">${esc(hosts)}</h2>
      <p class="ctitle"><span>${esc(title)}</span></p>
      ${parts ? `<div class="when" aria-label="${esc(cc.when)}">
        <div class="dnum">${esc(parts.day)}</div>
        <div class="dtxt"><b>${esc(parts.month)} ${esc(parts.year)}</b><span>${esc(parts.weekday)} · ${esc(parts.time)}</span>${parts.hijri ? `<em>${esc(parts.hijri)}</em>` : ''}</div>
      </div>` : ''}
      <div class="where"><small>${esc(cc.where)}</small><b>${esc(venue)}</b>${inv.ad ? `<span>${esc(inv.ad)}</span>` : ''}
        ${inv.m ? `<a class="maplink" href="${esc(inv.m)}" target="_blank" rel="noopener noreferrer">${esc(cc.map)} ↗</a>` : ''}</div>
      ${inv.n ? `<p class="note">${esc(inv.n)}</p>` : ''}
      ${inv.rb ? `<p class="rb">${esc(cc.rsvpBy)} ${esc(new Intl.DateTimeFormat(inv.l === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long' }).format(new Date(inv.rb + 'T00:00:00')))}</p>` : ''}
      ${live ? '<div class="cd" id="cd" aria-live="off"></div>' : ''}
    </div>
  </article>`;
}

// ---------- routing ----------
function route() {
  const { route: r, arg, params } = parseHash(location.hash);
  stopTimers();
  applyLang();
  document.body.classList.toggle('is-guest', r === 'i');
  window.scrollTo(0, 0);
  if (r === 'i') return guestView(location.hash.replace(/^#\/i\//, '').split('?')[0], params);
  if (r === 'mine') return minePage();
  if (r === 'share') return sharePage(arg);
  if (r === 'guests') return guestsPage(arg);
  if (r === 'edit') return editor(arg);
  return editor('');
}
let timers = [];
function stopTimers() { timers.forEach(clearInterval); timers = []; }

window.addEventListener('hashchange', route);

// ---------- editor ----------
function blankDraft() {
  return normalize({ t: 'wedding', a: 0, l: ui === 'ar' ? 'ar' : 'en', c: 4, hj: false });
}
let draft = blankDraft();
let editingId = '';

function editor(id) {
  editingId = id;
  if (id) {
    const rec = store.invites.find(i => i.id === id);
    if (!rec) { location.hash = '#/'; return; }
    draft = { ...rec.inv };
  } else if (store.draft && !editor.fresh) {
    draft = normalize(store.draft);
  } else {
    draft = blankDraft();
  }
  editor.fresh = false;
  const tplBtns = Object.keys(TEMPLATES).map(k => {
    const p = TEMPLATES[k].palettes[0];
    return `<button type="button" class="tpl ${draft.t === k ? 'on' : ''}" data-t="${k}" style="--bg:${p.bg};--ink:${p.ink};--ac:${p.ac}" aria-pressed="${draft.t === k}">
      <span class="tpl-art">${TEMPLATES[k].art}</span><span>${esc(t('tpl_' + k))}</span></button>`;
  }).join('');
  app.innerHTML = `
  <section class="hero"><h1>${esc(t('tagline'))}</h1></section>
  <div class="editor">
    <form class="panel" id="form" novalidate autocomplete="off">
      <h3>${esc(t('step1'))}</h3>
      <div class="tpls" id="tpls">${tplBtns}</div>
      <div class="row2">
        <div><label>${esc(t('palette'))}</label><div class="dots" id="dots"></div></div>
        <div><label>${esc(t('invLang'))}</label>
          <div class="seg" id="langSeg"><button type="button" data-l="ar">${esc(t('ar'))}</button><button type="button" data-l="en">${esc(t('en'))}</button></div></div>
      </div>
      <h3>${esc(t('step2'))}</h3>
      <div class="fld"><label for="h">${esc(t('f_h'))}</label><input id="h" name="h" maxlength="80" required><p class="err" data-e="h" hidden>${esc(t('err_h'))}</p></div>
      <div class="fld"><label for="ti">${esc(t('f_ti'))}</label><input id="ti" name="ti" maxlength="60"></div>
      <div class="fld"><label for="d">${esc(t('f_d'))}</label><input id="d" name="d" type="datetime-local" required><p class="err" data-e="d" hidden>${esc(t('err_d'))}</p></div>
      <div class="fld"><label for="v">${esc(t('f_v'))}</label><input id="v" name="v" maxlength="80" required><p class="err" data-e="v" hidden>${esc(t('err_v'))}</p></div>
      <div class="fld"><label for="ad">${esc(t('f_ad'))}</label><input id="ad" name="ad" maxlength="120"></div>
      <div class="fld"><label for="m">${esc(t('f_m'))}</label><input id="m" name="m" inputmode="url" dir="ltr" placeholder="https://maps.app.goo.gl/..."></div>
      <div class="fld"><label for="n">${esc(t('f_n'))}</label><textarea id="n" name="n" rows="2" maxlength="280"></textarea></div>
      <div class="fld"><label for="p">${esc(t('f_p'))}</label><input id="p" name="p" inputmode="tel" dir="ltr" maxlength="20"><p class="hint">${esc(t('h_p'))}</p><p class="err" data-e="p" hidden>${esc(t('err_p'))}</p></div>
      <div class="row2">
        <div class="fld"><label for="c">${esc(t('f_c'))}</label><input id="c" name="c" type="number" min="0" max="20" inputmode="numeric"><p class="hint">${esc(t('h_c'))}</p></div>
        <div class="fld"><label for="rb">${esc(t('f_rb'))}</label><input id="rb" name="rb" type="date"></div>
      </div>
      <label class="check"><input type="checkbox" id="hj"> <span>${esc(t('f_hj'))}</span></label>
      <button class="primary" type="submit" id="pub">${esc(t('publish'))}</button>
    </form>
    <aside class="preview"><div class="plabel">${esc(t('previewLabel'))}</div><div id="pv"></div></aside>
  </div>`;
  const f = $('#form');
  for (const k of ['h', 'ti', 'v', 'ad', 'm', 'n', 'p', 'rb']) f.elements[k].value = draft[k] || '';
  f.elements.d.value = draft.d || '';
  f.elements.c.value = draft.c;
  f.elements.hj.checked = draft.hj;
  const paint = () => {
    $('#pv').innerHTML = cardHTML(draft);
    $('#dots').innerHTML = TEMPLATES[draft.t].palettes.map((p, i) =>
      `<button type="button" class="dot ${draft.a === i ? 'on' : ''}" data-a="${i}" aria-label="${esc(p.name[ui])}" title="${esc(p.name[ui])}" style="--c1:${p.bg};--c2:${p.ac}"></button>`).join('');
    document.querySelectorAll('#tpls .tpl').forEach(b => { b.classList.toggle('on', b.dataset.t === draft.t); b.setAttribute('aria-pressed', b.dataset.t === draft.t); });
    document.querySelectorAll('#langSeg button').forEach(b => b.classList.toggle('on', b.dataset.l === draft.l));
    if (!editingId) { store.draft = draft; save(); }
  };
  const read = () => {
    const raw = {};
    for (const k of ['h', 'ti', 'd', 'v', 'ad', 'm', 'n', 'p', 'c', 'rb']) raw[k] = f.elements[k].value;
    return normalize({ ...draft, ...raw, hj: f.elements.hj.checked });
  };
  f.addEventListener('input', () => { draft = read(); paint(); });
  $('#tpls').onclick = e => { const b = e.target.closest('.tpl'); if (!b) return; draft = { ...draft, t: b.dataset.t, a: 0 }; paint(); };
  $('#dots').onclick = e => { const b = e.target.closest('.dot'); if (!b) return; draft = { ...draft, a: Number(b.dataset.a) }; paint(); };
  $('#langSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; draft = { ...draft, l: b.dataset.l }; paint(); };
  f.addEventListener('submit', e => {
    e.preventDefault();
    draft = read();
    const errs = validate(draft);
    f.querySelectorAll('.err').forEach(p => { p.hidden = !errs.includes(p.dataset.e); });
    if (errs.length) { const first = f.elements[errs[0]]; first.focus(); return; }
    const now = Date.now();
    let rec = store.invites.find(i => i.id === editingId);
    if (rec) { rec.inv = draft; rec.updated = now; }
    else { rec = { id: uid(), inv: draft, guests: [], created: now, updated: now }; store.invites.unshift(rec); }
    store.draft = null; editor.fresh = true;
    save();
    location.hash = '#/share/' + rec.id;
  });
  paint();
}

// ---------- share ----------
function baseUrl() { return location.href.split('#')[0]; }

function sharePage(id) {
  const rec = store.invites.find(i => i.id === id);
  if (!rec) { location.hash = '#/mine'; return; }
  applyLang();
  const link = guestLink(baseUrl(), rec.inv);
  const msg = invitationMessage(rec.inv, link, '');
  app.innerHTML = `<div class="share">
    <div class="ok"><span class="tick">✓</span><div><h1>${esc(t('shareTitle'))}</h1><p>${esc(t('saved'))}</p></div></div>
    <div class="share-grid">
      <div class="panel">
        <label for="lk">${esc(t('link'))}</label>
        <input id="lk" readonly dir="ltr" value="${esc(link)}">
        <div class="btns">
          <button class="primary" id="copy" type="button">${esc(t('copy'))}</button>
          <a class="btn wa" id="wa" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent(msg)}">${esc(t('shareWa'))}</a>
          <a class="btn" id="open" href="${esc(link)}">${esc(t('open'))}</a>
          ${navigator.share ? `<button class="btn" id="nshare" type="button">${esc(t('share'))}</button>` : ''}
        </div>
        <div class="btns sub">
          <a class="btn ghost" id="guestsBtn" href="#/guests/${rec.id}">${esc(t('guests'))}</a>
          <button class="btn ghost" id="ics" type="button">${esc(t('ics'))}</button>
          <a class="btn ghost" href="#/edit/${rec.id}">${esc(t('edit'))}</a>
          <button class="btn ghost danger" id="del" type="button">${esc(t('del'))}</button>
        </div>
        ${rec.inv.p ? '' : `<p class="err">${esc(t('noPhoneWarn'))}</p>`}
        <p class="hint">${esc(t('linkNote'))}</p>
      </div>
      <div class="preview">${cardHTML(rec.inv)}</div>
    </div></div>`;
  $('#copy').onclick = async () => {
    try { await navigator.clipboard.writeText(link); } catch { $('#lk').select(); document.execCommand('copy'); }
    toast(t('copied'));
  };
  const ns = $('#nshare');
  if (ns) ns.onclick = () => navigator.share({ text: msg }).catch(() => {});
  $('#lk').onfocus = e => e.target.select();
  $('#ics').onclick = () => download(`da3wa-${rec.id}.ics`, 'text/calendar;charset=utf-8', toICS(rec.inv));
  $('#del').onclick = () => {
    if (!confirm(t('confirmDel'))) return;
    store.invites = store.invites.filter(i => i.id !== rec.id); save(); location.hash = '#/mine';
  };
}

function download(name, type, text) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- my invitations ----------
function minePage() {
  applyLang();
  const items = store.invites.map(r => {
    const tpl = TEMPLATES[r.inv.t];
    const p = tpl.palettes[r.inv.a];
    const s = summarize(r.guests);
    const parts = formatParts(r.inv.d, ui);
    return `<li class="mi">
      <a class="mi-main" href="#/share/${r.id}"><span class="mi-art" style="--bg:${p.bg};--ac:${p.ac}">${tpl.art}</span>
        <span class="mi-txt"><b>${esc(r.inv.h)}</b><small>${esc(r.inv.ti || tpl.copy[r.inv.l].title)}${parts ? ' · ' + esc(parts.day + ' ' + parts.month) : ''}</small>
        <small>${s.total ? `${s.yes}/${s.total} ${esc(t('s_yes'))}` : esc(t('gNone').split('.')[0])}</small></span></a>
      <a class="btn ghost sm" href="#/guests/${r.id}">${esc(t('guests'))}</a></li>`;
  }).join('');
  app.innerHTML = `<section class="mine"><div class="mine-h"><h1>${esc(t('mine'))}</h1><a class="primary btn" href="#/" id="newBtn">${esc(t('new'))}</a></div>
    ${items ? `<ul class="mlist">${items}</ul>` : `<p class="empty">${esc(t('empty'))}</p>`}</section>`;
  $('#newBtn').onclick = () => { editor.fresh = true; store.draft = null; save(); };
}

// ---------- guests ----------
function guestsPage(id) {
  const rec = store.invites.find(i => i.id === id);
  if (!rec) { location.hash = '#/mine'; return; }
  applyLang();
  const draw = () => {
    const s = summarize(rec.guests);
    const rows = rec.guests.map((g, i) => {
      const link = guestLink(baseUrl(), rec.inv, g.name);
      const msg = invitationMessage(rec.inv, link, g.name);
      const wa = normalizePhone(g.phone) ? waLink(g.phone, msg) : 'https://wa.me/?text=' + encodeURIComponent(msg);
      return `<li class="g" data-i="${i}">
        <div class="g-n"><b>${esc(g.name)}</b><small dir="ltr">${esc(g.phone || '')}</small></div>
        <select class="g-s" aria-label="${esc(t('gStatus'))}">${['pending', 'yes', 'maybe', 'no'].map(k =>
          `<option value="${k}" ${(g.status || 'pending') === k ? 'selected' : ''}>${esc(k === 'pending' ? t('pending') : t('s_' + k))}</option>`).join('')}</select>
        <input class="g-c" type="number" min="1" max="20" value="${g.count || 1}" aria-label="${esc(t('gCount'))}" ${g.status === 'yes' ? '' : 'disabled'}>
        <a class="btn wa sm" target="_blank" rel="noopener noreferrer" href="${esc(wa)}">${esc(t('gInvite'))}</a>
        <button class="btn ghost sm g-copy" type="button">${esc(t('gCopy'))}</button>
        <button class="btn ghost sm danger g-rm" type="button">${esc(t('gRemove'))}</button></li>`;
    }).join('');
    $('#gl').innerHTML = rows || `<li class="empty">${esc(t('gNone'))}</li>`;
    $('#sum').innerHTML = `<span><b>${s.total}</b>${esc(t('total'))}</span><span class="y"><b>${s.yes}</b>${esc(t('s_yes'))}</span>
      <span><b>${s.maybe}</b>${esc(t('s_maybe'))}</span><span class="n"><b>${s.no}</b>${esc(t('s_no'))}</span>
      <span><b>${s.pending}</b>${esc(t('pending'))}</span><span class="h"><b>${s.heads}</b>${esc(t('heads'))}</span>`;
  };
  app.innerHTML = `<section class="guests"><a class="back" href="#/share/${rec.id}">${ui === 'ar' ? '→' : '←'} ${esc(t('back'))}</a>
    <h1>${esc(t('gTitle'))}</h1><p class="hint">${esc(t('gNote'))}</p>
    <div class="sum" id="sum"></div>
    <div class="panel"><label for="gadd">${esc(t('gAdd'))}</label><textarea id="gadd" rows="3" placeholder="${esc(t('gHelp'))}"></textarea>
      <div class="btns"><button class="primary" id="gaddBtn" type="button">${esc(t('gAddBtn'))}</button>
      <button class="btn ghost" id="csv" type="button">${esc(t('csv'))}</button></div></div>
    <ul class="glist" id="gl"></ul></section>`;
  draw();
  $('#gaddBtn').onclick = () => {
    const add = parseGuestLines($('#gadd').value);
    if (!add.length) return;
    for (const g of add) rec.guests.push({ ...g, status: 'pending', count: 1 });
    rec.guests = rec.guests.slice(0, 300);
    $('#gadd').value = ''; save(); draw();
  };
  $('#csv').onclick = () => download('da3wa-guests.csv', 'text/csv;charset=utf-8', guestsToCSV(rec.guests));
  const gl = $('#gl');
  gl.addEventListener('change', e => {
    const li = e.target.closest('.g'); if (!li) return;
    const g = rec.guests[Number(li.dataset.i)];
    if (e.target.classList.contains('g-s')) { g.status = e.target.value; if (g.status !== 'yes') g.count = 1; }
    if (e.target.classList.contains('g-c')) g.count = Math.min(20, Math.max(1, parseInt(e.target.value, 10) || 1));
    save(); draw();
  });
  gl.addEventListener('click', async e => {
    const li = e.target.closest('.g'); if (!li) return;
    const i = Number(li.dataset.i);
    if (e.target.classList.contains('g-rm')) { rec.guests.splice(i, 1); save(); draw(); }
    if (e.target.classList.contains('g-copy')) {
      const link = guestLink(baseUrl(), rec.inv, rec.guests[i].name);
      try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
      toast(t('copied'));
    }
  });
}

// ---------- guest view ----------
function guestView(payload, params) {
  applyLang();
  const inv = decodeInvite(payload);
  if (!inv) { app.innerHTML = `<section class="bad"><h1>:(</h1><p>${esc(t('badLink'))}</p><a class="btn" href="#/">${esc(t('makeOwn'))}</a></section>`; return; }
  const gname = (params.to || '').slice(0, 60);
  const g = inv.l; // guest page UI follows the invitation language
  const T = k => UI[g][k];
  document.documentElement.lang = g;
  document.documentElement.dir = g === 'ar' ? 'rtl' : 'ltr';
  const cap = inv.c || 20;
  const sentKey = 'da3wa.sent.' + payload.slice(-24) + '.' + gname;
  app.innerHTML = `<div class="guest">${cardHTML(inv, { guestName: gname, live: true })}
    <section class="panel rsvp" id="rsvp" dir="${g === 'ar' ? 'rtl' : 'ltr'}" lang="${g}">
      <h3>${esc(T('rsvpTitle'))}</h3>
      ${inv.p ? `<form id="rf" novalidate>
        <div class="fld"><label for="rn">${esc(T('yourName'))}</label><input id="rn" maxlength="60" value="${esc(gname)}"><p class="err" id="rne" hidden>${esc(T('needName'))}</p></div>
        <div class="choices" role="radiogroup">
          ${['yes', 'maybe', 'no'].map((k, i) => `<label class="choice c-${k}"><input type="radio" name="st" value="${k}" ${i === 0 ? 'checked' : ''}><span>${esc(T(k))}</span></label>`).join('')}
        </div>
        <div class="fld" id="cntw"><label for="rc">${esc(T('howMany'))}</label>
          <div class="stepper"><button type="button" id="mn" aria-label="-">−</button><output id="rc">1</output><button type="button" id="pl" aria-label="+">+</button></div></div>
        <div class="fld"><label for="rm">${esc(T('msg'))}</label><textarea id="rm" rows="2" maxlength="200"></textarea></div>
        <button class="primary wa" type="submit">${esc(T('sendRsvp'))}</button>
        <p class="hint ok" id="sent" hidden>${esc(T('replied'))}</p>
      </form>` : `<p class="hint">${esc(T('noPhone'))}</p>`}
      <div class="btns sub"><button class="btn ghost" id="ics" type="button">${esc(T('addCal'))}</button>
      <button class="btn ghost" id="pr" type="button">${esc(UI[g].print)}</button></div>
    </section>
    <p class="makeown"><a href="#/" id="own">${esc(T('makeOwn'))}</a></p></div>`;
  $('#foot').textContent = T('foot');
  $('#ics').onclick = () => download('invitation.ics', 'text/calendar;charset=utf-8', toICS(inv));
  $('#pr').onclick = () => window.print();
  $('#own').onclick = () => { ui = (navigator.language || '').startsWith('ar') ? 'ar' : ui; };
  // countdown
  const cd = $('#cd');
  const tick = () => {
    const c = countdown(inv.d);
    if (!c) { cd.innerHTML = ''; return; }
    if (c.past) { cd.innerHTML = `<span class="cd-past">${esc(T('started'))}</span>`; return; }
    const n = v => new Intl.NumberFormat(g === 'ar' ? 'ar-EG' : 'en-GB').format(v);
    cd.innerHTML = `<small>${esc(T('countdownLeft'))}</small><div><span><b>${n(c.days)}</b>${esc(T('d'))}</span><span><b>${n(c.hours)}</b>${esc(T('h'))}</span><span><b>${n(c.minutes)}</b>${esc(T('mi'))}</span></div>`;
  };
  tick(); timers.push(setInterval(tick, 30000));
  const rf = $('#rf');
  if (rf) {
    let count = 1;
    const out = $('#rc');
    const paintCount = () => {
      out.textContent = new Intl.NumberFormat(g === 'ar' ? 'ar-EG' : 'en-GB').format(count);
      $('#mn').disabled = count <= 1; $('#pl').disabled = count >= cap;
    };
    const st = () => rf.elements.st.value;
    const showCount = () => { $('#cntw').hidden = st() !== 'yes'; };
    $('#mn').onclick = () => { count = Math.max(1, count - 1); paintCount(); };
    $('#pl').onclick = () => { count = Math.min(cap, count + 1); paintCount(); };
    rf.addEventListener('change', showCount);
    paintCount(); showCount();
    try { if (localStorage.getItem(sentKey)) $('#sent').hidden = false; } catch { /* ignore */ }
    rf.addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#rn').value.trim();
      $('#rne').hidden = !!name;
      if (!name) { $('#rn').focus(); return; }
      const text = rsvpMessage(inv, { name, status: st(), guests: st() === 'yes' ? count : 1, note: $('#rm').value });
      try { localStorage.setItem(sentKey, '1'); } catch { /* ignore */ }
      $('#sent').hidden = false;
      window.open(waLink(inv.p, text), '_blank', 'noopener');
    });
  }
}

applyLang();
route();
