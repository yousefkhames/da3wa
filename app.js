/* MIT · Copyright (c) 2026 Yousef Khames · da3wa UI */
(function () {
  'use strict';
  const { el, t } = Kit, D = Da3waCore;
  const cfg = Object.assign({ demo: true, defaultLang: 'ar' }, window.DA3WA_CONFIG);
  const blank = () => ({ ty: 'wedding', lg: cfg.defaultLang === 'en' ? 'en' : 'ar', h1: '', h2: '', date: '', time: '20:00', e: '', vn: '', ad: '', mp: '', dc: '', msg: '', wa: '', th: 'gold', demo: 0 });
  const fromDemo = () => { const d = D.demo(); return { ty: d.ty, lg: d.lg, h1: d.h[0], h2: d.h[1], date: d.d.slice(0, 10), time: d.d.slice(11), e: d.e, vn: d.vn, ad: d.ad, mp: d.mp, dc: d.dc, msg: d.msg, wa: d.wa, th: d.th, demo: 1 }; };
  const store = Kit.store('da3wa', 1, { form: null, guests: '' });
  if (!store.data.form) { store.data.form = cfg.demo ? fromDemo() : blank(); store.save(); }
  const app = document.getElementById('app');
  const style = document.head.appendChild(document.createElement('style'));
  style.textContent = Object.keys(D.THEMES).map((k) => { const x = D.THEMES[k]; return '.inv[data-theme=' + k + ']{--bg:' + x.bg + ';--ink:' + x.ink + ';--ac:' + x.accent + ';--ln:' + x.line + '}'; }).join('');
  const base = () => location.href.split('#')[0];
  const route = () => location.hash.replace(/^#\/?/, '');
  const field = (label, input) => el('label', { class: 'field' }, el('span', { text: label }), input);

  function header(builder) {
    return el('header', { class: 'top noprint' }, el('div', { class: 'brand' }, el('img', { src: 'assets/favicon.svg', width: 28, height: 28, alt: '' }), el('strong', { text: t('title') })),
      el('button', { class: 'btn small', onclick: () => { Kit.setLang(Kit.lang === 'ar' ? 'en' : 'ar', 'da3wa'); render(); } }, t('lang')));
  }
  const toObj = (f) => ({ ty: f.ty, lg: f.lg, h: [f.h1, f.h2], d: f.date && f.time ? f.date + 'T' + f.time : '', e: f.e, vn: f.vn, ad: f.ad, mp: f.mp, dc: f.dc, msg: f.msg, wa: f.wa, th: f.th, demo: f.demo });

  function viewBuilder() {
    const root = el('main', { id: 'main-content', tabindex: '-1' }), f = store.data.form;
    if (store.blocked) root.append(el('div', { class: 'banner', role: 'alert', text: t('blocked') }));
    if (f.demo) root.append(el('div', { class: 'banner', role: 'note', id: 'demo-banner', text: t('demoBanner') }));
    root.append(el('h1', { text: t('h1') }), el('p', { text: t('intro') }), el('button', { class: 'btn small', id: 'clear', onclick: () => { if (!confirm(t('confirmClear'))) return; store.data.form = blank(); store.data.guests = ''; store.save(); render(); } }, t('clear')));
    const pv = el('div', { class: 'pv', id: 'preview' }), out = el('div', { id: 'out' }), glist = el('div', { id: 'glist' });
    const refresh = () => {
      const o = D.sanitize(toObj(store.data.form)), errs = D.validate(o);
      pv.replaceChildren(); out.replaceChildren(); glist.replaceChildren(); store.save();
      if (errs.length) { out.append(el('ul', { id: 'errs' }, errs.map((e) => el('li', { class: 'err', text: t('e_' + e) })))); if (store.data.form.mp && !o.mp) out.append(el('p', { class: 'err', text: t('badMaps') })); return; }
      pv.innerHTML = D.cardHtml(o, ''); D.activate(pv);
      const url = D.link(base(), o), box = el('div', { class: 'qrbox' });
      if (store.data.form.mp && !o.mp) out.append(el('p', { class: 'err', text: t('badMaps') })); if (store.data.form.wa && !o.wa) out.append(el('p', { class: 'err', text: t('badWa') }));
      if (/^(localhost|127\.|192\.168\.)/.test(location.hostname) || location.protocol === 'file:') out.append(el('p', { class: 'banner', role: 'note', text: t('localLink') }));
      if (url.length > 1500) out.append(el('p', { class: 'err', id: 'longwarn', text: t('longLink', { n: url.length }) }));
      try { box.innerHTML = Kit.qrSvg(url, { level: 'L' }); } catch (e) { out.append(el('p', { class: 'err', text: t('noQr') })); }
      const inp = el('input', { id: 'link', readonly: true, value: url, dir: 'ltr', 'aria-label': t('linkLabel') });
      out.append(el('h2', { text: t('share') }), field(t('linkLabel'), inp), box, el('div', { class: 'row' },
        el('button', { class: 'btn primary', id: 'copy', onclick: async () => { try { await navigator.clipboard.writeText(url); Kit.toast(t('copied')); } catch (e) { inp.select(); } } }, t('copyLink')),
        el('button', { class: 'btn', id: 'dl-html', onclick: () => Kit.download('invitation.html', D.standalone(o, ''), 'text/html') }, t('dlHtml')),
        el('button', { class: 'btn', id: 'dl-ics', onclick: () => Kit.download('invitation.ics', D.ics(o), 'text/calendar') }, t('dlIcs')),
        el('button', { class: 'btn', id: 'print', onclick: () => { document.body.classList.add('ps'); window.print(); } }, t('printCard'))));
      const names = store.data.guests.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 100);
      names.forEach((g) => { const gu = D.link(base(), o, g); glist.append(el('div', { class: 'row gline' }, el('strong', { class: 'grow', text: g }),
        el('button', { class: 'btn small', onclick: async () => { try { await navigator.clipboard.writeText(gu); Kit.toast(t('copied')); } catch (e) { Kit.toast(gu); } } }, t('copyLink')),
        el('button', { class: 'btn small', onclick: () => window.open('https://wa.me/?text=' + encodeURIComponent(t('waGuest', { g, url: gu })), '_blank', 'noopener') }, t('wa')))); });
    };
    const bind = (key, input, after) => { input.addEventListener('input', () => { store.data.form[key] = input.value; if (key === 'h1' || key === 'h2') store.data.form.demo = 0; refresh(); }); return input; };
    const sel = (key, opts, id) => { const s = el('select', { id }, opts.map(([v, l]) => el('option', { value: v, selected: store.data.form[key] === v }, l))); return bind(key, s); };
    const inp = (key, id, type, extra) => bind(key, el('input', Object.assign({ id, type: type || 'text', value: store.data.form[key], maxlength: 160 }, extra || {})));
    const msg = bind('msg', el('textarea', { id: 'f-msg', maxlength: 400 }, f.msg));
    const guests = el('textarea', { id: 'guests', placeholder: t('guestsPh'), 'aria-label': t('guestsPh') }, store.data.guests); guests.addEventListener('input', () => { store.data.guests = guests.value; refresh(); });
    root.append(el('section', { class: 'card' },
      el('div', { class: 'grid2' }, field(t('fType'), sel('ty', D.TYPES.map((x) => [x, t('ty_' + x)]), 'f-ty')), field(t('fLang'), sel('lg', [['ar', t('langAr')], ['en', t('langEn')]], 'f-lg')),
        field(t('fH1'), inp('h1', 'f-h1', 'text', { maxlength: 40 })), field(t('fH2'), inp('h2', 'f-h2', 'text', { maxlength: 40 })),
        field(t('fDate'), inp('date', 'f-date', 'date')), field(t('fTime'), inp('time', 'f-time', 'time')), field(t('fEnd'), inp('e', 'f-end', 'time')), field(t('fTheme'), sel('th', Object.keys(D.THEMES).map((k) => [k, D.THEMES[k][Kit.lang]]), 'f-th')),
        field(t('fVenue'), inp('vn', 'f-vn', 'text', { maxlength: 80 })), field(t('fAddr'), inp('ad', 'f-ad')), field(t('fMaps'), inp('mp', 'f-mp', 'url', { dir: 'ltr', maxlength: 300 })), field(t('fDress'), inp('dc', 'f-dc', 'text', { maxlength: 60 })),
        field(t('fWa'), inp('wa', 'f-wa', 'tel', { dir: 'ltr', inputmode: 'tel', maxlength: 20 }))), field(t('fMsg'), msg)));
    root.append(el('h2', { text: t('preview') }), el('div', { class: 'pvwrap' }, pv), out, el('section', { class: 'card noprint' }, el('h2', { text: t('guestsH') }), el('p', { class: 'small', text: t('guestsHelp') }), guests, glist), el('p', { class: 'small', text: t('limits') }));
    refresh(); return root;
  }

  function viewInvite(r) {
    const root = el('main', { id: 'main-content', tabindex: '-1' }), parts = r.slice(2).split('/'), o = D.decode(parts[0]), g = parts[1] === 'g' && parts[2] ? D.decodeGuest(parts[2]) : '';
    if (!o) { root.append(el('div', { class: 'banner err', role: 'alert', id: 'bad', text: t('badLink') }), el('a', { class: 'btn', href: '#/' }, t('openMaker'))); return root; }
    const w = el('div', { class: 'pv', id: 'invite' }); w.innerHTML = D.cardHtml(o, g); D.activate(w); document.title = D.title(o); root.append(el('div', { class: 'pvwrap' }, w)); return root;
  }

  function render() {
    document.body.classList.remove('ps'); Kit.applyTheme(); const r = route(); document.title = 'da3wa | دعوة';
    const inv = /^i\//.test(r), view = inv ? viewInvite(r) : viewBuilder();
    app.replaceChildren(header(!inv), el('div', { class: 'wrap' }, view), Kit.footer()); document.body.dataset.ready = '1';
  }
  window.addEventListener('afterprint', () => document.body.classList.remove('ps'));
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  Kit.initLang('da3wa'); render();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
