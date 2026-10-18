// ===== 标签页:横向选择条 =====
// 职责:
// - 把标签页的完整分组列表(无 JS 时的降级形态)变成"选择条 + 单标签文章列表"
// - 支持 URL #锚点(文章页的标签链接会带着 #标签 跳进来)
// - 选择条溢出时显示左右滚动箭头,并支持键盘左右方向键切换
// 设计:标签条和面板都直接由 Jekyll 输出,这里只做显隐切换,不发起任何请求。

(function () {
  'use strict';

  var tabs = document.getElementById('tag-tabs');
  if (!tabs) return;

  var scroll = tabs.querySelector('.tag-tabs-scroll');
  var leftArrow = tabs.querySelector('.tag-tabs-arrow--left');
  var rightArrow = tabs.querySelector('.tag-tabs-arrow--right');
  var buttons = Array.prototype.slice.call(tabs.querySelectorAll('.tag-tab'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.tag-panel'));

  if (!scroll || buttons.length === 0 || panels.length === 0) return;

  // 隐藏标签条是为了无 JS 时保持原来的分组列表;有 JS 才接管。
  tabs.hidden = false;

  function hashSlug() {
    var raw = window.location.hash.replace(/^#/, '');
    try {
      return decodeURIComponent(raw);
    } catch (err) {
      return raw;
    }
  }

  function findButton(slug) {
    for (var i = 0; i < buttons.length; i += 1) {
      if (buttons[i].getAttribute('data-tag') === slug) return buttons[i];
    }
    return null;
  }

  function updateArrows() {
    var max = scroll.scrollWidth - scroll.clientWidth;
    var canLeft = scroll.scrollLeft > 8;
    var canRight = max - scroll.scrollLeft > 8;
    if (leftArrow) leftArrow.hidden = !canLeft;
    if (rightArrow) rightArrow.hidden = !canRight;
    tabs.classList.toggle('has-overflow-left', canLeft);
    tabs.classList.toggle('has-overflow-right', canRight);
  }

  function centerTab(button, instant) {
    var scrollRect = scroll.getBoundingClientRect();
    var buttonRect = button.getBoundingClientRect();
    var delta = (buttonRect.left - scrollRect.left) - (scroll.clientWidth - buttonRect.width) / 2;
    var left = scroll.scrollLeft + delta;
    if (instant || typeof scroll.scrollTo !== 'function') {
      scroll.scrollLeft = left;
    } else {
      scroll.scrollTo({ left: left, behavior: 'smooth' });
    }
  }

  function activate(slug, options) {
    options = options || {};
    var button = findButton(slug);
    var matched = button !== null;
    if (!button) button = buttons[0];

    var active = button.getAttribute('data-tag');

    buttons.forEach(function (item) {
      var on = item === button;
      item.classList.toggle('is-active', on);
      item.setAttribute('aria-selected', on ? 'true' : 'false');
      item.tabIndex = on ? 0 : -1;
    });

    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-tag') !== active;
    });

    if (options.center !== false) centerTab(button, options.instant);
    if (options.updateHash !== false && active !== hashSlug()) {
      // 浏览器在 replaceState 改 hash 后可能会跳到锚点,这里把滚动位置还原,
      // 避免点一下标签页就"跳"到文章列表中间。
      var scrollX = window.scrollX;
      var scrollY = window.scrollY;
      try {
        history.replaceState(null, '', '#' + active);
        requestAnimationFrame(function () {
          if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
            window.scrollTo(scrollX, scrollY);
          }
        });
      } catch (err) {
        // file:// 等环境不支持时忽略,不影响切换
      }
    }
    updateArrows();
    return matched;
  }

  buttons.forEach(function (button, index) {
    button.addEventListener('click', function () {
      activate(button.getAttribute('data-tag'));
    });

    button.addEventListener('keydown', function (event) {
      var next = null;
      if (event.key === 'ArrowRight') next = buttons[(index + 1) % buttons.length];
      else if (event.key === 'ArrowLeft') next = buttons[(index - 1 + buttons.length) % buttons.length];
      else if (event.key === 'Home') next = buttons[0];
      else if (event.key === 'End') next = buttons[buttons.length - 1];
      if (next) {
        event.preventDefault();
        activate(next.getAttribute('data-tag'));
        next.focus();
      }
    });
  });

  function scrollByPage(direction) {
    var amount = Math.max(180, scroll.clientWidth * 0.7);
    if (typeof scroll.scrollBy === 'function') {
      scroll.scrollBy({ left: amount * direction, behavior: 'smooth' });
    } else {
      scroll.scrollLeft += amount * direction;
    }
  }

  if (leftArrow) leftArrow.addEventListener('click', function () { scrollByPage(-1); });
  if (rightArrow) rightArrow.addEventListener('click', function () { scrollByPage(1); });
  scroll.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);

  window.addEventListener('hashchange', function () {
    activate(hashSlug(), { instant: true });
  });

  var initial = hashSlug();
  var matched = activate(initial || 'all', {
    instant: true,
    center: Boolean(initial),
    updateHash: false
  });
  updateArrows();

  // 从文章页带着 #标签 跳进来时,把选择条带到视口顶部附近。
  // 没有 hash 时不要滚动,否则移动端会一进页面就跳过标题。
  if (initial && matched) {
    var top = tabs.getBoundingClientRect().top + window.pageYOffset - 16;
    window.scrollTo(0, top);
  }
})();
