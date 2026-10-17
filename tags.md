---
title: 标签
permalink: /tags/
---

<!-- 标签页:顶部横向标签选择条 + 下方对应标签的文章列表。
     默认无 JS 时降级为「按标签分组」的完整列表;标签条与 JS 逻辑见
     assets/js/tags.js。slugify 与文章页里的 #锚点 保持一致。 -->
{% assign sorted_tags = site.tags | sort %}

<div class="tag-tabs" id="tag-tabs" hidden>
  <button class="tag-tabs-arrow tag-tabs-arrow--left" type="button" aria-label="向左滚动" hidden>
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>

  <div class="tag-tabs-scroll" role="tablist" aria-label="按标签筛选">
    <button class="tag-tab is-active" id="tab-all" type="button" role="tab"
            aria-selected="true" aria-controls="tag-all" data-tag="all" tabindex="0">全部</button>
    {% for tag in sorted_tags %}
    <button class="tag-tab" id="tab-{{ tag[0] | slugify }}" type="button" role="tab"
            aria-selected="false" aria-controls="{{ tag[0] | slugify }}"
            data-tag="{{ tag[0] | slugify }}" tabindex="-1">{{ tag[0] }}</button>
    {% endfor %}
  </div>

  <button class="tag-tabs-arrow tag-tabs-arrow--right" type="button" aria-label="向右滚动" hidden>
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </button>
</div>

<div class="tag-panels">
  <section class="tag-panel" id="tag-all" data-tag="all" role="tabpanel"
           aria-labelledby="tab-all" hidden>
    <h2 class="tag-panel-heading">
      <span>全部</span><small>{{ site.posts | size }} 篇</small>
    </h2>
    <ul class="tag-post-list">
      {% for post in site.posts %}
      <li>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y-%m-%d" }}</time>
      </li>
      {% endfor %}
    </ul>
  </section>

  {% for tag in sorted_tags %}
  <section class="tag-panel" id="{{ tag[0] | slugify }}" data-tag="{{ tag[0] | slugify }}"
           role="tabpanel" aria-labelledby="tab-{{ tag[0] | slugify }}">
    <h2 class="tag-panel-heading">
      <span>{{ tag[0] }}</span><small>{{ tag[1] | size }} 篇</small>
    </h2>
    <ul class="tag-post-list">
      {% for post in tag[1] %}
      <li>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y-%m-%d" }}</time>
      </li>
      {% endfor %}
    </ul>
  </section>
  {% endfor %}
</div>

<script src="{{ '/assets/js/tags.js' | relative_url }}" defer></script>
