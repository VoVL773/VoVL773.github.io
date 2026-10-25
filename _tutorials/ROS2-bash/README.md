---
title: "课程导读"
course: "ros2-basics"
order: 0
group: "ROS2基础"
description: "按 ROS2基础、ROS2实战、巡游小车实战三部分循序学习。"
---

## 三部分学习路线

| 部分 | 内容 | 入口 |
| --- | --- | --- |
| ROS2基础 | 工作空间、通信、TF、可视化、仿真与导航，以及勘误速查 | [创建工作空间]({{ '/tutorials/ROS2-bash/01-创建工作空间/' | relative_url }}) |
| ROS2实战 | 海龟画圈、状态机、服务、键盘控制、参数、Action 与 rosbag 等九个案例 | [ROS2 实战]({{ '/tutorials/ROS2-bash/ROS2实战部分详细记录/' | relative_url }}) |
| 巡游小车实战 | 从零搭建仿真小车，完成建图、Nav2 导航与路点巡检 | [巡游小车实战]({{ '/tutorials/ROS2-bash/巡游小车仿真-从零复刻手册/' | relative_url }}) |

建议依次阅读三部分；已有基础时，可直接进入实战。下方保留基础笔记的章节索引、阅读约定和勘误说明。

> 一套基于 **鱼香ROS 教程** 的学习笔记，做了**注释增补**与**勘误**。
> 目标不是照抄教程，而是把「**为什么这么写**」和「**踩过什么坑**」讲清楚。

---

## 📚 目录

| # | 章节 | 主要内容 |
|:--:|---|---|
| 1 | [一、创建工作空间]({{ '/tutorials/ROS2-bash/01-创建工作空间/' | relative_url }}) | `ros2 pkg create`、`ament_python` vs `ament_cmake`、`package.xml` 与 `setup.py` 的分工、`colcon build` 三个产物目录 |
| 2 | [二、多线程示例]({{ '/tutorials/ROS2-bash/02-多线程示例/' | relative_url }}) | Python `threading`、GIL 与 I/O 密集任务、回调函数的意义 |
| 3 | [三、话题通信]({{ '/tutorials/ROS2-bash/03-话题通信/' | relative_url }}) | 发布者/订阅者、`ros2 topic` 命令族、自定义 `.msg` 接口、CvBridge、Qt 跨线程集成 |
| 4 | [四、服务和参数]({{ '/tutorials/ROS2-bash/04-服务和参数/' | relative_url }}) | 服务与 `.srv`、参数与 params 文件、人脸检测实例、海龟巡航（闭环控制）、launch 文件 |
| 5 | [五、TF 坐标变换]({{ '/tutorials/ROS2-bash/05-TF坐标变换/' | relative_url }}) | 静态/动态变换、`tf2_echo`、`view_frames`、`/tf_static` 的 QoS 陷阱、Python 发布与监听 |
| 6 | [六、可视化与数据工具]({{ '/tutorials/ROS2-bash/06-可视化与数据工具/' | relative_url }}) | RViz2 从零上手、`ros2 bag` 录制回放、两者联调实战 |
| 7 | [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) | URDF/Xacro 建模与 `check_urdf`、collision 与 inertial、**Gazebo Harmonic 仿真**（`gz sim` + `ros_gz` 桥接 + 雷达/IMU/深度相机）、**ros2_control**（状态/力控/差速控制器）、**slam_toolbox 建图**、**Nav2 导航**、导航应用开发（`nav2_simple_commander`） |
| 7B | [七之实操手册：仿真与导航跑通步骤]({{ '/tutorials/ROS2-bash/07B-仿真与导航实操手册/' | relative_url }}) | **动手照着做的那份**：建包 → 写模型 → 世界 → 桥接 → 跑通 → ros2_control → SLAM → Nav2 → 代码发目标，每步都有命令、文件内容和排查表 |
| 附 | [附录：勘误清单与命令速查]({{ '/tutorials/ROS2-bash/附录-勘误与速查/' | relative_url }}) | 全部修正过的问题 + 可直接复制的命令清单 |

---

## 🧭 推荐阅读顺序

**主线是顺着 1 → 7 走**，每章都建立在前一章之上：

```
一、创建工作空间   ← 先把包建出来、能跑起来
      ↓
二、多线程示例     ← Python 基础（后面 Qt 那节要用到）
      ↓
三、话题通信       ← ROS 2 最核心的通信方式
      ↓
四、服务和参数     ← 第二种通信方式 + 参数系统
      ↓
五、TF 坐标变换    ← 机器人专属：坐标系之间的关系
      ↓
六、可视化与数据工具 ← 怎么看、怎么录
      ↓
七、仿真与导航       ← 把机器人"造"出来：URDF/Xacro + 物理属性
```


**如果是带着问题来的**，可以直接跳：

| 你的问题 | 去看 |
|---|---|
| `ros2 pkg create` 报参数错误 | [一、创建工作空间]({{ '/tutorials/ROS2-bash/01-创建工作空间/' | relative_url }}) |
| `colcon build` 失败 / 找不到包 | [一、创建工作空间]({{ '/tutorials/ROS2-bash/01-创建工作空间/' | relative_url }})、[附录]({{ '/tutorials/ROS2-bash/附录-勘误与速查/' | relative_url }}) |
| 话题收不到消息 | [三、话题通信]({{ '/tutorials/ROS2-bash/03-话题通信/' | relative_url }})、[五、TF 坐标变换]({{ '/tutorials/ROS2-bash/05-TF坐标变换/' | relative_url }}) 的 QoS 一节 |
| 自定义接口怎么定义 | [三、话题通信]({{ '/tutorials/ROS2-bash/03-话题通信/' | relative_url }}) |
| 服务回调 / launch 不会写 | [四、服务和参数]({{ '/tutorials/ROS2-bash/04-服务和参数/' | relative_url }}) |
| TF 树看不懂 / `tf2_echo` 报错 | [五、TF 坐标变换]({{ '/tutorials/ROS2-bash/05-TF坐标变换/' | relative_url }}) |
| **RViz 里一片空白** | [六、可视化与数据工具]({{ '/tutorials/ROS2-bash/06-可视化与数据工具/' | relative_url }}) 第 3~4 节 |
| 想把数据录下来慢慢调 | [六、可视化与数据工具]({{ '/tutorials/ROS2-bash/06-可视化与数据工具/' | relative_url }}) 第 8~9 节 |
| 跟着 Humble 教程装不上包 | [五、TF 坐标变换]({{ '/tutorials/ROS2-bash/05-TF坐标变换/' | relative_url }}) 第 6 节 |
| **RViz 里 RobotModel 一片空白** | [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) 第 3 节 |
| URDF 报 `Failed to build tree` / `child link not found` | [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) 第 5 节 |
| xacro 报 `Invalid parameter` / 宏找不到 | [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) 第 4~5 节 |
| **想动手把仿真跑起来，但不知道先敲什么命令** | [七之实操手册]({{ '/tutorials/ROS2-bash/07B-仿真与导航实操手册/' | relative_url }}) 第 1~7 步 |
| 想让机器人真的会走路（导航） | [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) 第 11~15 节 |
| `gazebo：未找到命令` / 机器人进不去仿真 / 进了仿真没有 ROS 话题 | [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) 第 9 节 |
| 想用 ros2_control 驱动仿真机器人 | [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) 第 10 节 |
| 建图、保存地图、Nav2 参数不会配 | [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) 第 12~13 节 |
| 想用代码（而不是 RViz）发导航目标 | [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) 第 14 节 |

---

## 📖 阅读约定

正文里用了三种标注，看到就知道该留意什么：

| 标注 | 含义 |
|---|---|
| 💡 **知识点** | 概念性补充，解释"为什么" |
| ⚠️ **注意** | 容易踩的坑，通常配了实测的错误输出 |
| ✅ / ❌ | 正确写法与错误写法的对照 |

**绝大多数代码实际跑过**（ROS 2 Jazzy / Ubuntu 24.04 / Python 3.12），报错信息也是实测复现的原文，不是编的。

> 例外：第七章第 10.3 节的 `gz_ros2_control`、以及第 12~15 节的 SLAM / Nav2 本机没有安装，
> 这几节是照官方文档核对改写的，正文里已逐处标注"未实测"。

---

## ⚠️ 关于勘误

原稿在编辑过程中发现并修正了多个问题，都记在 [附录 A]({{ '/tutorials/ROS2-bash/附录-勘误与速查/' | relative_url }}) 里，分两类：

- **会直接导致报错的**（构建失败、`AttributeError`、包名不存在……）
- **不会报错但会误导的**（拼写、命名不一致、说法不严谨……）

> 特别提醒：本笔记基于 **ROS 2 Jazzy + Gazebo Harmonic**。如果跟着 **Humble** 时代的教程做，
> 包名和部分 API 会有差异——最常见的是 `ros-humble-xxx` → `ros-jazzy-xxx`，
> 少数包（如 MRPT）还被拆分成了多个子包。
> 详见 [五、TF 坐标变换]({{ '/tutorials/ROS2-bash/05-TF坐标变换/' | relative_url }}) 第 6 节的踩坑记录。
>
> **仿真部分的差异最大**：Humble 时代用 **Gazebo Classic**（`gazebo` 命令），它 2025 年 1 月已 EOL、
> Ubuntu 24.04 上根本没有这个包；Jazzy 搭配的是 **Gazebo Harmonic**（`gz sim`），
> 而且**插件体系整个换了**——不再往仿真器里塞 ROS 插件，改成 gz 原生插件 + `ros_gz_bridge` 桥接。
> 详见 [七、仿真与导航]({{ '/tutorials/ROS2-bash/07-仿真与导航/' | relative_url }}) 第 9.1 节。

---

## 🔗 相关资源

- [ROS 2 官方文档（Jazzy）](https://docs.ros.org/en/jazzy/)
- [ROS 2 官方教程](https://docs.ros.org/en/jazzy/Tutorials.html)
- [代码随想录](https://programmercarl.com/) —— 算法部分用的是这套路线
- 鱼香ROS 教程 —— 本笔记的原始出处

---

## 📄 文件说明

```
ROS2/
├── README.md                  ← 你在这里
├── 01-创建工作空间.md
├── 02-多线程示例.md
├── 03-话题通信.md
├── 04-服务和参数.md
├── 05-TF坐标变换.md
├── 06-可视化与数据工具.md
├── 07-仿真与导航.md
├── 07B-仿真与导航实操手册.md
└── 附录-勘误与速查.md
```


每篇文档的**顶部和底部都有导航**，可以顺序翻阅，也可以随时跳回这里。
