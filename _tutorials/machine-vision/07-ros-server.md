---
title: "ROS 2 视觉服务端"
course: "machine-vision"
order: 7
group: "接入 ROS 2"
description: "读取图像、发布目标消息，并提供配置保存与加载服务。"
source_doc: "七.ROS视觉服务端：Mvc_sorting_server.py.md"
---

> 前面几章完成了配置、检测、绘图、滑块和合成场景。
> 这一章把它们接入 ROS 2：读取图像、发布检测结果，并提供配置保存/加载服务。

## 一. 补充依赖与服务端入口

在 `src/Mvc_sorting/Mvc_sorting/` 下创建 `Mvc_sorting_server.py`。
确认 `package.xml` 包含以下依赖，已有的条目不用重复添加：

```xml
<depend>rclpy</depend>
<depend>std_msgs</depend>
<depend>color_sorting_interfaces</depend>
<depend>sensor_msgs</depend>
<depend>std_srvs</depend>
<exec_depend>cv_bridge</exec_depend>
<exec_depend>python3-opencv</exec_depend>
<exec_depend>python3-numpy</exec_depend>
```


| 依赖 | 本章用法 |
| --- | --- |
| `rclpy` | 节点、参数、定时器、发布/订阅和服务 |
| `color_sorting_interfaces` | 发布 `ColorTargetArray` |
| `sensor_msgs` | 接收/发布 `Image` |
| `std_srvs` | 配置保存/加载的 `Trigger` 服务 |
| `cv_bridge` | 在 ROS `Image` 与 OpenCV 数组之间转换 |


`setup.py` 的 `console_scripts` 中保留服务端入口：

```python
'Mvc_sorting_server = Mvc_sorting.Mvc_sorting_server:main',
```

服务端较长，下面按源码顺序拆开讲解。所有带类内缩进的方法放在同一个 `MvcSortingServer` 类中，
`main()` 放在类外；完整文件可对照 [服务端源码](https://github.com/VoVL773/Machine_vision-_color_sorting_system/blob/main/src/Mvc_sorting/Mvc_sorting/Mvc_sorting_server.py)。

## 二. 逐步讲解 Mvc_sorting_server.py（ROS 视觉服务端）

### 1. 导入模块和输入类型

```python
from __future__ import annotations

import os
import sys
import time

from color_sorting_interfaces.msg import ColorTarget, ColorTargetArray
import cv2
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import Image
from std_srvs.srv import Trigger

from .color_detector import ColorDetector, Detection
from .gui import HSVTrackbarPanel, TRACKBAR_HELP
from .hsv_config import HSVConfig
from .image_sources import SyntheticScene
from .visualization import (
    annotate_frame,
    gui_is_available,
    make_mask_montage,
    sharpen_frame,
)

try:
    from cv_bridge import CvBridge
except ImportError:  # pragma: no cover - only when cv_bridge is not installed
    CvBridge = None

VALID_INPUT_TYPES = ('camera', 'video', 'topic', 'synthetic')
```


| 模块或对象 | 作用 |
| --- | --- |
| `os`、`sys` | 路径处理、平台判断和退出码 |
| `time.monotonic()` | 计算处理帧率和日志间隔，不受系统时间调整影响 |
| `Node` | ROS 2 节点基类 |
| `qos_profile_sensor_data` | 图像输入和调试图像使用的传感器 QoS（Best Effort） |
| `Image`、`Trigger` | 图像消息与配置服务类型 |
| 前面章节的模块 | 分别提供检测、GUI、配置、合成图和绘图功能 |
| `CvBridge` | 图像消息与 NumPy 数组转换，缺失时暂置为 `None` |


`VALID_INPUT_TYPES` 限制可用输入模式为 `camera/video/topic/synthetic`。
`cv_bridge` 缺失时，topic 输入无法运行；仅请求调试图像时会关闭该功能并记录警告。

### 2. MvcSortingServer 类：初始化节点

```python
class MvcSortingServer(Node):
    """Vision server that publishes detected colour targets."""
    def __init__(self) -> None:
        """Declare parameters, open the input source and start processing."""
        super().__init__('Mvc_sorting_server')
        self._shutdown_requested = False
        self._shutdown_done = False
        self._frame_count = 0
        self._fps = 0.0
        self._last_frame_time = None
        self._last_log_time = 0.0
        self._consecutive_failures = 0
        self._config_changed_at = 0.0

        self._input_type = self._string_param('input_type', 'camera').lower()
        if self._input_type not in VALID_INPUT_TYPES:
            raise ValueError(
                f'input_type must be one of {VALID_INPUT_TYPES}, got {self._input_type!r}')
        self._camera_index = self._int_param('camera_index', 0)
        self._video_path = os.path.expanduser(self._string_param('video_path', ''))
        self._image_topic = self._string_param('image_topic', '/camera/image_raw')
        self._targets_topic = self._string_param('targets_topic', '/color_targets')
        self._debug_image_topic = self._string_param(
            'debug_image_topic', '/color_sorting/debug_image')
        self._frame_id = self._string_param('frame_id', 'camera_optical_frame')
        self._frame_width = max(1, self._int_param('frame_width', 1280))
        self._frame_height = max(1, self._int_param('frame_height', 720))
        self._fps_limit = max(1.0, self._float_param('fps', 30.0))
        self._camera_backend = self._string_param(
            'camera_backend', 'auto').strip().lower()
        if self._camera_backend not in ('auto', 'v4l2'):
            raise ValueError("camera_backend must be 'auto' or 'v4l2'")
        self._camera_fourcc = self._string_param(
            'camera_fourcc', '').strip().upper()
        self._camera_autofocus = self._bool_param('camera_autofocus', True)
        self._camera_focus = self._int_param('camera_focus', -1)
        self._camera_sharpness = self._int_param('camera_sharpness', -1)
        self._camera_warmup_frames = max(
            0, self._int_param('camera_warmup_frames', 5))
        self._display_sharpen = max(
            0.0, self._float_param('display_sharpen', 0.35))
        self._loop_video = self._bool_param('loop_video', False)
        self._max_frames = max(0, self._int_param('max_frames', 0))
        self._max_targets = max(0, self._int_param('max_targets', 20))
        self._publish_empty = self._bool_param('publish_empty', True)
        self._publish_debug_image = self._bool_param('publish_debug_image', False)
        self._print_targets = self._bool_param('print_targets', True)
        self._log_period = max(0.1, self._float_param('log_period', 1.0))
        self._auto_save = self._bool_param('auto_save', False)
        self._enable_tracking = self._bool_param('enable_tracking', True)
        self._track_max_distance = max(
            0.0, self._float_param('track_max_distance', 80.0))
        self._track_max_age = max(0, self._int_param('track_max_age', 15))
        self._min_hits = max(1, self._int_param('min_hits', 2))

        self._config_path, self._config = self._load_initial_config()
        min_area_override = self._int_param('initial_min_area', -1)
        morph_override = self._int_param('initial_morph_kernel', -1)
        if min_area_override >= 0:
            self._config.min_area = min_area_override
        if morph_override >= 0:
            self._config.morph_kernel = morph_override
        self._config.validate()

        self._detector = ColorDetector(
            self._config,
            enable_tracking=self._enable_tracking,
            track_max_distance=self._track_max_distance,
            track_max_age=self._track_max_age,
            min_hits=self._min_hits,
        )

        self._targets_publisher = self.create_publisher(
            ColorTargetArray, self._targets_topic, 10)

        self._bridge = None
        if self._publish_debug_image or self._input_type == 'topic':
            if CvBridge is None:
                if self._input_type == 'topic':
                    raise RuntimeError(
                        'input_type=topic requires cv_bridge (ros-jazzy-cv-bridge)')
                self.get_logger().warning(
                    'cv_bridge is not available; debug image publishing disabled')
                self._publish_debug_image = False
            else:
                self._bridge = CvBridge()

        self._debug_publisher = None
        if self._publish_debug_image:
            self._debug_publisher = self.create_publisher(
                Image, self._debug_image_topic, qos_profile_sensor_data)

        self._save_service = self.create_service(
            Trigger, '~/save_config', self._on_save_config)
        self._load_service = self.create_service(
            Trigger, '~/load_config', self._on_load_config)

        self._capture = None
        self._synthetic = None
        self._subscription = None
        self._timer = None
        if self._input_type == 'topic':
            self._subscription = self.create_subscription(
                Image, self._image_topic, self._on_image, qos_profile_sensor_data)
        else:
            self._open_input_source()
            self._timer = self.create_timer(1.0 / self._fps_limit, self._on_timer)

        self._window_name = 'Color Sorting'
        self._control_window_name = 'HSV Controls'
        self._mask_window_name = 'HSV Masks'
        self._gui_requested = self._bool_param('show_window', True)
        self._show_masks = self._bool_param('show_masks', True)
        self._show_trackbars = self._bool_param('show_trackbars', True)
        self._gui_enabled = self._gui_requested and gui_is_available()
        self._panel = None
        self._masks_visible = False
        self._mask_window_was_shown = False
        self._window_was_shown = False
        self._display_size = None
        if self._gui_requested and not self._gui_enabled:
            self.get_logger().warning(
                'show_window=True but no usable display was found; running headless')
        self._setup_gui()

        self.get_logger().info(
            f'vision server ready: input={self._input_type}, '
            f'targets={self._targets_topic}, config={self._config_path}, '
            f'gui={self._gui_enabled}, tracking={self._enable_tracking}, '
            f'min_hits={self._min_hits}')
        if self._input_type == 'synthetic':
            self.get_logger().info(
                'synthetic scene: 8 moving blobs (2 per colour), '
                f'{self._frame_width}x{self._frame_height}')
        if self._gui_enabled:
            self.get_logger().info(TRACKBAR_HELP)
```

#### 1. 初始化状态和参数

`super().__init__('Mvc_sorting_server')` 创建节点。
接着记录退出标志、帧数、帧率、连续读帧失败次数，再声明参数。


| 参数组 | 主要参数 | 作用 |
| --- | --- | --- |
| 输入 | `input_type`、`camera_index`、`video_path`、`image_topic` | 选择图像来源 |
| 相机 | `frame_width/height`、`fps`、`camera_backend/fourcc`、对焦参数 | 请求采集格式与属性 |
| 输出 | `targets_topic`、`debug_image_topic`、`publish_debug_image` | 目标列表和标注图像 |
| 检测 | `min_hits`、`enable_tracking`、`track_max_distance/age` | 跟踪与命中确认 |
| 配置 | `config_path`、`initial_min_area`、`initial_morph_kernel` | 加载配置与启动时覆盖 |
| GUI | `show_window`、`show_masks`、`show_trackbars` | 控制三个显示窗口 |
| 运行 | `max_frames`、`max_targets`、`publish_empty`、`auto_save` | 帧数上限、目标数上限、空结果和退出保存 |


参数在这里声明并读取。当前节点没有注册运行时参数更新回调，所以 `ros2 param set` 改值后，
不代表对应内部属性会同步更新；实时 HSV 调参走滑块/配置服务。
`max_targets` 按检测列表顺序截断，不是按面积挑选最大的目标。

#### 2. 加载配置，创建检测器

先加载 JSON，再应用非负的启动覆盖值，校验后创建 `ColorDetector`。
服务端默认 `min_hits=2`，因此新目标通常从第二次命中开始发布。

#### 3. 创建话题、服务和输入入口

目标列表使用深度为 10 的默认 QoS；图像使用 sensor-data QoS。
配置服务使用 `~/save_config` 和 `~/load_config`，`~` 表示相对节点的私有名称。
默认展开为 `/Mvc_sorting_server/save_config` 和 `/Mvc_sorting_server/load_config`。

topic 模式创建图像订阅；其他三种模式打开输入源，并按 `1 / fps` 创建定时器。
因此 topic 模式由图像到达驱动，`fps` 不会限制订阅回调的输入频率。

#### 4. 初始化 GUI

显示名分别是 `Color Sorting`、`HSV Controls`、`HSV Masks`。
只有请求显示且环境初步检查通过时才创建窗口，否则继续 headless 运行。

### 3. 参数辅助方法

```python
    def _string_param(self, name: str, default: str) -> str:
        """Declare and read a string parameter."""
        return str(self.declare_parameter(name, default).value)
```

```python
    def _int_param(self, name: str, default: int) -> int:
        """Declare and read an integer parameter."""
        value = self.declare_parameter(name, default).value
        try:
            return int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f'parameter {name} must be an integer') from exc
```

```python
    def _float_param(self, name: str, default: float) -> float:
        """Declare and read a floating point parameter."""
        value = self.declare_parameter(name, default).value
        try:
            return float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f'parameter {name} must be a number') from exc
```

```python
    def _bool_param(self, name: str, default: bool) -> bool:
        """Declare and read a boolean parameter, accepting string values."""
        value = self.declare_parameter(name, default).value
        if isinstance(value, str):
            return value.strip().lower() in ('1', 'true', 'yes', 'on')
        return bool(value)
```

这四个方法统一执行“声明参数 → 读取 `.value` → 转换类型”。
整数、浮点转换失败时给出参数名称；布尔字符串只有 `1/true/yes/on` 被视为真，其他字符串为假。
范围限制由初始化中的 `max()` 或显式判断完成，这些辅助方法本身不检查业务范围。

### 4. 配置管理

#### _load_initial_config()：确定配置路径

```python
    def _load_initial_config(self) -> tuple[str, HSVConfig]:
        """Resolve config_path and load or create the initial configuration."""
        default_path = os.path.expanduser('~/.ros/color_sorting_hsv.json')
        raw_path = self._string_param('config_path', '').strip()
        if raw_path:
            config_path = os.path.abspath(os.path.expanduser(raw_path))
            if not os.path.isfile(config_path):
                raise FileNotFoundError(
                    f'config_path does not exist: {config_path}')
            config = HSVConfig.load(config_path)
            self.get_logger().info(f'loaded HSV config: {config_path}')
            return config_path, config

        if os.path.isfile(default_path):
            config = HSVConfig.load(default_path)
            self.get_logger().info(f'loaded HSV config: {default_path}')
            return default_path, config
        return default_path, HSVConfig.default()
```


| 启动方式 | 行为 |
| --- | --- |
| 显式设置非空 `config_path` | 文件必须已经存在，否则抛出 `FileNotFoundError` |
| 未指定路径，默认文件存在 | 加载 `~/.ros/color_sorting_hsv.json` |
| 未指定路径，默认文件不存在 | 使用内置默认值，记录默认保存路径 |


注意：显式指定一个不存在的文件，不会自动回退到默认值。验收时应先生成 JSON，再传入路径。

#### _apply_config()：让检测器和面板使用同一份配置

```python
    def _apply_config(self, config: HSVConfig, reset_tracking: bool = True) -> None:
        """Apply a new configuration to the detector and GUI."""
        config.validate()
        self._config = config
        self._detector.set_config(config)
        if reset_tracking:
            self._detector.reset_tracking()
        if self._panel is not None:
            self._panel.set_config(config)
```

先校验配置，再替换服务端与检测器持有的对象，默认重置跟踪。
如果面板已经存在，也同步替换面板配置；所以加载/恢复默认后 ID 可能重新从 1 开始。

#### 保存、加载与恢复默认

```python
    def _save_config(self, quiet: bool = False) -> tuple[bool, str]:
        """Save the current configuration to ``config_path``."""
        if not self._config_path:
            return False, 'config_path is empty'
        try:
            saved_path = self._config.save(self._config_path)
        except (OSError, ValueError) as exc:
            message = f'failed to save HSV config: {exc}'
            if not quiet:
                self.get_logger().error(message)
            return False, message
        message = f'saved HSV config to {saved_path}'
        if not quiet:
            self.get_logger().info(message)
        return True, message
```

```python
    def _load_config(self, quiet: bool = False) -> tuple[bool, str]:
        """Load the configuration from ``config_path``."""
        if not self._config_path:
            return False, 'config_path is empty'
        if not os.path.isfile(self._config_path):
            message = f'config file does not exist: {self._config_path}'
            if not quiet:
                self.get_logger().warning(message)
            return False, message
        try:
            config = HSVConfig.load(self._config_path)
        except (OSError, ValueError) as exc:
            message = f'failed to load HSV config: {exc}'
            if not quiet:
                self.get_logger().error(message)
            return False, message
        self._apply_config(config)
        message = f'loaded HSV config from {self._config_path}'
        if not quiet:
            self.get_logger().info(message)
        return True, message
```

```python
    def _reset_config(self) -> None:
        """Restore the built-in default HSV configuration."""
        self._apply_config(HSVConfig.default())
        self.get_logger().info('restored default HSV configuration')
```

保存与加载返回 `(是否成功, 提示文字)`，便于快捷键和 ROS 服务复用。
`quiet=True` 只抑制方法内的部分日志，不改变保存行为。
读取失败时不会把失败结果应用到检测器；恢复默认只更改内存，需保存才会写入文件。

#### Trigger 服务回调

```python
    def _on_save_config(self, _request, response):
        """Handle the ~/save_config Trigger service."""
        success, message = self._save_config()
        response.success = success
        response.message = message
        return response
```

```python
    def _on_load_config(self, _request, response):
        """Handle the ~/load_config Trigger service."""
        success, message = self._load_config()
        response.success = success
        response.message = message
        return response
```

`Trigger` 请求没有业务字段，响应包含 `success` 和 `message`。
回调把前面方法返回的状态填入响应并返回，不需要重复实现文件读写。

### 5. 相机打开与回退

#### FOURCC 解码和属性设置

```python
    @staticmethod
    def _decode_fourcc(value: float) -> str:
        """Decode an OpenCV FOURCC numeric value into four ASCII characters."""
        code = int(value)
        characters = [chr((code >> (8 * index)) & 0xFF) for index in range(4)]
        return ''.join(char if 32 <= ord(char) < 127 else '.' for char in characters)
```

```python
    def _set_camera_property(
        self, capture, prop: int, value, label: str, warn: bool = True,
    ) -> bool:
        """Set one camera property, optionally logging unsupported values."""
        try:
            accepted = bool(capture.set(prop, value))
        except cv2.error as exc:
            if warn:
                self.get_logger().warning(f'camera setting {label} failed: {exc}')
            return False
        if not accepted and warn:
            self.get_logger().warning(
                f'camera did not accept {label}={value}; keeping current value')
        return accepted
```

FOURCC 是四字符格式标识，如 `MJPG`。解码方法从整数中逐字节提取 ASCII 字符，便于打印日志。
属性设置封装了驱动拒绝参数或 OpenCV 报错的情况；设备不支持某项时记录警告并返回 `False`。

#### _try_camera()：尝试一种采集配置

```python
    def _try_camera(
        self,
        backend: str,
        width: int,
        height: int,
        fourcc_text: str,
        autofocus: bool,
        focus: int,
        sharpness: int,
    ):
        """
        Open and validate one camera configuration.

        Returns ``(capture, backend_label)`` on success or ``(None, reason)``.
        A frame is read before accepting the configuration so a broken
        GStreamer/V4L2 pipeline cannot be mistaken for a working camera.
        """
        if backend == 'v4l2' and sys.platform.startswith('linux'):
            capture = cv2.VideoCapture(self._camera_index, cv2.CAP_V4L2)
            backend_label = 'V4L2'
        else:
            capture = cv2.VideoCapture(self._camera_index)
            backend_label = 'auto'

        if not capture.isOpened():
            capture.release()
            return None, f'{backend_label} could not open camera {self._camera_index}'

        if fourcc_text:
            if len(fourcc_text) == 4:
                fourcc = cv2.VideoWriter_fourcc(*fourcc_text)
                self._set_camera_property(
                    capture, cv2.CAP_PROP_FOURCC, fourcc,
                    f'fourcc {fourcc_text}')
            else:
                self.get_logger().warning(
                    'camera_fourcc must contain exactly four characters; ignoring')

        self._set_camera_property(
            capture, cv2.CAP_PROP_FRAME_WIDTH, width, 'width', warn=False)
        self._set_camera_property(
            capture, cv2.CAP_PROP_FRAME_HEIGHT, height, 'height', warn=False)
        self._set_camera_property(
            capture, cv2.CAP_PROP_FPS, self._fps_limit, 'fps', warn=False)

        if focus >= 0:
            self._set_camera_property(
                capture, cv2.CAP_PROP_AUTOFOCUS, 0, 'autofocus')
            self._set_camera_property(
                capture, cv2.CAP_PROP_FOCUS, focus, 'focus')
        elif autofocus:
            self._set_camera_property(
                capture, cv2.CAP_PROP_AUTOFOCUS, 1, 'autofocus')

        if sharpness >= 0:
            self._set_camera_property(
                capture, cv2.CAP_PROP_SHARPNESS, sharpness, 'sharpness')

        try:
            capture.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        except cv2.error:
            pass

        attempts = max(1, self._camera_warmup_frames)
        successful_reads = 0
        for _ in range(attempts):
            try:
                ok, _frame = capture.read()
            except cv2.error as exc:
                capture.release()
                return None, f'{backend_label} read failed: {exc}'
            if ok:
                successful_reads += 1

        if successful_reads > 0:
            return capture, backend_label

        capture.release()
        return None, f'{backend_label} opened but returned no frames'
```

流程是“打开设备 → 请求格式/尺寸/帧率 → 请求对焦/锐度 → 预热并读帧验证”。
仅 `isOpened()` 成功还不够，实际读到有效图像才接受这个配置。
手动 `camera_focus >= 0` 时先关闭自动对焦，再请求手动值；属性是否生效取决于相机驱动。
失败时释放设备，避免占用句柄。

#### 记录实际格式并尝试安全配置

```python
    def _log_opened_camera(self, capture, backend_label: str) -> None:
        """Log the actual resolution, FOURCC and focus values."""
        actual_width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
        actual_height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
        actual_fps = capture.get(cv2.CAP_PROP_FPS)
        actual_fourcc = self._decode_fourcc(capture.get(cv2.CAP_PROP_FOURCC))
        focus = capture.get(cv2.CAP_PROP_FOCUS)
        fps_text = f'{actual_fps:.1f}' if actual_fps > 0.0 else 'unknown'
        self.get_logger().info(
            f'opened camera {self._camera_index} '
            f'({actual_width}x{actual_height} @ {fps_text} fps, '
            f'fourcc={actual_fourcc}, focus={focus:.0f}, backend={backend_label})')
```

```python
    def _open_camera(self):
        """Open the camera with the requested settings and safe fallbacks."""
        preferred = 'auto'
        if sys.platform.startswith('linux') and self._camera_backend in ('auto', 'v4l2'):
            preferred = 'v4l2'

        capture, reason = self._try_camera(
            preferred,
            self._frame_width,
            self._frame_height,
            self._camera_fourcc,
            self._camera_autofocus,
            self._camera_focus,
            self._camera_sharpness,
        )
        if capture is not None:
            self._log_opened_camera(capture, reason)
            return capture

        self.get_logger().warning(
            f'{reason}; retrying camera with safe 640x480 defaults '
            '(no MJPG, no autofocus)')
        capture, safe_reason = self._try_camera(
            'auto', 640, 480, '', False, -1, -1)
        if capture is not None:
            self.get_logger().warning(
                'using safe camera fallback; set frame_width/frame_height/'
                'camera_fourcc explicitly if you need another mode')
            self._log_opened_camera(capture, safe_reason)
            return capture

        raise RuntimeError(
            f'camera {self._camera_index} could not provide frames: {safe_reason}; '
            'try another camera_index, close other camera applications, or use '
            'input_type:=topic/synthetic')
```

Linux 下优先尝试 V4L2；请求配置失败后，使用 auto 后端、640×480、不显式请求 FOURCC、
不请求自动对焦/手动对焦/锐度的安全配置重试。这里“不请求自动对焦”不等同于强制关闭设备原有自动对焦状态。
即使 `camera_backend=v4l2`，失败后的安全重试仍使用 auto。
最终实际分辨率、帧率和格式以日志为准，不能只看请求参数。

### 6. 统一图像输入

#### 打开输入源与读取下一帧

```python
    def _open_input_source(self) -> None:
        """Open a camera, video file or synthetic scene."""
        if self._input_type == 'synthetic':
            self._synthetic = SyntheticScene(
                width=self._frame_width, height=self._frame_height)
            return
        if self._input_type == 'video':
            if not self._video_path:
                raise ValueError('input_type=video requires video_path')
            if not os.path.isfile(self._video_path):
                raise FileNotFoundError(
                    f'video_path does not exist: {self._video_path}')
            capture = cv2.VideoCapture(self._video_path)
            if not capture.isOpened():
                capture.release()
                raise RuntimeError(
                    f'could not open video: {self._video_path}')
            self._capture = capture
            actual_width = int(
                capture.get(cv2.CAP_PROP_FRAME_WIDTH) or self._frame_width)
            actual_height = int(
                capture.get(cv2.CAP_PROP_FRAME_HEIGHT) or self._frame_height)
            self.get_logger().info(
                f'opened {self._video_path} ({actual_width}x{actual_height})')
            return

        self._capture = self._open_camera()
```

```python
    def _read_frame(self):
        """Read the next frame, handling video loop and end of stream."""
        if self._synthetic is not None:
            return self._synthetic.read()
        if self._capture is None:
            return None
        ok, frame = self._capture.read()
        if ok:
            return frame
        if self._input_type == 'video' and self._loop_video:
            self._capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, frame = self._capture.read()
            if ok:
                return frame
        return None
```


| 输入模式 | 读帧方式 |
| --- | --- |
| synthetic | `SyntheticScene.read()` 直接返回图像 |
| video | 检查路径，再用 `VideoCapture` 读取；`loop_video` 开启时回到第 0 帧 |
| camera | 使用前面的相机打开与回退逻辑 |
| topic | 不经过这里，直接由图像订阅回调接收 |


`_read_frame()` 把输入统一为“图像或 `None`”，避免后续处理区分合成场景与 OpenCV 返回格式。
视频按定时器频率读取，不按视频原时间戳调度。

#### 定时器输入与话题输入

```python
    def _on_timer(self) -> None:
        """Capture and process one frame on a timer."""
        if self._shutdown_requested:
            return
        try:
            frame = self._read_frame()
        except cv2.error as exc:
            self.get_logger().error(f'frame capture failed: {exc}')
            frame = None
        if frame is None:
            self._consecutive_failures += 1
            if self._consecutive_failures >= 10:
                self._request_shutdown('input stream ended or is unavailable')
            return
        self._consecutive_failures = 0
        self._process_frame(
            frame, self.get_clock().now().to_msg(), self._frame_id)
```

```python
    def _on_image(self, message: Image) -> None:
        """Process a frame received from a ROS image topic."""
        if self._shutdown_requested:
            return
        if self._bridge is None:
            self._request_shutdown('cv_bridge is not available')
            return
        try:
            frame = self._bridge.imgmsg_to_cv2(message, desired_encoding='bgr8')
        except Exception as exc:  # cv_bridge raises various exceptions
            self.get_logger().error(
                f'failed to convert image: {exc}', throttle_duration_sec=5.0)
            return
        stamp = message.header.stamp
        if stamp.sec == 0 and stamp.nanosec == 0:
            stamp = self.get_clock().now().to_msg()
        frame_id = message.header.frame_id or self._frame_id
        self._process_frame(frame, stamp, frame_id)
```

定时器模式连续读帧失败 10 次后请求退出；成功读帧会把失败计数清零。
图像话题模式通过 `CvBridge` 转为 `bgr8`，保留原时间戳和坐标系；
原时间戳全零时改用当前 ROS 时间，坐标系为空时使用配置的默认值。
两条入口最终都调用 `_process_frame()`。

### 7. _process_frame()：检测、发布与显示

```python
    def _process_frame(self, frame, stamp, frame_id: str) -> None:
        """Detect targets, publish messages and update the display."""
        try:
            detections, masks = self._detector.detect(frame)
        except (ValueError, cv2.error) as exc:
            self.get_logger().error(f'detection failed: {exc}')
            return

        self._frame_count += 1
        now = time.monotonic()
        if self._last_frame_time is not None:
            delta = now - self._last_frame_time
            if delta > 0.0:
                instantaneous = 1.0 / delta
                self._fps = (instantaneous if self._fps <= 0.0
                             else 0.9 * self._fps + 0.1 * instantaneous)
        self._last_frame_time = now

        if self._max_targets > 0:
            detections = detections[:self._max_targets]
        self._publish_targets(detections, stamp, frame_id)

        needs_image = self._publish_debug_image or self._gui_enabled
        annotated = None
        if needs_image:
            status_parts = []
            if self._panel is not None:
                status_parts.append(f'edit {self._panel.current_color_name}')
            if not self._enable_tracking:
                status_parts.append('tracking off')
            view_frame = sharpen_frame(frame, self._display_sharpen)
            annotated = annotate_frame(
                view_frame, detections, self._config, fps=self._fps,
                frame_index=self._frame_count, status=' | '.join(status_parts))

        if self._publish_debug_image and annotated is not None:
            self._publish_debug(annotated, stamp, frame_id)
        if self._gui_enabled and annotated is not None:
            self._show_frame(annotated, masks)

        if self._print_targets and now - self._last_log_time >= self._log_period:
            self._last_log_time = now
            self.get_logger().info(self._format_targets(detections))

        if self._max_frames > 0 and self._frame_count >= self._max_frames:
            self._request_shutdown(
                f'max_frames={self._max_frames} reached')
```


| 顺序 | 处理内容 |
| --- | --- |
| 1 | 检测图像，失败时记录日志并跳过当前帧 |
| 2 | 递增成功处理帧数，用单调时钟计算帧间隔 |
| 3 | 使用 `0.9 × 原帧率 + 0.1 × 瞬时帧率` 平滑 FPS |
| 4 | 截断目标数量并发布目标列表 |
| 5 | GUI 或调试图像需要画面时，才锐化、绘制标注 |
| 6 | 发布调试图像、刷新窗口并按周期打印摘要 |
| 7 | 达到 `max_frames` 时请求退出 |


检测先于显示锐化执行，锐化不改变检测用的像素。
`max_frames` 统计成功处理的帧；topic 模式没有收到足够图像时，不会仅因时间流逝而退出。

### 8. 日志与消息发布

```python
    @staticmethod
    def _format_targets(detections: list[Detection]) -> str:
        """Format a compact one-line target summary for logging."""
        if not detections:
            return 'no colour targets'
        parts = [
            f'{item.color}#{item.id}'
            f'({item.x:.0f},{item.y:.0f},a={item.area:.0f})'
            for item in detections[:12]
        ]
        suffix = '' if len(detections) <= 12 else f' ... (+{len(detections) - 12})'
        return f'{len(detections)} target(s): ' + ', '.join(parts) + suffix
```

```python
    def _publish_targets(self, detections, stamp, frame_id: str) -> None:
        """Publish the target list as a ColorTargetArray message."""
        message = ColorTargetArray()
        message.header.stamp = stamp
        message.header.frame_id = frame_id
        for detection in detections:
            target = ColorTarget()
            target.id = int(detection.id)
            target.color = detection.color
            target.x = float(detection.x)
            target.y = float(detection.y)
            target.area = float(detection.area)
            message.targets.append(target)
        if self._publish_empty or message.targets:
            self._targets_publisher.publish(message)
```

```python
    def _publish_debug(self, annotated, stamp, frame_id: str) -> None:
        """Publish the annotated frame on the optional debug image topic."""
        if self._debug_publisher is None or self._bridge is None:
            return
        try:
            image_message = self._bridge.cv2_to_imgmsg(annotated, encoding='bgr8')
        except Exception as exc:  # cv_bridge raises various exceptions
            self.get_logger().error(
                f'failed to convert debug image: {exc}', throttle_duration_sec=5.0)
            return
        image_message.header.stamp = stamp
        image_message.header.frame_id = frame_id
        self._debug_publisher.publish(image_message)
```

#### 目标数组

为每帧创建 `ColorTargetArray`，填入时间戳、坐标系，再把检测对象转换为 `ColorTarget`。
`bbox` 只用于本地图像显示，不在当前 ROS 消息中传输。
`publish_empty=True` 时，没有目标也发布空数组，订阅端可以据此清除过期显示。

#### 调试图像与摘要

调试图像通过 `cv2_to_imgmsg(..., encoding='bgr8')` 转换，并沿用当前处理帧的 Header。
订阅端需兼容 Best Effort QoS。
摘要最多列出前 12 个目标，剩余数量用后缀提示，不改变实际发布的目标列表。

### 9. 窗口、滑块和快捷键

#### 创建与更新窗口

```python
    def _setup_gui(self) -> None:
        """Create the video, control and mask windows."""
        if not self._gui_enabled:
            return
        try:
            cv2.namedWindow(self._window_name, cv2.WINDOW_NORMAL)
            if self._show_trackbars:
                self._panel = HSVTrackbarPanel(
                    self._control_window_name, self._config,
                    self._on_config_changed)
            if self._show_masks:
                cv2.namedWindow(self._mask_window_name, cv2.WINDOW_NORMAL)
                self._masks_visible = True
        except cv2.error as exc:
            self.get_logger().warning(f'failed to create GUI windows: {exc}')
            self._disable_gui()
```

```python
    def _on_config_changed(self) -> None:
        """Record live threshold edits from the Trackbar panel."""
        self._config_changed_at = time.monotonic()
```

```python
    def _show_frame(self, annotated, masks) -> None:
        """Display the annotated frame, masks and process keyboard input."""
        if not self._gui_enabled:
            return
        try:
            if self._window_was_shown and cv2.getWindowProperty(
                    self._window_name, cv2.WND_PROP_VISIBLE) < 1:
                self.get_logger().info('display window closed; continuing headless')
                self._disable_gui()
                return
            cv2.imshow(self._window_name, annotated)
            display_size = (annotated.shape[1], annotated.shape[0])
            if display_size != self._display_size:
                cv2.resizeWindow(
                    self._window_name, display_size[0], display_size[1])
                self._display_size = display_size
            self._window_was_shown = True
            if self._masks_visible and self._mask_window_was_shown:
                try:
                    if cv2.getWindowProperty(
                            self._mask_window_name, cv2.WND_PROP_VISIBLE) < 1:
                        self._masks_visible = False
                except cv2.error:
                    self._masks_visible = False
            if self._masks_visible:
                canvas_width = min(800, annotated.shape[1])
                canvas_height = min(600, annotated.shape[0])
                montage = make_mask_montage(
                    masks, self._config,
                    canvas_width=canvas_width, canvas_height=canvas_height)
                cv2.imshow(self._mask_window_name, montage)
                self._mask_window_was_shown = True
            key = cv2.waitKey(1) & 0xFF
            self._handle_key(key)
        except cv2.error as exc:
            self.get_logger().warning(f'GUI disabled after error: {exc}')
            self._disable_gui()
```

面板与检测器共享配置对象；滑块修改后回调只记录变化时间，下一帧检测会读取新值。
`waitKey(1)` 不只是读按键，也让 OpenCV 处理窗口事件。
关闭标注窗口时，当前实现会切换到 headless 继续处理；关闭掩码窗口只停止显示掩码。

#### 处理快捷键和窗口开关

```python
    def _handle_key(self, key: int) -> None:
        """Process a single OpenCV keyboard event."""
        if key in (255, 0):
            return
        if key in (27, ord('q')):
            self._request_shutdown('quit requested from GUI')
        elif key == ord('s'):
            self._save_config()
        elif key == ord('l'):
            self._load_config()
        elif key == ord('r'):
            self._reset_config()
        elif key == ord('m'):
            self._toggle_masks()
        elif key == ord('h'):
            self.get_logger().info(TRACKBAR_HELP)
```

```python
    def _toggle_masks(self) -> None:
        """Show or hide the mask preview window."""
        if not self._gui_enabled:
            return
        if self._masks_visible:
            try:
                cv2.destroyWindow(self._mask_window_name)
            except cv2.error:
                pass
            self._masks_visible = False
            self._mask_window_was_shown = False
            return
        try:
            cv2.namedWindow(self._mask_window_name, cv2.WINDOW_NORMAL)
            self._masks_visible = True
            self._mask_window_was_shown = False
        except cv2.error as exc:
            self.get_logger().warning(f'could not open mask window: {exc}')
```

```python
    def _disable_gui(self) -> None:
        """Disable all GUI output and close OpenCV windows."""
        self._gui_enabled = False
        self._masks_visible = False
        self._mask_window_was_shown = False
        self._display_size = None
        try:
            cv2.destroyAllWindows()
        except cv2.error:
            pass
```


| 按键 | 动作 |
| --- | --- |
| `s` / `l` | 保存 / 加载 JSON |
| `r` | 恢复内置配置，同时重置跟踪 |
| `m` | 显示 / 隐藏掩码窗口 |
| `h` | 打印滑块与快捷键帮助 |
| `q` / `Esc` | 请求退出 |


按键需要 OpenCV 窗口获得焦点。
GUI 抛出可捕获的 OpenCV 错误时会关闭显示，保留检测和话题发布。

### 10. 退出与 main() 入口

```python
    def _request_shutdown(self, reason: str) -> None:
        """Stop the ROS executor after logging the reason."""
        if self._shutdown_requested:
            return
        self._shutdown_requested = True
        self.get_logger().info(f'stopping vision server: {reason}')
        if rclpy.ok():
            rclpy.shutdown()
```

```python
    def shutdown(self) -> None:
        """Release capture, optionally save config and close windows."""
        if self._shutdown_done:
            return
        self._shutdown_done = True
        self._shutdown_requested = True
        if self._timer is not None:
            self._timer.cancel()
        if self._capture is not None:
            self._capture.release()
            self._capture = None
        if self._auto_save and self._config_path:
            success, message = self._save_config(quiet=True)
            if success:
                self.get_logger().info(message)
            else:
                self.get_logger().warning(message)
        if self._gui_enabled:
            self._disable_gui()
```

```python
def main(args=None) -> int:
    """Run the colour sorting server node."""
    rclpy.init(args=args)
    node = None
    exit_code = 0
    try:
        node = MvcSortingServer()
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    except (RuntimeError, ValueError, FileNotFoundError, OSError) as exc:
        if node is None:
            print(f'[Mvc_sorting_server] {exc}', file=sys.stderr)
        else:
            node.get_logger().fatal(str(exc))
        exit_code = 1
    finally:
        if node is not None:
            node.shutdown()
            node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
    return exit_code
```

```python
if __name__ == '__main__':
    sys.exit(main())
```

`_request_shutdown()` 先记录原因，再停止 ROS 执行器。
`shutdown()` 负责取消定时器、释放相机/视频、按需保存配置和关闭窗口，退出标志避免重复清理。
`main()` 在 `finally` 中清理已经成功创建的节点；预期的启动错误返回非零退出码。

> 自此，Mvc_sorting_server.py 的 ROS 视觉服务端部分结束。

## 检测成果

先生成一份独立配置，避免个人已有阈值影响合成验收。
以下命令在工作区根目录运行；首次先构建接口包，再构建视觉包：

```bash
cd "$WS"
source /opt/ros/jazzy/setup.bash
colcon build --packages-select color_sorting_interfaces
source install/setup.bash
colcon build --packages-select Mvc_sorting
source install/setup.bash

PYTHONPATH="src/Mvc_sorting" python3 - <<'PY'
from Mvc_sorting.hsv_config import HSVConfig
HSVConfig.default().save('replication_hsv.json')
PY

ros2 run Mvc_sorting Mvc_sorting_server --ros-args   -p input_type:=synthetic -p show_window:=false   -p config_path:="$WS/replication_hsv.json" -p publish_debug_image:=true
```

服务端保持运行，在另一个已加载 ROS 和工作区环境的终端检查：

```bash
ros2 topic echo /color_targets --once
ros2 topic info /color_sorting/debug_image
ros2 service call /Mvc_sorting_server/save_config std_srvs/srv/Trigger
ros2 service call /Mvc_sorting_server/load_config std_srvs/srv/Trigger
```

预期：稳定帧中有 8 个目标、每种颜色两个；调试话题存在发布者；两个服务返回 `success: true`。
第一帧可能因 `min_hits=2` 为空，重新加载配置后也需要重新积累命中次数。
按 `Ctrl+C` 停止。有限帧验收时，在服务端命令中加 `-p max_frames:=120`，处理完成后应退出。

其他输入示例（一次运行一个；视频路径、话题名按实际情况修改）：

```bash
# 摄像头：需要桌面显示环境
ros2 run Mvc_sorting Mvc_sorting_server --ros-args   -p input_type:=camera -p camera_index:=0 -p show_window:=true

# 视频文件
ros2 run Mvc_sorting Mvc_sorting_server --ros-args   -p input_type:=video -p video_path:=/absolute/path/demo.mp4 -p show_window:=false

# 图像话题：先启动相机驱动或仿真发布端
ros2 run Mvc_sorting Mvc_sorting_server --ros-args   -p input_type:=topic -p image_topic:=/camera/image_raw -p show_window:=false
```

---
