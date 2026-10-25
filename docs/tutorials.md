# 教程栏目维护指南

教程栏目沿用 Jekyll，与算法栏目并列。每章是一个 Markdown 文件，Jekyll 在构建时把它变成可独立打开的网页，不需要手写 HTML，也不需要后端路由。

## 文件与网址

| 文件 | 网站地址 |
| --- | --- |
| `tutorials/index.html` | `/tutorials/`，全部教程 |
| `_tutorials/machine-vision/00-overview.md` | `/tutorials/machine-vision/00-overview/` |
| `_tutorials/machine-vision/01-interfaces.md` | `/tutorials/machine-vision/01-interfaces/` |
| `_tutorials/machine-vision/03-color-detector.md` | `/tutorials/machine-vision/03-color-detector/` |

`_config.yml` 中 `tutorials` 集合的 `permalink: /tutorials/:path/` 负责生成网址。`_layouts/tutorial.html` 负责三栏排版和章节翻页；`_data/tutorials.yml` 保存课程介绍、分组顺序和源码地址。

## 更新现有项目教程

本次导入是博客内的一份副本，原项目不受影响。以后修改原项目的 `md` 目录后，在博客根目录重新运行：

```bash
python3 scripts/import-machine-vision.py "/home/vovl773/VoVL773/开源项目/Machine_vision_color_sorting_system/md"
```

脚本会更新这门课程的 10 个 Markdown 文件（导读 + 9 章）和图片，转换原文中的章节链接与图片路径，把源码链接指向 GitHub，并保留代码围栏内容。重跑会覆盖这门课已导入的正文；因此请把原项目 `md` 作为这门课的内容来源。

## 手动新增一章

### ROS2 基础教程

课程正文位于 `_tutorials/ROS2-bash/`，课程 ID 为 `ros2-basics`，入口为 `/tutorials/ROS2-bash/README/`。共三部分：

- **ROS2基础**：课程导读、01～07 章、07B 实操手册与勘误附录。
- **ROS2实战**：`ROS2实战部分详细记录.md`，包含海龟与通信练习案例。
- **巡游小车实战**：`巡游小车仿真-从零复刻手册.md`，包含小车仿真与巡检完整流程。

这门课直接维护博客内的 Markdown 文件，不使用机器视觉课程的导入脚本。正文中的 Liquid 示例（如 `{{FILE:…}}`）需要使用 Liquid 的 `raw` / `endraw` 标签包裹，避免被当作站点模板执行。

### 章节元数据

创建 `_tutorials/machine-vision/10-your-topic.md`，开头写：

```yaml
---
title: 新章节标题
course: machine-vision
order: 10
group: 接入 ROS 2
description: 用一句话介绍这一章。
---
```

随后写普通 Markdown 正文，一级内容标题使用 `##`，小节使用 `###`。`course` 对应课程 ID，`order` 控制顺序，`group` 必须是该课程在 `_data/tutorials.yml` 中已有的分组。保存后，左侧目录和上一章／下一章会在下次构建时自动更新，右侧本页目录由标题自动生成。

`source_doc` 是可选字段，只在这章也有对应的项目原文时填写原始文件名。不要让同一课程的章节使用相同的 `order`。

## 删除、改名与栏目调整

- 修改正文：编辑对应 `.md`；修改显示标题：编辑文件开头的 `title`，不必改文件名，网页地址也不会变。
- 调整章节顺序：修改 `.md` 开头的 `order`；移动到别的分组：修改 `group`。
- 调整分组名称和显示顺序：编辑 `_data/tutorials.yml` 的 `groups`，并同步修改相关章节的 `group`，两处名称必须一致。
- 删除一章：删除对应 `.md`，构建后目录与翻页会自动更新。其他正文里手写的该章链接也应一起删除或修改。
- 删除整门课：删除课程文件夹和 `_data/tutorials.yml` 中对应课程条目。
- 这门机器视觉课目前的同步脚本使用固定的原始文件映射 `CHAPTERS`。增删或改名原项目文件时，也要更新脚本映射；否则重跑可能恢复已删除的导入章节，或因找不到原文件而停止。只手动维护博客时，不必运行同步脚本。

## 链接和图片怎么写

教程章节链接指向生成的网页地址，而非 `.md` 文件：

```liquid
[下一章]({{ '/tutorials/machine-vision/02-hsv-config/' | relative_url }})
![示意图]({{ '/assets/images/tutorials/machine-vision/detect.png' | relative_url }})
```

`relative_url` 会自动适配 GitHub Pages 的 `baseurl`。左侧章节与底部翻页自动生成，通常不用自己写跳转链接。

## 新增另一门教程

封面文字也由 `_data/tutorials.yml` 管理。每门课程可以配置：

```yaml
  cover:
    title: Python
    subtitle: 从入门到实践
    label: PYTHON
```

把 `cover` 与该课程的 `title`、`description` 等字段对齐缩进即可。`title` 是封面第一行，`subtitle` 是第二行，`label` 是底部小字；章节数量自动统计，不用填写。省略 `cover` 时，封面自动显示课程名称和 `TUTORIAL`。这些字段都是纯文字，不需要写 HTML。

1. 在 `_data/tutorials.yml` 增加一门课程，设置唯一 `id`、名称、简介、入口 `url`、`groups` 等。
2. 创建 `_tutorials/课程ID/`，把各章放进去，并在 front matter 中使用同一个 `course`。
3. 按照从 0 开始的 `order` 排序；课程列表、章节目录和翻页会在构建后自动出现。

## 本地预览

按博客 README 的方式运行 Jekyll，打开 `/tutorials/`。桌面端是章节／正文／本页目录三栏；手机端课程目录折叠为可展开区域，正文按屏幕宽度排版，代码和表格在各自区域内横向滚动。
