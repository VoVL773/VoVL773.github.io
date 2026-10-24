---
title: "交互调参与控制面板"
course: "machine-vision"
order: 5
group: "纯 Python 视觉模块"
description: "通过 OpenCV 滑块实时修改 HSV 参数，与检测器共享配置。"
source_doc: "五.中文调参面板：gui.py.md"
---

> 上一章负责画面显示，这一章通过 OpenCV 滑块修改 HSVConfig。
> 面板与检测器共享配置对象，实现拖动滑块后使用新阈值检测。

## 一. 创建 gui.py

在 `src/Mvc_sorting/Mvc_sorting/` 下创建 `gui.py`，继续使用 OpenCV 依赖。
GUI 验收需要可用的桌面显示环境；无显示环境可以先阅读代码，继续下一章的合成场景。

窗口名使用 `HSV Controls` 这类 ASCII 名称。中文滑块文字的显示取决于 OpenCV 图形后端和字体，
窗口名与滑块文字的支持情况也可能不同。

## 二. 逐步讲解 gui.py（中文调参面板）

### 1. 导入模块

```python
from __future__ import annotations

from typing import Callable, Dict

import cv2

from .hsv_config import HSVConfig
```


| 代码 | 作用 |
| --- | --- |
| `Callable` | 声明配置改变后要调用的函数类型 |
| `Dict` | 保存滑块名称与位置的对应关系 |
| `cv2` | 创建窗口和滑块，读取与设置滑块位置 |
| `HSVConfig` | 保存面板正在编辑的配置 |


### 2. 滑块名称和帮助文字

```python
COLOR_TRACKBAR = '颜色(0红1绿2蓝3黄)'
ENABLED_TRACKBAR = '启用(1开)'
WRAP_TRACKBAR = '红色环绕(1开)'
H_MIN_TRACKBAR = '色相最小'
H_MAX_TRACKBAR = '色相最大'
S_MIN_TRACKBAR = '饱和度最小'
S_MAX_TRACKBAR = '饱和度最大'
V_MIN_TRACKBAR = '亮度最小'
V_MAX_TRACKBAR = '亮度最大'
AREA_TRACKBAR = '最小面积/100'
MORPH_TRACKBAR = '形态学核(0关)'

TRACKBAR_HELP = (
    '滑块说明：颜色 0红/1绿/2蓝/3黄；启用 1开0关；红色环绕用于红色；'
    '最小面积 = 滑块值 x 100 平方像素；形态学核 0或1表示关闭。'
    '快捷键：s保存 l加载 r恢复默认 m掩码 h帮助 q退出。'
)
```

把滑块名称写成常量，后面创建、读取和设置时统一引用，避免文字不一致导致找不到滑块。


| 滑块 | 范围 | 含义 |
| --- | --- | --- |
| 颜色 | 默认 0–3 | 默认顺序为红、绿、蓝、黄；实际由配置字典顺序决定 |
| 启用 / 红色环绕 | 0–1 | 当前颜色是否参与检测、是否增加 H 环绕区间 |
| H 下限 / 上限 | 0–179 | 当前颜色的色相范围 |
| S、V 下限 / 上限 | 0–255 | 饱和度、亮度范围 |
| 最小面积/100 | 0–1000 | 实际面积阈值为滑块值 × 100，作用于所有颜色 |
| 形态学核 | 0–31 | 作用于所有颜色；检测器把 0/1 视为关闭，偶数调整为奇数 |


虽然标注为“红色环绕”，代码会把开关写入当前选中颜色的 `wrap_hue`。
通常只对红色开启。
`TRACKBAR_HELP` 只是说明文字，保存、加载等快捷键由后续服务端处理，面板本身不实现文件读写。

### 3. HSVTrackbarPanel 类（管理滑块和配置同步）

下面的方法片段都放在同一个类中，保留类内缩进。

#### 初始化

```python
class HSVTrackbarPanel:
    """Create and synchronise HSV threshold Trackbars on an OpenCV window."""
    def __init__(
        self,
        window_name: str,
        config: HSVConfig,
        on_change: Callable[[], None] | None = None,
    ) -> None:
        """Attach the panel to ``window_name`` and show the current config."""
        self.window_name = window_name
        self._config = config
        self._on_change = on_change
        self._color_names = list(config.colors)
        self._guard = False
        self._current_color_index = 0

        self._guard = True
        try:
            cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)
            self._create_trackbars()
            self.sync_from_config()
        finally:
            self._guard = False
```


| 属性 | 作用 |
| --- | --- |
| `window_name` | 控件所在的窗口名 |
| `_config` | 正在编辑的配置对象 |
| `_on_change` | 可选回调，配置变化时通知调用者 |
| `_color_names` | 配置中的颜色顺序 |
| `_current_color_index` | 当前选中颜色的下标 |
| `_guard` | 阻止程序同步控件时重复进入回调 |


`Callable[[], None]` 表示不接收参数、没有返回值的函数；`None` 表示不需要通知。
创建滑块时也可能触发回调，所以初始化期间先打开 `_guard`，结束后在 `finally` 中恢复。

### 4. current_color_name：读取当前颜色

```python
    @property
    def current_color_name(self) -> str:
        """Return the colour currently selected in the Trackbar panel."""
        if not self._color_names:
            return ''
        index = min(max(self._current_color_index, 0), len(self._color_names) - 1)
        return self._color_names[index]
```

`@property` 把方法变成只读属性，使用时写 `panel.current_color_name`，不加括号。
没有颜色时返回空字符串；否则先限制下标范围，再返回对应颜色名。

### 5. _create_trackbars()：创建所有滑块

```python
    def _create_trackbars(self) -> None:
        """Create every Trackbar with its range and default position."""
        cv2.createTrackbar(
            COLOR_TRACKBAR, self.window_name, 0,
            max(0, len(self._color_names) - 1), self._on_trackbar)
        cv2.createTrackbar(
            ENABLED_TRACKBAR, self.window_name, 1, 1, self._on_trackbar)
        cv2.createTrackbar(
            WRAP_TRACKBAR, self.window_name, 0, 1, self._on_trackbar)
        cv2.createTrackbar(H_MIN_TRACKBAR, self.window_name, 0, 179, self._on_trackbar)
        cv2.createTrackbar(H_MAX_TRACKBAR, self.window_name, 10, 179, self._on_trackbar)
        cv2.createTrackbar(S_MIN_TRACKBAR, self.window_name, 0, 255, self._on_trackbar)
        cv2.createTrackbar(S_MAX_TRACKBAR, self.window_name, 255, 255, self._on_trackbar)
        cv2.createTrackbar(V_MIN_TRACKBAR, self.window_name, 0, 255, self._on_trackbar)
        cv2.createTrackbar(V_MAX_TRACKBAR, self.window_name, 255, 255, self._on_trackbar)
        cv2.createTrackbar(
            AREA_TRACKBAR, self.window_name, 3, 1000, self._on_trackbar)
        cv2.createTrackbar(
            MORPH_TRACKBAR, self.window_name, 5, 31, self._on_trackbar)
```

`cv2.createTrackbar(名称, 窗口名, 初始位置, 最大值, 回调)` 创建一条滑块。
所有滑块共用 `_on_trackbar` 回调，每次变化都重新读取整组参数。
创建时的初值只是占位，随后 `sync_from_config()` 会用当前配置覆盖。

### 6. sync_from_config()：配置 → 滑块

```python
    def sync_from_config(self, color_index: int | None = None) -> None:
        """Push the current configuration values into the Trackbars."""
        if not self._color_names:
            return
        if color_index is None:
            color_index = self._current_color_index
        color_index = min(max(color_index, 0), len(self._color_names) - 1)
        self._current_color_index = color_index
        threshold = self._config.colors[self._color_names[color_index]]

        previous_guard = self._guard
        self._guard = True
        try:
            cv2.setTrackbarPos(COLOR_TRACKBAR, self.window_name, color_index)
            cv2.setTrackbarPos(
                ENABLED_TRACKBAR, self.window_name, int(threshold.enabled))
            cv2.setTrackbarPos(
                WRAP_TRACKBAR, self.window_name, int(threshold.wrap_hue))
            positions: Dict[str, int] = {
                H_MIN_TRACKBAR: threshold.lower[0],
                H_MAX_TRACKBAR: threshold.upper[0],
                S_MIN_TRACKBAR: threshold.lower[1],
                S_MAX_TRACKBAR: threshold.upper[1],
                V_MIN_TRACKBAR: threshold.lower[2],
                V_MAX_TRACKBAR: threshold.upper[2],
                AREA_TRACKBAR: min(1000, max(0, self._config.min_area // 100)),
                MORPH_TRACKBAR: min(31, max(0, self._config.morph_kernel)),
            }
            for name, value in positions.items():
                cv2.setTrackbarPos(name, self.window_name, value)
        finally:
            self._guard = previous_guard
```

这个方法用于启动、切换颜色或加载配置后，把对象中的数值显示到滑块上。

1. 确定颜色下标并限制范围。
2. 读取该颜色的 `ColorThreshold`。
3. 临时把 `_guard` 设为 `True`，防止 `setTrackbarPos()` 触发的回调反过来修改配置。
4. 设置启用、环绕、H/S/V 和全局参数。
5. 在 `finally` 中恢复之前的 `_guard` 状态。

面积使用 `min_area // 100` 显示，只能精确表示 100 的整数倍。
例如 `min_area=450` 会显示为 `4`；同步本身不修改配置，但之后编辑滑块并写回时会按 `400` 保存。

### 7. set_config()：切换配置对象

```python
    def set_config(self, config: HSVConfig) -> None:
        """Switch the panel to a new configuration object."""
        self._config = config
        self._color_names = list(config.colors)
        cv2.setTrackbarMax(
            COLOR_TRACKBAR, self.window_name,
            max(0, len(self._color_names) - 1))
        self.sync_from_config(min(self._current_color_index,
                                  max(0, len(self._color_names) - 1)))
```

加载新的配置后，需要重新绑定 `_config`，更新颜色列表与颜色滑块最大值，
再显示当前颜色的参数。原下标超出新颜色列表时会被限制在有效范围内。

### 8. _on_trackbar()：滑块 → 配置

```python
    def _on_trackbar(self, _value: int = 0) -> None:
        """Read all controls and update the configuration."""
        if self._guard or not self._color_names:
            return

        index = int(cv2.getTrackbarPos(COLOR_TRACKBAR, self.window_name))
        index = min(max(index, 0), len(self._color_names) - 1)
        if index != self._current_color_index:
            self._current_color_index = index
            self.sync_from_config(index)
            self._notify()
            return

        threshold = self._config.colors[self._color_names[index]]
        lower = [
            int(cv2.getTrackbarPos(H_MIN_TRACKBAR, self.window_name)),
            int(cv2.getTrackbarPos(S_MIN_TRACKBAR, self.window_name)),
            int(cv2.getTrackbarPos(V_MIN_TRACKBAR, self.window_name)),
        ]
        upper = [
            int(cv2.getTrackbarPos(H_MAX_TRACKBAR, self.window_name)),
            int(cv2.getTrackbarPos(S_MAX_TRACKBAR, self.window_name)),
            int(cv2.getTrackbarPos(V_MAX_TRACKBAR, self.window_name)),
        ]
        for channel in range(3):
            if lower[channel] > upper[channel]:
                upper[channel] = lower[channel]

        threshold.enabled = bool(
            cv2.getTrackbarPos(ENABLED_TRACKBAR, self.window_name))
        threshold.wrap_hue = bool(
            cv2.getTrackbarPos(WRAP_TRACKBAR, self.window_name))
        threshold.lower = (lower[0], lower[1], lower[2])
        threshold.upper = (upper[0], upper[1], upper[2])
        self._config.min_area = int(
            cv2.getTrackbarPos(AREA_TRACKBAR, self.window_name)) * 100
        self._config.morph_kernel = int(
            cv2.getTrackbarPos(MORPH_TRACKBAR, self.window_name))
        try:
            self._config.validate()
        except ValueError:
            return
        self.sync_from_config(index)
        self._notify()
```

#### 切换颜色

先检查 `_guard` 和颜色列表。如果颜色选择发生变化，直接把新颜色的配置同步到控件，
通知调用者后返回，避免把上一个颜色的滑块数值写进新颜色。

#### 修改阈值

选中颜色不变时，读取 H/S/V 的上下限。
如果某个下限大于上限，就把上限提高到相同值，保证 `lower <= upper`。
例如 H 下限从 `10` 拖到 `20`、上限仍是 `15` 时，上限会一起变成 `20`。

然后写入启用开关、环绕开关和全局面积/形态学参数，调用 `validate()`。
校验成功后再同步控件并通知；失败时直接返回，当前实现没有额外的回滚逻辑。

### 9. _notify()：通知配置已改变

```python
    def _notify(self) -> None:
        """Invoke the optional change callback."""
        if self._on_change is not None:
            self._on_change()
```

调用者传入 `on_change` 时才执行通知。
检测器如果持有同一个 `HSVConfig` 对象，下次检测就会读取修改后的字段；
如果替换了整个配置对象，则还需要同步调用检测器的 `set_config()`。

> 自此，gui.py 的中文调参面板部分结束。

## 检测成果

下面的独立示例不依赖 ROS，拖动滑块后会打印当前颜色的配置。
先点击 OpenCV 窗口，再按 `q` 或 `Esc` 退出；示例没有实现保存/加载快捷键。

```bash
cd "$WS"
PYTHONPATH="src/Mvc_sorting" python3 - <<'PY'
import cv2
from Mvc_sorting.gui import HSVTrackbarPanel
from Mvc_sorting.hsv_config import HSVConfig
from Mvc_sorting.visualization import gui_is_available

if not gui_is_available():
    print('没有可用显示环境，跳过 GUI 验收。')
else:
    config = HSVConfig.default()
    def on_change():
        name = panel.current_color_name
        print(name, config.colors[name].to_dict(), 'min_area:', config.min_area)
    panel = HSVTrackbarPanel('HSV Controls', config, on_change=on_change)
    print('初始颜色:', panel.current_color_name)
    try:
        while True:
            key = cv2.waitKey(30) & 0xFF
            if key in (27, ord('q')):
                break
            if cv2.getWindowProperty('HSV Controls', cv2.WND_PROP_VISIBLE) < 1:
                break
    finally:
        cv2.destroyAllWindows()
PY
```

预期：初始颜色为 `red`；切换到 `3` 时显示黄色配置；
拖动下限超过上限时，上限自动跟随；面积滑块为 `5` 时，打印 `min_area: 500`。
无显示环境时仅输出跳过提示，不代表已通过桌面交互验收。

---
