const assert = require('node:assert/strict'), { serve, launch } = require('./cdp.js');
(async () => {
  const srv = await serve(8134); const b = await launch(); let fail = 0; const U = 'http://127.0.0.1:8134/';
  const step = async (n, f) => { try { await f(); console.log('ok  ' + n); } catch (e) { fail++; console.log('FAIL ' + n + ' ' + e.message); } };
  const val = (s) => b.eval('document.querySelector(' + JSON.stringify(s) + ').value');
  const txt = (s) => b.eval('document.querySelector(' + JSON.stringify(s) + ').textContent');
  try {
    await b.goto(U);
    await step('demo banner, preview, fictional names, byline', async () => { const t = await b.text(); assert.match(t, /نموذج تجريبي/); assert.match(await txt('#preview'), /Demo Host A/); assert.match(t, /من تطوير يوسف خميس/); assert.ok(await b.eval("!!document.querySelector('#out .qrbox svg path')")); });
    await step('live preview follows the form and clears the demo flag on name edit', async () => { await b.type('#f-h1', 'سارة'); await b.type('#f-h2', 'أحمد'); await b.waitFor("document.querySelector('#preview').textContent.includes('سارة')"); assert.equal(await b.eval("!!document.querySelector('#preview .demotag')"), false); });
    await step('invalid maps link is flagged and not put in the card', async () => { await b.type('#f-mp', 'https://evil.example/x'); await b.waitFor("document.body.innerText.includes('رابط الخرائط غير مقبول')"); assert.ok(!(await b.eval("document.querySelector('#preview').innerHTML")).includes('evil.example')); await b.type('#f-mp', ''); });
    await step('missing date shows an error and hides share', async () => { await b.type('#f-date', ''); await b.waitFor("document.querySelector('#errs')"); assert.ok(!(await b.eval("!!document.querySelector('#link')"))); await b.type('#f-date', '2027-03-05'); await b.waitFor("document.querySelector('#link')"); });
    await step('invitation link opens the viewer with countdown, ics, and guest name', async () => {
      await b.type('#f-wa', '01012345678'); await b.type('#guests', 'Demo Guest One'); await b.waitFor("document.querySelector('#glist .gline')");
      const link = await val('#link'); assert.match(link, /#\/i\//); await b.eval('location.hash=' + JSON.stringify(link.slice(link.indexOf('#')))); await b.waitFor("document.querySelector('#invite')");
      const t = await txt('#invite'); assert.match(t, /سارة/); assert.match(t, /to go|started or passed/); assert.ok((await b.eval("document.querySelector('#inv-ics').href")).startsWith('data:text/calendar')); assert.ok(await b.eval("!!document.querySelector('[data-rsvp]')"));
      await b.eval("location.hash='#/'"); await b.waitFor("document.querySelector('#link')");
    });
    await step('per-guest link shows the guest name and prefilled RSVP name', async () => {
      const gl = await b.eval("(()=>{let u='';window.open=(x)=>{u=x};const btn=[...document.querySelectorAll('#glist button')].find(x=>x.textContent.includes('واتساب'));btn.click();return decodeURIComponent(u.split('text=')[1])})()"); const m = /(https?:\/\/\S+#\/i\/\S+)/.exec(gl); assert.ok(m, gl);
      await b.eval('location.hash=' + JSON.stringify(m[1].slice(m[1].indexOf('#')))); await b.waitFor("document.querySelector('#inv-guest')"); assert.match(await txt('#inv-guest'), /Demo Guest One/); assert.equal(await val('[data-rsvp-name]'), 'Demo Guest One');
      const wa = await b.eval("(()=>{let u='';window.open=(x)=>{u=x};document.querySelector('[data-rsvp]').click();return u})()"); assert.match(wa, /^https:\/\/wa\.me\/201012345678\?text=/); assert.match(decodeURIComponent(wa), /Demo Guest One/);
    });
    await step('tampered link shows an error', async () => { await b.eval("location.hash='#/i/garbage'"); await b.waitFor("document.querySelector('#bad')"); });
    await step('markup typed by the host is not executed in the card', async () => { await b.eval("location.hash='#/'"); await b.waitFor("document.querySelector('#f-msg')"); await b.type('#f-msg', '<img src=x onerror="window.__x=1">'); await new Promise((r) => setTimeout(r, 300)); assert.equal(await b.eval('window.__x||0'), 0); assert.ok(!(await b.eval("document.querySelector('#preview').innerHTML")).includes('<img')); await b.type('#f-msg', ''); });
    await step('no script errors', async () => assert.deepEqual(b.logs, []));
    await b.eval("localStorage.clear();location.hash='#/'"); await b.eval('location.reload()'); await new Promise((r) => setTimeout(r, 800)); await b.viewport(412, 860, true);
    await b.waitFor("document.querySelector('#preview .inv')"); await b.eval("document.querySelector('#preview').scrollIntoView()"); await b.shot('/tmp/da3wa-builder.png');
    await b.type('#f-wa', '01012345678'); await b.type('#f-th', 'night'); const l = await val('#link'); await b.eval('location.hash=' + JSON.stringify(l.slice(l.indexOf('#')))); await b.waitFor("document.querySelector('#invite')"); await b.shot('/tmp/da3wa-invite.png');
  } finally { await b.close(); srv.close(); }
  process.exit(fail ? 1 : 0);
})();
