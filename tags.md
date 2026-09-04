---
title: 标签
permalink: /tags/
---

<!-- site.tags 是一个哈希:{标签名 => [该标签下的文章数组]}
     迭代得到 tag[0]=标签名、tag[1]=文章数组。
     slugify 生成与文章页里标签链接一致的锚点 id。 -->
{% assign sorted_tags = site.tags | sort %}
{% for tag in sorted_tags %}
<h3 class="tag-heading" id="{{ tag[0] | slugify }}">{{ tag[0] }} <small class="tag-count">({{ tag[1] | size }})</small></h3>
<ul class="tag-list">
  {% for post in tag[1] %}
  <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>
{% endfor %}
