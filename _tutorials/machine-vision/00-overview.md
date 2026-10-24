---
title: "课程介绍与学习路线"
course: "machine-vision"
order: 0
group: "课程导读"
description: "从纯 Python 视觉模块到 ROS 2 服务，按项目结构逐步构建颜色分拣系统。"
source_doc: "README (目录).md"
---

## 开始之前

> 按项目结构逐步讲解，先跑通纯 Python 视觉模块，再接入 ROS 2。

教程结合分段源码、中文解释、参数表和验收示例，帮助复刻项目并学习 ROS 2 与 OpenCV。
命令中的 `$WS` 表示工作区根目录；每个新终端先设置工作区路径，再加载 ROS 和构建后的工作区环境。

```bash
export WS="$HOME/color_sorting_ws"
cd "$WS"
source /opt/ros/jazzy/setup.bash
# 首次构建成功后再加载：
source install/setup.bash
```

## 课程目录

- [一.接口包(color_sorting_interfaces)]({{ '/tutorials/machine-vision/01-interfaces/' | relative_url }})
- [二.包骨架创建与 HSV 配置层]({{ '/tutorials/machine-vision/02-hsv-config/' | relative_url }})
- [三.检测与跟踪层：color_detector.py]({{ '/tutorials/machine-vision/03-color-detector/' | relative_url }})
- [四.可视化层：visualization.py]({{ '/tutorials/machine-vision/04-visualization/' | relative_url }})
- [五.中文调参面板：gui.py]({{ '/tutorials/machine-vision/05-gui/' | relative_url }})
- [六.合成测试场景：image_sources.py]({{ '/tutorials/machine-vision/06-image-sources/' | relative_url }})
- [七.ROS 视觉服务端：Mvc_sorting_server.py]({{ '/tutorials/machine-vision/07-ros-server/' | relative_url }})
- [八.订阅客户端：Mvc_sorting_client.py]({{ '/tutorials/machine-vision/08-ros-client/' | relative_url }})
- [九.配置、launch 与测试]({{ '/tutorials/machine-vision/09-launch-testing/' | relative_url }})

## 项目结构

![项目结构]({{ '/assets/images/tutorials/machine-vision/项目结构.png' | relative_url }})
