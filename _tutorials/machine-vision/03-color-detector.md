---
title: "颜色检测与目标跟踪"
course: "machine-vision"
order: 3
group: "纯 Python 视觉模块"
description: "从颜色掩码、形态学处理到轮廓筛选，输出可跟踪的目标列表。"
source_doc: "三.检测与跟踪层：color_detector.py.md"
---

> 接着上一章的 HSV 配置层，先脱离 ROS 2，用纯 Python 跑通检测与跟踪。
> 输入一帧图像，输出 `Detection` 列表和每种颜色对应的掩码。

## 一. 添加 OpenCV 和 NumPy 依赖

这一章需要用到 OpenCV 和 NumPy，在 `package.xml` 中补充运行依赖：

```xml
<exec_depend>python3-opencv</exec_depend>
<exec_depend>python3-numpy</exec_depend>
```

与上一章一样，Python 相关依赖在 `package.xml` 中声明即可，不需要再写到 `ros2 pkg create --dependencies` 中。
如果系统中还没有安装这两个库，执行：

```bash
sudo apt install python3-opencv python3-numpy
```

在 `src/Mvc_sorting/Mvc_sorting/` 下创建 `color_detector.py`。下面按源码顺序逐步讲解；
`ColorDetector` 的方法片段保留类内缩进，整理到文件时放在同一个类中。

## 二. 逐步讲解 color_detector.py（检测与跟踪层）

### 1. 导入模块

```python
from __future__ import annotations

from dataclasses import dataclass
from math import hypot
from typing import Dict, List, Tuple

import cv2
import numpy as np

from .hsv_config import HSVConfig
```

逐行解释：


| 代码 | 作用 |
| --- | --- |
| `from __future__ import annotations` | 延迟处理类型注解 |
| `dataclass` | 为检测结果和轨迹状态自动生成初始化方法 |
| `hypot` | 计算两个目标中心之间的欧几里得距离 |
| `Dict`、`List`、`Tuple` | 字典、列表和元组的类型注解 |
| `cv2` | 颜色转换、阈值分割、形态学处理和轮廓计算 |
| `numpy as np` | 创建和处理图像数组 |
| `from .hsv_config import HSVConfig` | 从同一个包中导入上一章的配置类 |


例如，两个目标的中心分别是 `(100, 100)` 和 `(103, 104)`，
`hypot(103 - 100, 104 - 100)` 的结果为 `5.0`，表示相距 5 个像素。

### 2. Detection 类（保存单个目标的检测结果）

```python
@dataclass
class Detection:
    """One filtered colour blob in image coordinates."""

    id: int  # noqa: A003
    color: str
    x: float
    y: float
    area: float
    bbox: Tuple[int, int, int, int]  # x, y, width, height
```

这里继续使用上一章介绍的 `@dataclass`，直接声明字段即可创建保存检测结果的对象。


| 字段 | 含义 |
| --- | --- |
| `id` | 目标编号，检测后再由跟踪逻辑或逐帧编号逻辑分配 |
| `color` | 颜色名称，如 `red` |
| `x`、`y` | 质心的像素坐标，原点为图像左上角 |
| `area` | 轮廓面积，单位为像素² |
| `bbox` | 外接矩形，格式为 `(左上角 x, 左上角 y, 宽, 高)` |


注：`# noqa: A003` 用来告诉检查工具，允许这里使用与 Python 内置函数 `id` 同名的字段。

### 3. _Track 类（保存跟踪过程中的内部状态）

```python
@dataclass
class _Track:
    """Internal state for one tracked blob."""

    id: int  # noqa: A003
    color: str
    x: float
    y: float
    area: float
    last_seen: int
    hits: int
```

`Detection` 保存当前帧的检测结果，`_Track` 保存跨帧匹配需要的历史状态。
前面的下划线表示这个类主要供模块内部使用。

除了编号、颜色、位置和面积，还增加了两个字段：


| 字段 | 含义 |
| --- | --- |
| `last_seen` | 最后一次匹配到该目标的帧号，用于清理过期轨迹 |
| `hits` | 该轨迹累计命中的次数，新轨迹从 1 开始 |


注意：当前实现中，短暂漏检不会把 `hits` 清零，所以它表示累计命中次数。

### 4. _odd_kernel()：统一处理核尺寸

```python
def _odd_kernel(size: int) -> int:
    """Return an odd morphology/blur kernel size, or 0 when disabled."""
    if size <= 1:
        return 0
    if size % 2 == 0:
        size += 1
    return size
```

这个函数把配置中的核尺寸转换为检测器实际使用的尺寸：

- `size <= 1`：返回 `0`，表示关闭相应处理。
- `size` 为偶数：加 `1`，调整为奇数。
- 其他情况：直接使用原值。

例如：`_odd_kernel(0)` 返回 `0`，`_odd_kernel(4)` 返回 `5`。
高斯模糊要求这里传入的核尺寸为正奇数；形态学核也统一按本项目的规则取奇数，便于围绕中心像素处理。

### 5. ColorDetector 类（管理检测与跟踪）

#### 初始化

```python
class ColorDetector:
    """Detect coloured blobs and optionally keep stable IDs between frames."""

    def __init__(
        self,
        config: HSVConfig,
        enable_tracking: bool = True,
        track_max_distance: float = 80.0,
        track_max_age: int = 15,
        min_hits: int = 1,
    ) -> None:
        """Create a detector for the given configuration."""
        if not isinstance(config, HSVConfig):
            raise TypeError('config must be an HSVConfig instance')
        if track_max_distance < 0:
            raise ValueError('track_max_distance must be >= 0')
        if track_max_age < 0:
            raise ValueError('track_max_age must be >= 0')
        if min_hits < 1:
            raise ValueError('min_hits must be >= 1')
        self.config = config
        self.enable_tracking = bool(enable_tracking)
        self.track_max_distance = float(track_max_distance)
        self.track_max_age = int(track_max_age)
        self.min_hits = int(min_hits)
        self._tracks: Dict[int, _Track] = {}
        self._frame_number = 0
        self._next_id = 1
```

先检查参数是否合法，再保存配置和跟踪状态。


| 参数 | 默认值 | 作用 |
| --- | --- | --- |
| `config` | 必传 | 上一章创建的 `HSVConfig` 对象 |
| `enable_tracking` | `True` | 是否跨帧保持目标 ID |
| `track_max_distance` | `80.0` | 匹配时允许的最大中心距离，单位为像素 |
| `track_max_age` | `15` | 根据当前帧与 `last_seen` 的帧号差判断轨迹是否过期 |
| `min_hits` | `1` | 轨迹至少命中多少次，才出现在返回的检测列表中 |


`config` 必须是 `HSVConfig` 实例，距离和轨迹年龄不能为负数，`min_hits` 至少为 `1`。
这里是纯算法类，默认 `min_hits=1`；后续 ROS 服务端默认使用 `2`。

三个内部属性分别负责：

- `self._tracks`：保存 `轨迹 ID → _Track 对象` 的对应关系。
- `self._frame_number`：记录启用跟踪后处理到的帧号，初始为 `0`。
- `self._next_id`：记录下一个新目标使用的 ID，初始为 `1`。


这里手写 `__init__()`，主要是因为 **`ColorDetector` 是一个执行算法、维护运行状态的对象**，用普通类表达很自然。

与前面的两个数据类对比：


|类|主要职责|适合的写法|
|---|---|---|
|`Detection`|保存一条检测结果|`@dataclass`|
|`_Track`|保存一条轨迹状态|`@dataclass`|
|`ColorDetector`|执行检测、分配 ID、管理轨迹|普通类，也可以用 dataclass|


具体到这段代码，手写初始化有几个实际优势：

- **校验与赋值顺序明确**：先检查传入参数，再转换类型、保存属性，最后创建内部状态，顺着读就能理解。
- **内部状态声明直接**：`self._tracks = {}`、`self._next_id = 1` 就够了；使用 dataclass 需要额外写 `field(init=False, ...)`。
- **不自动引入额外行为**：普通类默认按对象身份比较；dataclass 默认会生成字段比较 `__eq__()` 和对象展示 `__repr__()`，这里通常用不上。


#### set_config()：替换检测配置

```python
    def set_config(self, config: HSVConfig) -> None:
        """Replace the active threshold configuration."""
        if not isinstance(config, HSVConfig):
            raise TypeError('config must be an HSVConfig instance')
        self.config = config
```

调参后，可以把新的 `HSVConfig` 对象交给检测器。
这里仍然检查对象类型，但只替换配置，不自动清空已有轨迹。

#### reset_tracking()：重置跟踪状态

```python
    def reset_tracking(self) -> None:
        """Drop all track state and restart IDs at 1."""
        self._tracks.clear()
        self._frame_number = 0
        self._next_id = 1
```

清空所有轨迹，把帧号恢复为 `0`、下一个 ID 恢复为 `1`。
如果切换输入源，或修改阈值后希望重新编号，可以调用这个方法。
工具函数 用于切换跟随对象等重新开始新的跟随识别轨迹任务

### 6. detect()：处理一帧图像

```python
    def detect(self, frame: np.ndarray) -> Tuple[List[Detection], Dict[str, np.ndarray]]:
        """
        Detect colour blobs in a BGR frame.

        Returns a list of detections and a dictionary containing one binary
        mask per configured colour (disabled colours get an empty mask).
        """
        
        if frame is None or not isinstance(frame, np.ndarray) or frame.size == 0:
            raise ValueError('frame must be a non-empty numpy array')#检查图像能否正常使用 1.是否传入 2.传入的是不是Numpy数组 3. 图像大小为0即图像为空
        bgr = self._as_bgr(frame) 
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV) #默认BGR格式转HSV格式 再根据配置决定是否模糊降噪 HSV 将色调、饱和度和明度分开，方便根据颜色阈值筛选红色、蓝色等目标 
        blur_kernel = _odd_kernel(self.config.blur_kernel)
        if blur_kernel:
            hsv = cv2.GaussianBlur(hsv, (blur_kernel, blur_kernel), 0)# 只有模糊核大小不为 `0` 时，才执行高斯模糊
            
        masks: Dict[str, np.ndarray] = {} #保持每种颜色的二值图像 
        detections: List[Detection] = [] #保持识别到的对象 每个元素都是一个 Detection对象，包含 ID、颜色、中心坐标、面积和边界框等信息
        for color_name, threshold in self.config.colors.items():
            if not threshold.enabled: #判断颜色是否启用
                masks[color_name] = np.zeros(bgr.shape[:2], dtype=np.uint8)
                continue
            mask = self._threshold_mask(hsv, threshold.mask_ranges())#获取当前颜色的阈值范围并self._threshold_mask 跟据范围提取颜色区域
            mask = self._clean_mask(mask) #清空掩膜
            masks[color_name] = mask
            contours, _hierarchy = cv2.findContours(
                mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)#提取轮廓
            for contour in contours:
                detection = self._contour_to_detection(contour, color_name)
                if detection is not None:
                    detections.append(detection) #逐个处理轮廓
        order = {name: index for index, name in enumerate(self.config.colors)}
        detections.sort(key=lambda item: (
            order.get(item.color, len(order)), item.color, item.x, item.y))#按配置中的顺序排序
		
        if self.enable_tracking:  #根据是否为跟踪任务进行命中次数判断
            self._update_tracks(detections)
            if self.min_hits > 1:
                detections = [
                    detection for detection in detections
                    if detection.id in self._tracks
                    and self._tracks[detection.id].hits >= self.min_hits]
        else:
            for index, detection in enumerate(detections, start=1):
                detection.id = index
        return detections, masks
```

这是检测器的主要入口，最后返回两个结果：

```python
detections, masks = detector.detect(frame)
```

- `detections`：当前帧通过筛选的 `Detection` 对象列表。
- `masks`：`颜色名称 → 二值掩码` 的字典，禁用的颜色对应全黑掩码。

按执行顺序解释：


| 步骤 | 代码对应的作用 |
| --- | --- |
| 检查输入 | 拒绝 `None`、非 NumPy 数组和空数组 |
| 转换颜色空间 | `_as_bgr()` 统一图像格式，再把 BGR 转为 HSV |
| 可选模糊 | 在 HSV 图像上进行高斯模糊，核尺寸由配置决定 |
| 遍历颜色 | 跳过禁用颜色，对启用颜色生成并清理掩码 |
| 查找轮廓 | `RETR_EXTERNAL` 只取外轮廓，`CHAIN_APPROX_SIMPLE` 压缩轮廓点 |
| 筛选目标 | `_contour_to_detection()` 过滤噪声并计算目标信息 |
| 排序 | 按配置中的颜色顺序，再按颜色名称和位置排列目标 |
| 分配编号 | 启用跟踪时跨帧匹配；关闭跟踪时每帧从 `1` 重新编号 |

为什么要保持颜色的二值图像？
![]({{ '/assets/images/tutorials/machine-vision/转二值图.png' | relative_url }})

以红色为例转为二值图后 对于红色色块会转化为白色表示符合筛选条件
masks 为字典可以保存多个颜色的二值图 彩色图像 → HSV 阈值筛选 → 二值掩膜 → 提取轮廓 → 得到目标坐标和面积。
![detect.png]({{ '/assets/images/tutorials/machine-vision/detect.png' | relative_url }})
### 7. _as_bgr()：统一输入图像格式

```python
    @staticmethod
    def _as_bgr(frame: np.ndarray) -> np.ndarray:
        """Convert supported frame layouts to 8-bit BGR."""
        if frame.dtype != np.uint8:
            frame = np.clip(frame, 0, 255).astype(np.uint8)
        if frame.ndim == 2:
            return cv2.cvtColor(frame, cv2.COLOR_GRAY2BGR)
        if frame.ndim != 3:
            raise ValueError(f'unsupported frame shape: {frame.shape}')
        channels = frame.shape[2]
        if channels == 3:
            return frame
        if channels == 4:
            return cv2.cvtColor(frame, cv2.COLOR_BGRA2BGR)
        raise ValueError(f'unsupported frame channel count: {channels}')
```

这个方法不需要访问 `self`，所以使用上一章介绍的 `@staticmethod`。


| 输入 | 处理方式 |
| --- | --- |
| 非 `uint8` 数组 | 先把数值截到 0–255，再转换为 `uint8` |
| 二维灰度图 | `COLOR_GRAY2BGR`，转换为三通道 |
| 三通道 BGR 图 | 直接返回 |
| 四通道 BGRA 图 | `COLOR_BGRA2BGR`，去掉透明度通道 |
| 其他维数或通道数 | 抛出 `ValueError` |


注意：三通道输入按 BGR 解释，不会自动判断它是不是 RGB 图像。

### 8. _threshold_mask()：按 HSV 区间生成掩码

```python
    @staticmethod
    def _threshold_mask(
        hsv: np.ndarray,
        ranges: List[Tuple[Tuple[int, int, int], Tuple[int, int, int]]],
    ) -> np.ndarray:
        """Apply one or more inRange intervals and merge them with OR."""
        mask = np.zeros(hsv.shape[:2], dtype=np.uint8) #创建一个全黑的掩膜
        for lower, upper in ranges:  #转化黑白图符合 置255为白色 不符合置0为黑色
            lower_array = np.array(lower, dtype=np.uint8)
            upper_array = np.array(upper, dtype=np.uint8)
            mask = cv2.bitwise_or(
                mask, cv2.inRange(hsv, lower_array, upper_array))
        return mask
```


| 内容                | 含义                        |
| ----------------- | ------------------------- |
| `hsv`             | 输入的 HSV 图像，是 NumPy 数组     |
| `ranges`          | 一个或多个 HSV 颜色范围            |
| `-> np.ndarray`   |

提示函数会返回一个 NumPy 数组        

先创建与输入图像同宽高的全黑掩码，再逐个处理 HSV 区间。
- `hsv.shape`：获取图像的形状。假设图像是 `480 × 640`，那么 HSV 数组的形状为 `(480, 640, 3)`。
- `hsv.shape[:2]`：只取前两个维度，即 `(480, 640)`，代表图像的高度和宽度。
- `np.zeros(...)`：创建一个所有元素都是 `0` 的数组。
- `dtype=np.uint8`：使用 8 位无符号整数，像素值范围为 `0～255`。
所以，创建出来的是一张与原图大小相同的全黑单通道图像。

`cv2.inRange()` 把区间内的像素标记为 `255`，其余为 `0`。 
`cv2.bitwise_or()` 把多个区间的检测结果合并，只要任意区间命中，该像素就保留。

这与上一章的 `mask_ranges()` 对应：普通颜色通常只有一个区间，开启环绕的红色有两个区间，
因此 H 接近 `0` 和接近 `179` 的红色都可以进入同一张掩码。

### 9. _clean_mask()：形态学去噪

```python
    def _clean_mask(self, mask: np.ndarray) -> np.ndarray:
        """Remove speckles with open/close morphology."""
        kernel_size = _odd_kernel(self.config.morph_kernel)
        if not kernel_size or self.config.morph_iterations <= 0:
            return mask
        kernel = cv2.getStructuringElement(
            cv2.MORPH_ELLIPSE, (kernel_size, kernel_size)) # 创建椭圆形结构元素
        cleaned = cv2.morphologyEx(
            mask, cv2.MORPH_OPEN, kernel,
            iterations=self.config.morph_iterations) #开运算
        cleaned = cv2.morphologyEx(
            cleaned, cv2.MORPH_CLOSE, kernel,
            iterations=self.config.morph_iterations) #闭运算
        return cleaned
```

核尺寸关闭或迭代次数不大于 `0` 时，直接返回原掩码；否则创建椭圆形结构元素，依次执行：


| 操作                | 顺序      | 作用                |
| ----------------- | ------- | ----------------- |
| 开运算 `MORPH_OPEN`  | 先腐蚀，后膨胀 | 去除细小噪点(白点)        |
| 闭运算 `MORPH_CLOSE` | 先膨胀，后腐蚀 | 填补小孔洞、连接较小间隙(补缺口) |

满足任意一个条件，就直接返回原始掩膜，不执行形态学操作。
- `not kernel_size`：核大小无效或为 `0` 等假值。
- `morph_iterations <= 0`：形态学操作的迭代次数小于或等于 `0`。

`morph_iterations` 控制每次形态学操作的迭代次数。
核越大、迭代次数越多，对目标形状的影响也越大，小目标可能一起被去除。
![]({{ '/assets/images/tutorials/machine-vision/开&闭运算处理图片.png' | relative_url }})

### 10. _contour_to_detection()：过滤轮廓并计算质心

```python
    def _contour_to_detection(
        self, contour: np.ndarray, color_name: str,
    ) -> Detection | None:
        """Filter one contour and convert it to a detection."""
        area = float(cv2.contourArea(contour))
        if area < self.config.min_area:
            return None
        if self.config.max_area and area > self.config.max_area:
            return None

        x, y, width, height = cv2.boundingRect(contour)
        if width < self.config.min_dimension or height < self.config.min_dimension:
            return None
        box_area = float(width * height)
        if box_area > 0 and area / box_area < self.config.min_fill_ratio:
            return None

        moments = cv2.moments(contour)
        if moments['m00'] > 0:
            center_x = moments['m10'] / moments['m00']
            center_y = moments['m01'] / moments['m00']
        else:
            center_x = x + width / 2.0
            center_y = y + height / 2.0
        return Detection(
            id=0,
            color=color_name,
            x=float(center_x),
            y=float(center_y),
            area=area,
            bbox=(int(x), int(y), int(width), int(height)),
        )
```

把找到的轮廓转换成一个目标检测结果 `Detection`，同时过滤掉面积太小、太大、尺寸不合适或形状不符合要求的轮廓。

#### 按面积、宽高和填充率过滤


| 检查项 | 过滤条件 |
| --- | --- |
| 最小面积 | `area < min_area` |
| 最大面积 | `max_area` 非零，且 `area > max_area` |
| 最小宽高 | 宽或高小于 `min_dimension` |
| 最小填充率 | `轮廓面积 / 外接矩形面积 < min_fill_ratio` |


例如，一个外接矩形宽 `20`、高 `10`，轮廓面积为 `30`，填充率就是 `30 / 200 = 0.15`。
若 `min_fill_ratio=0.20`，该轮廓会被过滤。

#### 使用图像矩计算质心

`cv2.moments()` 返回轮廓的图像矩，质心计算如下：

```python
center_x = moments['m10'] / moments['m00']
center_y = moments['m01'] / moments['m00']
```

如果 `m00` 为 `0`，为避免除零，改用外接矩形中心。
返回对象时暂时设置 `id=0`，真正的 ID 在 `detect()` 后续的跟踪或编号步骤中分配。


### 11. _update_tracks()：同色目标的最近邻匹配

```python
    def _update_tracks(self, detections: List[Detection]) -> None:
        """Assign stable IDs using greedy nearest-neighbour matching."""
        self._frame_number += 1
        active = {
            track_id: track for track_id, track in self._tracks.items()
            if self._frame_number - track.last_seen <= self.track_max_age
        }
        unmatched_tracks = set(active)

        for color_name in self.config.colors:
            color_detections = [
                detection for detection in detections
                if detection.color == color_name]
            if not color_detections:
                continue

            candidates = []
            for detection_index, detection in enumerate(color_detections):
                for track_id, track in active.items():
                    if track.color != color_name or track_id not in unmatched_tracks:
                        continue
                    distance = hypot(
                        detection.x - track.x, detection.y - track.y)
                    if distance <= self.track_max_distance:
                        candidates.append((distance, detection_index, track_id))
            candidates.sort(key=lambda item: (item[0], item[1], item[2]))

            matched_detections = set()
            matched_tracks = set()
            for _distance, detection_index, track_id in candidates:
                if detection_index in matched_detections or track_id in matched_tracks:
                    continue
                detection = color_detections[detection_index]
                track = active[track_id]
                detection.id = track_id
                track.x = detection.x
                track.y = detection.y
                track.area = detection.area
                track.last_seen = self._frame_number
                track.hits += 1
                matched_detections.add(detection_index)
                matched_tracks.add(track_id)
                unmatched_tracks.discard(track_id)

            for detection_index, detection in enumerate(color_detections):
                if detection_index in matched_detections:
                    continue
                track_id = self._next_id
                self._next_id += 1
                detection.id = track_id
                self._tracks[track_id] = _Track(
                    id=track_id,
                    color=color_name,
                    x=detection.x,
                    y=detection.y,
                    area=detection.area,
                    last_seen=self._frame_number,
                    hits=1,
                )

        self._tracks = {
            track_id: track for track_id, track in self._tracks.items()
            if self._frame_number - track.last_seen <= self.track_max_age
        }
```

这个方法直接修改检测对象的 `id`，并更新 `self._tracks`，不额外返回结果。

#### 1. 找出尚未过期的轨迹

每处理一帧，`self._frame_number` 加 `1`。
只有满足 `当前帧号 - last_seen <= track_max_age` 的历史轨迹，才参与本帧匹配。

`unmatched_tracks` 保存尚未被匹配的轨迹 ID，用来避免同一条轨迹被重复使用。

#### 2. 生成同色候选匹配

按颜色分别处理，只比较颜色相同的检测目标和轨迹。
通过 `hypot()` 计算中心距离，小于或等于 `track_max_distance` 才加入候选列表：

```python
candidates.append((distance, detection_index, track_id))
```

随后按距离从小到大排序；距离相同时，再按检测下标、轨迹 ID 排序。

#### 3. 优先匹配距离最近的一对

遍历候选列表，跳过已经匹配过的检测目标或轨迹。
匹配成功后沿用轨迹 ID，更新位置、面积和最后出现帧号，并把 `hits` 加 `1`。

这种方式叫贪心最近邻匹配：每次优先选择当前最近的一对。
它实现简单，但目标交叉、距离过近或移动过快时，仍可能交换 ID。

#### 4. 为新目标分配 ID，清理过期轨迹

没有匹配到历史轨迹的检测目标，会获得 `self._next_id`，并创建 `hits=1` 的新轨迹。
最后删除过期轨迹。暂时未匹配、但尚未过期的轨迹会保留，供后续帧重新匹配；
它们不会凭历史位置生成当前帧的检测结果。

> 自此，color_detector.py 的检测与跟踪部分结束。

## 检测成果

在工作区根目录执行下面的代码，不需要启动 ROS 节点。
先画出四色圆，验证颜色检测，再用连续两帧验证 ID 和 `min_hits`。

```bash
cd "$WS"
PYTHONPATH="src/Mvc_sorting" python3 - <<'PY'
import cv2
import numpy as np
from Mvc_sorting.color_detector import ColorDetector
from Mvc_sorting.hsv_config import HSVConfig

frame = np.full((480, 640, 3), 35, dtype=np.uint8)
colors = [
    ((100, 100), (0, 0, 255)),
    ((250, 100), (0, 255, 0)),
    ((400, 100), (255, 0, 0)),
    ((550, 100), (0, 255, 255)),
]
for center, bgr in colors:
    cv2.circle(frame, center, 30, bgr, cv2.FILLED)

detector = ColorDetector(HSVConfig.default(), enable_tracking=False)
detections, masks = detector.detect(frame)
print('colors:', [item.color for item in detections])
print('count:', len(detections))
print('masks:', list(masks))
assert len(detections) == 4

tracker = ColorDetector(HSVConfig.default(), min_hits=2)
first, _ = tracker.detect(frame)
second, _ = tracker.detect(frame)
third, _ = tracker.detect(frame)
print('tracked counts:', len(first), len(second), len(third))
print('stable ids:', [item.id for item in second] == [item.id for item in third])
assert len(first) == 0 and len(second) == len(third) == 4
assert [item.id for item in second] == [item.id for item in third]
PY
```

预期：

```text
colors: ['red', 'green', 'blue', 'yellow']
count: 4
masks: ['red', 'green', 'blue', 'yellow']
tracked counts: 0 4 4
stable ids: True
```

可以看到，四色圆都被识别，四种颜色都有对应掩码；开启 `min_hits=2` 后，
第一帧不返回目标，第二帧开始返回，并在第三帧保持相同 ID。

---
