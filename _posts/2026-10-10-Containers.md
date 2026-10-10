---
layout: post
title: "从零开始的容器教程"
tags: [随笔, 教程]
---

这篇博客将告诉你，怎么从零开始搭建Ubuntu22.04 + ROS2 Humble的容器 , Python YOLOV8 编译环境容器 和label studio标注工具三种不同类型的容器 方便你学会容器的使用

## Ubuntu22.04 + ROS2 Humble容器

首先假设你是一个纯小白刚装好Ubuntu系统，发现自己的系统版本是26.04或者24.04但是需求是需要22.04的ubuntu系统，删了重装显然不是一个好办法，那有没有什么办法可以在24.04的Ubuntu上运行基于22.04的ROS2 Humble呢 如果你想知道接下来的教程对你很有帮助了

先以一个流程图大致过一下流程 
![ican容器搭建](/assets/images/2026_10_10/iCAN容器搭建全流程指南.png)

接下来我们一步一步来搭建这个容器

### 1.环境准备

首先我们先装一下容器依赖

```bash
sudo apt update
sudo apt install -y docker.io
```

将当前登录的用户加入 docker 组获得容器命令的权限

```bash
sudo usermod -aG docker $USER
```
这里必须要加 a 不然可能会覆盖用户已经在的组

这里注销登录重启后才会生效 

重启后确认 `groups` 看到 `docker`字段就成功了

保险期间 验证一下 `docker run hello-world`应该看到
```txt
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

### 2.镜像准备

首先寻找有没有现成的镜像 [hub.docker](https://hub.docker.com/)

如果官方有现成的会方便非常多 但这个我们这个是官方没有的情况 所以接下来我们来自己build一个镜像

也是拿图片通一下流程 ![镜像搭建](/assets/images/2026_10_10/从零搭建%20Docker%20镜像教程海报.png)


### 3.build基础镜像
1. 准备一个空目录
    ```bash
    mkdir -p ~/docker_text/first_image
    cd ~/docker_text/first_image
    ls -a #确认目录是否只有 . 和 .. 
    ```

2. 创建第一个文件 `Dockerfile` (没有后缀) 写入如下内容
    ```
    FROM ubuntu:22.04
    RUN apt-get update && apt-get install -y python 
    CMD ["bash"]
    ```

   - `FROM ubuntu:22.04`   从基础的 ubuntu:22.04 镜像开始
   - `RUN apt-get update && apt-get install -y python3` 装python3 build时执行 -> 固化进镜像
   - `CMD ["bash"]`  表示运行时启动 bash CMD 是默认启动命令，可以被 docker run 后面的命令覆盖

3. 第一次build
    ```bash
    docker build -t my_image:1 .   #注意这个 . 告诉Docker：Dockerfile 和 COPY 文件都在当前目录
    ```

    docker build -- 执行构建 
    -t 名字:版本号

4. 验证镜像是否存在
    ```bash
    docker images | grep my_
    ```

5. 尝试运行容器
    ```bash
    docker run -it --rm my_image:1
    ```

6. 看到提示符变了

    类似如下
    ```bash
    root@a1b2c3d4e5f6:/#
    ```
7. 验证 RUN语句声明的python依赖是否安装成功
   
    ```bash
    python --version
    ```

到这里一个基础的带Python环境的ubuntu 22.04 的容器就搭建完毕了

### 4. 在镜像里配置ROS2 Humble 和 Gazebo

#### 配置下载源
- 如果有代理可以不用更改下载源
  
- 更改下载源
  >在Dockerfile里写入
  ```
  FROM ubuntu:22.04

    # ★ 新加的：先换清华源
    RUN sed -i \
            -e 's@//.*archive\.ubuntu\.com@//mirrors.tuna.tsinghua.edu.cn@g' \
            -e 's@//.*security\.ubuntu\.com@//mirrors.tuna.tsinghua.edu.cn@g' \
            /etc/apt/sources.list \
    && grep -c 'tuna' /etc/apt/sources.list

    RUN apt-get update && apt-get install -y python3
    CMD ["bash"]
  ```
  重新build 

 ```bash
    docker build -t 我的镜像:2 .
 ```

### 安装ROS2 Humble

在Dockerfile下加入
```
RUN apt-get update && apt-get install -y --no-install-recommends \
        ros-humble-desktop \
    && rm -rf /var/lib/apt/lists/*
```
再次build 并检验

比如需要每次构建时从宿主机上拷贝文件时 在 Dockerfile 里加入

```
COPY 宿主机路径(相对于构建上下文) 容器内的绝对路径
```

### 5. 配置.dockerignore忽略项
为什么：docker build ... . 那个 . 是把整个目录打包发给 Docker 引擎。目录里要是有 10GB 的 ws/，每次 build 都要先传一遍，即使 Dockerfile 里没用到。

内容大致如下 与.gitignore一样
```
# .dockerignore
.git/
__pycache__/
*.log
*.tmp
大文件夹/
```

### 6. 给build 加入自检

在 Dockerfile里加入

```
# ★ 构建期自检
RUN bash -c 'source /opt/ros/humble/setup.bash && \
             echo "ROS_DISTRO=$ROS_DISTRO" && \
             ros2 pkg prefix rviz2' \
 && command -v gazebo \
 && python3 --version
```
自动检查对应环境和设置环境变量

7. 启动和自检脚本这里不作赘述

### 7. 加挂载目录
```bash
docker run -it --name test \
  -v ~/containers/我的项目:/workspace \
  -w /workspace \
  22.04_humble:laster bash
```
`-v 宿主机路径:容器路径`	把宿主机这个文件夹插到容器里的那个位置

`-w /workspace`	进去后默认站在 /workspace

## ultralytics(YOLOV8)开发环境容器

### 官方网站有现成镜像直接使用启动容器 
```bash
    docker run -it --name test \
  -v ~/containers/我的项目:/workspace \
  -w /workspace \
  ultralytics/ultralytics:latest bash
```

### 配置显卡驱动(以nvidia显卡为例)
1. 先装驱动 `nvidia-smi`
2. 安装容器侧的支持
```bash
    # 加 NVIDIA 的软件源
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
    | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

    curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
    | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list >/dev/null

    # 装
    sudo apt update
    sudo apt install -y nvidia-container-toolkit

    # 告诉 docker 用它
    sudo nvidia-ctk runtime configure --runtime=docker
    sudo systemctl restart docker
    ```
    3. 加 --gpus all
    ```bash
    docker run -it --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
```
### 给容器加图形权限
```bash
xhost +local:root          # ← 在【宿主机】上先执行，给容器开图形权限

docker run -it --name test \
  -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -v $HOME/.Xauthority:/root/.Xauthority:ro \
  -e XAUTHORITY=/root/.Xauthority \
  -v ~/containers/我的项目:/workspace \
  -w /workspace \
  你的镜像 bash
```

## Label studio (要对外提供网页服务 → 加端口)

### 有现成镜像
无需build
### 直接跑
```bash
docker run -d --name label-studio \
  -p 8080:8080 \
  -v ~/containers/label-studio-data:/label-studio/data \
  heartexlabs/label-studio:latest
```
之后浏览器访问 http://localhost:8080 即可

也可以通过编写启动脚本和谷歌浏览器打包成桌面软件

### 设置开机自启 (label studio占用少可以)
```bash
docker run -d --restart unless-stopped --name label-studio ...
```
## 管理命令大全
```
Dockerfile
    |
    | build
    ↓
 Image
    |
    | run
    ↓
Container
    |
    | stop
    ↓
Container停止

    |
    | rm
    ↓

删除容器

Image仍存在

```
```bash
镜像
查看：
docker images

删除：
docker rmi image

容器
查看运行：
docker ps

查看全部：
docker ps -a

启动：
docker start xxx

进入：
docker exec -it xxx bash

删除：
docker rm xxx
```

## 总结与建议

![流程图](/assets/images/2026_10_10/从零搭建三类%20Docker%20容器全流程.png)

Docker 的核心思想是把复杂的软件环境封装成可复用的容器，实现环境隔离和快速部署。通过镜像管理环境，通过容器运行程序，通过挂载保存数据。iCAN、YOLO、Label Studio 虽然用途不同，但本质都是利用 Docker 创建稳定、可重复的开发环境。