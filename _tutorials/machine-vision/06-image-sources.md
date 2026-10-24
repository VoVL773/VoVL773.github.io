---
title: "合成图像与测试场景"
course: "machine-vision"
order: 6
group: "纯 Python 视觉模块"
description: "没有相机也能测试：生成多色移动目标与噪点，验证完整视觉流水线。"
source_doc: "六.合成测试场景：image_sources.py.md"
---

> 没有相机时，用程序生成图像作为检测输入。
> 合成场景包含四色各两个移动目标和随机噪点，用来验证检测、跟踪与可视化。

## 一. 创建 image_sources.py

在 `src/Mvc_sorting/Mvc_sorting/` 下创建 `image_sources.py`。
本章仍然只用到标准库、OpenCV 和 NumPy，无需新增 ROS 依赖。

## 二. 逐步讲解 image_sources.py（合成测试场景）

### 1. 导入模块与颜色表

```python
from __future__ import annotations

import math

import cv2
import numpy as np

SYNTHETIC_COLORS = {
    'red': (0, 0, 255),
    'green': (0, 255, 0),
    'blue': (255, 0, 0),
    'yellow': (0, 255, 255),
}
```


| 代码 | 作用 |
| --- | --- |
| `math` | 使用正弦、余弦生成平滑运动 |
| `cv2` | 绘制背景、圆形目标、噪点和帧号 |
| `np` | 创建图像、渐变背景和随机数生成器 |
| `SYNTHETIC_COLORS` | 定义目标的 BGR 绘制颜色 |


这里的颜色表负责生成测试图片；HSV 配置层中的阈值负责从图片中识别这些颜色。

### 2. SyntheticScene 类（管理合成画面）

方法片段保留类内缩进，整理到文件时放在同一个类中。

#### 初始化

```python
class SyntheticScene:
    """
    Generate a moving multi-colour scene without a camera.

    Four colours are provided with two blobs each, so the server publishes
    eight targets. Small speckles are added to exercise morphology filtering.
    """
    def __init__(self, width: int = 640, height: int = 480, seed: int = 7) -> None:
        """Create the scene with two blobs per colour."""
        if width < 320 or height < 240:
            raise ValueError('synthetic frame size must be at least 320x240')
        self.width = int(width)
        self.height = int(height)
        self._scale_x = self.width / 640.0
        self._scale_y = self.height / 480.0
        self._scale = min(self._scale_x, self._scale_y)
        self._rng = np.random.default_rng(seed)
        self._frame_index = 0
        self._blobs = self._make_blobs()
```


| 参数或属性 | 作用 |
| --- | --- |
| `width` / `height` | 输出图像宽高，默认 640×480，最小 320×240 |
| `seed` | 随机种子，默认 7，便于重复生成相同序列 |
| `_scale_x` / `_scale_y` | 相对 640×480 基准画面的宽、高比例 |
| `_scale` | 两个比例中的较小值，用于缩放半径等尺寸 |
| `_rng` | 独立的 NumPy 随机数生成器 |
| `_frame_index` | 已生成的帧号 |
| `_blobs` | 保存八个目标的布局信息 |


相同尺寸和种子的新场景，按相同顺序调用 `read()` 会生成相同图像序列。
尺寸变化会影响目标面积；过小分辨率配合较高 `min_area` 时，不一定还能检出全部目标。

### 3. _make_blobs()：设置八个目标的初始布局

```python
    def _make_blobs(self) -> list[dict]:
        """Lay out eight blobs with non-overlapping base positions."""
        layouts = [
            ('red', (110, 105), 30),
            ('red', (530, 105), 20),
            ('green', (110, 375), 20),
            ('green', (530, 375), 30),
            ('blue', (320, 105), 30),
            ('blue', (110, 240), 20),
            ('yellow', (320, 375), 20),
            ('yellow', (530, 240), 30),
        ]
        blobs = []
        for index, (color, (base_x, base_y), radius) in enumerate(layouts):
            blobs.append({
                'color': color,
                'base_x': int(round(base_x * self._scale_x)),
                'base_y': int(round(base_y * self._scale_y)),
                'radius': max(8, int(round(radius * self._scale))),
                'phase': index * 0.79,
            })
        return blobs
```

`layouts` 为每种颜色安排两个不同半径的圆，基准位置分散在画面中，避免初始布局重叠。
随后按图像尺寸缩放中心和半径，并给每个目标设置不同的 `phase`（相位）。

例如第一项 `('red', (110, 105), 30)` 表示：基准图像中，一个红色圆的中心为
`(110, 105)`、半径为 `30`。使用 1280×960 时，对应位置和半径均放大两倍。
半径至少为 `8`，避免缩放后过小。

### 4. read()：生成下一帧 BGR 图像

```python
    def read(self) -> np.ndarray:
        """Return the next synthetic BGR frame."""
        self._frame_index += 1
        frame = self._background()

        for blob in self._blobs:
            phase = blob['phase']
            offset_x = int(
                22.0 * self._scale_x
                * math.sin(self._frame_index * 0.030 + phase))
            offset_y = int(
                12.0 * self._scale_y
                * math.cos(self._frame_index * 0.024 + phase * 1.7))
            center = (
                int(blob['base_x'] + offset_x),
                int(blob['base_y'] + offset_y),
            )
            color = SYNTHETIC_COLORS[blob['color']]
            radius = int(blob['radius'])
            cv2.circle(frame, center, radius + 2, (245, 245, 245),
                       cv2.FILLED, cv2.LINE_AA)
            cv2.circle(frame, center, radius, color, cv2.FILLED, cv2.LINE_AA)
            highlight = (center[0] - radius // 3, center[1] - radius // 3)
            cv2.circle(frame, highlight, max(3, radius // 5),
                       (255, 255, 255), cv2.FILLED, cv2.LINE_AA)

        self._draw_speckles(frame)
        cv2.putText(
            frame, f'SYNTHETIC #{self._frame_index}',
            (max(8, int(12 * self._scale)), self.height - max(10, int(16 * self._scale))),
            cv2.FONT_HERSHEY_SIMPLEX, max(0.4, 0.5 * self._scale),
            (180, 180, 180), max(1, int(self._scale)), cv2.LINE_AA)
        return frame
```

每次调用先增加帧号、生成背景，再遍历八个目标并绘制。

#### 使用正弦、余弦计算偏移

```text
水平偏移 = 22 × 宽度比例 × sin(帧号 × 0.030 + 相位)
垂直偏移 = 12 × 高度比例 × cos(帧号 × 0.024 + 相位 × 1.7)
```

在 640×480 下，水平振幅约为 22 像素、垂直振幅约为 12 像素。
运动随调用帧号变化，不按真实时间推进；调用越快，播放时看起来移动越快。
不同相位让八个目标不会完全同步移动。

#### 画出边缘、高光和噪点

先画浅色外圈，再画彩色圆，再添加左上方白色高光。
高光会在颜色掩码中形成小孔，可观察形态学处理的效果。
最后加入噪点和 `SYNTHETIC #帧号` 文字，返回形状为 `(高, 宽, 3)` 的 BGR 数组。

注意：这里的 `read()` 直接返回图像，不像 `cv2.VideoCapture.read()` 那样返回 `(成功标志, 图像)`。

### 5. _background()：绘制传送带风格的背景

```python
    def _background(self) -> np.ndarray:
        """Build a dark conveyor-like background with a subtle gradient."""
        ramp = np.linspace(26, 62, self.width, dtype=np.float32)
        frame = np.tile(ramp, (self.height, 1))
        frame = cv2.merge([frame * 0.85, frame, frame * 1.10])
        frame = np.clip(frame, 0, 255).astype(np.uint8)
        grid = max(40, int(80 * self._scale))
        for x in range(0, self.width, grid):
            cv2.line(frame, (x, 0), (x, self.height), (48, 48, 48), 1)
        for y in range(0, self.height, grid):
            cv2.line(frame, (0, y), (self.width, y), (48, 48, 48), 1)
        band_top = int(198 * self._scale_y)
        band_bottom = int(292 * self._scale_y)
        cv2.rectangle(
            frame, (0, band_top), (self.width, band_bottom),
            (58, 58, 58), cv2.FILLED)
        thickness = max(1, int(2 * self._scale))
        cv2.line(
            frame, (0, band_top), (self.width, band_top),
            (95, 95, 95), thickness)
        cv2.line(
            frame, (0, band_bottom - 2), (self.width, band_bottom - 2),
            (95, 95, 95), thickness)
        return frame
```


| 步骤 | 作用 |
| --- | --- |
| `linspace(26, 62, width)` | 从左到右生成深灰到浅灰的亮度渐变 |
| `tile()` | 把一行渐变复制为整张图 |
| `merge()` | 给 B/G/R 通道稍微不同的比例，形成暗色背景 |
| `clip(...).astype(uint8)` | 限制像素值并转为标准 8 位图像 |
| `line()` / `rectangle()` | 画网格、传送带条带和边界线 |


背景饱和度较低，与彩色圆形成对比，便于先验证理想条件下的检测链路。
它不能代替真实相机在复杂光照、反光和运动模糊下的测试。

### 6. _draw_speckles()：加入小噪点

```python
    def _draw_speckles(self, frame: np.ndarray) -> None:
        """Draw small colour speckles that must not survive area filtering."""
        count = max(30, int(70 * self._scale_x * self._scale_y))
        for _ in range(count):
            x = int(self._rng.integers(0, self.width))
            y = int(self._rng.integers(0, self.height))
            radius = max(1, int(self._rng.integers(1, 4) * self._scale))
            color = tuple(int(value) for value in self._rng.integers(0, 256, 3))
            cv2.circle(frame, (x, y), radius, color, cv2.FILLED)
```

根据画面面积缩放噪点数量，至少绘制 30 个；随机选择位置、半径和 BGR 颜色。
这个函数直接修改传入的 `frame`。

默认 640×480 时，噪点半径为 1–3 像素，通常会被形态学处理和最小面积过滤。
分辨率、阈值或形态学参数变化后，需要重新观察过滤效果，不能仅凭“合成场景”保证没有误检。

> 自此，image_sources.py 的合成测试场景部分结束。

## 检测成果

下面用默认尺寸连续处理 30 帧，检查每色两个目标、ID 保持和固定种子的可重复性，并保存第一帧：

```bash
cd "$WS"
PYTHONPATH="src/Mvc_sorting" python3 - <<'PY'
from collections import Counter
import cv2
import numpy as np
from Mvc_sorting.color_detector import ColorDetector
from Mvc_sorting.hsv_config import HSVConfig
from Mvc_sorting.image_sources import SyntheticScene
from Mvc_sorting.visualization import annotate_frame

scene = SyntheticScene()
replica = SyntheticScene()
detector = ColorDetector(HSVConfig.default())
expected = Counter({'red': 2, 'green': 2, 'blue': 2, 'yellow': 2})
previous_ids = None
for index in range(30):
    frame = scene.read()
    assert frame.shape == (480, 640, 3) and frame.dtype == np.uint8
    assert np.array_equal(frame, replica.read())
    detections, masks = detector.detect(frame)
    assert Counter(item.color for item in detections) == expected
    ids = {item.id for item in detections}
    if previous_ids is not None:
        assert ids == previous_ids
    previous_ids = ids
    if index == 0:
        annotated = annotate_frame(frame, detections, detector.config, frame_index=1)
        assert cv2.imwrite('/tmp/color_sorting_synthetic.png', annotated)
print('frames: 30, targets per frame: 8')
print('reproducible: True, stable ids: True')
print('saved: /tmp/color_sorting_synthetic.png')
PY
```

预期：30 帧均得到 8 个目标、每色两个，固定种子的图像一致，目标 ID 集合保持不变。
打开 `/tmp/color_sorting_synthetic.png` 可以查看第一帧标注。
这只验证当前默认配置和场景，不等同于复杂遮挡或交叉运动下的跟踪验收。

---
