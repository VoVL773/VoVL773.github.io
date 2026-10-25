---
title: "ROS2 实战：海龟案例与通信练习"
course: "ros2-basics"
order: 10
group: "ROS2实战"
description: "通过九个案例练习话题、服务、参数、Action 和数据录制。"
---

## 指令速查

```bash
## ── 包与构建 ──────────────────────────────
ros2 pkg create <包名> --build-type ament_python --dependencies rclpy --license Apache-2.0
colcon build --symlink-install      # 调试期推荐，改 Python 代码免重编译
source install/setup.bash           # 每个新终端都要执行

## ── 节点 ─────────────────────────────────
ros2 node list
ros2 node info /节点名
ros2 run <包名> <可执行名>
ros2 launch <包名> <xxx.launch.py>

## ── 话题 ─────────────────────────────────
ros2 topic list -t                  # -t 显示消息类型（用于反推 import）
ros2 topic info /话题名 --verbose    # --verbose 看 QoS，排查"收不到消息"
ros2 topic echo /话题名
ros2 topic hz /话题名               # 实际发布频率
ros2 topic pub /话题名 类型 "{...}"  # 默认 1Hz 持续发布，--once 只发一次

## ── 服务 ─────────────────────────────────
ros2 service list -t
ros2 service call /服务名 类型 "{...}"
ros2 interface show <包名>/srv/<名字>   # msg 则换成 msg

## ── 参数 ─────────────────────────────────
ros2 param list
ros2 param get /节点名 参数名
ros2 param set /节点名 参数名 值
ros2 param describe /节点名 参数名
ros2 param dump /节点名 > params.yaml
ros2 run <包名> <可执行名> --ros-args --params-file params.yaml
ros2 run <包名> <可执行名> --ros-args -p 参数名:=值    # 注意是 :=

## ── TF 坐标变换 ───────────────────────────
ros2 run tf2_ros static_transform_publisher --x 0.1 --z 0.2 \
  --frame-id base_link --child-frame-id base_laser   # 发布静态变换（注意 --）
ros2 run tf2_ros tf2_echo base_link base_laser       # 查询两坐标系关系
ros2 topic echo /tf_static                           # 静态变换原始消息
ros2 topic info /tf_static --verbose                 # 看 Durability: TRANSIENT_LOCAL
ros2 run tf2_tools view_frames                       # 生成坐标系树 PDF（落在当前目录）
ros2 run tf2_tools view_frames -o ~/tf图/frames       # 指定输出（不带扩展名）
dot -Tpng frames.gv -o frames.png                    # .gv 转其它格式

## ── 可视化 ───────────────────────────────
rviz2                               # 三维可视化（首次启动报 Fixed Frame 错是正常的）
rviz2 -d ~/tf_demo.rviz             # 加载指定的配置文件
rqt                                 # plugins → service → service call
rqt_graph                           # 看节点与话题的连接关系，排查通信问题神器

## ── 仿真 / URDF 模型 ──────────────────────
ros2 pkg create <包名> --build-type ament_cmake --license Apache-2.0   # 模型包用 cmake
xacro 模型.xacro > /tmp/model.urdf        # 先展开：URDF 工具不认 xacro
check_urdf /tmp/model.urdf                # 校验结构（失败常见于名字对不上/父子成环）
urdf_to_graphviz /tmp/model.urdf 输出名    # 生成 .gv + .pdf（输出名是位置参数）
ros2 launch <包名> display_robot.launch.py
ros2 launch <包名> display_robot.launch.py --show-args   # 只列参数，不启动
ros2 topic echo /robot_description --once                # 确认模型参数发出来了
sudo apt install ros-$ROS_DISTRO-joint-state-publisher-gui  # 滑块手调关节

## ── Gazebo Harmonic 仿真（Jazzy）──────────
sudo apt install ros-$ROS_DISTRO-ros-gz      # 仿真器 + ROS 桥（gz sim 就在里面）
source /opt/ros/jazzy/setup.bash             # ★ 必须，否则 gz 里没有 sim 子命令
gz sim --version && gz --commands            # 自检
gz sim -r 你的世界.sdf                        # 启动（-s 只起服务端，不开界面）
gz topic -l                                  # ① 先看 gz 侧有没有数据
gz topic -e -t /clock -n 1                   # 仿真时间在不在走
ros2 run ros_gz_sim create -world default -file 模型.urdf -name fishbot -z 0.1   # 生成机器人
ros2 run ros_gz_bridge parameter_bridge \
  /clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock \
  /model/fishbot/cmd_vel@geometry_msgs/msg/Twist]gz.msgs.Twist \
  /model/fishbot/odometry@nav_msgs/msg/Odometry[gz.msgs.Odometry \
  /model/fishbot/tf@tf2_msgs/msg/TFMessage[gz.msgs.Pose_V
##   [ = gz→ROS    ] = ROS→gz    @ = 双向   （写反不报错，只是数据不动）
ros2 topic list | grep -E "cmd_vel|odom|scan"   # ② 再看桥过来没有
sudo apt install ros-$ROS_DISTRO-teleop-twist-keyboard && ros2 run teleop_twist_keyboard teleop_twist_keyboard

## ── ros2_control ─────────────────────────
sudo apt install ros-$ROS_DISTRO-ros2-control ros-$ROS_DISTRO-ros2-controllers
sudo apt install ros-$ROS_DISTRO-gz-ros2-control   # Harmonic 用这个（不是 gazebo-ros2-control）
ros2 control list_hardware_interfaces         # 看接口 [available][unclaimed]
ros2 control list_hardware_components
ros2 control list_controller_types
ros2 control load_controller fishbot_joint_state_broadcaster --set-state active
ros2 control list_controllers
ros2 control set_controller_state <控制器> inactive   # 卸载前先失活
ros2 control unload_controller <控制器>

## ── 建图（slam_toolbox）──────────────────
sudo apt install ros-$ROS_DISTRO-slam-toolbox
ros2 launch slam_toolbox online_async_launch.py use_sim_time:=True
ros2 topic echo /map --once                   # 地图在不在发
sudo apt install ros-$ROS_DISTRO-nav2-map-server
ros2 run nav2_map_server map_saver_cli -f room   # 生成 room.pgm + room.yaml

## ── 导航（Nav2）──────────────────────────
sudo apt install ros-$ROS_DISTRO-navigation2 ros-$ROS_DISTRO-nav2-bringup
ros2 launch fishbot_navigation2 navigation2.launch.py
ros2 topic pub /initialpose geometry_msgs/msg/PoseWithCovarianceStamped \
  "{header: {frame_id: map}, pose: {pose: {position: {x: 0.0, y: 0.0}, orientation: {w: 1.0}}}}" --once
ros2 action list | grep -i navigate           # /navigate_to_pose、/follow_waypoints
ros2 action send_goal /navigate_to_pose nav2_msgs/action/NavigateToPose \
  "{pose: {header: {frame_id: map}, pose: {position: {x: 2.0, y: 2.0}, orientation: {w: 1.0}}}}" --feedback
ros2 run tf2_ros tf2_echo map base_footprint  # 查机器人在地图里的位姿
ros2 topic echo /cmd_vel                      # 看导航输出的速度指令

## ── 排查 ─────────────────────────────────
ros2 doctor                         # 环境体检
echo $ROS_DOMAIN_ID                 # 多机/多容器通信时，域 ID 必须一致
pgrep -af static_transform_publisher # 找残留的 tf 发布器
pkill -f static_transform_publisher  # 一次清干净（kill 外壳杀不掉子进程）
```


## 案例1.publisher -- 海龟画圈 

知识点汇总：

- `ros2 node list` —— 列出所有正在运行的节点
- `ros2 node info /turtlesim` —— 显示 `/turtlesim` 这个节点的信息（它订阅了什么、发布了什么、提供了哪些服务）
- `ros2 topic --help` —— 话题对应的命令

> 示例 `ros2 topic echo /turtle1/pose` 打印海龟节点 **/turtlesim** 的位置。
> 输出依次是：x 轴坐标、y 轴坐标、朝向角 theta（与 x 轴的夹角，单位弧度）、线速度 linear_velocity、角速度 angular_velocity。

- `ros2 topic info /turtle1/cmd_vel` —— 显示这个话题的消息类型，以及发布者和订阅者的数量
- `ros2 interface show` —— 查看对应接口的详细定义(只写接口即可不要在前面加上话题名)
- `ros2 topic pub 话题名 接口名 对应参数`
> 示例：`ros2 topic pub /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.5, y: 0.0}, angular: {z: 0.0}}"`
>
> 发布一个对应控制海龟速度的接口的话题，让海龟节点以指定速度运动

可以看到 控制海龟运动的是 /turtle1/cmd_vel话题的geometry_msg/msg/Twist接口 建立发布者传入指定的Twist字段即可控制海龟移动

借用python库可以发布对应信息

turtke_circle_publisher.py

```py
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist #从对应接口引用Twist类型

"""
案例 1:Publisher —— 让小海龟画圆
"""

class TurtleCircleNode(Node):
    def __init__(self,node_name):
        super().__init__(node_name)
        self.get_logger().info(f'{node_name}节点(海龟画圈节点)启动')
        self.turtleCircle_publisher = self.create_publisher(Twist, '/turtle1/cmd_vel', 10) #对turtle1_cmd_vel创建发布Twist类型的发布者，最多缓存10条消息 创建了这个发布者
        self.create_timer(1,self.timer_callback)
    def timer_callback(self):
        twist = Twist()
        twist.linear.x = 4.0
        twist.angular.z = -1.0
        self.turtleCircle_publisher.publish(twist) #实际发送控制指令 调用发布者发布
        self.get_logger().info(f'发布了话题{twist}')

def main():
    rclpy.init()
    node = TurtleCircleNode('TurtleCircleNode')
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()
```


自测回复
1.  Twist 控制海龟用到 linear线速度 和 angular角速度
2.  回调函数里修改要发布的速度即可
3.  话题发布速度变慢 画圆不平滑了

## 案例2.Subscriber —— 监听小海龟的实时位姿

我们发现 话题/turtle1/pose 负责记录海龟的位置信息 这样我们可以通过订阅该话题监听海龟的位置

在运行案例1时 另起一个终端 输入 ros2 topic echo /turtle1/pose 每秒62次输出海龟的位置信息


turtle_subscriber.py

```py
import rclpy
from rclpy.node import Node
from turtlesim.msg import Pose

"""
案例2: 监听海龟の状态
"""

class TurtleCircleNode(Node):
    def __init__(self,node_name):
        super().__init__(node_name)
        self.get_logger().info(f'{node_name}节点(海龟状态监听)启动')
        self.latest_msg = None
        self.subscription = self.create_subscription(Pose,'/turtle1/pose',self.pose_callback,10)
        self.create_timer(1.0, self.timer_callback)
    def pose_callback(self, msg):
        self.latest_msg = msg                      
    def timer_callback(self):
        if self.latest_msg is None:                 
            return
        msg = self.latest_msg
        self.get_logger().info(
            f'位置: ({msg.x:.2f}, {msg.y:.2f}) | '
            f'线速度: {msg.linear_velocity:.2f} | '
            f'角速度: {msg.angular_velocity:.2f}'
        )


def main():
    rclpy.init()
    node = TurtleCircleNode('TurtleCircleNode')
    rclpy.spin(node)
    rclpy.shutdown()

if __name__ == "__main__":
    main()
```


自测回复：
1. 字段解释：

```bash
x: 9.497976303100586  #x轴位置   
y: 1.2041237354278564 #y轴位置
theta: -1.6480000019073486 #与主方向的偏移值
linear_velocity: 4.0  #线速度
angular_velocity: -1.0 #角速度

```


2. 实例代码里使用定时器的回调函数实现 其他实现 每60次统计一次，记录上传时间time.time() 
3. 获取或发布的数据类型，话题，缓存最大值 而订阅者必需有一个回调函数


## 案例3.综合练习 —— 状态机控制小海龟画正方形

```py
"""
案例3:综合练习 —— 状态机控制小海龟画正方形
"""
import math

import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

# ====== 参数配置（把"魔法数字"提到顶部，要改只改这里）======
TIMER_PERIOD = 0.1      # 定时器周期（秒）
GO_SPEED = 1.0          # 直行线速度 (m/s)
GO_CYCLES = 20          # 直行持续周期数
TURN_SPEED = 1.5708     # 转向角速度 (rad/s)，约 90°/s
TURN_CYCLES = 10        # 转向持续周期数
EDGES = 4               # 正方形四条边


class SquareDriver(Node):
    def __init__(self):
        super().__init__("square_driver")

        # 发布速度指令给海龟
        self.publisher_ = self.create_publisher(Twist, "/turtle1/cmd_vel", 10)

        # 状态变量
        self.state = "GO"    # 当前状态：'GO' 或 'TURN'
        self.cycles = 0      # 当前状态已持续的周期数
        self.edge = 0        # 已完成的边数

        # 定时器 10Hz
        self.timer = self.create_timer(TIMER_PERIOD, self.timer_callback)

        self.get_logger().info("画正方形节点已启动!")

    def timer_callback(self):
        msg = Twist()

        if self.state == "GO":
            msg.linear.x = GO_SPEED
        else:                                   # TURN
            msg.angular.z = TURN_SPEED

        self.publisher_.publish(msg)
        self.cycles += 1

        # ---- 到达阈值就切状态 ----
        if self.state == "GO" and self.cycles >= GO_CYCLES:
            self.cycles = 0
            self.state = "TURN"
            self.edge += 1
            self.get_logger().info(f"第 {self.edge} 条边画完, 开始转弯...")

        elif self.state == "TURN" and self.cycles >= TURN_CYCLES:
            self.cycles = 0
            if self.edge >= EDGES:
                # 四条边 + 四个 90° 转弯 = 闭合正方形
                self.get_logger().info("正方形画完了! 停止运动.")
                self.publisher_.publish(Twist())     # 发一条零速度
                self.timer.cancel()                  # 4 条边完成后取消定时器
                return
            self.state = "GO"


def main():
    rclpy.init()
    node = SquareDriver()
    rclpy.spin(node)
    rclpy.shutdown()


if __name__ == "__main__":
    main()
```


自测回复：

1.  状态循环条件
- GO->TURN  self.cycles >= GO_CYCLES 够20个周期也就是20*0.1s = 2s 
- TURN -> GO self.cycles >= TRUN_CYCLES 够10个周期也就是 10*0.1=1s and edge <4
2. 边长改为3m 就是直行多走1s GO_CYCLES = 30
3. 多加一个停顿状态在旋转结束后停10个周期再直行


## 案例4.Service 客户端 —— 调用 /spawn 服务生成一只新海龟


```py
import random

import rclpy
from rclpy.node import Node
from turtlesim.srv import Spawn

"""
案例4:Service 客户端 —— 调用 /spawn 服务生成一只新海龟
流程：创建客户端 -> 循环等待服务上线 -> 构造 Spawn.Request ->
     call_async 异步调用(不阻塞) -> add_done_callback 在回调里取响应
"""


class SpawnClientNode(Node):
    def __init__(self, node_name):
        super().__init__(node_name)
        self.get_logger().info(f'{node_name}节点(生成新海龟客户端)启动')

        # 1. 创建客户端：参数为服务类型 Spawn 和服务名 /spawn
        #    这一步不会立即建立连接，只是"准备好以后可以调用"
        self.client = self.create_client(Spawn, '/spawn')

        # 2. 防御性等待：每秒检查一次服务端是否在线
        #    用 while 而不是 if，保证先启动客户端、后启动 turtlesim 也能用
        while not self.client.wait_for_service(timeout_sec=1.0):
            self.get_logger().info('等待 /spawn 服务上线...')

        # 3. 构造请求对象并填字段（对应 Spawn.srv 的请求部分）
        self.request = Spawn.Request()
        self.request.x = random.uniform(2.0, 9.0)
        self.request.y = random.uniform(2.0, 9.0)
        self.request.theta = 0.0
        self.request.name = 'turtle2'

        # 发起异步调用，立即返回一个 Future；响应到达时自动执行注册的回调
        future = self.client.call_async(self.request)
        future.add_done_callback(self.response_callback)

    # 4. 回调里取出响应（future.result() 失败时会抛异常，必须 try/except）
    def response_callback(self, future):
        try:
            response = future.result()
            self.get_logger().info(f'成功! 服务返回的新海龟名字为: {response.name}')
        except Exception as e:
            self.get_logger().error(f'服务调用失败: {e}')


def main():
    rclpy.init()
    node = SpawnClientNode('spawn_client')
    rclpy.spin(node)
    rclpy.shutdown()


if __name__ == "__main__":
    main()

```


自测回复：

1. 续的数据流 / 只管发不管结果 → Topic；一次性动作、需要"办成了没"的回执 → Service。

||Topic（话题） |Service（服务） 
|:--|:--|:--|
|模式 |发布/订阅，单向、持续 |客户端/服务端，一问一答 
|反馈 |没有，发出去就不管了 |有响应，能知道成功/失败 
|例子（真实机器人）| 底盘持续接收`/cmd_vel` 速度指令；雷达持续发布`/scan` 激光数据；摄像头持续发图像 |调用"清空地图"服务、"开始标定相机"服务、电梯机器人按楼层按钮；导航中"清空代价地图`/clear_costmap` "

同样是"动一下"，区分关键是 要不要确认结果 ：

- 让机器人 以 0.5m/s 一直往前走 → Topic。速度要 20Hz 持续发，撞到障碍停发即可，不需要每条指令都得到应答。
- 让机器人**"把机械臂归零"或"生成一只新海龟"** → Service。这是一个有明确起止的动作，调用方需要知道"到位了没有/新海龟叫什么名字"。
2. 三步各在等什么、做什么
  三步 ：`wait_for_service` 等服务端出现；`call_async` 发请求并立刻拿到 Future（不阻塞）；`add_done_callback` 登记响应到达后的处理函数。

3. 代码如下

```py
import rclpy
from rclpy.node import Node
from turtlesim.srv import Spawn

"""
案例4：Service 客户端 —— 调用 /spawn 服务生成一只新海龟
位置从命令行参数读入：
    python3 turtle_spawn_client.py <x> <y> [theta] [name]
例：
    python3 turtle_spawn_client.py 2.0 3.0 0.0 turtle2
"""


class SpawnClientNode(Node):
    def __init__(self, node_name, x, y, theta, name):
        super().__init__(node_name)
        self.get_logger().info(f'{node_name}节点(生成新海龟客户端)启动')

        # 1. 创建客户端
        self.client = self.create_client(Spawn, '/spawn')

        # 2. 循环等待服务端上线
        while not self.client.wait_for_service(timeout_sec=1.0):
            self.get_logger().info('等待 /spawn 服务上线...')

        # 3. 用命令行传入的参数构造请求
        self.request = Spawn.Request()
        self.request.x = x
        self.request.y = y
        self.request.theta = theta
        self.request.name = name

        # 异步调用并登记回调，保存 future 供 main 判断是否完成
        self.future = self.client.call_async(self.request)
        self.future.add_done_callback(self.response_callback)

    # 4. 回调里取出响应
    def response_callback(self, future):
        try:
            response = future.result()
            self.get_logger().info(f'成功! 服务返回的新海龟名字为: {response.name}')
        except Exception as e:
            self.get_logger().error(f'服务调用失败: {e}')


def parse_args(argv):
    """解析命令行参数：x、y 必填，theta、name 有默认值"""
    def usage():
        return '用法: python3 turtle_spawn_client.py <x> <y> [theta] [name]\n' \
               '例:   python3 turtle_spawn_client.py 2.0 3.0 0.0 turtle2'

    if len(argv) < 3:
        print(usage())
        sys.exit(1)
    try:
        x = float(argv[1])
        y = float(argv[2])
        theta = float(argv[3]) if len(argv) > 3 else 0.0
        name = argv[4] if len(argv) > 4 else 'turtle2'
    except ValueError:
        print('错误: x、y、theta 必须是数字\n' + usage())
        sys.exit(1)
    return x, y, theta, name


def main():
    x, y, theta, name = parse_args(sys.argv)

    # args=[]：告诉 rclpy 不要自己去解析命令行参数(位置参数由我们手动解析)
    rclpy.init(args=[])
    node = SpawnClientNode('spawn_client', x, y, theta, name)

    # 一次性任务：响应回来后就结束，而不是一直 spin
    while rclpy.ok() and not node.future.done():
        rclpy.spin_once(node, timeout_sec=0.1)

    node.destroy_node()
    rclpy.shutdown()

```


## 案例5. Service Server —— 接收目标坐标并导航海龟

先规划一下： 首先我们需要一个节点发布位置 一个节点接收位置并控制海龟 这里我们可以通过一个接口规范一下数据格式

创建一下接口 `ros2 pkg create nav_interface --build-type ament_cmake --license Apache-2.0`

在package.xml 里手写三行：

```xml
<buildtool_depend>rosidl_default_generators</buildtool_depend>
<exec_depend>rosidl_default_runtime</exec_depend>
<member_of_group>rosidl_interface_packages</member_of_group>
```


创建srv目录写入NavigateTo.srv

```srv
float32 x #目标地点和状态
float32 y
float32 theta
---
bool success #响应字段
```


之后colcon build && source install/setup.bash

`ros2 interface show nav_interface/srv/NavigateTo`

看到输出srv内的内容即为创建完成

现在就着手于客户端与服务端的书写由客户端发指令服务端控制海龟

navigate_server.py

```py
#!/usr/bin/env python3
import math
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from turtlesim.msg import Pose
from nav_interface import NavigateTo

#辅助函数
def clamp(v,low,high):
    """限制速度"""
    return max(low,min(high,v))
def norm(a):
    """角度归一化到 [-π, π]，避免"要转 350°"这种绕远路"""
    return math.atan2(math.sin(a), math.cos(a))

CANVAS = 11.09 #小海龟窗口的尺寸 11.09m * 11.09m 画布尺寸：窗口 500x500，比例尺 45 px/m → (500-1)/45 ≈ 11.09

class NavigateServer(Node):
    ARRIVE_TOL = 0.10 #位置到目标位置的偏差最大值(m)
    ANGLE_TOL = 0.02 #朝向到位容差(rad)

    def __init__(self):
        super().__init__("navigate_server")
        self.srv_ = self.create_service(NavigateTo,"navigate_to",self.on_navigate) #接收服务端的NavigateTo信息
        self.cmd_pub_ = self.create_publisher(Twist,"/turtle1/cmd_vel",10) #发布速度
        self.create_subscription(Pose,"/turtle1/pose",self.on_pose,10) #接收海龟的位置信息
        self.create_timer(0.02,self.control_loop) #50HZ的闭环控制
        self.pose_ = None #当前位置
        self.target_ = None 
        self.get_logger().info("导航服务已经启动，服务名:/navigate_to")

    def on_pose(self, pose: Pose):
        self.pose_ = pose #更新位姿

    def on_navigate(self,request,response):
        if not (0.0 < request.x < CANVAS and 0.0 < request.y < CANVAS):
            response.success = False
            self.get_logger().warn(f"目标点({request.x:.2f},{request.y:.2f}) 超出画布")
            return response
        self.target_ = (request.x, request.y, request.theta)
        response.success = True
        self.get_logger().info(f"目标点 ({request.x:.2f}, {request.y:.2f}),朝向 {math.degrees(request.theta):.1f}° 已接收")
        return response

    def control_loop(self):
        #没有收到指令不控制
        if self.pose_ is None or self.target_ is None:
            return

        tx,ty,ttheta = self.target_ #目标点的参数
        dx = tx - self.pose_.x #计算距离
        dy = ty - self.pose_.y
        distance = math.hypot(dx,dy)

        msg = Twist()

        #朝向目标点 前进
        if distance >= self.ARRIVE_TOL:
            angle_error = norm(math.atan2(dy,dx) - self.pose_.theta)
            #比例控制，限制最大角速度为3.0rad/s
            msg.angular.z = clamp(6.0 * angle_error, -3.0, 3.0)
            #确定朝向是否对准
            if abs(angle_error) < 0.2:
                msg.linear.x = min(1.5 * distance,2.0) #前进
            self.cmd_pub_.publish(msg)
            return
        #检测并停止
        angle_error = norm(ttheta - self.pose_.theta)
        if abs(angle_error) < self.ANGLE_TOL:
            self.cmd_pub_.publish(Twist())       #到达后发布停止指令 
            self.get_logger().info(
                f"已到达 ({self.pose_.x:.2f}, {self.pose_.y:.2f}),"
                f"朝向 {math.degrees(self.pose_.theta):.1f}°")
            self.target_ = None                   
            return
        else:
            # 朝向未对准 → 原地旋转（不前进）
            msg = Twist()
            msg.angular.z = clamp(4.0 * angle_error, -2.0, 2.0)
            self.cmd_pub_.publish(msg)
            return

def main(args=None):
    rclpy.init(args=args)
    node = NavigateServer()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        try:
            node.cmd_pub_.publish(Twist())
        except Exception:
            pass
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()

```


navigate_client.py

```py

#!/usr/bin/env python3
"""
通过自定义服务发布目标地点，让海龟前往 —— 客户端

用法：
    ros2 run turtle_navigate navigate_client                # 默认目标 (8, 8, 90°)
    ros2 run turtle_navigate navigate_client 2 9 0          # x y theta(弧度)
    ros2 run turtle_navigate navigate_client 5.5 5.5 3.14

"""
import math
import sys
import rclpy
from rclpy.node import Node
from turtlesim.msg import Pose
from status_interface.srv import NavigateTo


class NavigateClient(Node):

    ARRIVE_TOL = 0.10      # 位置容差，和服务端保持一致
    ANGLE_TOL = 0.05       # 朝向容差 (rad)
    STOP_TOL = 0.05        # 判定"停稳"的速度阈值

    def __init__(self):
        super().__init__("navigate_client")

        self.cli_ = self.create_client(NavigateTo, "navigate_to") #服务类型 服务名均与服务端一致
        self.create_subscription(Pose, "/turtle1/pose", self.on_pose, 10) #订阅者

        self.pose_ = None
        self.goal_ = None          # (x, y, theta)
        self.accepted_ = False     # 服务是否已接收
        self.arrived_ = False      # 是否已到达

    # ---------------- 回调 ----------------
    def on_pose(self, pose: Pose):
        self.pose_ = pose
        if self.goal_ is None or self.arrived_:
            return

        # ★ 只有"位置到位 + 朝向到位 + 已经停稳"才算真的到了。
        #   只看位置会判早：服务端还要转朝向，中途路过目标附近就误判了。
        pos_err = math.hypot(self.goal_[0] - pose.x, self.goal_[1] - pose.y)
        ang_err = abs(math.atan2(
            math.sin(self.goal_[2] - pose.theta),
            math.cos(self.goal_[2] - pose.theta)))
        stopped = (abs(pose.linear_velocity) < self.STOP_TOL
                   and abs(pose.angular_velocity) < self.STOP_TOL)

        if pos_err < self.ARRIVE_TOL and ang_err < self.ANGLE_TOL and stopped:
            self.arrived_ = True
            self.get_logger().info(
                f"已到达 ({pose.x:.2f}, {pose.y:.2f})，"
                f"朝向 {math.degrees(pose.theta):.1f}°，"
                f"位置误差 {pos_err * 100:.1f} cm，"
                f"朝向误差 {math.degrees(ang_err):.2f}°")

    def on_response(self, future):
        """服务返回时自动调用（不阻塞）"""
        response = future.result()
        self.accepted_ = bool(response.success)
        if self.accepted_:
            self.get_logger().info(" 服务端已接收目标，海龟开始移动")
        else:
            self.get_logger().warn("服务端拒绝了目标（超出画布？）")

    # ---------------- 发目标 ----------------
    def send(self, x, y, theta, wait_timeout=60.0):
        # 等服务器上线
        while not self.cli_.wait_for_service(timeout_sec=1.0):
            if not rclpy.ok():
                self.get_logger().error("等待服务时被打断")
                return False
            self.get_logger().info("等待导航服务 /navigate_to ...")

        self.goal_ = (x, y, theta)
        request = NavigateTo.Request()
        request.x = float(x)
        request.y = float(y)
        request.theta = float(theta)

        self.get_logger().info(f"发送目标: ({x}, {y}, {theta} rad)")
        # ★ 异步发送 + 回调处理结果
        self.cli_.call_async(request).add_done_callback(self.on_response)

        # 等它到达（客户端自己盯位姿，不是等服务）
        import time
        deadline = time.monotonic() + wait_timeout
        while rclpy.ok() and not self.arrived_ and time.monotonic() < deadline:
            rclpy.spin_once(self, timeout_sec=0.1)

        if not self.arrived_:
            self.get_logger().warn(f"等了 {wait_timeout:.0f} 秒还没到，放弃等待")
        return self.arrived_


def main(args=None):
    rclpy.init(args=args)
    node = NavigateClient()
    # 默认目标：右上方，朝上
    x, y, theta = 8.0, 8.0, math.pi / 2
    if len(sys.argv) >= 4:
        x, y, theta = float(sys.argv[1]), float(sys.argv[2]), float(sys.argv[3])
    try:
        node.send(x, y, theta)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()

```



## 案例6. 键盘控制海龟


teleop_keyboard.py

```py
#!/usr/bin/env python3
import sys
import select
import termios
import tty
import threading
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist

BINDINGS = {
    'w': (2.0,  0.0),
    's': (-2.0, 0.0),
    'a': (0.0,  2.0),
    'd': (0.0, -2.0),
    ' ': (0.0,  0.0),   # 空格 = 停
}


class KeyboardTeleop(Node):

    def __init__(self):
        super().__init__("teleop_keyboard")
        self.pub_ = self.create_publisher(Twist, "/turtle1/cmd_vel", 10)
        self.twist_ = Twist()
        self.create_timer(0.02, self.on_timer)
        self.kb_thread_ = threading.Thread(target=self.keyboard_loop, daemon=True)
        self.kb_thread_.start()
        self.get_logger().info("W/S 前后,A/D 左右,空格停,Q 退出（无需回车）")

    def on_timer(self):
        self.pub_.publish(self.twist_)

    def get_key(self, settings):
        """非阻塞读一个键，没有就返回 None"""
        tty.setcbreak(sys.stdin.fileno())   # 非规范模式，逐键
        if select.select([sys.stdin], [], [], 0.1)[0]:
            return sys.stdin.read(1)
        return None

    def keyboard_loop(self):
        settings = termios.tcgetattr(sys.stdin)
        try:
            while rclpy.ok():
                key = self.get_key(settings)
                if key is None:
                    continue
                key = key.lower()
                if key == 'q':
                    rclpy.shutdown()
                    break
                if key in BINDINGS:
                    lin, ang = BINDINGS[key]
                    self.twist_.linear.x = lin
                    self.twist_.angular.z = ang
        finally:
            termios.tcsetattr(sys.stdin, termios.TCSADRAIN, settings)


def main(args=None):
    rclpy.init(args=args)
    node = KeyboardTeleop()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()


if __name__ == "__main__":
    main()
```


自测回复：
1. 主线程 spin+定时器（只读 twist），子线程 input（只写 twist），共享 self.twist_
2. input 阻塞主线程→必须子线程；daemon 防退出挂住；子线程只改值→线程安全+持续发布+职责分离
3. 空格归零 self.twist_，定时器 20ms 内发出 → 乌龟立刻停；非阻塞键盘才能"真急停"


## 案例7. 参数化节点 + Launch 文件

现在我们发现启动终端1运行节点1 启动终端2运行节点2 启动终端3运行节点3.... 过于繁琐有没有一键启动的方法呢？ 还真有

首先我们以案例1和案例2为基础学习参数化节点与launch文件编写

turtle_circle_publisher.py 更改部分

```py
        self.get_logger().info(f'{node_name}节点(海龟画圈节点)启动')
        # 参数：launch 文件 / 命令行可以覆盖，不给就用默认值
        self.declare_parameter('linear_speed', 1.0)   # 线速度，0 只会原地转
        self.declare_parameter('angular_speed', -1.0) # 角速度，决定圆的方向大小
        self.declare_parameter('period', 0.05)        # 发布周期(秒)

        linear = self.get_parameter('linear_speed').value
        angular = self.get_parameter('angular_speed').value
        period = self.get_parameter('period').value
        self.get_logger().info(f'参数: linear={linear}, angular={angular}, period={period}')

        self.turtleCircle_publisher = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.create_timer(period, self.timer_callback)
    def timer_callback(self):
        twist = Twist()

        twist.linear.x = self.get_parameter('linear_speed').value
        twist.angular.z = self.get_parameter('angular_speed').value
        
        self.turtleCircle_publisher.pubilc(twist)
```


上面就是参数化节点的主要修改内容

下面是launch文件的编写


turtle_sim.launch.py

```py
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node

"""
一键启动：海龟窗口 + 画圆 + 监听状态

用法：
    ros2 launch status_publisher turtle_sim.launch.py
    ros2 launch status_publisher turtle_sim.launch.py linear_speed:=2.0 angular_speed:=-3.0
"""

def generate_launch_description():
    # ① 声明可以从命令行覆盖的参数（有默认值）
    linear_arg = DeclareLaunchArgument('linear_speed', default_value='1.5',description='海龟线速度') #参数名 ，值 ，描述
    angular_arg = DeclareLaunchArgument('angular_speed', default_value='-2.0',description='海龟角速度，负数顺时针')

    # ② 三个节点
    turtlesim_node = Node(
        package='turtlesim', #包名
        executable='turtlesim_node', #可执行文件名
        name='sim',   #自己起的节点名
        output='screen', #日志输出的目标位置
    )

    circle_node = Node(
        package='status_publisher',
        executable='turtle_circle_publisher',
        name='turtle_circle',
        output='screen',
        parameters=[{
            'linear_speed': LaunchConfiguration('linear_speed'),
            'angular_speed': LaunchConfiguration('angular_speed'),
            'period': 0.05,
        }], #参数列表
    )

    listener_node = Node(
        package='status_publisher',
        executable='turtle_subscriber',
        name='turtle_listener',
        output='screen',
    )

    return LaunchDescription([
        linear_arg,
        angular_arg,
        turtlesim_node,
        circle_node,
        listener_node,
    ])

```


## 案例 8. Action 通信 —— 带进度反馈、可取消的导航任务


navigate_action_server.py

```py
#!/usr/bin/env python3  
"""
是一个 ROS 2 Action 服务端：它接收客户端发来的导航坐标
让 turtlesim 海龟朝目标移动，并在执行中持续发布进度反馈。
目标可以被取消，结束时会返回成功状态和估算的行驶距离。
"""
import math
import time

import rclpy
from rclpy.action import ActionServer, CancelResponse, GoalResponse
from rclpy.callback_groups import ReentrantCallbackGroup
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from geometry_msgs.msg import Twist
from turtlesim.msg import Pose
from status_interface.action import Navigate

# turtlesim 画布：窗口 500x500，比例尺 45 px/m → (500-1)/45 ≈ 11.09
CANVAS = 11.0

def clamp(v, lo, hi):
    return max(lo, min(hi, v))

def norm_angle(a):
    """角度归一化到 [-π, π]，避免"要转 350°"这种绕远路"""
    return math.atan2(math.sin(a), math.cos(a))

class NavigateActionServer(Node):

    def __init__(self):
        super().__init__("navigate_action_server")
        self.declare_parameter("arrival_threshold",0.05) #声明离目标0.05m就算到达
        self._cb_group = ReentrantCallbackGroup()
        #使用ReentrantCallbackGroup导航任务会在 execute_callback 中持续循环。如果这个循环独占了执行线程，位置订阅回调可能无法及时更新海龟位置，取消请求也可能得不到处理。因此代码使用 ReentrantCallbackGroup，并在 main 中使用 MultiThreadedExecutor。这样执行导航期间，位置回调和取消请求仍有机会运行
        self._action_server = ActionServer(
            self,
            Navigate,
            "navigate",                   #创建名为navigate的Action服务端 接受处理Navigate类型的消息 
            execute_callback=self.execute_callback,  #负责执行任务
            goal_callback=self.goal_callback,          #负责检查并接受或拒绝任务
            cancel_callback=self.cancel_callback,       #处理取消请求
            callback_group=self._cb_group,                  #把 ActionServer 的回调交给 self._cb_group 管理。前面创建的 _cb_group 是 ReentrantCallbackGroup，允许同一组中的回调在适当时并发执行
        )

        self.cmd_pub_ = self.create_publisher(Twist, "/turtle1/cmd_vel",10) #速度发布者 向/turtle1/cmd_vel 发送移动指令
        self.create_subscription(Pose,"/turtle1/pose",self.on_pose,10,callback_group=self._cb_group) #订阅/turtle1/pose 获取当前位姿
        self.pose_ = None #当前位姿
        self.get_logger().info("导航 Action服务端启动成功，action名：/navigate")

        def goal_callback(self,goal_request):
            """检测是否在画布内"""
            if 0.0 < goal_request.x < CANVAS and 0.0 < goal_request.y < CANVAS:
                self.get_logger().info(f"收到目标({goal_request.x:.2f},{goal_request.y:.2f})超出画布")
                return GoalResponse.ACCEPT #返回GoalResponse.ACCEPT让客户端知道被拒绝了
            self.get_logger().warn(f"目标 ({goal_request.x:.2f}, {goal_request.y:.2f}) 超出画布 0~{CANVAS:.1f}，拒绝")
            return GoalResponse.REJECT
        
        def cancel_callback(self, goal_handle): #收到客户端的取消请求后，服务端允许取消。不过，真正停止海龟是在执行循环检查到取消请求时完成的在execute_callback()里
            self.get_logger().info("收到取消请求")
            return CancelResponse.ACCEPT

        def on_pose(self, pose: Pose): #更新位置参数
            self.pose_ = pose
        
        def execute_callback(self,goal_handle):
            target = goal_handle.request #客户端的目标请求
            threshold = self.get_parameter("arrival_threshold").value #到目标的距离

            feedback = Navigate.Feedback() #反馈信息 报告导航过程中的实时状态
            result = Navigate.Result() #最终结果 保存任务结束时的结果
            
            wait_start = time.monotonic() #记录开始时间
            while self.pose_ is None:
                if time.monotonic() - wait_start > 2.0:
                    self.get_logger().error("2s 内没有收到位姿，任务终止")
                    goal_handle.abort()   #将任务标记中止  
                    result.success = False 
                    result.traveled_distance = 0.0 #走过的距离为0
                    return result                    
                time.sleep(0.05)
            """
            对于任务句柄而言
            goal_handle.request 任务请求
            goal_handle.is_cancel_requested 是否被取消
            goal_handle.publish_feedback 发送反馈
            goal_handle.success() 标记成功
            goal_handle.canedled() 标记取消
            goal_handle.abort() 标记中止
            """
            last_x, last_y = self.pose_.x,self.pose_.y #标记最新位置
            traveled = 0.0 #初始化已走距离
            self.get_logger().info(f"开始导航->({target.x:.2f},{target.y:.2f}),到达阈值{threshold:.2f}m")

            #主循环 10HZ
            while rclpy.ok():
                pose = self.pose_ #获得当前位姿
                dx = target.x - pose.x
                dy = target.y - pose.y
                distance = math.hypot(dx,dy) #获取斜边值 得到距离
                heading_error = norm_angle(math.atan2(dy, dx) - pose.theta) #角度差

                #检查是否被取消
                if goal_handle.is_cancel_requested:
                    self.stop_turtle()
                    goal_handle.canceled()
                    result.success = False
                    result.traveled_distance = traveled
                    self.get_logger().info(f"导航被取消，已走 {traveled:.2f} m")
                    return result
                #到达判定
                if distance < threshold:
                    self.stop_turtle()
                    goal_handle.succeed()
                    result.success = True
                    result.traveled_distance = traveled
                    self.get_logger().info(f"导航成功，总路程 {traveled:.2f} m")
                    return result
                #运动控制先转向后前进
                twist = Twist()
                twist.angular.z = clamp(6.0 * heading_error, -3.0, 3.0)
                if abs(heading_error) < 0.2:      #当弧度偏差小于0.2时再走直线
                    twist.linear.x = min(1.5 * distance, 2.0) 
                self.cmd_pub_.publish(twist)
                #发布反馈
                feedback.remaining_distance = distance #剩余距离
                feedback.heading_error = heading_error #朝向偏差
                goal_handle.publish_feedback(feedback) #发送feedback给客户端
                #累积路程
                traveled += math.hypot(pose.x - last_x, pose.y - last_y) 
                last_x, last_y = pose.x, pose.y

                time.sleep(0.1)

            goal_handle.abort()
            result.success = False
            result.traveled_distance = traveled
            return result

    def stop_turtle(self):
        """工具函数，发布零速度让海龟立刻停下"""
        self.cmd_pub_.publish(Twist())

def main(args=None):
    rclpy.init(args=args)
    node = NavigateActionServer()
    #创建多线程执行器
    executor = MultiThreadedExecutor()
    executor.add_node(node) #将node加入多线程执行器
    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally: #让海龟停下并销毁节点
        try:
            node.stop_turtle()
        except Exception:
            pass
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()
if __name__ == "__main__":
    main()
```




navigate_action_client.py

```py
#!/usr/bin/env python3
"""
使用方法(三个终端)：
ros2 run turtlesim turtlesim_node
ros2 run turtle_navigate_action navigate_action_server
ros2 run turtle_navigate_action navigate_action_client 8 8 【可选：cancel 2(运行2秒后退出)】
"""

import sys #读取命令行参数
import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from action_msgs.msg import GoalStatus #导入Action的状态枚举用于判断任务的最终状态 1.成功 2.被取消 3.失败/中止
from status_interface.action import Navgate #导入自定义的Action Navgate是CS共同使用的动作定义 位置在status_interface/action目录下的 Navigate.action 文件

class NavigateActionClient(Node):
    def __init__(self):
        super().__init__("navigate_action_client")
        self._action_client = ActionClient(self,Navigate,"navigate") #创建一个ActionClient连接名为"navigate"的action 发送Navigate类型的目标
        self._goal_handle = None #保存当前action的目标句柄  目标句柄不是目标本身(而是任务凭证)用于操作和跟踪这次的导航任务
        self._cancel_timer = None #保存定时器，用于在一段时间后取消任务

    def send_goal(self,x,y,canel_after=None):
        """发送导航目标"""
        if not self._action_client.wait_for_server(timeout_sec=5.0): #等待服务端上线 最多5s
            self.get_logger().error("等了5s也没有看到 /navigate 服务端，退出")
            return False
        goal = Navigate.Goal()
        goal.x = float(x)
        goal.y = float(y)

        #发送异步目标
        self.get_logger().info(f"发送导航目标:({x:.2f},{y:.2f})")
        send_future = self._action_client.send_goal_async(goal, feedback_callback=self.feedback_callback) #一旦发出之后，服务端开始处理任务，之后每次反馈都返回feedback_callback 返回当前的信息
        send_future.add_done_callback(self.goal_response_callback) #发送目标并收到服务端接受/拒绝的结果完成后调用:goal_respose_callback
        
        #可选：cancel_after 秒后自动取消
        if cancel_after is not None:
            self._cancel_timer = self.create_timer(cancel_after,self.cancel_goal) #等待cancel_after秒后调用停止函数
        return True

    #处理服务端给予的同意/拒绝请求
    def goal_response_callback(self,future):
        goal_handle = future.result()
        if not goal_handle.accepted: #判读从服务端返回的结果是不是接受
            self.get_logger().warn("目标被服务端拒绝")
            rclpy.shutdown()
            return
        self._goal_handle = goal_handle
        self.get_logger().info("目标被接受，开始执行")

        result_future = goal_handle.get_result_async()  #获取任务最终结果的异步future也就是当任务结束时拿到回调
        result_future.add_done_callback(self.get_result_callback)  #绑定结果回调函数
    
    # ---------------- ③ 反馈：每 0.1s 一次 ----------------
    def feedback_callback(self, feedback_msg):
        # 注意两层：feedback_msg 是包装，真正的数据在 .feedback
        f = feedback_msg.feedback
        self.get_logger().info(
            f"剩余 {f.remaining_distance:.2f} m, "
            f"朝向偏差 {f.heading_error:+.2f} rad")

    # ---------------- ④ 最终结果 ----------------
    def get_result_callback(self, future):
        response = future.result()
        status = response.status
        result = response.result

        if status == GoalStatus.STATUS_SUCCEEDED:
            self.get_logger().info(
                f"导航成功完成，总路程 {result.traveled_distance:.2f} m")
        elif status == GoalStatus.STATUS_CANCELED:
            self.get_logger().info(
                f"导航未完成（被取消），已走 {result.traveled_distance:.2f} m")
        else:
            self.get_logger().warn(
                f"导航未完成（中止/失败，状态码 {status}），"
                f"已走 {result.traveled_distance:.2f} m")

        rclpy.shutdown()

    # ---------------- 定时取消 ----------------
    def cancel_goal(self):
        # 定时器是重复触发的，取消一次就够
        self._cancel_timer.cancel()
        self._cancel_timer = None

        if self._goal_handle is None:
            return
        self.get_logger().info("主动取消导航目标！")
        # 服务端 execute 循环里 is_cancel_requested 变 True，自行收尾
        self._goal_handle.cancel_goal_async()


    def parse_args(argv):
        """
        返回 (x, y, cancel_after)
            client              → (8, 8, None)
            client 8 8          → (8, 8, None)
            client 10 10 cancel 3 → (10, 10, 3.0)
        """
        x, y, cancel_after = 8.0, 8.0, None
        if len(argv) >= 3:
            x, y = float(argv[1]), float(argv[2])
        if len(argv) >= 5 and argv[3] == "cancel":
            cancel_after = float(argv[4])
        return x, y, cancel_after

def main(args=None):
    rclpy.init(args=args)
    node = NavigateActionClient()

    x, y, cancel_after = parse_args(sys.argv) #从命令行读取参数
    if not node.send_goal(x, y, cancel_after):  
        node.destroy_node() #销毁节点
        if rclpy.ok():
            rclpy.shutdown()
        return

    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        if rclpy.ok():
            rclpy.shutdown()

if __name__ == "__main__":
    main()
```


## 案例9. rosbag数据录制与回放

以启动上一个案例的导航节点为例

ros2 bag record -o top --topics /turtle1/cmd_vel

监听指定话题 存到指定目录

产物如下

```txt
top
    |——metadata.yaml
    |——top_0.mcap
```

