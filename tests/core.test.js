import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../js/core.js';

const inv = c.normalize({ t: 'iftar', a: 1, l: 'ar', h: 'عائلة الشناوي', ti: 'إفطار', d: '2027-03-05T18:10', v: 'نادي الصيد', ad: 'الإسكندرية', m: 'maps.app.goo.gl/abc', n: 'ملحوظة', p: '01012345678', c: 3, rb: '2027-03-01', hj: true });

test('encode/decode roundtrip keeps Arabic and fields', () => {
  const back = c.decodeInvite(c.encodeInvite(inv));
  assert.deepEqual(back, inv);
  assert.match(c.encodeInvite(inv), /^[A-Za-z0-9_-]+$/);
});
test('decode rejects garbage, arrays and oversized payloads', () => {
  assert.equal(c.decodeInvite('!!!'), null);
  assert.equal(c.decodeInvite(''), null);
  assert.equal(c.decodeInvite('x'.repeat(7000)), null);
  assert.equal(c.decodeInvite(btoa('[1,2]')), null);
});
test('normalize clamps and sanitizes', () => {
  const n = c.normalize({ t: 'evil', a: 9, h: '  x'.repeat(100), c: 99, d: 'nope', m: 'javascript:alert(1)' });
  assert.equal(n.t, 'wedding'); assert.equal(n.a, 0); assert.ok(n.h.length <= 80); assert.equal(n.c, 20); assert.equal(n.d, ''); assert.equal(n.m, '');
});
test('safeUrl allows only http(s) with a dot host', () => {
  assert.equal(c.safeUrl('https://maps.google.com/?q=1'), 'https://maps.google.com/?q=1');
  assert.equal(c.safeUrl('maps.app.goo.gl/x'), 'https://maps.app.goo.gl/x');
  assert.equal(c.safeUrl('data:text/html,hi'), '');
  assert.equal(c.safeUrl('ftp://a.b'), '');
  assert.equal(c.safeUrl('localhost'), '');
});
test('esc escapes html', () => { assert.equal(c.esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;'); });
test('normalizePhone handles Egyptian and international formats', () => {
  assert.equal(c.normalizePhone('01012345678'), '201012345678');
  assert.equal(c.normalizePhone('+20 101 234 5678'), '201012345678');
  assert.equal(c.normalizePhone('00201012345678'), '201012345678');
  assert.equal(c.normalizePhone('٠١٠١٢٣٤٥٦٧٨'), '201012345678');
  assert.equal(c.normalizePhone('+44 7700 900123'), '447700900123');
  assert.equal(c.normalizePhone('123'), '');
  assert.equal(c.normalizePhone('abc'), '');
});
test('validate reports missing fields', () => {
  assert.deepEqual(c.validate(c.normalize({})), ['h', 'd', 'v']);
  assert.deepEqual(c.validate(c.normalize({ h: 'Ali', d: '2027-01-01T10:00', v: 'Hall', p: '12' })), ['p']);
  assert.deepEqual(c.validate(inv), []);
});
test('waLink builds wa.me url with encoded text', () => {
  const u = c.waLink('01012345678', 'مرحبا & hi\nline');
  assert.ok(u.startsWith('https://wa.me/201012345678?text='));
  assert.equal(decodeURIComponent(u.split('text=')[1]), 'مرحبا & hi\nline');
});
test('rsvpMessage covers statuses and languages', () => {
  const en = { ...inv, l: 'en', ti: 'Iftar' };
  assert.match(c.rsvpMessage(en, { name: 'Mona', status: 'yes', guests: 3 }), /Mona: I will attend "Iftar" with 3 guests/);
  assert.match(c.rsvpMessage(en, { name: 'Mona', status: 'no', guests: 1 }), /cannot attend/);
  assert.match(c.rsvpMessage(en, { name: '', status: 'maybe', guests: 1 }), /^A guest: .*not sure/);
  assert.match(c.rsvpMessage(inv, { name: 'منى', status: 'yes', guests: 2, note: 'شكرا' }), /منى: إن شاء الله هحضر.*2 أفراد[\s\S]*شكرا$/);
  assert.doesNotMatch(c.rsvpMessage(inv, { name: 'منى', status: 'yes', guests: 1 }), /أفراد/);
});
test('guestLink and parseHash', () => {
  const l = c.guestLink('https://x.io/da3wa/?a=1#/old', inv, 'منى علي');
  assert.ok(l.startsWith('https://x.io/da3wa/?a=1#/i/'));
  const hash = l.slice(l.indexOf('#'));
  const p = c.parseHash(hash);
  assert.equal(p.route, 'i'); assert.equal(p.params.to, 'منى علي');
  assert.deepEqual(c.decodeInvite(p.arg), inv);
  assert.equal(c.parseHash('#/guests/ab12').arg, 'ab12');
  assert.equal(c.parseHash('').route, '');
});
test('ICS is valid and escapes text', () => {
  const ics = c.toICS({ ...inv, ti: 'A,B;C', n: 'line1\nline2' }, new Date('2027-01-01T00:00:00Z'));
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART:20270305T181000\r\n/);
  assert.match(ics, /DTEND:20270305T211000\r\n/);
  assert.match(ics, /DTSTAMP:20270101T000000Z/);
  assert.match(ics, /SUMMARY:A\\,B\\;C - /);
  assert.match(ics, /DESCRIPTION:line1\\nline2/);
  assert.equal(c.toICS({ d: '' }), '');
});
test('countdown', () => {
  const now = new Date('2027-03-03T10:00:00');
  assert.deepEqual(c.countdown('2027-03-05T12:30', now), { past: false, days: 2, hours: 2, minutes: 30 });
  assert.equal(c.countdown('2027-03-01T12:30', now).past, true);
  assert.equal(c.countdown('', now), null);
});
test('formatParts gives Arabic and English parts and Hijri', () => {
  const ar = c.formatParts('2027-03-05T18:10', 'ar', true);
  const en = c.formatParts('2027-03-05T18:10', 'en', true);
  assert.equal(en.weekday, 'Friday'); assert.equal(en.month, 'March'); assert.match(en.time, /6:10/);
  assert.match(ar.month, /مارس/); assert.ok(ar.hijri && en.hijri);
  assert.equal(c.formatParts('bad', 'en'), null);
});
test('guest summary, CSV and line parsing', () => {
  const g = [{ name: 'A', status: 'yes', count: 3 }, { name: 'B', status: 'no' }, { name: 'C', status: 'maybe' }, { name: '=HYPERLINK("x")', phone: '0101' }];
  assert.deepEqual(c.summarize(g), { total: 4, yes: 1, no: 1, maybe: 1, pending: 1, heads: 3 });
  const csv = c.guestsToCSV(g);
  assert.ok(csv.startsWith('\ufeff"name"'));
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
  const lines = c.parseGuestLines('منى علي 01012345678\n\nAhmed, +20 100 123 4567\nJust Name\n');
  assert.deepEqual(lines, [{ name: 'منى علي', phone: '01012345678' }, { name: 'Ahmed', phone: '+20 100 123 4567' }, { name: 'Just Name', phone: '' }]);
});
