// UI overlay (labels, chapters, title, end card) drawn over the Cycles render. window.ui(t) sets the state for time t.
(() => {
  const W = 1920, H = 1080;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const ramp = (t, a, b) => clamp((t - a) / (b - a));
  const fade = (t, a, b, c, d) => Math.min(smooth(ramp(t, a, b)), 1 - smooth(ramp(t, c, d)));
  function drawLogo(g, cx, cy, s, color, lw) {
    g.save(); g.translate(cx, cy); g.scale(s, s); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.arc(0, -0.12, 0.36, Math.PI * 0.82, Math.PI * 2.18); g.quadraticCurveTo(0.17, 0.25, 0, 0.5); g.quadraticCurveTo(-0.17, 0.25, -0.33, 0.13); g.stroke();
    g.save(); g.translate(0, -0.12); g.rotate(-0.55); g.beginPath(); g.ellipse(0, 0, 0.13, 0.2, 0, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, -0.18); g.bezierCurveTo(0.08, -0.06, -0.08, 0.06, 0, 0.18); g.stroke(); g.restore(); g.restore();
  }
  function logoURL(bg) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = bg; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); drawLogo(g, 128, 132, 210, '#fff', .06); return c.toDataURL(); }
  document.getElementById('brandLogo').src = logoURL('#c9975e');
  document.getElementById('endLogo').src = logoURL('#1a1a1a');

  const CH = [
    [0, 9.6, 'جولة خارجية', 'Exterior · drive-thru lane'],
    [9.6, 15.2, 'الدخول إلى الكشك', 'Entering the kiosk'],
    [15.2, 27.4, 'منطقة التحضير الرئيسية', 'Main espresso bar'],
    [27.4, 35.0, 'التقطير والتبريد والتخزين', 'Brew · cold storage · stock'],
    [35.0, 43.4, 'كاونتر الخدمة', 'Service counter'],
    [43.4, 55.4, 'نافذة الدرايف ثرو · استقبال الطلبات', 'Drive-thru window · taking orders'],
  ];
  let LB = null, labelEls = [];
  window.setLabels = data => {
    LB = data; const host = document.getElementById('labels');
    labelEls = LB.labels.map(l => { const d = document.createElement('div'); d.className = 'label'; d.innerHTML = `<div class="stem"></div><div class="dot"></div><div class="pill"><div class="ar">${l.ar}</div><div class="en">${l.en}</div></div>`; host.appendChild(d); return d; });
  };
  const ui = { chapter: document.getElementById('chapter'), title: document.getElementById('title'), end: document.getElementById('end'), brand: document.getElementById('brand') };
  const chAr = ui.chapter.querySelector('.ar'), chEn = ui.chapter.querySelector('.en');
  window.ui = t => {
    ui.title.style.opacity = fade(t, .3, 1.2, 4.2, 5.2);
    ui.title.querySelector('.h').style.transform = `translateY(${(1 - smooth(ramp(t, .3, 1.6))) * 30}px)`;
    ui.title.querySelector('.line').style.width = `${smooth(ramp(t, .8, 2.0)) * 260}px`;
    const ea = smooth(ramp(t, 56.0, 57.2)); ui.end.style.opacity = ea; ui.end.style.display = ea > 0 ? 'flex' : 'none';
    ui.end.querySelector('.line').style.width = `${smooth(ramp(t, 57.0, 58.2)) * 300}px`;
    ui.end.querySelector('img').style.transform = `scale(${.85 + .15 * smooth(ramp(t, 56.4, 57.8))})`;
    ui.brand.style.opacity = fade(t, 5.0, 6.0, 55.0, 56.0);
    const ci = CH.findIndex(c => t >= c[0] && t < c[1]);
    if (ci >= 0) {
      const c = CH[ci]; chAr.textContent = c[2]; chEn.textContent = c[3];
      const s0 = ci === 0 ? 5.4 : c[0];
      ui.chapter.style.opacity = fade(t, s0, s0 + .6, c[1] - .6, c[1]);
      ui.chapter.style.transform = `translateX(${(1 - smooth(ramp(t, s0, s0 + 1))) * 40}px)`;
    } else ui.chapter.style.opacity = 0;
    const f = clamp(Math.round(t * LB.fps), 0, LB.frames - 1);
    LB.labels.forEach((l, i) => {
      const el = labelEls[i]; const al = fade(t, l.a, l.a + .5, l.b - .5, l.b); const p = LB.pos[f][i];
      if (al <= 0 || !p || p[0] < -.1 || p[0] > 1.1 || p[1] < -.1 || p[1] > 1.1) { el.style.display = 'none'; return; }
      const x = p[0] * W, y = p[1] * H, stem = 90 * smooth(ramp(t, l.a, l.a + .6));
      el.style.display = 'block'; el.style.opacity = al; el.style.transform = `translate(${x}px, ${y}px)`;
      el.querySelector('.stem').style.cssText = `top:${-stem}px;height:${stem}px`;
      const pill = el.querySelector('.pill'); pill.style.top = `${-stem}px`; pill.style.transform = `translate(-50%, -100%) scale(${.9 + .1 * smooth(ramp(t, l.a + .1, l.a + .6))})`;
    });
    return true;
  };
  window.ready = document.fonts.ready.then(() => document.fonts.load('800 40px Cairo')).then(() => true);
})();
