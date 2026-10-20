---
title: "钉钉博客自动统计工具"
tags: [Python]
cover: "assets/images/demo/钉钉机器人.png"
github: "https://github.com/VoVL773/dingtalk_blog_statistics"
---

dingtalk工具 —— 本周博客更新统计机器人
一句话：抓每个人的博客，自动数出本周（最近 7 天）发了几篇、都是哪几篇，然后把「谁完成了、谁没完成」发到钉钉群。

对名单里的每个人，脚本去抓他的博客首页，按下面的顺序找文章和日期：

|顺序	|来源	|说明|
|--|--|--|
|1	|订阅源	|自动找 feed / rss.xml / atom.xml / index.xml 等，标题和发布时间最准|
|2	|首页 / 列表页	|① 链接文字或 URL 里带日期（2026/09/20/xxx）；② 链接旁边带 <time datetime="...">（Astro、Hugo 等主题）——按出现顺序配对|
|3	|sitemap	|前两种都没结果时才用（sitemap 的 lastmod 常是整站构建时间，容易误判，所以放后面）|
|4	|文章页	|还没有就翻两页，读里面的 article:published_time / <time datetime> |
|5	|JS / JSON 兜底	|纯前端渲染的博客：扫描页面内联脚本和它的 JS 打包文件，从 date: 2026-09-19、"date":"..." 或内联的 Markdown 前置信息里取日期+标题；能对上 slug 的还会拼出文章链接（含 #/posts/xxx 这种 hash 路由）|
> 日期能识别的写法：2026-09-24、2026/09/24、2026.09.24、2026年9月24日、 RSS 的 Wed, 24 Sep 2026 10:00:00 GMT、Sep 24, 2026、24 Sep 2026。

判定规则：

发布时间在最近 N 天（默认 7 天）内的文章 → 计入本周产出，篇数 +1
某人有 ≥1 篇 → 已完成；0 篇 → 未完成（消息里点名，有手机号就 @）
抓不到日期（打不开 / 没有订阅源 / 页面上没有日期）→ 无法判断，单独列出原因，默认不 @
会自动排除标签页、分类页、归档页、分页（/tags/xxx/、/page/2/、/posts/ 这类）， 同一篇文章的两种写法（URL 编码 / 未编码、大小写、末尾斜杠）只算一篇。

实测覆盖：Hexo / Hugo / Jekyll / Astro / VitePress 等静态站靠订阅源或首页即可； Astro 把日期放在 <time> 里的、以及把文章内联进 JS 的 React/Vue SPA（#/posts/xxx）也能读到。 仍可能「无法判断」的情况：站点在当前网络打不开（Vercel 域名常超时）、页面完全没有任何日期信息。


