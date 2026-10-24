---
title: "包骨架与 HSV 配置"
course: "machine-vision"
order: 2
group: "基础与接口"
description: "创建 Python 包，用 HSVConfig 管理颜色阈值、参数校验与配置持久化。"
source_doc: "二.包骨架创建与 HSV 配置层.md"
---

> 先脱离ROS2 跑通基础的Opencv部分再与ROS2结合

```bash
ros2 pkg create --build-type ament_python Mvc_sorting \
  --dependencies rclpy std_msgs sensor_msgs std_srvs color_sorting_interfaces \
  --license Apache-2.0
```


| 依赖                         | 作用                | 本项目用在哪                                              |
| -------------------------- | ----------------- | --------------------------------------------------- |
| `rclpy`                    | ROS 2 Python 客户端库 | `Node`、发布/订阅、定时器、参数、`spin`                          |
| `std_msgs`                 | ROS 标准消息包         | `ColorTargetArray` 里的 `std_msgs/Header`             |
| `sensor_msgs`              | 传感器消息包            | `sensor_msgs/Image`：ROS 图像话题输入、调试图像发布               |
| `std_srvs`                 | 标准服务包             | `std_srvs/Trigger`：`save_config` / `load_config` 服务 |
| `color_sorting_interfaces` | 你自己的接口包           | `ColorTarget`、`ColorTargetArray`                    |

Python相关的依赖在package声明即可,  不用写到 --dependencies里
如果漏写了在package补上重新构建即可 

## 一. setup.py&package.xml初步注册
写最小对照版本 可对比判断是否少写依赖
`package.xml`
```xml
<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>Mvc_sorting</name>
  <version>0.1.0</version>
  <description>HSV colour blob detection and ROS 2 colour target publisher</description>
  <maintainer email="3152398081@qq.com">vovl773</maintainer>
  <license>Apache-2.0</license>

  <depend>rclpy</depend>
  <depend>std_msgs</depend>
  <depend>color_sorting_interfaces</depend>

  <test_depend>ament_copyright</test_depend>
  <test_depend>ament_flake8</test_depend>
  <test_depend>ament_pep257</test_depend>
  <test_depend>python3-pytest</test_depend>

  <export>
    <build_type>ament_python</build_type>
  </export>
</package>
```

setup.py
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
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='vovl773',
    maintainer_email='3152398081@qq.com',
    description='HSV colour blob detection and ROS 2 colour target publisher',
    license='Apache-2.0',
    extras_require={'test': ['pytest']},
    entry_points={
        'console_scripts': [
        ],
    },
)

```
## 二.逐步讲解hsv_config.py(HSV配置层)

### 1.导入模块

```python
from __future__ import annotations

from dataclasses import dataclass, field
import json
import os
from typing import Any, Dict, List, Sequence, Tuple
```

逐行解释：


| 代码                                   | 作用                        |
| ------------------------------------ | ------------------------- |
| `from __future__ import annotations` | 延迟处理类型注解，便于引用类名等类型        |
| `dataclass`                          | 自动生成类的初始化方法等常用方法          |
| `field`                              | 为数据类的字段设置特殊默认值，例如动态生成默认字典 |
| `json`                               | 读取和写入 JSON 文件             |
| `os`                                 | 处理文件路径、创建目录、替换文件          |
| `Any`                                | 表示任意类型                    |
| `Dict`                               | 字典类型注解                    |
| `List`                               | 列表类型注解                    |
| `Sequence`                           | 表示列表、元组等有序序列              |
| `Tuple`                              | 元组类型注解                    |


##### 1. 为什么需要 `field`？

先看一个普通的 `dataclass`：

```python
from dataclasses import dataclass
@dataclass
class HSVConfig:    
	min_area: int = 300    
	colors: dict = None
```

这里有两个属性：

- `min_area`：默认值是 `300`，没有问题。
    
- `colors`：默认值是 `None`，但每次创建对象后，如果希望它自动得到一个新的空字典，就需要额外处理。
    

这时候就可以使用 `field`。

##### 2. 最常见的用途：`default_factory`

```python
from dataclasses import dataclass, field
@dataclass
class HSVConfig:    
	min_area: int = 300    
	colors: dict = field(default_factory=dict)
```

重点看这一行：

```python
colors: dict = field(default_factory=dict)
```

`default_factory=dict` 的意思是：每次创建对象时，都调用 `dict()`，生成一个新的空字典作为默认值。
- `field()`：对某一个属性进行额外配置。
- `default_factory=dict`：每创建一个对象，就生成一个新的字典。
- `default_factory=list`：每创建一个对象，就生成一个新的列表。
```python
"""错误情况"""
shared_colors = {}

class HSVConfig:
    def __init__(self):
        self.colors = shared_colors

config1 = HSVConfig()
config2 = HSVConfig()

config1.colors["red"] = (0, 255, 255)

print(config1.colors)  # {'red': (0, 255, 255)}
print(config2.colors)  # {'red': (0, 255, 255)}
```

而每创建一个对象，就生成一个新的字典 可以让config1与config2互不干扰

#### 解释 dataclass:
普通 Python 类通常需要手动编写 `__init__()`：

```python
class Example:    
	def __init__(self, name):        
		self.name = name
```

使用 `@dataclass` 后，可以简化为：

```python
from dataclasses import dataclass

@dataclass
class Example:    
	name: str
```

### 2. 颜色顺序与默认阈值
```python
COLOR_ORDER = ('red', 'green', 'blue', 'yellow') #记录四种颜色的处理顺序
DEFAULT_COLORS: Dict[str, Dict[str, Any]] = {  # 字典定义四种颜色的检测配置
    'red': {
        'enabled': True, #是否启用检测
        'wrap_hue': True, # 色相是否需要跨越HSV色相环的边界
        'lower': [0, 120, 70], #HSV 三个通道的下限
        'upper': [10, 255, 255], #HSV 三个通道的上限
    },
    'green': {
        'enabled': True,
        'wrap_hue': False,
        'lower': [40, 80, 50],
        'upper': [85, 255, 255],
    },
    'blue': {
        'enabled': True,
        'wrap_hue': False,
        'lower': [100, 120, 70],
        'upper': [140, 255, 255],
    },
    'yellow': {
        'enabled': True,
        'wrap_hue': False,
        'lower': [15, 80, 80],
        'upper': [38, 255, 255],
    },
}
```

例如： 红色像素：【 0 ≤ H ≤ 10  ，120 ≤ S ≤ 255  ，70 ≤ V ≤ 255 】 色相  饱和度 亮度
这里的“色相是否需要跨越 HSV 色相环的边界处理”，指的是：当检测某种颜色（尤其是红色）时，是否需要同时检查 H 通道两端的数值范围。
红色比较特殊：它位于色相环的连接处附近。
- 一部分红色的 H 值接近 `0`。( 0 - 10)
- 另一部分红色的 H 值接近 `179`。(170 - 179)
希望同时检测两端的红色，可以使用两个区间

### 3. 过滤与形态学参数 
```python
DEFAULT_FILTER: Dict[str, Any] = {
	'min_area': 300,
	'max_area': 0,
	'min_dimension': 8,
	'min_fill_ratio': 0.20,
}
DEFAULT_MORPHOLOGY: Dict[str,Any] = {
	'kernel': 5,
	'iterations': 1,
	'blur_kernel': 3,
}
```


 这些参数不负责定义颜色，而是帮助后续检测算法筛除噪声、处理掩膜。


|参数|含义|
|---|---|
|`min_area = 300`|最小目标面积，小于该值的候选目标可被过滤|
|`max_area = 0`|按此文件的规则，`0` 表示不设置最大面积限制|
|`min_dimension = 8`|候选目标的最小尺寸阈值|
|`min_fill_ratio = 0.20`|候选区域的最小填充比例|
|`kernel = 5`|形态学处理的核尺寸参数|
|`iterations = 1`|形态学操作的迭代次数|
|`blur_kernel = 3`|模糊处理的核尺寸参数|


### 附：增大黄色阈值(黄色检测效果较差已更改这里保存第一版的阈值方便回退)

```python
DEFAULT_CONFIG_VERSION = 2  #版本号

# Yellow defaults before config version 2.  A saved configuration that still
# uses these exact values is migrated so that golden/orange-yellow objects are
# detected after upgrading.
LEGACY_YELLOW_LOWER = [20, 100, 100]  
LEGACY_YELLOW_UPPER = [35, 255, 255]
```
### 4. 参数校验函数：(辅助函数)

```python
def _as_int(value: Any, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, (int, float)): #只需要整数和浮点数 
        raise ValueError(f'{field_name} must be an integer, got {value!r}')

    number = int(value) #转为整数

    if number != value:
        raise ValueError(f'{field_name} must be an integer, got {value!r}')
		# 排除浮点数只留整数
    return number
```
注： 布尔值是整数类型的子类。如果不排除，`True` 就可能被误认为合法的整数参数。

```python
def _as_float(value: Any, field_name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(...)
    return float(value)
```

```python
def _as_bool(value: Any, field_name: str) -> bool:
    if isinstance(value, bool):
        return value

    if isinstance(value, int) and value in (0, 1):
        return bool(value)

    if isinstance(value, str) and value.lower() in ('true', 'false'):
        return value.lower() == 'true'

    raise ValueError(...)
```


#### `_as_triplet()`：验证 HSV 三元组

```python
def _as_triplet(values: Any, limits: Sequence[int], field_name: str) -> Tuple[int, int, int]:
    """Validate a three-element HSV triplet and clamp it to its limits."""
    #判断数据类型是否正确
    if not isinstance(values, Sequence) or isinstance(values, (str, bytes)):
        raise ValueError(f'{field_name} must be a list of three integers')
    if len(values) != 3:
        raise ValueError(f'{field_name} must contain exactly three values')
    #验证是否越界    
    result = []
    for index, (value, limit) in enumerate(zip(values, limits)):
        number = _as_int(value, f'{field_name}[{index}]')
        if number < 0 or number > limit:
            raise ValueError(f'{field_name}[{index}] must be in [0, {limit}]')
        result.append(number)
    return (result[0], result[1], result[2])
```

这个函数接收三个参数：

- `values`：待检查的 HSV 数值。
    
- `limits`：每个通道允许的最大值。
    
- `field_name`：出错时显示的字段名称。
    
例如：

```python
_as_triplet([0, 120, 70], (179, 255, 255), 'lower')
```

期望得到：

```python
(0, 120, 70)
```

```python
for index, (value, limit) in enumerate(zip(values, limits)):
```
- `zip(values, limits)`：把每个输入值和对应上限配对。
- `enumerate(...)`：同时获取元素的索引。
- `index`：当前通道的下标，依次为 `0、1、2`。
- `value`：当前通道的值。
- `limit`：该通道允许的最大值。
例如：对于  `values = [0, 120, 70] `limits = (179, 255, 255)  循环会依次检查 `(0, 179)`、`(120, 255)`、`(70, 255)`。 判断是否越界
```python
return (result[0], result[1], result[2])
```


### 5. ColorThreshold类 (用来保存和管理该颜色的 HSV 阈值)
```python
@dataclass
class ColorThreshold:
    """HSV threshold for one colour class."""
    enabled: bool = True
    wrap_hue: bool = False
    lower: Tuple[int, int, int] = (0, 0, 0)
    upper: Tuple[int, int, int] = (179, 255, 255)

    def __post_init__(self) -> None:
        """Validate and normalise the threshold values."""
        self.enabled = _as_bool(self.enabled, 'enabled')
        self.wrap_hue = _as_bool(self.wrap_hue, 'wrap_hue')
        self.lower = _as_triplet(self.lower, (179, 255, 255), 'lower')
        self.upper = _as_triplet(self.upper, (179, 255, 255), 'upper')
        if self.lower[0] > self.upper[0]:
            raise ValueError(
                f'hue lower bound {self.lower[0]} is greater than upper bound {self.upper[0]}')
        for channel, name in enumerate(('saturation', 'value')):
            if self.lower[channel + 1] > self.upper[channel + 1]:
                raise ValueError(
                    f'{name} lower bound {self.lower[channel + 1]} is greater than '
                    f'upper bound {self.upper[channel + 1]}')
```

这个类分两个部分 
#### 1. 使用dataclass的初始化
```python
@dataclass
```

```python
enabled: bool = True
wrap_hue: bool = False
lower: Tuple[int, int, int] = (0, 0, 0)
upper: Tuple[int, int, int] = (179, 255, 255)
```
dataclass是很常用装饰器 可以省去许多重复代码
对比不使用的写法
```python
def __init__(self,enabled:bool,
wrap_hue:bool,
lower:Tuple[int,int,int],
upper:Tuple[int,int,int]):
		self.enabled = True
		self.bool = False
        self.lower = (0,0,0)
        self.upper = (179,255,255)
```
对比而言 dataclass 的写法就简洁许多了
#### 2. __post_init__(self) 创建对象后自动校验是否合法
```python
def __post_init__(self) -> None:
        """Validate and normalise the threshold values."""
        # 类型判断
        self.enabled = _as_bool(self.enabled, 'enabled')
        self.wrap_hue = _as_bool(self.wrap_hue, 'wrap_hue')
        self.lower = _as_triplet(self.lower, (179, 255, 255), 'lower')
        self.upper = _as_triplet(self.upper, (179, 255, 255), 'upper')
        
        if self.lower[0] > self.upper[0]:  # 校验色相H
            raise ValueError(
                f'hue lower bound {self.lower[0]} is greater than upper bound {self.upper[0]}')
        for channel, name in enumerate(('saturation', 'value')): 
            if self.lower[channel + 1] > self.upper[channel + 1]:
                raise ValueError(
                    f'{name} lower bound {self.lower[channel + 1]} is greater than '
                    f'upper bound {self.upper[channel + 1]}')
```

这段代码要求：
- H 下限不能大于 H 上限。
- S 下限不能大于 S 上限。
- V 下限不能大于 V 上限。
如果传入不合法的阈值，就立即报错，而不是等到识别效果异常时才发现问题。

### 6. @classmethod & from_dict() & to_dict()函数
>`@classmethod` 用来定义类方法。类方法接收的第一个参数是 `cls`，代表类本身，而不是某个具体对象

这里来说明Python的常见三种方法:
#### 1. 实例方法：`self`

```python
def show(self):
    print(self.enabled)
```

操作某个具体对象的数据，例如某一个红色阈值对象。
#### 2. 类方法：`cls`
```python
@classmethod
def create(cls):
    return cls()
```

操作类本身，或者根据不同数据创建该类的对象。
#### 3. 静态方法：没有自动传入的 `self` 或 `cls`

```python
@staticmethod
def add(a, b):
    return a + b
```

把相关功能放在类里面，但不需要自动访问对象或类。


| 方法类型 | 第一个参数  | 主要用途     |
| ---- | ------ | -------- |
| 实例方法 | `self` | 操作具体对象   |
| 类方法  | `cls`  | 操作类、创建对象 |
| 静态方法 | 无特殊参数  | 组织相关工具功能 |



对于from_dict()
如果创建ColorThreshold的数据来自 JSON 字典 需要从字典中读取数据，再把它转换成对象。每次手动转换会比较麻烦。
而 类方法的典型用途：把外部数据转换为类的对象 所以这里使用类方法 from_dict 读取字典数据创建类 与后面的 to_dict结合实现配置信息的保存与读取 

```python
@classmethod
    def from_dict(cls, data: Any, name: str = 'color') -> 'ColorThreshold':
        """Build a threshold from a JSON-like dictionary."""
        if not isinstance(data, dict):
            raise ValueError(f'color {name!r} must be an object') #检查传入的是否为字典
        threshold = cls(
            enabled=_as_bool(data.get('enabled', True), f'{name}.enabled'),
            wrap_hue=_as_bool(data.get('wrap_hue', False), f'{name}.wrap_hue'),
            lower=_as_triplet(data.get('lower', [0, 0, 0]), (179, 255, 255),
                              f'{name}.lower'),
            upper=_as_triplet(data.get('upper', [179, 255, 255]), (179, 255, 255), f'{name}.upper'),
        )
        return threshold  #返回创建好的对象
```

python自动传入   
cls ：ColorThreshold 会调用自动生成的初始化方法，并执行类中定义的 `__post_init__()` 参数验证逻辑。
data : ‘提供的字典’ 
name : 类对象名

例如：

```python
name = "hello\nworld"
print(f"{name}")
print(f"{name!r}")
```

输出效果：

```bash
hello
world
'hello\nworld'
```

第二种写法把换行符显示成了 `\n`，因此更容易排查字符串中的特殊字符

 `!r`、`!s`、`!a` 有什么区别？


| 写法         | 实际转换          | 用途              |
| ---------- | ------------- | --------------- |
| `{name}`   | 默认格式化         | 一般输出            |
| `{name!s}` | `str(name)`   | 面向用户的可读文本       |
| `{name!r}` | `repr(name)`  | 调试、检查对象         |
| `{name!a}` | `ascii(name)` | 将非 ASCII 字符转义显示 |


```python
def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-serialisable representation."""
        return {
            'enabled': self.enabled,
            'wrap_hue': self.wrap_hue,
            'lower': list(self.lower),  # 元组转列表
            'upper': list(self.upper),
        }
```


### 7.  mask_ranges(self) : 处理红色色相环绕

```python
def mask_ranges(self) -> List[Tuple[Tuple[int, int, int], Tuple[int, int, int]]]:
        """
        Return the inRange intervals for this colour.
        When ``wrap_hue`` is enabled, a second interval is added around hue 180
        so that red colours on both sides of the OpenCV hue wrap are captured.
        """
        ranges = [(self.lower, self.upper)]
        if self.wrap_hue:  # 开启了wrap_hue 计算第二个区间
            wrap_low = max(0, 180 - self.upper[0])  #计算第二个区间的上下限
            wrap_high = 179
            if wrap_low <= wrap_high:
                ranges.append(
                    ((wrap_low, self.lower[1], self.lower[2]),
                     (wrap_high, self.upper[1], self.upper[2])))
        return ranges
```
返回多个 HSV 区间，供后续代码用于 `cv2.inRange()`

### 8. HSVConfig 类 (整个颜色系统的配置中心)
![类方法]({{ '/assets/images/tutorials/machine-vision/HSVConfig类.png' | relative_url }})
#### 初始化
```python
@dataclass
class HSVConfig:
    """Full detector configuration: per-colour thresholds and filters."""

    colors: Dict[str, ColorThreshold] = field(
        default_factory=lambda: {
            name: ColorThreshold.from_dict(data, name)
            for name, data in DEFAULT_COLORS.items()
        })  #颜色字典 管理所有颜色
    min_area: int = 300
    max_area: int = 0
    min_dimension: int = 8
    min_fill_ratio: float = 0.20
    morph_kernel: int = 5
    morph_iterations: int = 1
    blur_kernel: int = 3

    def __post_init__(self) -> None:
        """Validate the configuration after construction."""
        self.validate()  # 验证函数
```

颜色属性声明如下
```python
colors = {
    "red": red_threshold,
    "yellow": yellow_threshold,
    "blue": blue_threshold,
}
```

```python
default_factory=lambda: {
            name: ColorThreshold.from_dict(data, name)
            for name, data in DEFAULT_COLORS.items()
        }
```
这个lambda表达式是当创建 `HSVConfig` 对象时，通过指定的函数生成默认值。 `default_factory` 可以为每个实例生成独立的字典。
遍历颜色字典的每一项然后 生成 "red" : {"enable: True" ..... } , 这样的键值对到字典里 之后调用之前的from_dict函数创建ColorThreshold对象 作为Color属性的值来保存

其他属性如下:


| 字段                 | 默认值    | 作用                 |
| ------------------ | ------ | ------------------ |
| `min_area`         | `300`  | 目标轮廓最小面积           |
| `max_area`         | `0`    | 最大面积；`0` 表示不限制最大面积 |
| `min_dimension`    | `8`    | 目标宽度或高度的最小过滤尺寸     |
| `min_fill_ratio`   | `0.20` | 目标填充率下限            |
| `morph_kernel`     | `5`    | 形态学处理的核尺寸          |
| `morph_iterations` | `1`    | 形态学操作重复次数          |
| `blur_kernel`      | `3`    | 模糊处理的核尺寸           |


#### 检测配置是否合法
![vaildate]({{ '/assets/images/tutorials/machine-vision/HSVConfig.vaildate.png' | relative_url }})
```python
    def validate(self) -> None:  # 检验配置是否合法
        """Validate all fields and raise ValueError when invalid."""
        # 检测字典类型 与 字典数据类型是否合法
        if not isinstance(self.colors, dict) or not self.colors:
            raise ValueError('colors must be a non-empty object')
        if not all(isinstance(name, str) and name for name in self.colors):
            raise ValueError('colour names must be non-empty strings')
        # 检测每个颜色对象
        for name, threshold in self.colors.items():
            if not isinstance(threshold, ColorThreshold):
                raise ValueError(f'color {name!r} is not a ColorThreshold')
            checked = ColorThreshold(
                enabled=threshold.enabled,
                wrap_hue=threshold.wrap_hue,
                lower=threshold.lower,
                upper=threshold.upper,
            ) # 再次创建对象利用自身的检测函数检测数值是否合法并再次赋值会原对象
            threshold.enabled = checked.enabled
            threshold.wrap_hue = checked.wrap_hue
            threshold.lower = checked.lower
            threshold.upper = checked.upper

        self.min_area = _as_int(self.min_area, 'filter.min_area')
        self.max_area = _as_int(self.max_area, 'filter.max_area')
        self.min_dimension = _as_int(self.min_dimension, 'filter.min_dimension')
        self.min_fill_ratio = _as_float(self.min_fill_ratio, 'filter.min_fill_ratio')
        self.morph_kernel = _as_int(self.morph_kernel, 'morphology.kernel')
        self.morph_iterations = _as_int(self.morph_iterations, 'morphology.iterations')
        self.blur_kernel = _as_int(self.blur_kernel, 'morphology.blur_kernel')
# 对每个参数的范围进行检测并弹出对应报错
        if self.min_area < 0:
            raise ValueError('filter.min_area must be >= 0')
        if self.max_area < 0:
            raise ValueError('filter.max_area must be >= 0')
        if self.max_area and self.max_area < self.min_area:
            raise ValueError('filter.max_area must be 0 or >= filter.min_area')
        if self.min_dimension < 0:
            raise ValueError('filter.min_dimension must be >= 0')
        if not 0.0 <= self.min_fill_ratio <= 1.0:
            raise ValueError('filter.min_fill_ratio must be in [0.0, 1.0]')
        if not 0 <= self.morph_kernel <= 31:
            raise ValueError('morphology.kernel must be in [0, 31]')
        if self.morph_iterations < 0:
            raise ValueError('morphology.iterations must be >= 0')
        if not 0 <= self.blur_kernel <= 31:
            raise ValueError('morphology.blur_kernel must be in [0, 31]')
```

这段代码就是检测是否合法规定了：
- `max_area = 0`：不限制最大面积。
- `max_area = 5000` 且 `min_area = 300`：合法。
- `max_area = 200` 且 `min_area = 300`：非法。
- `morph_kernel`： 形态学处理的核尺寸 必须在 `0` 到 `31` 之间。
- `morph_iterations`：形态学操作重复次数 必须大于等于 `0`。
- `blur_kernel`：模糊处理的核尺寸  必须在 `0` 到 `31` 之间。


#### 获取默认配置 &读取和创建字典->获取保存配置

![流程图]({{ '/assets/images/tutorials/machine-vision/HSVConfigdict类方法.png' | relative_url }})
```python
    @classmethod
    def default(cls) -> 'HSVConfig':
        """Return the built-in default configuration."""
        return cls()
    @classmethod
    def from_dict(cls, data: Any) -> 'HSVConfig':
        """Build a configuration from a JSON-like dictionary."""
        if not isinstance(data, dict):
            raise ValueError('configuration root must be an object')

        colors_data = data.get('colors', {})
        if not isinstance(colors_data, dict):
            raise ValueError('colors must be an object')

        version = _as_int(data.get('version', 1), 'version')
        if version < DEFAULT_CONFIG_VERSION:
            legacy_yellow = colors_data.get('yellow')
            if (isinstance(legacy_yellow, dict)
                    and legacy_yellow.get('lower') == LEGACY_YELLOW_LOWER
                    and legacy_yellow.get('upper') == LEGACY_YELLOW_UPPER):
                colors_data = dict(colors_data)
                migrated = {
                    key: value for key, value in legacy_yellow.items()
                    if key not in ('lower', 'upper')}
                colors_data['yellow'] = {
                    **DEFAULT_COLORS['yellow'], **migrated}

        colors: Dict[str, ColorThreshold] = {}
        for name in COLOR_ORDER:
            raw = colors_data.get(name, DEFAULT_COLORS[name])
            if isinstance(raw, dict):
                raw = {**DEFAULT_COLORS[name], **raw}
            colors[name] = ColorThreshold.from_dict(raw, name)
        for name, raw in colors_data.items():
            if name not in colors:
                colors[name] = ColorThreshold.from_dict(raw, name)

        filter_data = data.get('filter', {})
        morphology_data = data.get('morphology', {})
        if not isinstance(filter_data, dict):
            raise ValueError('filter must be an object')
        if not isinstance(morphology_data, dict):
            raise ValueError('morphology must be an object')

        config = cls(
            colors=colors,
            min_area=filter_data.get('min_area', DEFAULT_FILTER['min_area']),
            max_area=filter_data.get('max_area', DEFAULT_FILTER['max_area']),
            min_dimension=filter_data.get(
                'min_dimension', DEFAULT_FILTER['min_dimension']),
            min_fill_ratio=filter_data.get(
                'min_fill_ratio', DEFAULT_FILTER['min_fill_ratio']),
            morph_kernel=morphology_data.get(
                'kernel', DEFAULT_MORPHOLOGY['kernel']),
            morph_iterations=morphology_data.get(
                'iterations', DEFAULT_MORPHOLOGY['iterations']),
            blur_kernel=morphology_data.get(
                'blur_kernel', DEFAULT_MORPHOLOGY['blur_kernel']),
        )
        return config

    def to_dict(self) -> Dict[str, Any]:
        """Return a JSON-serialisable representation."""
        return {
            'version': DEFAULT_CONFIG_VERSION,
            'colors': {name: threshold.to_dict()
                       for name, threshold in self.colors.items()},
            'filter': {
                'min_area': self.min_area,
                'max_area': self.max_area,
                'min_dimension': self.min_dimension,
                'min_fill_ratio': self.min_fill_ratio,
            },
            'morphology': {
                'kernel': self.morph_kernel,
                'iterations': self.morph_iterations,
                'blur_kernel': self.blur_kernel,
            },
        }
```

解释： 因为存在V1 黄色阈值未提升版 和 V2 黄色阈值增加版 所以对不同版本号做了不同处理V1版本的配置文件写成字典时黄色阈值保持较低阈值
### 加载和保存JSON格式
```python
    @classmethod
    def load(cls, path: str) -> 'HSVConfig':
        """Load and validate a configuration from ``path``."""
        expanded = os.path.expanduser(path)
        with open(expanded, 'r', encoding='utf-8') as stream:
            try:
                data = json.load(stream)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    f'invalid JSON in {expanded}: {exc.msg} at line {exc.lineno}') from exc
        try:
            return cls.from_dict(data) # 从JSON读取使用from_dict生成配置类
        except ValueError as exc:
            raise ValueError(f'invalid HSV configuration {expanded}: {exc}') from exc

    def save(self, path: str) -> str:
        """Validate and atomically write the configuration to ``path``."""
        expanded = os.path.abspath(os.path.expanduser(path))
        self.validate()
        parent = os.path.dirname(expanded)
        if parent:
            os.makedirs(parent, exist_ok=True)
        temporary = f'{expanded}.tmp'
        with open(temporary, 'w', encoding='utf-8') as stream:
            json.dump(self.to_dict(), stream, indent=2, ensure_ascii=False)
            stream.write('\n')
        os.replace(temporary, expanded)
        return expanded
```


这里就是简单的将 类的信息保存成JSON格式 之后加载时用 load的from_dict 创建配置对象

> 自此 包骨架和hsv_config.py 的部分结束

## 检测成果:

如果直接写python文件运行先`colon build && source install/setup.bash`  之后 
`python3 src/Mvc_sorting/Mvc_sorting/text.py`

```bash

cd "$WS"

PYTHONPATH="src/Mvc_sorting" python3 - <<'PY'

from Mvc_sorting.hsv_config import HSVConfig

c = HSVConfig.default()

print('version:', c.to_dict()['version'])

print('yellow:', c.colors['yellow'].lower, c.colors['yellow'].upper)

print('red ranges:', c.colors['red'].mask_ranges())

PY

```
这里就是让其他python文件引用HSVConfig检测配置是否生成成功

预期：
```text

version: 2

yellow: (15, 80, 80) (38, 255, 255)

red ranges: [((0, 120, 70), (10, 255, 255)), ((170, 120, 70), (179, 255, 255))]

```
可以看到成功读取到了配置里的信息 且 红色的双区间也生效了

---
