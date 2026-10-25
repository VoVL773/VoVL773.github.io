# VoVL 的博客

记录 ROS 2、机器视觉与机器人仿真实践，也分享 Python、算法学习笔记和日常随笔。

基于 **Jekyll + GitHub Pages** 构建的个人博客，包含文章归档、项目展示、算法题解和按章节阅读的教程。日常使用 **Markdown 写正文、YAML 管配置**，构建后发布为静态网页。

[访问博客](https://vovl773.github.io/) · [教程栏目维护指南](docs/tutorials.md)

## 栏目与功能

| 栏目 | 地址 | 内容 |
| --- | --- | --- |
| 首页 | `/` | 个人介绍、可切换头图、最新文章、精选项目与文章分类 |
| 文章 | `/posts/` | 学习笔记、教程和随笔，支持标签筛选与客户端分页 |
| 项目 | `/projects/` | 项目简介、技术栈、封面与 GitHub 源码链接 |
| 算法 | `/algorithm/` | 按题目组织的题解，以及独立的算法见解页面 |
| 教程 | `/tutorials/` | 按课程与章节组织的系统教程，支持连续阅读 |
| 关于 | `/about/` | 个人介绍 |

阅读与交互功能：

- 明暗主题切换，记住主题和首页 Banner 的选择。
- 博客主布局的站内页面支持退场与错峰渐入过渡，并遵循系统“减少动态效果”设置。
- 文章与题解提供本页小节目录；教程使用独立的章节导航和阅读布局。
- Markdown 代码块支持语法高亮，教程页提供代码复制按钮。
- 文章中的 Mermaid 图表按需加载，随明暗主题重新渲染。
- 文章评论接入 Giscus，RSS 订阅地址为 `/feed.xml`。
- 响应式布局，适配桌面与手机阅读。

## 网站是怎么生成的

Markdown 文件负责正文，YAML 配置站点信息、课程和分组。Jekyll 在构建时套用页面模板，生成 HTML、CSS 和 JavaScript，再由 GitHub Pages 托管。

例如，`_tutorials/machine-vision/03-color-detector.md` 会生成 `/tutorials/machine-vision/03-color-detector/`。左侧章节链接和底部翻页由模板生成，右侧本页目录由页面脚本根据标题生成。

站点通过文件增删改内容，目前没有网页编辑后台，也不需要自行维护数据库或业务后端。评论由 Giscus 提供。

## 项目结构

```text
.
├── _config.yml                 # 站点信息、集合与默认布局
├── _data/tutorials.yml         # 课程信息、封面文字与章节分组
├── _posts/                     # 按日期发布的博客文章
├── _projects/                  # 项目介绍
├── _problems/                  # 算法题解
├── _insights/                  # 算法见解
├── _tutorials/                 # 教程正文，一章一个 Markdown 文件
│   ├── machine-vision/         # ROS 2 机器视觉实战
│   └── ROS2-bash/              # ROS2基础、ROS2实战、巡游小车实战
├── _layouts/                   # 首页、文章、项目、题解与教程模板
├── _includes/                  # 导航、页脚、评论等公共片段
├── assets/
│   ├── css/                    # 全站样式与教程样式
│   ├── js/                     # 主题、筛选、转场和教程交互
│   └── images/                 # 封面、正文插图与站点图片
├── algorithm/                  # 算法栏目入口
├── tutorials/index.html        # 全部课程入口
├── docs/tutorials.md           # 教程栏目维护说明
├── scripts/import-machine-vision.py  # 从原项目导入机器视觉教程
├── .github/workflows/jekyll.yml      # GitHub Pages 构建与部署
└── _site/                      # 构建产物，日常编辑上面的源文件
```

## 本地运行

需要 Ruby、Bundler 和 Git。部署工作流使用 Ruby 3.3，本地也可以使用同版本环境。

在仓库根目录安装依赖并启动预览：

```bash
bundle install
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

打开 [本地博客](http://127.0.0.1:4000/) 或 [本地教程栏目](http://127.0.0.1:4000/tutorials/)。修改正文和模板后通常会自动重新生成，刷新浏览器即可；修改 `_config.yml` 后需要重启预览服务。

只生成静态文件：

```bash
bundle exec jekyll build
```

如果这台机器已经在用户目录安装了 Jekyll，也可以沿用现有环境：

```bash
export PATH="$HOME/.gem/ruby/3.2.0/bin:$PATH"
JEKYLL_NO_BUNDLER_REQUIRE=true jekyll serve --host 127.0.0.1 --port 4000
```

## 发布文章与项目

### 博客文章

在 `_posts/` 下新建 `YYYY-MM-DD-文章标识.md`，例如 `2026-10-24-opencv-notes.md`：

```markdown
---
title: "OpenCV 学习笔记"
tags: [Python, 图像处理, 笔记]
cover: "/assets/images/demo/default-cover.png"
---

正文简介。

## 第一个小节

在这里写 Markdown 正文。
```

`cover` 可省略，列表会使用默认封面。文章默认使用 `post` 布局，无需每篇重复指定；`##`、`###` 标题会进入本页目录。

### 项目介绍

在 `_projects/` 下新建 Markdown 文件：

```markdown
---
title: "机器视觉颜色分拣系统"
tags: [Python, ROS2, OpenCV]
cover: "/assets/images/demo/default-cover.png"
github: "https://github.com/VoVL773/Machine_vision-_color_sorting_system"
---

用一段话介绍项目的目标和主要功能。

## 运行方式

记录环境、安装步骤与使用示例。
```

### 算法题解与见解

题解放在 `_problems/`，例如 `001-two-sum.md`：

```yaml
---
title: "两数之和"
difficulty: 简单
desc: 用哈希表记录已经遍历的数字。
tags: [数组, 哈希表]
---
```

后面接题目、思路和代码。算法见解放在 `_insights/`，使用 `title`、`date`、`tags` 等信息描述文章。集合中的文件会自动套用各自布局。

## 教程栏目

目前的首门课程为 **ROS 2 机器视觉实战**，包含导读与 9 章正文，覆盖接口定义、HSV 配置、检测跟踪、可视化、交互调参、合成测试场景，以及 ROS 2 服务端、客户端和启动测试。

教程页采用左侧章节目录、中间正文、右侧本页目录的布局；窄屏隐藏右侧目录，手机端将章节目录折叠为可展开区域。章节高亮、上一章／下一章和代码复制均已接入。

### 新增一门课程

在 `_data/tutorials.yml` 末尾追加一个课程条目，例如：

```yaml
- id: python-basics
  title: Python 基础教程
  subtitle: 从语法到小项目
  description: 通过示例掌握 Python 语法、常用数据结构与文件处理。
  tags: [Python, 入门]
  cover:
    title: Python
    subtitle: 从入门到实践
    label: PYTHON
  url: /tutorials/python-basics/00-overview/
  source: https://github.com/你的用户名/课程源码仓库
  groups:
    - 课程导读
    - 基础语法
    - 动手实践
```

`cover.title`、`cover.subtitle` 和 `cover.label` 分别控制封面的第一行、第二行与底部小字。封面由 HTML 和 CSS 排版，填写文字即可，不需要制作图片或修改模板；章节数量自动统计。省略 `cover` 时，封面显示课程名称和 `TUTORIAL`。

### 新增一章

创建 `_tutorials/python-basics/00-overview.md`：

```markdown
---
title: 课程介绍
course: python-basics
order: 0
group: 课程导读
description: 了解课程安排、准备开发环境。
---

## 学习目标

介绍这门课程适合谁、学完后可以做什么。

## 环境准备

记录安装步骤。
```

后续章节使用 `order: 1`、`order: 2` 等顺序。`course` 必须对应课程的 `id`，`group` 必须对应该课程 `groups` 中的名称。保存并构建后，课程入口、章节目录和翻页链接自动更新。

### 日常增删改

| 操作 | 修改位置 |
| --- | --- |
| 修改课程名称、简介、封面 | `_data/tutorials.yml` |
| 调整分组顺序 | 课程的 `groups` 列表 |
| 重命名分组 | 同时修改 `groups` 和相关章节的 `group` |
| 修改章节标题或正文 | 对应 `.md` 的 `title` 或正文 |
| 调整章节顺序 | 章节的 `order`，同一课程内不要重复 |
| 删除章节 | 删除对应 `.md`，并清理其他正文里手写的该章链接 |
| 删除课程 | 删除课程配置和对应的章节文件夹 |

### 同步机器视觉项目的原始教程

机器视觉课程从原项目 `md` 目录导入，博客内保存了一份副本。原项目更新后，可在博客根目录运行：

```bash
python3 scripts/import-machine-vision.py "/你的项目路径/Machine_vision_color_sorting_system/md"
```

脚本会导入导读、9 章正文和图片，转换章节、图片与源码链接，并保留代码块内容。它会覆盖已导入的同名章节；如果使用同步方式，请在原项目中修改正文。原项目增删或改名章节时，还需要同步调整脚本的 `CHAPTERS` 映射。

完整说明见 [教程栏目维护指南](docs/tutorials.md)。

## 配置与个性化

| 想修改的内容 | 对应文件 |
| --- | --- |
| 博客名称、简介、作者、首页介绍 | `_config.yml` |
| 网站域名与子路径 | `_config.yml` 的 `url`、`baseurl` |
| B 站主页入口 | `_config.yml` 的 `bilibili_url`，留空时隐藏 |
| 博客顶部导航 | `_includes/header.html` |
| 算法栏目导航 | `_includes/algorithm-header.html` |
| 页脚与社交链接 | `_includes/footer.html` |
| Giscus 评论仓库与分类 | `_includes/comments.html` |
| 头像、图标和背景图 | `assets/images/icon&blanner/` |
| 首页 Banner 预设列表 | `_layouts/default.html` 的 `window.bannerPresets` |
| 全站样式与教程样式 | `assets/css/main.scss`、`assets/css/tutorials.css` |

用户站点的 `baseurl` 通常留空；部署到仓库子路径时，设置为 `/仓库名`。站内链接建议使用 Jekyll 的 `relative_url` 过滤器，适配这两种部署方式。

## 部署到 GitHub Pages

仓库已提供 `.github/workflows/jekyll.yml`，推送到 `main` 分支时自动构建并部署，也支持在 GitHub Actions 中手动运行。

首次部署时，在仓库 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。发布后可以在 **Actions** 页面查看构建和部署结果。

日常流程：编辑 Markdown 或 YAML → 本地预览 → 提交并推送到 `main` → 等待部署完成。

RSS 订阅：[订阅博客更新](https://vovl773.github.io/feed.xml)。
