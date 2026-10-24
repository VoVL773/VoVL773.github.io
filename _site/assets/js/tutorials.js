(function () {
  'use strict';
  var content = document.querySelector('.tutorial-content');
  var nav = document.getElementById('tutorial-toc-nav');
  if (!content || !nav) return;
  var chapters = document.querySelector('.tutorial-chapters');
  var mobile = window.matchMedia('(max-width: 760px)');
  function updateChapters() { chapters.open = !mobile.matches; }
  updateChapters();
  mobile.addEventListener('change', updateChapters);
  var headings = Array.from(content.querySelectorAll('h2, h3'));
  if (!headings.length) document.querySelector('.tutorial-toc').hidden = true;
  var links = headings.map(function (heading, index) {
    if (!heading.id) heading.id = 'section-' + index;
    var link = document.createElement('a');
    link.href = '#' + encodeURIComponent(heading.id);
    link.textContent = heading.textContent;
    if (heading.tagName === 'H3') link.className = 'tutorial-toc-nested';
    nav.appendChild(link);
    return link;
  });
  var queued = false;
  function updateActive() {
    queued = false;
    var active = 0;
    headings.forEach(function (heading, index) {
      if (heading.getBoundingClientRect().top <= 120) active = index;
    });
    links.forEach(function (link, index) {
      link.classList.toggle('is-current', index === active);
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (!queued) { queued = true; requestAnimationFrame(updateActive); }
  }, { passive: true });
  window.addEventListener('resize', updateActive);
  updateActive();

  // 每个代码块独立复制；不支持剪贴板时显示可操作的提示。
  content.querySelectorAll('div.highlighter-rouge').forEach(function (block) {
    var code = block.querySelector('code');
    if (!code) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'tutorial-copy';
    button.textContent = '复制';
    button.setAttribute('aria-label', '复制代码');
    button.setAttribute('aria-live', 'polite');
    button.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(code.textContent);
        button.textContent = '已复制';
      } catch (error) {
        button.textContent = '请选中代码复制';
      }
      setTimeout(function () { button.textContent = '复制'; }, 2000);
    });
    block.appendChild(button);
  });
})();
