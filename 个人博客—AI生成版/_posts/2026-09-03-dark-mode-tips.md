---
layout: post
title: "实现无闪烁的暗色模式切换"
tags: [CSS, JavaScript, 教程]
---

这个博客支持暗色模式。记录一下实现要点,正好复习用到的东西。

## 用 CSS 变量驱动主题

在 `:root` 定义浅色变量,在 `[data-theme="dark"]` 覆盖为暗色:

```css
:root { --bg: #fff; --text: #111; }
[data-theme="dark"] { --bg: #111; --text: #fff; }
body { background: var(--bg); color: var(--text); }
```

切换主题只要改 `<html>` 上的 `data-theme` 属性,所有变量自动更新。

## 为什么防闪烁脚本必须内联

如果主题判断逻辑写在外链 JS 里,浏览器会:

1. 先用默认(浅色)样式绘制一帧
2. 再加载执行 JS,切到暗色

暗色偏好的用户就会先看到一帧白色再变暗——这就是闪烁(flash)。

解决:把读取偏好的逻辑**内联**在 `<head>` 里、CSS 之前。同步脚本在首次绘制前执行,所以 `data-theme` 在绘制时已经是暗色,不会闪。

```html
<head>
  <script>
    (function () {
      var saved = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (saved === 'dark' || (saved === null && prefersDark)) {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  </script>
  <link rel="stylesheet" href="...">
</head>
```

而按钮的点击交互可以放在外链 `theme.js` 里(用 `defer`),它不影响首屏。

## 用 localStorage 记住偏好

点击切换按钮时写入 `localStorage.setItem('theme', next)`,刷新页面后内联脚本会读到并恢复。这就是本博客主题切换的全部原理。
