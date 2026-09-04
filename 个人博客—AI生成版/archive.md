---
title: 归档
permalink: /archive/
---

<!-- 用"年份变化点"分组:每当文章年份变化时打印一个年份标题。
     这比 group_by 过滤器对日期的分组更稳定,且不依赖任何插件。 -->
{% assign current_year = "" %}
{% for post in site.posts %}
  {% assign post_year = post.date | date: "%Y" %}
  {% if post_year != current_year %}
    {% assign current_year = post_year %}
<h2 class="archive-year">{{ post_year }}</h2>
  {% endif %}
<div class="archive-item">
  <time class="archive-date">{{ post.date | date: "%m-%d" }}</time>
  <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
</div>
{% endfor %}
