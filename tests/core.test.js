const test = require('node:test'), assert = require('node:assert/strict');
const D = require('../core.js');
test('encode/decode round trip keeps Arabic text and rejects invalid data', () => {
  const o = D.sanitize({ ...D.demo(), h: ['سارة', 'أحمد'], vn: 'قاعة النيل', lg: 'ar' }); const back = D.decode(D.encode(o)); assert.deepEqual(back, o);
  assert.equal(D.decode('%%%'), null); assert.equal(D.decode(D.b64u.enc('{"h":[],"d":""}')), null); assert.equal(D.decode(D.b64u.enc(JSON.stringify({ ...o, d: '2027-02-31T10:00' }))), null);
});
test('sanitize clips lengths, drops unknown types, unsafe maps urls and bad phones', () => {
  const o = D.sanitize({ ty: 'x', h: ['a'.repeat(100), '', 'b', 'c'], d: '2027-01-01T10:00', msg: 'm'.repeat(900), mp: 'javascript:alert(1)', wa: '12', th: 'nope' });
  assert.equal(o.ty, 'generic'); assert.equal(o.h.length, 2); assert.equal(o.h[0].length, 40); assert.equal(o.msg.length, 400); assert.equal(o.mp, ''); assert.equal(o.wa, ''); assert.equal(o.th, 'gold');
  assert.ok(D.mapsUrl('https://www.google.com/maps/place/X')); assert.ok(D.mapsUrl('https://maps.app.goo.gl/abc')); assert.equal(D.mapsUrl('https://evil.example/maps'), ''); assert.equal(D.mapsUrl('http://maps.google.com/x'), '');
  assert.equal(D.phone('01012345678'), '201012345678'); assert.equal(D.phone('+٢٠١٠١٢٣٤٥٦٧٨'), '201012345678');
});
test('card html escapes everything the host typed', () => {
  const o = D.sanitize({ ...D.demo(), h: ['<img src=x onerror=1>', 'B'], msg: '<script>alert(1)</script>', vn: '"><b>', wa: '201012345678' }); const h = D.cardHtml(o, '<i>guest</i>');
  assert.ok(!/<script|<img|<i>|<b>/.test(h)); assert.match(h, /&lt;img/); assert.match(h, /data-rsvp/);
});
test('ics has required fields, floating local time, escaping and 75-byte folding', () => {
  const o = D.sanitize({ ...D.demo(), vn: 'قاعة, النيل; الكبرى '.repeat(4), msg: 'line1\nline2' }); const s = D.ics(o, 1_800_000_000_000);
  assert.match(s, /^BEGIN:VCALENDAR\r\n/); assert.match(s, /DTSTART:20270115T200000\r\n/); assert.match(s, /DTEND:20270115T230000\r\n/); assert.ok(!/DTSTART:\d+T\d+Z/.test(s)); assert.match(s, /END:VCALENDAR\r\n$/); assert.match(s, /\\n/);
  s.split('\r\n').forEach((ln) => assert.ok(new TextEncoder().encode(ln).length <= 75, ln));
  const noEnd = D.ics(D.sanitize({ ...D.demo(), e: '' })); assert.ok(!/DTEND/.test(noEnd));
});
test('per-guest link carries the guest name outside the invitation data', () => {
  const o = D.sanitize(D.demo()), l = D.link('https://x.test/', o, 'ضيف'); const [data, , g] = l.split('#/i/')[1].split('/'); assert.deepEqual(D.decode(data), o); assert.equal(D.decodeGuest(g), 'ضيف'); assert.equal(D.link('https://x.test/', o), 'https://x.test/#/i/' + D.encode(o));
});
test('standalone file is self contained: no external urls, embeds the activate script', () => {
  const o = D.sanitize({ ...D.demo(), wa: '201012345678' }); const h = D.standalone(o, ''); assert.ok(!/<link|src="http|href="http(?!s:\/\/(maps|www\.google|goo))/.test(h)); assert.match(h, /By Yousef Khames/); assert.match(h, /function activate|function \(doc\)|\(doc\)/);
  assert.doesNotThrow(() => new Function(h.match(/<script>([\s\S]*)<\/script>/)[1]));
});
test('demo is clearly fictional and valid', () => { const d = D.sanitize(D.demo()); assert.equal(D.validate(d).length, 0); assert.equal(d.demo, 1); assert.match(d.h.join(), /Demo/); });
