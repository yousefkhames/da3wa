// Real-browser click-through. Usage: node tests/e2e.mjs <baseUrl> [shotDir]
import puppeteer from 'puppeteer-core';
const base = process.argv[2] || 'http://localhost:8080/';
const shots = process.argv[3] || '';
const results = [];
const ok = (name, cond) => { results.push([name, !!cond]); console.log((cond ? 'PASS ' : 'FAIL ') + name); };
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const errors = [];
async function newPage(w = 390, h = 844, lang = 'ar') {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: w < 500 });
  await page.evaluateOnNewDocument(l => { Object.defineProperty(navigator, 'language', { get: () => l }); window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; }, lang);
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base, { waitUntil: 'networkidle0' });
  return page;
}
const shot = (page, n) => shots && page.screenshot({ path: `${shots}/${n}.png` });
const fill = async (page, sel, v) => { await page.$eval(sel, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v); };

const page = await newPage();
ok('Arabic UI is RTL by default', await page.$eval('html', h => h.dir === 'rtl' && h.lang === 'ar'));
// validation
await page.click('#pub');
ok('validation errors show for empty form', (await page.$$eval('.err:not([hidden])', e => e.length)) >= 3);
// fill
await page.click('.tpl[data-t="iftar"]');
await fill(page, '#h', 'عائلة الشناوي');
await fill(page, '#d', '2027-03-05T18:10');
await fill(page, '#v', 'نادي الصيد');
await fill(page, '#ad', 'كورنيش الإسكندرية');
await fill(page, '#m', 'https://maps.google.com/?q=alexandria');
await fill(page, '#n', 'الملابس: كاجوال');
await fill(page, '#p', '01012345678');
await fill(page, '#rb', '2027-03-01');
await page.click('#hj');
ok('live preview shows host and venue', await page.$eval('#pv', e => e.textContent.includes('عائلة الشناوي') && e.textContent.includes('نادي الصيد')));
ok('hijri date rendered', await page.$eval('#pv', e => /رمضان/.test(e.textContent)));
ok('iftar template applied', await page.$eval('#pv .card', e => e.classList.contains('t-iftar')));
await page.click('.dot[data-a="1"]');
ok('palette change applies', await page.$eval('#pv .card', e => e.getAttribute('style').includes('#0d2f33')));
await shot(page, 'editor-mobile');
await page.click('#pub');
await page.waitForSelector('.share');
ok('share page reached', page.url().includes('#/share/'));
const link = await page.$eval('#lk', e => e.value);
ok('link contains #/i/ payload', link.includes('#/i/'));
// persistence
await page.reload({ waitUntil: 'networkidle0' });
await page.goto(base + '#/mine'); await page.waitForSelector('.mlist');
ok('invitation persisted in My invitations', (await page.$$('.mi')).length === 1);
// guests
await page.click('.mi .btn');
await page.waitForSelector('#gadd');
await page.$eval('#gadd', e => { e.value = 'منى علي 01012345678\nAhmed Samir\nنور'; });
await page.click('#gaddBtn');
ok('3 guests added', (await page.$$('.g')).length === 3);
await page.select('.g:nth-child(1) .g-s', 'yes');
await page.$eval('.g:nth-child(1) .g-c', e => { e.value = '3'; e.dispatchEvent(new Event('change', { bubbles: true })); });
await page.select('.g:nth-child(2) .g-s', 'no');
const sum = await page.$eval('#sum', e => e.textContent);
ok('summary counts people coming (3)', /٣|3/.test(sum) && (await page.$eval('#sum .h b', e => e.textContent)) === '3');
const waHref = await page.$eval('.g:nth-child(1) .btn.wa', a => a.href);
ok('guest invite WhatsApp link targets guest phone', waHref.startsWith('https://wa.me/201012345678?text='));
ok('guest invite carries personalized link', decodeURIComponent(waHref).includes('?to=' + encodeURIComponent('منى علي')));
await shot(page, 'guests-mobile');
// guest view in a fresh context (no storage)
const guestUrl = decodeURIComponent(waHref.split('text=')[1]).split('\n').pop();
const g = await newPage(390, 844, 'en');
await g.goto(guestUrl, { waitUntil: 'networkidle0' });
ok('guest page shows personalized greeting', await g.$eval('.card .dear', e => e.textContent.includes('منى علي')));
ok('guest card is RTL (Arabic invitation) ', await g.$eval('.card', e => e.dir === 'rtl'));
ok('countdown rendered', await g.$eval('#cd', e => e.textContent.length > 3));
ok('map link safe attrs', await g.$eval('.maplink', a => a.rel.includes('noopener') && a.href.startsWith('https://maps.google.com')));
await g.$eval('#rn', e => { e.value = ''; });
await g.click('#rf .primary');
ok('RSVP requires a name when blank', await g.$eval('#rne', e => !e.hidden) && (await g.evaluate(() => window.__opened.length)) === 0);
await g.type('#rn', 'منى علي');
await g.click('#pl'); await g.click('#pl');
await g.type('#rm', 'مبروك مقدما');
await g.click('#rf .primary');
const opened = await g.evaluate(() => window.__opened);
ok('RSVP opens one WhatsApp link to host', opened.length === 1 && opened[0].startsWith('https://wa.me/201012345678?text='));
const text = decodeURIComponent(opened[0].split('text=')[1]);
ok('RSVP text has name, count 3 and note', text.includes('منى علي') && text.includes('3') && text.includes('مبروك مقدما'));
await shot(g, 'guest-mobile');
// XSS check
const x = await newPage();
const evil = Buffer.from(JSON.stringify({ t: 'wedding', l: 'en', h: '<img src=x onerror=window.__xss=1>', d: '2027-01-01T10:00', v: '<script>window.__xss=2</script>', m: 'javascript:alert(1)' })).toString('base64url');
await x.goto(base + '#/i/' + evil + '?to=' + encodeURIComponent('<b onmouseover=1>x</b>'), { waitUntil: 'networkidle0' });
ok('XSS payloads are inert', await x.evaluate(() => !window.__xss && !document.querySelector('.card img') && !document.querySelector('.card b[onmouseover]')));
ok('javascript: map link dropped', await x.$('.maplink') === null);
const bad = await newPage();
await bad.goto(base + '#/i/@@@', { waitUntil: 'networkidle0' });
ok('broken link shows friendly error', await bad.$eval('.bad', e => e.textContent.length > 10));
// English UI + LTR
const en = await newPage(1280, 800, 'en');
ok('English UI is LTR', await en.$eval('html', h => h.dir === 'ltr'));
await en.click('.tpl[data-t="graduation"]'); await en.click('#langSeg button[data-l="en"]');
await fill(en, '#h', 'Youssef Ahmed'); await fill(en, '#d', '2027-07-10T19:00'); await fill(en, '#v', 'Grand Hall');
await shot(en, 'editor-desktop');
await en.click('#langBtn');
ok('language toggle flips to RTL', await en.$eval('html', h => h.dir === 'rtl'));
await page.goto(base + '#/mine'); await page.waitForSelector('.mlist');
ok('no horizontal overflow on mobile (mine + header)', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.querySelector('#langBtn').getBoundingClientRect().right <= innerWidth));
ok('no console or page errors', errors.length === 0);
if (errors.length) console.log(errors);
await browser.close();
const failed = results.filter(r => !r[1]);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
