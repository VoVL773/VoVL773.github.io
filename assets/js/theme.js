// ===== 主题切换 + Banner 切换 逻辑 =====
// 职责:
// - 主题切换:按钮点击翻转 data-theme,写入 localStorage 记忆
// - Banner 切换:按钮点击循环切换预设图,写入 localStorage 记忆
// 注意:首屏的初始主题已由 _layouts/default.html 里的内联脚本设置好,
// 本文件只负责按钮的点击交互与偏好持久化(职责分离)。

document.addEventListener('DOMContentLoaded', function () {
  var root = document.documentElement;

  // ===== 主题切换 =====
  var toggle = document.getElementById('theme-toggle');
  if (toggle) {
    // 根据当前主题更新按钮图标:浅色显示月亮,暗色显示太阳
    function updateThemeButton() {
      var isDark = root.getAttribute('data-theme') === 'dark';
      toggle.textContent = isDark ? '☀️' : '🌙';
      toggle.setAttribute('aria-label', isDark ? '切换到浅色' : '切换到暗色');
    }

    // 点击切换:翻转 data-theme,写入 localStorage 记忆,更新按钮图标
    toggle.addEventListener('click', function () {
      var isDark = root.getAttribute('data-theme') === 'dark';
      var next = isDark ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateThemeButton();
    });

    // 页面加载后初始化按钮图标(与防闪烁脚本设好的主题保持一致)
    updateThemeButton();
  }

  // ===== Banner 切换 =====
  var bannerToggle = document.getElementById('banner-toggle');
  var presets = window.bannerPresets || [];  // 由 default.html 内联脚本注入
  if (bannerToggle && presets.length > 0) {

    // 应用第 idx 张预设图(设置 CSS 变量 --hero-bg)
    function applyBanner(idx) {
      var url = presets[idx];
      root.style.setProperty('--hero-bg', 'url("' + url + '")');
    }

    // 恢复已保存的偏好(或用默认第 0 张)
    var savedIdx = localStorage.getItem('bannerIdx');
    var currentIdx = (savedIdx !== null) ? parseInt(savedIdx, 10) : 0;
    // 边界保护:localStorage 可能存了一个已不存在的索引(如用户增删图片后)
    if (isNaN(currentIdx) || currentIdx < 0 || currentIdx >= presets.length) {
      currentIdx = 0;
    }
    applyBanner(currentIdx);

    // 点击循环切换:下一张 → 存 localStorage → 应用
    bannerToggle.addEventListener('click', function () {
      currentIdx = (currentIdx + 1) % presets.length;
      localStorage.setItem('bannerIdx', String(currentIdx));
      applyBanner(currentIdx);
    });
  }
});
