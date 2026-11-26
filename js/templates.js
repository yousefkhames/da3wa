// Template data: palettes, default copy and SVG ornaments.
const leaf = (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="4" transform="rotate(${r} ${x} ${y})"/>`;

export const TEMPLATES = {
  wedding: {
    palettes: [
      { name: { ar: 'نبيذي', en: 'Burgundy' }, bg: '#fbf5ec', ink: '#3b1a24', ac: '#8a1f40', soft: '#f1e2d4' },
      { name: { ar: 'زيتي', en: 'Olive' }, bg: '#f6f4ea', ink: '#26352b', ac: '#55713f', soft: '#e6e8d3' },
      { name: { ar: 'أزرق ضبابي', en: 'Dusk blue' }, bg: '#f4f6f8', ink: '#1f2f40', ac: '#4a6a8f', soft: '#e0e8f0' }
    ],
    copy: {
      ar: { title: 'حفل زفاف', kicker: 'بقلوب مليئة بالفرح يدعوكم', hostLabel: 'العروسان', ph: 'أحمد وسارة' },
      en: { title: 'Wedding Celebration', kicker: 'Together with their families', hostLabel: 'The couple', ph: 'Ahmed & Sara' }
    },
    art: `<svg viewBox="0 0 320 120" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
      <path d="M20 112C20 50 80 12 160 12s140 38 140 100"/>
      <path d="M36 112C36 60 90 28 160 28s124 32 124 84" stroke-opacity=".45"/>
      <g fill="currentColor" stroke="none">${leaf(46, 70, -50)}${leaf(60, 48, -30)}${leaf(86, 30, -10)}${leaf(120, 20, 5)}${leaf(274, 70, 50)}${leaf(260, 48, 30)}${leaf(234, 30, 10)}${leaf(200, 20, -5)}</g>
      <circle cx="160" cy="12" r="5" fill="currentColor"/><circle cx="160" cy="12" r="10" stroke-opacity=".5"/>
    </svg>`
  },
  iftar: {
    palettes: [
      { name: { ar: 'ليل ذهبي', en: 'Gold night' }, bg: '#151a3d', ink: '#f7edd3', ac: '#e6b34c', soft: '#232a5c' },
      { name: { ar: 'فيروزي', en: 'Teal' }, bg: '#0d2f33', ink: '#eaf6f0', ac: '#6fd1b9', soft: '#164349' },
      { name: { ar: 'عنابي', en: 'Maroon' }, bg: '#3a1424', ink: '#fbe9dc', ac: '#f0a46b', soft: '#4f2033' }
    ],
    copy: {
      ar: { title: 'إفطار جماعي', kicker: 'تقبل الله منا ومنكم، ويسعدنا حضوركم', hostLabel: 'يدعوكم', ph: 'عائلة الشناوي' },
      en: { title: 'Iftar Gathering', kicker: 'Join us to break the fast together', hostLabel: 'Hosted by', ph: 'The Shenawy Family' }
    },
    art: `<svg viewBox="0 0 320 130" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">
      <path d="M0 4h320" stroke-opacity=".3"/>
      <g><path d="M60 4v26"/><path d="M48 30h24l5 10-5 26H48l-5-26z" fill="currentColor" fill-opacity=".18"/><path d="M52 40h16M52 56h16" stroke-opacity=".6"/><circle cx="60" cy="48" r="4" fill="currentColor" stroke="none"/><path d="M52 66l8 12 8-12"/></g>
      <g><path d="M260 4v26"/><path d="M248 30h24l5 10-5 26h-24l-5-26z" fill="currentColor" fill-opacity=".18"/><path d="M252 40h16M252 56h16" stroke-opacity=".6"/><circle cx="260" cy="48" r="4" fill="currentColor" stroke="none"/><path d="M252 66l8 12 8-12"/></g>
      <path d="M176 36a34 34 0 1 0 0 58a27 27 0 1 1 0-58z" fill="currentColor" stroke="none"/>
      <path d="M200 52l3 7 7 .6-5.3 4.7 1.6 7-6.3-3.8-6.3 3.8 1.6-7-5.3-4.7 7-.6z" fill="currentColor" stroke="none"/>
      <g fill="currentColor" stroke="none"><circle cx="110" cy="30" r="1.6"/><circle cx="130" cy="84" r="1.2"/><circle cx="222" cy="100" r="1.6"/><circle cx="104" cy="96" r="1.2"/></g>
    </svg>`
  },
  graduation: {
    palettes: [
      { name: { ar: 'كحلي وذهبي', en: 'Navy & gold' }, bg: '#10265a', ink: '#ffffff', ac: '#ffc83d', soft: '#1b3a80' },
      { name: { ar: 'عاجي وأحمر', en: 'Ivory & red' }, bg: '#fff9ee', ink: '#17213f', ac: '#c4182e', soft: '#f5e9d0' },
      { name: { ar: 'زمردي', en: 'Emerald' }, bg: '#0a3b30', ink: '#f6f3df', ac: '#f2d466', soft: '#12503f' }
    ],
    copy: {
      ar: { title: 'حفل تخرج', kicker: 'بعد سنين من التعب والسهر، جه وقت الفرحة', hostLabel: 'الخريج', ph: 'يوسف أحمد' },
      en: { title: 'Graduation Party', kicker: 'Years of hard work, one big celebration', hostLabel: 'The graduate', ph: 'Youssef Ahmed' }
    },
    art: `<svg viewBox="0 0 320 130" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M160 22L64 58l96 36 96-36z" fill="currentColor" fill-opacity=".2"/>
      <path d="M104 76v26c0 8 25 16 56 16s56-8 56-16V76" />
      <path d="M256 58v34"/><path d="M256 92l-4 14h8z" fill="currentColor"/>
      <g fill="currentColor" stroke="none"><circle cx="34" cy="30" r="3"/><circle cx="52" cy="104" r="2"/><circle cx="288" cy="28" r="2.4"/><circle cx="300" cy="96" r="3"/><rect x="22" y="70" width="7" height="3" transform="rotate(30 22 70)"/><rect x="290" y="60" width="7" height="3" transform="rotate(-25 290 60)"/><rect x="120" y="10" width="7" height="3" transform="rotate(20 120 10)"/><rect x="204" y="8" width="7" height="3" transform="rotate(-35 204 8)"/></g>
    </svg>`
  }
};
