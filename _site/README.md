# VoVL 的博客

基于 Jekyll + GitHub Pages 的个人博客。

## 功能

- 首页：Hero 头图 + 精选项目 + 文章分类 + 最新文章
- 全部文章页（`/posts/`）：封面卡片 + 分类筛选 + 分页
- 项目页（`/projects/`）：项目展示
- 算法题解站（`/algorithm/`）：LeetCode 题解与见解
- 主题切换（明/暗）、Banner 切换
- 分类跳转筛选、响应式布局

## 写作

### 文章

在 `_posts/` 下新建 Markdown 文件，按格式命名：

```markdown
---
layout: post
title: "文章标题"
tags: [标签1, 标签2]
cover: "assets/images/2026_10_19/封面.png"  # 可选，留空用默认封面
---

正文...
```

### 项目

在 `_projects/` 下新建 Markdown 文件：

```markdown
---
title: "项目名"
tags: [技术栈]
cover: "assets/images/demo/封面.png"
github: "https://github.com/xxx/xxx"
---

## 项目简介
...
```

### 题解 / 见解

- 题解 → `_problems/` 目录
- 见解 → `_insights/` 目录

格式同上，均自动收集，无需改代码。

## 本地预览

```bash
export PATH="$HOME/.gem/ruby/3.2.0/bin:$PATH"
export JEKYLL_NO_BUNDLER_REQUIRE=true
jekyll serve --host 0.0.0.0 --port 4000
```

访问 http://127.0.0.1:4000/
[博客界面](https://vovl773.github.io/)
