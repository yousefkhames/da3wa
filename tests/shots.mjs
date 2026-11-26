// Generates README screenshots with clean sample data. Usage: node tests/shots.mjs <baseUrl>
import puppeteer from 'puppeteer-core';
import { encodeInvite } from '../js/core.js';
const base = process.argv[2];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
const mk = async (w, h, lang) => {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: w < 500 });
  await p.evaluateOnNewDocument(l => Object.defineProperty(navigator, 'language', { get: () => l }), lang);
  return p;
};
const invs = {
  wedding: { t: 'wedding', a: 0, l: 'ar', h: 'محمد وسلمى', ti: 'حفل زفاف', d: '2027-06-18T20:00', v: 'قاعة الماسة', ad: 'سموحة، الإسكندرية', m: 'https://maps.google.com/?q=alexandria', n: 'الملابس: رسمي', p: '01012345678', c: 4, rb: '2027-06-10' },
  iftar: { t: 'iftar', a: 0, l: 'ar', h: 'عائلة الشناوي', ti: 'إفطار جماعي', d: '2027-03-05T18:10', v: 'نادي الصيد', ad: 'كورنيش الإسكندرية', p: '01012345678', c: 6, hj: true },
  graduation: { t: 'graduation', a: 0, l: 'en', h: 'Youssef Ahmed', ti: 'Graduation Party', d: '2027-07-10T19:00', v: 'Grand Hall', ad: 'Sadat City', p: '01012345678', c: 4 }
};
for (const [k, inv] of Object.entries(invs)) {
  const p = await mk(390, 844, k === 'graduation' ? 'en' : 'ar');
  await p.goto(base + '#/i/' + encodeInvite(inv) + (k === 'wedding' ? '?to=' + encodeURIComponent('منى علي') : ''), { waitUntil: 'networkidle0' });
  await p.screenshot({ path: `docs/guest-${k}.png` });
  await p.close();
}
const e = await mk(1280, 860, 'en');
await e.goto(base, { waitUntil: 'networkidle0' });
await e.evaluate(inv => { localStorage.setItem('da3wa.v1', JSON.stringify({ invites: [], ui: 'en', draft: inv })); }, { ...invs.graduation, a: 1 });
await e.reload({ waitUntil: 'networkidle0' });
await e.screenshot({ path: 'docs/editor.png' });
const g = await mk(390, 844, 'en');
await g.goto(base, { waitUntil: 'networkidle0' });
await g.evaluate(inv => {
  const guests = [['Mona Ali', '01012345678', 'yes', 3], ['Omar Hassan', '01123456789', 'yes', 2], ['Nour Samir', '', 'maybe', 1], ['Kareem Fathy', '', 'no', 1], ['Hana Ibrahim', '01234567890', 'pending', 1]].map(([name, phone, status, count]) => ({ name, phone, status, count }));
  localStorage.setItem('da3wa.v1', JSON.stringify({ ui: 'en', draft: null, invites: [{ id: 'demo1', inv, guests, created: 1, updated: 1 }] }));
}, invs.graduation);
await g.reload({ waitUntil: 'networkidle0' });
await g.evaluate(() => { location.hash = '#/guests/demo1'; });
await g.waitForSelector('.g');
await g.screenshot({ path: 'docs/guests.png' });
await g.evaluate(() => { location.hash = '#/mine'; });
await g.waitForSelector('.mi');
await g.screenshot({ path: 'docs/mine.png' });
await b.close();
