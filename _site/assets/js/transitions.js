// 保留完整页面导航，让文章脚本、评论区和浏览器历史正常初始化。
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var navigating = false;
  var navigationTimer;
  var recoveryTimer;

  function reset() {
    clearTimeout(navigationTimer);
    clearTimeout(recoveryTimer);
    navigating = false;
    document.body.classList.remove('page-exiting');
  }

  // 从往返缓存恢复时，不能留下退场后的透明页面。
  window.addEventListener('pageshow', reset);
  window.addEventListener('pagehide', reset);

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey || reducedMotion.matches) return;

    var link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self') ||
        link.relList.contains('external')) return;

    var destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin ||
        !/^https?:$/.test(destination.protocol)) return;

    // 锚点、当前页面的筛选参数和文件下载都直接交给浏览器。
    if (destination.pathname === window.location.pathname ||
        /\.[^/]+$/.test(destination.pathname) && !/\.html?$/i.test(destination.pathname)) return;

    event.preventDefault();
    if (navigating) return;
    navigating = true;
    document.body.classList.add('page-exiting');
    navigationTimer = setTimeout(function () {
      window.location.assign(destination.href);
    }, 180);
    // 网络慢或导航被取消时，恢复旧页面以便继续操作。
    recoveryTimer = setTimeout(reset, 1500);
  });
})();
