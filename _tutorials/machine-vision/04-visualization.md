---
title: "检测结果可视化"
course: "machine-vision"
order: 4
group: "纯 Python 视觉模块"
description: "绘制目标信息并拼接颜色掩码，把检测结果变成直观的调试画面。"
source_doc: "四.可视化层：visualization.py.md"
---

> 接着上一章的检测结果，把目标画到图像上，再把各颜色掩码拼成预览图。
> 这一层仍然不依赖 ROS 2，无显示环境也能保存图片验收。

## 一. 创建 visualization.py

在 `src/Mvc_sorting/Mvc_sorting/` 下创建 `visualization.py`。
沿用前面已经声明的 OpenCV、NumPy 依赖即可，本章不需要新增 ROS 消息包。

这个文件负责“怎么显示”，检测结果仍由 `ColorDetector` 计算。

## 二. 逐步讲解 visualization.py（可视化层）

### 1. 导入模块

```python
from __future__ import annotations

import math
import os
import sys
from typing import Dict, List

import cv2
import numpy as np

from .color_detector import Detection
from .hsv_config import HSVConfig
```


| 模块或对象 | 作用 |
| --- | --- |
| `math` | 计算掩码拼图所需的行数 |
| `os`、`sys` | 检查显示环境变量和操作系统 |
| `Dict`、`List` | 类型注解 |
| `cv2`、`np` | 绘制图形、文字以及处理图像数组 |
| `Detection` | 上一章生成的目标信息 |
| `HSVConfig` | 显示阈值、最小面积和形态学核等状态 |


### 2. 颜色表与 bgr_for_color()：确定绘制颜色

```python
COLOR_BGR = {
    'red': (0, 0, 255),
    'green': (0, 255, 0),
    'blue': (255, 0, 0),
    'yellow': (0, 255, 255),
}
```

```python
def bgr_for_color(name: str) -> tuple[int, int, int]:
    """Return a deterministic BGR draw colour for a class name."""
    known = COLOR_BGR.get(name.lower())
    if known is not None:
        return known
    hue = sum((index + 1) * ord(char) for index, char in enumerate(name)) % 180
    hsv = np.uint8([[[hue, 230, 255]]])
    bgr = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)[0, 0]
    return (int(bgr[0]), int(bgr[1]), int(bgr[2]))
```

OpenCV 按 BGR 排列颜色通道。例如红色为 `(0, 0, 255)`，蓝色为 `(255, 0, 0)`。
已知颜色先转为小写后查表；自定义颜色则根据名称计算 H，再从 HSV 转为 BGR。

这里没有使用随机数，因此同一个名称会得到相同的绘制颜色。
生成 H 时使用原始名称，所以自定义名称大小写不同可能得到不同颜色。

### 3. gui_is_available()：判断是否适合尝试打开窗口

```python
def gui_is_available() -> bool:
    """Return True when OpenCV highgui can plausibly open a window."""
    if os.environ.get('CV2_HEADLESS', '').lower() in ('1', 'true', 'yes', 'on'):
        return False
    if not hasattr(cv2, 'imshow') or not hasattr(cv2, 'namedWindow'):
        return False
    if sys.platform.startswith('linux'):
        if not (os.environ.get('DISPLAY') or os.environ.get('WAYLAND_DISPLAY')):
            return False
    return True
```

按以下顺序检查：

1. `CV2_HEADLESS` 为 `1/true/yes/on` 时，直接关闭 GUI。
2. OpenCV 没有 `imshow` 或 `namedWindow` 接口时，关闭 GUI。
3. Linux 上既没有 `DISPLAY`，也没有 `WAYLAND_DISPLAY` 时，关闭 GUI。

这个函数只是初步判断，并不保证图形后端一定可用。远程终端或服务器上可以显式设置
`CV2_HEADLESS=1`，继续使用绘图和保存图片功能。

### 4. _put_label()：绘制带背景的文字标签

```python
def _put_label(
    image: np.ndarray,
    text: str,
    origin: tuple[int, int],
    color: tuple[int, int, int],
    scale: float = 0.45,
) -> None:
    """Draw text with a filled background for readability."""
    thickness = 1
    (text_width, text_height), baseline = cv2.getTextSize(
        text, cv2.FONT_HERSHEY_SIMPLEX, scale, thickness)
    x, y = origin
    max_x = max(0, image.shape[1] - text_width - 6)
    x = min(max(0, x), max_x)
    top = max(0, y - text_height - baseline - 4)
    bottom = top + text_height + baseline + 4
    right = x + text_width + 6
    cv2.rectangle(image, (x, top), (right, bottom), (0, 0, 0), cv2.FILLED)
    cv2.rectangle(image, (x, top), (right, bottom), color, 1)
    cv2.putText(
        image, text, (x + 3, bottom - baseline - 2),
        cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness, cv2.LINE_AA)
```

这个辅助函数直接修改传入的 `image`，不返回新图像。


| 代码 | 作用 |
| --- | --- |
| `getTextSize()` | 估算文字宽、高和基线距离 |
| `min(max(...))` | 调整横向位置，尽量避免标签超出图像右侧 |
| `rectangle(..., FILLED)` | 绘制黑色底板，提高可读性 |
| 第二次 `rectangle()` | 绘制与目标同色的边框 |
| `putText()` | 在底板上绘制文字 |


这里使用 OpenCV 的 Hershey 字体，适合英文、数字标签，不能直接用它绘制中文。

### 5. annotate_frame()：画出目标和状态栏

```python
def annotate_frame(
    frame: np.ndarray,
    detections: List[Detection],
    config: HSVConfig,
    fps: float = 0.0,
    frame_index: int = 0,
    status: str = '',
) -> np.ndarray:
    """Return a copy of ``frame`` with boxes, centres, labels and a HUD."""
    annotated = frame.copy()
    for detection in detections:
        color = bgr_for_color(detection.color)
        x, y, width, height = detection.bbox
        cv2.rectangle(annotated, (x, y), (x + width, y + height), color, 2)

        center = (int(round(detection.x)), int(round(detection.y)))
        cv2.circle(annotated, center, 4, color, cv2.FILLED)
        cv2.circle(annotated, center, 8, (255, 255, 255), 1)
        cv2.line(annotated, (center[0] - 11, center[1]),
                 (center[0] + 11, center[1]), color, 1)
        cv2.line(annotated, (center[0], center[1] - 11),
                 (center[0], center[1] + 11), color, 1)

        label = f'{detection.color.upper()} #{detection.id}'
        label_y = y - 6 if y > 24 else y + height + 18
        _put_label(annotated, label, (x, label_y), color)

    header = (
        f'FPS {fps:5.1f} | targets {len(detections):2d} | '
        f'min_area {config.min_area} | morph {config.morph_kernel} | frame {frame_index}')
    if status:
        header = f'{header} | {status}'
    overlay = annotated.copy()
    cv2.rectangle(overlay, (0, 0), (annotated.shape[1], 30), (0, 0, 0), cv2.FILLED)
    annotated = cv2.addWeighted(overlay, 0.65, annotated, 0.35, 0.0)
    cv2.putText(
        annotated, header, (8, 21), cv2.FONT_HERSHEY_SIMPLEX,
        0.55, (255, 255, 255), 1, cv2.LINE_AA)
    return annotated
```

先用 `frame.copy()` 复制输入，避免在原始检测图像上修改像素。
遍历检测结果后，依次绘制外接矩形、中心实心圆、白色圆圈、十字线和颜色/ID 标签。
标签优先放在目标上方；靠近图像顶部时，改放在目标下方。


| 参数 | 作用 |
| --- | --- |
| `frame` | 原始 BGR 图像 |
| `detections` | 当前帧的检测结果 |
| `config` | 状态栏中显示的配置 |
| `fps` | 调用者提供的帧率，本函数不负责测量 |
| `frame_index` | 当前帧号 |
| `status` | 附加状态文字，如当前编辑颜色 |


顶部状态栏显示帧率、目标数量、最小面积、形态学核和帧号。
`addWeighted(overlay, 0.65, annotated, 0.35, 0.0)` 把黑色底板与原画面混合，形成半透明背景。

### 6. make_mask_montage()：把颜色掩码拼成网格

```python
def make_mask_montage(
    masks: Dict[str, np.ndarray],
    config: HSVConfig,
    canvas_width: int = 640,
    canvas_height: int = 480,
) -> np.ndarray:
    """Build a labelled grid preview from the per-colour binary masks."""
    names = list(masks.keys())
    if not names:
        canvas = np.zeros((canvas_height, canvas_width, 3), dtype=np.uint8)
        cv2.putText(canvas, 'No colour masks', (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
        return canvas

    columns = 2 if len(names) > 1 else 1
    rows = int(math.ceil(len(names) / columns))
    tile_width = max(1, canvas_width // columns)
    tile_height = max(1, canvas_height // rows)
    canvas = np.zeros((tile_height * rows, tile_width * columns, 3),
                      dtype=np.uint8)

    for index, name in enumerate(names):
        mask = masks[name]
        if mask is None or mask.size == 0:
            mask = np.zeros((480, 640), dtype=np.uint8)
        color = bgr_for_color(name)
        color_layer = np.zeros((mask.shape[0], mask.shape[1], 3), dtype=np.uint8)
        color_layer[:] = color
        colored = cv2.bitwise_and(color_layer, color_layer, mask=mask)
        tile = cv2.resize(colored, (tile_width, tile_height),
                          interpolation=cv2.INTER_NEAREST)

        row = index // columns
        column = index % columns
        origin_x = column * tile_width
        origin_y = row * tile_height
        canvas[origin_y:origin_y + tile_height,
               origin_x:origin_x + tile_width] = tile
        cv2.rectangle(
            canvas, (origin_x + 1, origin_y + 1),
            (origin_x + tile_width - 2, origin_y + tile_height - 2),
            (80, 80, 80), 1)
        threshold = config.colors.get(name)
        detail = ''
        if threshold is not None:
            detail = f' H{threshold.lower[0]}-{threshold.upper[0]}'
        _put_label(
            canvas, f'{name.upper()} px={int(cv2.countNonZero(mask))}{detail}',
            (origin_x + 6, origin_y + 24), color, 0.42)
    return canvas
```

输入的掩码是单通道图，白色表示该颜色命中的像素。
这里先建立纯色图层，再通过 `bitwise_and(..., mask=mask)` 只保留命中区域。

拼图规则：

- 没有掩码：返回带 `No colour masks` 提示的黑色画布。
- 只有一种颜色：使用一列。
- 多种颜色：使用两列，行数向上取整；默认四色就是 2×2。
- 使用 `INTER_NEAREST` 缩放，保持二值掩码的清晰边界。

每格显示颜色、原始掩码非零像素数 `px` 和主 H 区间。
`px` 是像素计数，不等于检测器计算的轮廓面积；H 标签也没有单独列出红色的环绕区间。
画布宽高除不尽网格数时，最终尺寸会按每格的整数尺寸取整。

### 7. sharpen_frame()：增强显示锐度

```python
def sharpen_frame(frame: np.ndarray, amount: float) -> np.ndarray:
    """Apply a mild unsharp mask for the display/debug view only."""
    if amount <= 0.0:
        return frame
    blurred = cv2.GaussianBlur(frame, (0, 0), 1.2)
    return cv2.addWeighted(
        frame, 1.0 + amount, blurred, -amount, 0.0)
```

`amount <= 0` 时直接返回输入；否则先模糊，再计算：

```text
锐化结果 = 原图 × (1 + amount) - 模糊图 × amount
```

这是轻量反锐化掩模（USM）。后续服务端在完成检测后才调用它，
因此只影响显示/调试图像，不改变 HSV 检测结果。

> 自此，visualization.py 的可视化部分结束。

## 检测成果

在工作区根目录执行，生成标注图和掩码拼图，无需打开窗口：

```bash
cd "$WS"
PYTHONPATH="src/Mvc_sorting" python3 - <<'PY'
from pathlib import Path
import cv2
import numpy as np
from Mvc_sorting.color_detector import ColorDetector
from Mvc_sorting.hsv_config import HSVConfig
from Mvc_sorting.visualization import annotate_frame, make_mask_montage, sharpen_frame

frame = np.full((480, 640, 3), 35, dtype=np.uint8)
for x, bgr in zip((100, 250, 400, 550),
                  ((0, 0, 255), (0, 255, 0), (255, 0, 0), (0, 255, 255))):
    cv2.circle(frame, (x, 220), 30, bgr, cv2.FILLED)
original = frame.copy()
config = HSVConfig.default()
detections, masks = ColorDetector(config).detect(frame)
annotated = annotate_frame(sharpen_frame(frame, 0.35), detections, config,
                           fps=30.0, frame_index=1)
montage = make_mask_montage(masks, config)
output = Path('/tmp/color_sorting_visualization')
output.mkdir(exist_ok=True)
assert len(detections) == 4
assert np.array_equal(frame, original)
assert annotated.shape == montage.shape == (480, 640, 3)
assert not np.array_equal(annotated, frame)
assert cv2.imwrite(str(output / 'annotated.png'), annotated)
assert cv2.imwrite(str(output / 'masks.png'), montage)
print('targets:', len(detections))
print('shape:', annotated.shape, montage.shape)
print('saved:', output)
PY
```

预期输出 `targets: 4`，两张图片尺寸均为 `(480, 640, 3)`。
打开 `/tmp/color_sorting_visualization/` 中的图片，应看到四色目标的框、中心和标签，
以及对应的四格彩色掩码。原始输入图像保持不变。

---
