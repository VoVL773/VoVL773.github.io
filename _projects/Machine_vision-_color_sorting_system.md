---
title: "机器视觉颜色分拣系统（ROS 2 视觉目标输出）"
tags: [Python,ROS2,Opencv]
cover: "assets/images/demo/synthetic_preview.png"
github: "https://github.com/VoVL773/Machine_vision-_color_sorting_system"
---

基于 ROS 2 Jazzy 框架实现：复用 color_sorting_interfaces 中的 ColorTarget / ColorTargetArray 消息，由 Mvc_sorting 包完成摄像头采集、HSV 阈值分割、形态学去噪、轮廓筛选、色块中心计算、ID 跟踪、画面标注和 ROS 话题发布。

功能
- 支持 4 种输入：USB/CSI 摄像头、视频文件、ROS 图像话题、内置合成场景（无相机也能演示和测试）。
- 实时识别红 / 绿 / 蓝 / 黄四类色块，支持多目标同时检测。
- 中文 HSV 阈值 Trackbar 动态调参，带颜色选择、启用开关、红色 Hue 环绕、最小面积和形态学核调节。
- 颜色掩码生成，开运算 + 闭运算（腐蚀/膨胀）去噪，按面积、宽高、填充率过滤轮廓。
- 用图像矩计算色块质心，绘制包围框、中心十字和颜色名称。
- 简单 ID 跟踪：基于同色目标最近邻匹配，输出稳定 ID。
- 通过 /color_targets 发布 color_sorting_interfaces/msg/ColorTargetArray。
- 可选发布标注后的调试图像 /color_sorting/debug_image（sensor_msgs/msg/Image）。
- HSV 配置保存/加载 JSON：GUI 快捷键、ROS Trigger 服务、启动参数三种方式。
- 支持无显示环境（headless）运行；视频、滑块、掩码分开显示，互不遮挡。

