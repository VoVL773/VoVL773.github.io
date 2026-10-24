---
title: "接口包与消息定义"
course: "machine-vision"
order: 1
group: "基础与接口"
description: "创建 color_sorting_interfaces，定义视觉模块与 ROS 2 之间的消息接口。"
source_doc: "一.接口包(color_sorting_interfaces).md"
---

## 1. 创建接口包 与 msg文件

创建项目目录
```bash
ros2 pkg create color_sorting_interfaces --build-type ament_cmake --license Apache-2.0
```

删除无用目录 只留 **CMakeList.txt  package.xml  LICENSE**  这三个文件

新建 msg 目录: 写入接口说明

ColorTarget.msg
```msg
uint32 id     #色块编号
string color   #色块颜色
float32 x       #中心点x轴坐标
float32 y       #中心点Y轴坐标
float32 area    #色块面积 单位平方像素
```

ColorTargetArray.msg
```msg
std_msgs/Header header  #包含时间戳和坐标标识等信息
ColorTarget[] targets  # 色块列表
```

## 2. CMakeList & package 注册与声明

在CMakeList.txt 注册信息
```txt
find_package(rosidl_default_generators REQUIRED)
find_package(std_msgs REQUIRED)

rosidl_generate_interfaces(${PROJECT_NAME}
	"msg/ColorTarget.msg"
	"msg/ColorTargetArray.msg"
	DEPENDENCIES std_msgs
)
```


```
find_package(rosidl_default_generators REQUIRED)
```


| 代码                          | 含义                      |
| --------------------------- | ----------------------- |
| `find_package()`            | 在当前 ROS 2 环境中查找指定的软件包   |
| `rosidl_default_generators` | ROS 2 默认的接口生成工具包        |
| `REQUIRED`                  | 表示必须找到这个包；找不到就报错，不能继续配置 |

msg 文件里的内容只是消息的数据结构定义
借助接口生成工具，ROS 2 才能生成对应的消息类型，让 Python 或 C++ 节点使用它
```
find_package(std_msgs REQUIRED)
```

这里查找的是 ROS 2 的标准消息包 `std_msgs`。
它提供了一些常用消息类型，例如：
- `std_msgs/msg/String`
    
- `std_msgs/msg/Bool`
    
- `std_msgs/msg/Int32`

在 **ColorTargetArray.msg** 中我们定义了std_msgs/Header header  来接收标准ROS2消息类型进行时间戳等等的消息确认

```
rosidl_generate_interfaces(${PROJECT_NAME}
  "msg/ColorTarget.msg"
  "msg/ColorTargetArray.msg"
  DEPENDENCIES std_msgs
)
```

消息接口生成 负责根据你列出的 `.msg`、`.srv` 或 `.action` 等接口定义文件，配置并生成对应的接口代码  `${PROJECT_NAME}`表示当前项目名 会在colon build 后成为接口的ROS2软件包名

写明接口包的相对路径和依赖即可


在package.xml写明依赖
加入如下四行
```xml
<buildtool_depend>rosidl_default_generators</buildtool_depend> <depend>std_msgs</depend> 
<exec_depend>rosidl_default_runtime</exec_depend> <member_of_group>rosidl_interface_packages</member_of_group>
```

构建一下
```bash
colcon build
```


之后在python就可以直接导入了
```python
from color_sorting_interfaces.msg import ColorTarget
from color_sorting_interfaces.msg import ColorTargetArray
```

## 3.检验构建是否成功

```bash
ros2 interface show color_sorting_interfaces/msg/ColorTarget
```

显示`ColorTarget.msg` 的内容即可

---
