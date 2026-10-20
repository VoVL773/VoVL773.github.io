---
title: "城市应急物资投放仿真"
tags: [Python,ROS2,Gazebo,Docker]
cover: "assets/images/demo/城市应急无人机投送仿真平台主管.png"
github: "https://github.com/VoVL773/Distribution_of_supplies-ROS2-Gazebo-/tree/main"
---

这是一个 ROS 2 + Gazebo Classic 的无人机物资投送仿真系统。Gazebo 提供场景、无人机、相机、3D 雷达和投放装置；ROS 2 把传感器、飞控、任务程序、裁判和 RViz 串起来。

流程
1. 起飞

   - 动作：从起降点起飞到观察高度。
   - 接口：/flight_control/cmd_vel。
2. 窗户 1（10 分）

   - 动作：飞到观察点 → 声明 window_1 → 读 ArUco 二维码 → 发识别话术 → 下降穿窗。
   - 接口：/referee/task_event、/delivery/detections。
3. 投放（60 分）

   - 动作：按点位 1→2→3→4 依次飞抵、精调、声明 drop_N、投放指定颜色。
   - 接口：/delivery/drop_cmd、/delivery/package_state。
4. 窗户 2（10 分）

   - 动作：飞到观察点 → 声明 window_2 → 分类“救援无人机/飞鸟” → 发话术 → 下降穿窗。
   - 接口：/referee/task_event、/delivery/detections。
5. 降落（10 分）

   - 动作：斜线飞到起降点，降到 Z_LAND，确认后声明 landing。
   - 接口：/referee/task_event。
