// ===== 主题切换按钮逻辑 =====
// 注意:首屏的初始主题已由 _layouts/default.html 里的内联脚本设置好,
// 本文件只负责按钮的点击交互与偏好持久化(职责分离)。

document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.getElementById('theme-toggle');
  var root = document.documentElement;
  if (!toggle) return;

  // 根据当前主题更新按钮图标:浅色显示月亮,暗色显示太阳
  function updateButton() {
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
    updateButton();
  });

  // 页面加载后初始化按钮图标(与防闪烁脚本设好的主题保持一致)
  updateButton();
});
