// 全站背景动态特效:
// - 暗色模式:少量暖色"萤火虫"光点,缓慢飘移并明暗呼吸
// - 亮色模式:几团极淡的光晕缓慢流动,营造背景微微呼吸的感觉
// 画布固定在视口底层(content 用 z-index:1 覆盖在上方),不拦截鼠标事件。
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'bg-fx';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0;
  var H = 0;
  var mode = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  var items = [];
  var last = 0;

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function build() {
    items = [];
    if (mode === 'dark') {
      // 萤火虫:数量随屏幕宽度增减
      var count = Math.round(Math.min(56, Math.max(18, W / 26)));
      for (var i = 0; i < count; i++) {
        items.push({
          x: rand(0, W),
          y: rand(0, H),
          vx: rand(-0.18, 0.18),
          vy: rand(-0.14, 0.14),
          r: rand(1.1, 2.8),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.5, 1.1)
        });
      }
    } else {
      // 亮色:几团大而淡的彩色光晕(纯白在浅色底上看不出来,所以用冷/暖色微微染色)
      var palette = ['110, 165, 255', '140, 205, 235', '255, 236, 190'];
      var blob = Math.round(Math.min(W, H) * 0.42);
      for (var j = 0; j < 5; j++) {
        items.push({
          x: rand(0, W),
          y: rand(0, H),
          vx: rand(-0.045, 0.045),
          vy: rand(-0.032, 0.032),
          r: rand(blob * 0.85, blob * 1.7),
          phase: rand(0, Math.PI * 2),
          speed: rand(0.10, 0.22),
          tint: palette[j % palette.length]
        });
      }
    }
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    if (mode === 'dark') {
      for (var i = 0; i < items.length; i++) {
        var p = items[i];
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.02 * p.speed;

        // 越界回绕,避免粒子消失
        if (p.x < -6) p.x = W + 6;
        if (p.x > W + 6) p.x = -6;
        if (p.y < -6) p.y = H + 6;
        if (p.y > H + 6) p.y = -6;

        var alpha = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(p.phase));
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 214, 130, ' + alpha.toFixed(3) + ')';
        ctx.shadowColor = 'rgba(255, 196, 92, 0.95)';
        ctx.shadowBlur = 16;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    } else {
      // 亮色:彩色光斑缓慢漂移;用 source-over 而不是 lighter,
      // 否则浅色底上叠加白光只会更白,看不出流动。
      for (var k = 0; k < items.length; k++) {
        var b = items[k];
        b.x += b.vx;
        b.y += b.vy;
        b.phase += 0.006 * b.speed;

        if (b.x < -b.r) b.x = W + b.r;
        if (b.x > W + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = H + b.r;
        if (b.y > H + b.r) b.y = -b.r;

        var strength = 0.20 + 0.12 * (0.5 + 0.5 * Math.sin(b.phase));
        var gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        gradient.addColorStop(0, 'rgba(' + b.tint + ', ' + strength.toFixed(3) + ')');
        gradient.addColorStop(0.55, 'rgba(' + b.tint + ', ' + (strength * 0.45).toFixed(3) + ')');
        gradient.addColorStop(1, 'rgba(' + b.tint + ', 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    // 限制在约 30fps,降低常驻开销(效果本身很慢,肉眼无差别)
    if (now - last < 33) return;
    last = now;
    draw();
  }

  new MutationObserver(function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    if (next === mode) return;
    mode = next;
    build();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  window.addEventListener('resize', resize);

  resize();
  requestAnimationFrame(frame);
})();
