---
layout: post
title: "Jekyll 入门笔记"
tags: [Jekyll, 教程]
---

记录一些搭建这个博客时学到的 Jekyll 基础。

## 文章命名规范

`_posts` 目录下的文章文件名必须形如:

```
YEAR-MONTH-DAY-title.md
```

例如 `2026-09-02-jekyll-getting-started.md`。日期格式错了或漏了,文章会被 Jekyll **静默忽略**(不报错),新手最容易踩这个坑。

## front matter

每篇文章顶部的两行 `---` 之间是元数据:

```yaml
---
layout: post
title: "文章标题"
tags: [标签1, 标签2]
---
```

## Liquid 模板

Jekyll 用 Liquid 模板语言。常用:

- `site.posts` 站点所有文章(按日期倒序)
- `{% for post in site.posts %} ... {% endfor %}` 循环
- `{{ post.url | relative_url }}` 自动拼接 baseurl 的链接

下一篇文章会讲如何实现无闪烁的暗色模式切换。
