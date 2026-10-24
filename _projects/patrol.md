---
title: "机器视觉颜色分拣系统（ROS 2 视觉目标输出）"
tags: [Python,ROS2,NAV2]
cover: "assets/images/demo/patrol.png"
github: "https://github.com/VoVL773/patrol"
---

在 Gazebo 里跑一台两轮差速小车：SLAM 建图 → Nav2 导航 → 按航点自动巡检（到点拍照 + 中文语音播报 + CSV 记录），附带一个不依赖 explore_lite 的 frontier 自主探索节点，以及一个把 SDF 世界直接渲染成 Nav2 真值地图的小工具。