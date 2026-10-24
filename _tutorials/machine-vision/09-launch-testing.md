---
title: "配置、启动与测试"
course: "machine-vision"
order: 9
group: "接入 ROS 2"
description: "整理默认配置、launch 与测试，在新工作区中复现整个系统。"
source_doc: "九.配置、launch与测试.md"
---

> 前面已经可以分别运行服务端与客户端，这一章补齐默认配置、launch 和测试。
> 完成后可以一条命令启动合成场景，并在新工作区复现整个项目。

## 一. 创建并安装默认配置

### 1. config/hsv_colors.json

在 `src/Mvc_sorting/` 下创建 `config/`，再创建 `hsv_colors.json`。
结构与第二章的 `HSVConfig.to_dict()` 对应，下面是与仓库示例等价的紧凑写法：

```json
{
  "version": 2,
  "colors": {
    "red": {
      "enabled": true,
      "wrap_hue": true,
      "lower": [0, 120, 70],
      "upper": [10, 255, 255]
    },
    "green": {
      "enabled": true,
      "wrap_hue": false,
      "lower": [40, 80, 50],
      "upper": [85, 255, 255]
    },
    "blue": {
      "enabled": true,
      "wrap_hue": false,
      "lower": [100, 120, 70],
      "upper": [140, 255, 255]
    },
    "yellow": {
      "enabled": true,
      "wrap_hue": false,
      "lower": [15, 80, 80],
      "upper": [38, 255, 255]
    }
  },
  "filter": {
    "min_area": 300,
    "max_area": 0,
    "min_dimension": 8,
    "min_fill_ratio": 0.2
  },
  "morphology": {
    "kernel": 5,
    "iterations": 1,
    "blur_kernel": 3
  }
}
```


| 部分 | 作用 |
| --- | --- |
| `version` | 配置格式版本，当前为 2 |
| `colors` | 每个颜色的启用开关、环绕开关、HSV 上下限 |
| `filter` | 面积、最小宽高、填充率过滤 |
| `morphology` | 形态学核、迭代次数和 HSV 模糊核 |


JSON 的布尔值是小写 `true/false`，不能写成 Python 的 `True/False`。
`max_area=0` 表示不限制最大面积；`kernel=0/1` 在检测器中表示关闭形态学处理。
旧版本黄色仍是旧默认范围时，加载逻辑会迁移到新的范围，自定义阈值保留。

### 2. 安装示例不等于自动加载示例

`setup.py` 会把 JSON 安装进包的 share 目录，但服务端不会自动从该目录加载它。
服务端默认读取 `~/.ros/color_sorting_hsv.json`；需要使用包内示例时，先复制到可写位置，再指定路径。
显式指定的 `config_path` 必须已存在。

## 二. 创建 color_sorting.launch.py

### 1. 导入 launch 相关模块

在 `src/Mvc_sorting/launch/` 下创建 `color_sorting.launch.py`，并在 `package.xml` 中追加：

```xml
<exec_depend>launch</exec_depend>
<exec_depend>launch_ros</exec_depend>
```

下面的函数片段依次放入同一个 `generate_launch_description()` 中，保留缩进。
完整文件可对照 [launch 源码](https://github.com/VoVL773/Machine_vision-_color_sorting_system/blob/main/src/Mvc_sorting/launch/color_sorting.launch.py)。

```python
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.conditions import IfCondition
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue
```


| 对象 | 作用 |
| --- | --- |
| `LaunchDescription` | 保存本次启动要执行的动作 |
| `DeclareLaunchArgument` | 声明可从命令行覆盖的 launch 参数 |
| `LaunchConfiguration` | 在启动时读取参数值 |
| `Node` | 启动 ROS 节点进程 |
| `ParameterValue` | 显式指定整数、浮点数和布尔参数类型 |
| `IfCondition` | 按条件决定是否启动客户端 |


### 2. 声明启动参数

```python
def generate_launch_description() -> LaunchDescription:
    """Build the launch description."""
    arguments = [
        DeclareLaunchArgument(
            'input_type', default_value='camera',
            description='camera, video, topic or synthetic'),
        DeclareLaunchArgument(
            'camera_index', default_value='0',
            description='OpenCV camera index'),
        DeclareLaunchArgument(
            'camera_backend', default_value='auto',
            description='auto or v4l2 (Linux)'),
        DeclareLaunchArgument(
            'camera_fourcc', default_value='',
            description='Optional camera FOURCC, e.g. MJPG or YUYV; empty lets the driver choose'),
        DeclareLaunchArgument(
            'camera_autofocus', default_value='true',
            description='Enable camera continuous autofocus when supported'),
        DeclareLaunchArgument(
            'camera_focus', default_value='-1',
            description='Manual camera focus value; -1 keeps autofocus'),
        DeclareLaunchArgument(
            'camera_sharpness', default_value='-1',
            description='Camera sharpness value; -1 leaves the driver default'),
        DeclareLaunchArgument(
            'frame_width', default_value='1280',
            description='Requested camera/frame width'),
        DeclareLaunchArgument(
            'frame_height', default_value='720',
            description='Requested camera/frame height'),
        DeclareLaunchArgument(
            'fps', default_value='30.0',
            description='Capture timer rate and requested camera FPS'),
        DeclareLaunchArgument(
            'display_sharpen', default_value='0.35',
            description='Display-only unsharp mask amount (0 disables)'),
        DeclareLaunchArgument(
            'min_hits', default_value='2',
            description='Frames a blob must be seen before it is published'),
        DeclareLaunchArgument(
            'video_path', default_value='',
            description='Video file used when input_type:=video'),
        DeclareLaunchArgument(
            'image_topic', default_value='/camera/image_raw',
            description='ROS image topic used when input_type:=topic'),
        DeclareLaunchArgument(
            'targets_topic', default_value='/color_targets',
            description='Published ColorTargetArray topic'),
        DeclareLaunchArgument(
            'config_path', default_value='',
            description='HSV JSON file; empty uses ~/.ros/color_sorting_hsv.json'),
        DeclareLaunchArgument(
            'show_window', default_value='true',
            description='Show the annotated OpenCV window'),
        DeclareLaunchArgument(
            'show_masks', default_value='true',
            description='Show the per-colour mask preview window'),
        DeclareLaunchArgument(
            'show_trackbars', default_value='true',
            description='Show the Chinese HSV Trackbar window'),
        DeclareLaunchArgument(
            'publish_debug_image', default_value='false',
            description='Publish the annotated frame as sensor_msgs/Image'),
        DeclareLaunchArgument(
            'enable_tracking', default_value='true',
            description='Keep stable IDs between frames'),
        DeclareLaunchArgument(
            'max_frames', default_value='0',
            description='Stop after N frames (0 = unlimited)'),
        DeclareLaunchArgument(
            'with_client', default_value='false',
            description='Also start the console target monitor'),
    ]
```

`DeclareLaunchArgument` 的默认值以字符串表达，调用时使用 `参数名:=值` 覆盖。
这里默认启动相机，教学验收用 `input_type:=synthetic`。
`with_client` 只控制是否启动控制台客户端，`show_window` 控制服务端 GUI，二者相互独立。

不是每个服务端参数都被这个 launch 文件暴露。例如 `max_targets`、`auto_save`、`loop_video`
需要扩展 launch 参数转发，或直接用 `ros2 run ... --ros-args -p ...` 设置。

### 3. 启动服务端并转发参数

```python
    server = Node(
        package='Mvc_sorting',
        executable='Mvc_sorting_server',
        name='Mvc_sorting_server',
        output='screen',
        parameters=[{
            'input_type': LaunchConfiguration('input_type'),
            'camera_index': ParameterValue(
                LaunchConfiguration('camera_index'), value_type=int),
            'camera_backend': LaunchConfiguration('camera_backend'),
            'camera_fourcc': LaunchConfiguration('camera_fourcc'),
            'camera_autofocus': ParameterValue(
                LaunchConfiguration('camera_autofocus'), value_type=bool),
            'camera_focus': ParameterValue(
                LaunchConfiguration('camera_focus'), value_type=int),
            'camera_sharpness': ParameterValue(
                LaunchConfiguration('camera_sharpness'), value_type=int),
            'frame_width': ParameterValue(
                LaunchConfiguration('frame_width'), value_type=int),
            'frame_height': ParameterValue(
                LaunchConfiguration('frame_height'), value_type=int),
            'fps': ParameterValue(
                LaunchConfiguration('fps'), value_type=float),
            'display_sharpen': ParameterValue(
                LaunchConfiguration('display_sharpen'), value_type=float),
            'min_hits': ParameterValue(
                LaunchConfiguration('min_hits'), value_type=int),
            'video_path': LaunchConfiguration('video_path'),
            'image_topic': LaunchConfiguration('image_topic'),
            'targets_topic': LaunchConfiguration('targets_topic'),
            'config_path': LaunchConfiguration('config_path'),
            'show_window': ParameterValue(
                LaunchConfiguration('show_window'), value_type=bool),
            'show_masks': ParameterValue(
                LaunchConfiguration('show_masks'), value_type=bool),
            'show_trackbars': ParameterValue(
                LaunchConfiguration('show_trackbars'), value_type=bool),
            'publish_debug_image': ParameterValue(
                LaunchConfiguration('publish_debug_image'), value_type=bool),
            'enable_tracking': ParameterValue(
                LaunchConfiguration('enable_tracking'), value_type=bool),
            'max_frames': ParameterValue(
                LaunchConfiguration('max_frames'), value_type=int),
        }],
    )
```

`package` 指向包名，`executable` 指向 `setup.py` 中注册的入口名，`name` 是运行时节点名。
`parameters` 将 launch 参数转换并传入节点。
例如 `ParameterValue(..., value_type=bool)` 确保 `show_window:=false` 按布尔值传递。

### 4. 可选客户端与返回启动描述

```python
    client = Node(
        package='Mvc_sorting',
        executable='Mvc_sorting_client',
        name='Mvc_sorting_client',
        output='screen',
        condition=IfCondition(LaunchConfiguration('with_client')),
        parameters=[{
            'targets_topic': LaunchConfiguration('targets_topic'),
        }],
    )

    return LaunchDescription(arguments + [server, client])
```

只有 `with_client:=true` 才执行客户端启动动作。
客户端与服务端使用同一个 `targets_topic`，避免改了服务端话题却忘记改订阅端。
所有声明和节点动作最后都加入 `LaunchDescription`。

注意：`max_frames` 只传给服务端。若同时启用客户端，服务端达到帧数退出后，
客户端仍可能继续等待消息，launch 不会因此自动整体退出；需要 `Ctrl+C` 停止。
有限帧退出验收时保持 `with_client:=false`。

## 三. 同步 setup.py 与 package.xml

### 1. 安装文件与节点入口

此时 config、launch、server 和 client 文件都已经存在，可以使用最终 `setup.py`：

```python
from setuptools import find_packages, setup

package_name = 'Mvc_sorting'

setup(
    name=package_name,
    version='0.1.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        ('share/' + package_name + '/config', ['config/hsv_colors.json']),
        ('share/' + package_name + '/launch',
            ['launch/color_sorting.launch.py']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='vovl773',
    maintainer_email='3152398081@qq.com',
    description='HSV colour blob detection and ROS 2 colour target publisher',
    license='Apache-2.0',
    extras_require={
        'test': [
            'pytest',
        ],
    },
    entry_points={
        'console_scripts': [
            'Mvc_sorting_server = Mvc_sorting.Mvc_sorting_server:main',
            'Mvc_sorting_client = Mvc_sorting.Mvc_sorting_client:main',
        ],
    },
)
```


| 配置项 | 作用 |
| --- | --- |
| `find_packages()` | 查找要安装的 Python 包，排除测试目录 |
| `resource/Mvc_sorting` | 向 ament 索引注册包 |
| `package.xml` | 安装包元信息 |
| `config`、`launch` 的 `data_files` | 让安装后的包仍能找到配置与启动文件 |
| `console_scripts` | 生成 `ros2 run` 使用的可执行入口 |


`setup.cfg` 保持以下内容，确保入口安装在 ROS 2 查找的位置：

```ini
[develop]
script_dir=$base/lib/Mvc_sorting
[install]
install_scripts=$base/lib/Mvc_sorting
```

`resource/Mvc_sorting` 是空的标记文件；包内的 `__init__.py` 也要保留。
逐文件复刻时，只有文件存在后再注册对应的 `data_files`，否则构建阶段会找不到文件。

### 2. 核对最终依赖

可与 [最终 package.xml](https://github.com/VoVL773/Machine_vision-_color_sorting_system/blob/main/src/Mvc_sorting/package.xml) 对照：


| 类型 | 依赖 |
| --- | --- |
| 节点和消息 | `rclpy`、`std_msgs`、`sensor_msgs`、`std_srvs`、`color_sorting_interfaces` |
| 图像处理 | `cv_bridge`、`python3-opencv`、`python3-numpy` |
| 启动 | `launch`、`launch_ros` |
| 测试 | `python3-pytest`、`ament_flake8`、`ament_pep257`、`ament_copyright` |


当前 launch 没有使用 `ament_index_python`，不需要为了启动文件额外添加它。

## 四. 测试：配置、检测与 ROS lint

### 1. 测试文件与运行范围

完整测试可对照 [test 目录](https://github.com/VoVL773/Machine_vision-_color_sorting_system/tree/main/src/Mvc_sorting/test/)。


| 文件 | 检查内容 |
| --- | --- |
| `test_hsv_config.py` | 默认值、JSON 往返、非法配置、红色环绕、黄色旧配置迁移 |
| `test_color_detector.py` | 四色检测、噪点、面积/禁用过滤、跟踪 ID、命中确认等 |
| `test_flake8.py` | Python 代码格式与静态检查 |
| `test_pep257.py` | 文档字符串规范 |
| `test_copyright.py` | 当前保留 `skip` 标记，默认跳过 |


测试文件不写进 `console_scripts`。pytest 通过 `test_*.py` 文件和 `test_*` 函数发现测试。
下面选取关键测试讲解；复刻完整测试集时保留上述文件中的其余测试。

### 2. JSON 往返与非法阈值

以下片段来自 `test_hsv_config.py`，文件顶部需导入：

```python
from Mvc_sorting.hsv_config import ColorThreshold, HSVConfig
import pytest
```

```python
def test_json_round_trip(tmp_path):
    """A saved configuration loads back with identical values."""
    config = HSVConfig.default()
    config.min_area = 450
    config.colors['blue'].upper = (145, 250, 240)
    path = tmp_path / 'hsv.json'

    saved_path = config.save(str(path))
    loaded = HSVConfig.load(saved_path)

    assert loaded.min_area == 450
    assert loaded.colors['blue'].upper == (145, 250, 240)
    assert loaded.to_dict() == config.to_dict()
```

```python
def test_invalid_threshold_rejected():
    """Out-of-range HSV values raise a descriptive ValueError."""
    with pytest.raises(ValueError, match='upper'):
        ColorThreshold.from_dict(
            {'lower': [0, 0, 0], 'upper': [200, 255, 255]}, 'bad')
    with pytest.raises(ValueError, match='greater than upper'):
        ColorThreshold.from_dict(
            {'lower': [20, 0, 0], 'upper': [10, 255, 255]}, 'bad')
```

`tmp_path` 是 pytest 提供的临时目录，不会覆盖个人配置。
往返测试先修改配置、保存再加载，最后比较序列化结果；
`pytest.raises()` 要求非法输入确实抛出指定异常，而不是静默接受。

### 3. 四色检测与两帧确认

以下片段来自 `test_color_detector.py`：

```python
import cv2
from Mvc_sorting.color_detector import ColorDetector
from Mvc_sorting.hsv_config import HSVConfig
import numpy as np
```

```python
def blank_frame() -> np.ndarray:
    """Return a dark 480x640 BGR frame."""
    return np.full((480, 640, 3), 35, dtype=np.uint8)
```

```python
def test_detects_four_colours():
    """One circle per colour yields four detections with known centres."""
    frame = blank_frame()
    expected = {
        'red': (100, 100),
        'green': (250, 100),
        'blue': (400, 100),
        'yellow': (550, 100),
    }
    colours = {
        'red': (0, 0, 255),
        'green': (0, 255, 0),
        'blue': (255, 0, 0),
        'yellow': (0, 255, 255),
    }
    for name, centre in expected.items():
        cv2.circle(frame, centre, 30, colours[name], cv2.FILLED)

    detector = ColorDetector(HSVConfig.default(), enable_tracking=False)
    detections, masks = detector.detect(frame)

    assert len(detections) == 4
    assert {item.color for item in detections} == set(expected)
    for detection in detections:
        centre = expected[detection.color]
        assert abs(detection.x - centre[0]) < 1.5
        assert abs(detection.y - centre[1]) < 1.5
        assert detection.area > 2400
        assert 55 <= detection.bbox[2] <= 61
        assert 55 <= detection.bbox[3] <= 61
    assert set(masks) == set(expected)
    assert all(int(cv2.countNonZero(mask)) > 0 for mask in masks.values())
```

```python
def test_min_hits_requires_two_frames():
    """min_hits suppresses a target until it has been seen twice."""
    detector = ColorDetector(
        HSVConfig.default(), enable_tracking=True, min_hits=2)
    frame = blank_frame()
    cv2.circle(frame, (300, 240), 30, (0, 0, 255), cv2.FILLED)

    first_detections, _ = detector.detect(frame)
    second_detections, _ = detector.detect(frame)

    assert first_detections == []
    assert len(second_detections) == 1
    assert second_detections[0].color == 'red'
```

四色测试不仅比较数量，也检查颜色集合、质心误差、面积和外接矩形，避免“碰巧检测到四个”就通过。
两帧确认测试用相同画面连续调用，验证新目标第一帧被抑制、第二帧达到命中条件。
这属于纯算法测试，不验证 ROS 发现、QoS、真实相机和桌面交互，后面还需要端到端验收。

### 4. 执行测试

```bash
cd "$WS"
# 无需启动 ROS 节点的算法测试
PYTHONPATH=src/Mvc_sorting python3 -m pytest   src/Mvc_sorting/test/test_hsv_config.py   src/Mvc_sorting/test/test_color_detector.py -v

# 完成构建并加载工作区后，运行 ROS 包测试
source /opt/ros/jazzy/setup.bash
source install/setup.bash
colcon test --packages-select color_sorting_interfaces Mvc_sorting
colcon test-result --verbose
```

预期没有失败；copyright 测试按当前模板跳过，不能把跳过当作已完成版权检查。
测试文件存在但没有被运行也不算通过，最终以 `colcon test-result` 报告为准。

如果接口包的 `xmllint` 报 `Failed to locate the main schema resource`，检查能否访问
`http://download.ros.org/schema/package_format3.xsd`。这类远程 schema 下载失败需要先解决网络或使用本地 schema，
不能仅凭构建成功就认定 XML 检查通过。

> 自此，默认配置、launch 和测试部分结束。

## 检测成果

### 1. 构建并检查安装资源

前提是接口包已按第一章创建，两个源码包都在工作区的 `src/` 中。

```bash
cd "$WS"
source /opt/ros/jazzy/setup.bash
colcon build --packages-select color_sorting_interfaces Mvc_sorting
source install/setup.bash
ros2 pkg executables Mvc_sorting
ros2 launch Mvc_sorting color_sorting.launch.py --show-args

mkdir -p "$WS/config"
cp "$(ros2 pkg prefix Mvc_sorting)/share/Mvc_sorting/config/hsv_colors.json"   "$WS/config/replication_hsv.json"
```

应看到两个入口和 launch 参数列表，配置复制成功。
这里使用工作区内的独立配置，不修改默认的个人配置文件。

### 2. 一条命令启动服务端和客户端

```bash
ros2 launch Mvc_sorting color_sorting.launch.py   input_type:=synthetic show_window:=false with_client:=true   publish_debug_image:=true config_path:="$WS/config/replication_hsv.json"
```

在另一个加载相同 ROS 和工作区环境的终端执行：

```bash
ros2 topic info /color_targets
ros2 topic info /color_sorting/debug_image
ros2 service call /Mvc_sorting_server/save_config std_srvs/srv/Trigger
ros2 service call /Mvc_sorting_server/load_config std_srvs/srv/Trigger
```

预期客户端稳定输出每色两个、共八个目标，两个话题都有发布者，配置服务返回成功。
服务端默认两次命中确认，因此首次或重载配置后的第一帧可能为空。完成后 `Ctrl+C` 停止整个 launch。
若在受限容器/沙箱中出现 `Error creating socket: Operation not permitted`，即使本地检测仍能运行，
ROS 发现与消息通信也可能失败；应在允许 DDS 网络通信的环境中完成这一步验收。

### 3. 有限帧自动退出与桌面验收

```bash
# 不启动常驻客户端，方便验证 launch 随服务端退出
ros2 launch Mvc_sorting color_sorting.launch.py   input_type:=synthetic show_window:=false max_frames:=120   config_path:="$WS/config/replication_hsv.json"

# 有桌面环境时再打开三个窗口
ros2 launch Mvc_sorting color_sorting.launch.py   input_type:=synthetic show_window:=true show_trackbars:=true show_masks:=true   config_path:="$WS/config/replication_hsv.json"
```

- [ ] 两个包构建成功，消息、两个入口和安装资源可见。
- [ ] 配置/检测测试及 lint 无失败。
- [ ] 合成场景目标、调试图像和配置服务可用。
- [ ] 有限帧模式能退出，退出后没有遗留相机/窗口占用。
- [ ] 桌面环境中滑块实时生效，`s` 保存、`l` 加载，重启能加载保存配置。
- [ ] 用摄像头、视频或 ROS 图像话题补充一次真实输入验证。

真实输入的命令见 [服务端教程]({{ '/tutorials/machine-vision/07-ros-server/' | relative_url }})，完整参数表见 [项目 README](https://github.com/VoVL773/Machine_vision-_color_sorting_system/blob/main/README.md)。

---
