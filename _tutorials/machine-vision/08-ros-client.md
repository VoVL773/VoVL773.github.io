---
title: "ROS 2 订阅客户端"
course: "machine-vision"
order: 8
group: "接入 ROS 2"
description: "订阅检测结果，验证机器人侧接收到的目标数据。"
source_doc: "八.订阅客户端：Mvc_sorting_client.py.md"
---

> 上一章已经发布目标列表，这一章编写订阅端，检查机器人侧能收到哪些数据。
> 客户端负责打印消息，不包含机械臂控制或像素坐标到机器人坐标的转换。

## 一. 创建客户端并注册入口

在 `src/Mvc_sorting/Mvc_sorting/` 下创建 `Mvc_sorting_client.py`。
使用已有的 `rclpy` 和 `color_sorting_interfaces` 依赖，不需要新增 OpenCV 或图像订阅。

在 `setup.py` 的 `console_scripts` 中保留 server，再追加 client：

```python
'console_scripts': [
    'Mvc_sorting_server = Mvc_sorting.Mvc_sorting_server:main',
    'Mvc_sorting_client = Mvc_sorting.Mvc_sorting_client:main',
],
```

## 二. 逐步讲解 Mvc_sorting_client.py（订阅客户端）

### 1. 导入模块

```python
from __future__ import annotations

import json

from color_sorting_interfaces.msg import ColorTargetArray
import rclpy
from rclpy.node import Node
```


| 模块或对象 | 作用 |
| --- | --- |
| `json` | 将目标列表整理为 JSON 字符串 |
| `ColorTargetArray` | 服务端发布的自定义消息类型 |
| `rclpy`、`Node` | 节点初始化、订阅、日志与退出 |


### 2. MvcSortingClient 类：初始化参数与订阅

```python
class MvcSortingClient(Node):
    """Subscribe to ColorTargetArray and print the received target list."""
    def __init__(self) -> None:
        """Declare parameters and start the subscription."""
        super().__init__('Mvc_sorting_client')
        self._targets_topic = str(
            self.declare_parameter('targets_topic', '/color_targets').value)
        self._max_messages = max(
            0, int(self.declare_parameter('max_messages', 0).value))
        print_json_value = self.declare_parameter('print_json', False).value
        if isinstance(print_json_value, str):
            self._print_json = print_json_value.strip().lower() in (
                '1', 'true', 'yes', 'on')
        else:
            self._print_json = bool(print_json_value)
        self._message_count = 0
        self._subscription = self.create_subscription(
            ColorTargetArray, self._targets_topic, self._on_targets, 10)
        self.get_logger().info(
            f'listening for colour targets on {self._targets_topic}')
```


| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `targets_topic` | `/color_targets` | 订阅的话题名，需与服务端输出一致 |
| `max_messages` | `0` | 收到多少条消息后停止，0 表示持续运行 |
| `print_json` | `False` | 是否把每条消息的内容整理为 JSON |


`max_messages` 被限制为非负数；`print_json` 兼容布尔值和 `true/yes/on/1` 等字符串。
订阅使用默认 QoS、队列深度 10，与服务端目标话题匹配。
这里订阅的是目标数组，和 Best Effort 的调试图像话题是两条不同的数据链路。

### 3. _on_targets()：处理一帧目标列表

```python
    def _on_targets(self, message: ColorTargetArray) -> None:
        """Print one received target array."""
        self._message_count += 1
        stamp = message.header.stamp.sec + message.header.stamp.nanosec * 1e-9
        if self._print_json:
            payload = {
                'sequence': self._message_count,
                'stamp': stamp,
                'frame_id': message.header.frame_id,
                'targets': [
                    {
                        'id': int(target.id),
                        'color': target.color,
                        'x': round(float(target.x), 2),
                        'y': round(float(target.y), 2),
                        'area': round(float(target.area), 2),
                    }
                    for target in message.targets
                ],
            }
            self.get_logger().info(json.dumps(payload, ensure_ascii=False))
        else:
            lines = [
                f'frame {self._message_count}: {len(message.targets)} target(s), '
                f'stamp={stamp:.3f}, frame_id={message.header.frame_id!r}'
            ]
            for target in message.targets:
                lines.append(
                    f'  id={int(target.id):>3d}  {target.color:<6s}  '
                    f'x={float(target.x):8.2f}  y={float(target.y):8.2f}  '
                    f'area={float(target.area):9.2f}')
            self.get_logger().info('\n' + '\n'.join(lines))

        if self._max_messages and self._message_count >= self._max_messages:
            self.get_logger().info(
                f'received max_messages={self._max_messages}; stopping')
            if rclpy.ok():
                rclpy.shutdown()
```

#### 1. 消息计数与时间戳

每收到一条数组消息，`_message_count` 加 `1`。
它表示客户端实际收到的消息数，不是服务端的原始帧号；空数组也算一条。

ROS 时间戳拆成秒和纳秒，这里计算 `sec + nanosec × 1e-9`，便于日志显示。
转换成浮点数便于阅读，但不适合要求纳秒精度的时间计算。

#### 2. JSON 与普通文本输出

JSON 包含本地序号、时间戳、坐标系和目标数组，坐标/面积保留两位小数。
普通文本按目标逐行显示 ID、颜色、质心坐标和轮廓面积。

注意：JSON 通过 ROS logger 输出，控制台通常还包含日志前缀，不能把整行直接当纯 JSON 解析。
业务程序应直接订阅消息；需要纯 JSON 文件时，可以另外编写不带日志前缀的导出逻辑。

#### 3. 达到消息数量后退出

`max_messages > 0` 且计数达到上限时调用 `rclpy.shutdown()`。
没有发布者或没有收到足够消息时会继续等待，这不是按秒计时的超时功能。

### 4. main()：启动、spin 与清理

```python
def main(args=None) -> int:
    """Run the colour target monitor node."""
    rclpy.init(args=args)
    node = None
    try:
        node = MvcSortingClient()
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        if node is not None:
            node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
    return 0
```

```python
if __name__ == '__main__':
    main()
```

`rclpy.init()` 初始化 ROS 上下文，`rclpy.spin(node)` 等待订阅回调。
`Ctrl+C` 或达到消息上限后，在 `finally` 中销毁节点，并在上下文仍有效时执行关闭。

> 自此，Mvc_sorting_client.py 的订阅客户端部分结束。

## 检测成果

先重新构建，确认两个入口都已安装：

```bash
cd "$WS"
source /opt/ros/jazzy/setup.bash
source install/setup.bash
colcon build --packages-select Mvc_sorting
source install/setup.bash
ros2 pkg executables Mvc_sorting
```

预期包含 `Mvc_sorting_server` 和 `Mvc_sorting_client`。
保持上一章的合成服务端运行，在另一个加载环境的终端执行：

```bash
ros2 run Mvc_sorting Mvc_sorting_client --ros-args   -p targets_topic:=/color_targets -p max_messages:=5

# 普通文本验收完成后，再验证 JSON 格式日志
ros2 run Mvc_sorting Mvc_sorting_client --ros-args   -p targets_topic:=/color_targets -p print_json:=true -p max_messages:=2
```

预期：稳定帧中每条消息包含 8 个目标；普通模式收到 5 条消息退出，JSON 模式收到 2 条退出。
日志中的时间戳与 ID 以实际运行结果为准；客户端较晚启动时，序号仍从 1 开始。

如果没有输出，依次检查服务端是否运行、话题名、两个终端是否加载相同工作区，以及 `ROS_DOMAIN_ID` 是否一致：

```bash
ros2 topic list
ros2 topic info /color_targets
ros2 topic echo /color_targets --once
```

---
