---
layout: post
title: "从零开始的容器教程"
tags: [随笔, 教程]
cover: "assets/images/2026_10_10/Docker.png"
---

这篇博客记录我怎么从零搭建三类容器：**Ubuntu 22.04 + ROS 2 Humble**、**YOLOv8 编译环境**，以及 **Label Studio 标注工具**。三者用途完全不同，但搭建套路是一致的——看完你应该也能照着做出自己的容器。

## Ubuntu 22.04 + ROS 2 Humble 容器

假设你刚装好 Ubuntu，但系统版本是 24.04（甚至 26.04），而你要用的 ROS 2 Humble 只支持 22.04。为了一个需求把系统删了重装，显然不划算。

那有没有办法在 24.04 上跑基于 22.04 的 ROS 2 Humble？有，用容器。下面就是完整过程。

先用一张流程图把整体过一遍：

![iCAN 容器搭建全流程](/assets/images/2026_10_10/iCAN容器搭建全流程指南.png)

接下来一步一步来。

### 1. 环境准备

先装 Docker 本体：

```bash
sudo apt update
sudo apt install -y docker.io
```

然后把当前用户加进 `docker` 组，这样后面用 Docker 命令就不用每次都加 `sudo`：

```bash
sudo usermod -aG docker $USER
```

`-aG` 里的 `a` 是 *append*，**不能省**——写成 `-G` 会把用户已有的附加组整体替换掉。

这一步**注销重登后才生效**。重新登录后跑一次 `groups`，输出里能看到 `docker` 就成了。

保险起见，再验证一次：

```bash
docker run hello-world
```

看到下面这段，说明 Docker 已经装好了：

```txt
Hello from Docker!
This message shows that your installation appears to be working correctly.
```

### 2. 镜像准备

先看有没有现成镜像：[Docker Hub](https://hub.docker.com/)。

如果官方已经提供，那会省事非常多。但我们要的这个官方没有，所以只能自己 build 一个。

同样先用一张图过一下流程：

![从零搭建 Docker 镜像](/assets/images/2026_10_10/从零搭建%20Docker%20镜像教程海报.png)

### 3. build 基础镜像

1. 准备一个空目录：

   ```bash
   mkdir -p ~/docker_text/first_image
   cd ~/docker_text/first_image
   ls -a          # 确认目录里只有 . 和 ..
   ```

2. 创建第一个文件 `Dockerfile`（没有后缀），写入：

   ```dockerfile
   FROM ubuntu:22.04
   RUN apt-get update && apt-get install -y python3
   CMD ["bash"]
   ```

   这三行分别是什么意思：

   - `FROM ubuntu:22.04` —— 以官方的 `ubuntu:22.04` 镜像作为起点。
   - `RUN apt-get update && apt-get install -y python3` —— **构建时**执行，结果会固化进镜像。
   - `CMD ["bash"]` —— **运行时**的默认启动命令，可以被 `docker run` 后面跟的命令覆盖。

3. 第一次 build：

   ```bash
   docker build -t my_image:1 .
   ```

   末尾这个 `.` 是**构建上下文**，告诉 Docker：`Dockerfile` 和要 COPY 的文件都在当前目录。

   - `docker build` —— 执行构建。
   - `-t 名字:版本号` —— 给镜像打标签。

4. 确认镜像在不在：

   ```bash
   docker images | grep my_
   ```

5. 试着跑一个容器：

   ```bash
   docker run -it --rm my_image:1
   ```

6. 看到提示符变了，就说明已经进到容器里了：

   ```text
   root@a1b2c3d4e5f6:/#
   ```

7. 验证 `RUN` 里装的 Python 是否真的进了镜像：

   ```bash
   python3 --version
   ```

到这里，一个带 Python 环境的 Ubuntu 22.04 基础容器就搭好了。

### 4. 在镜像里配置 ROS 2 Humble 和 Gazebo

#### 配置下载源

如果不走代理，就得把 apt 源换成国内镜像，否则下载会很慢甚至中断。

在 `Dockerfile` 里这么写（以清华源为例）：

```dockerfile
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

改完重新 build：

```bash
docker build -t my_image:2 .
```

#### 安装 ROS 2 Humble

继续在 `Dockerfile` 里追加：

```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
        ros-humble-desktop \
 && rm -rf /var/lib/apt/lists/*
```

然后重新 build，再验证一次。

如果构建时需要从宿主机拷文件进去，就再加一行 `COPY`：

```dockerfile
COPY 宿主机路径（相对于构建上下文） 容器内的绝对路径
```

### 5. 配置 .dockerignore

`docker build ... .` 里的那个 `.`，是把**整个目录打包发给 Docker 引擎**。如果目录里躺着一个 10 GB 的 `ws/`，即使 `Dockerfile` 根本用不到它，每次 build 也都要先传一遍。

所以加一个 `.dockerignore`，写法跟 `.gitignore` 一样：

```text
# .dockerignore
.git/
__pycache__/
*.log
*.tmp
大文件夹/
```

### 6. 给 build 加入自检

在 `Dockerfile` 末尾加一段构建期自检。这样任何一项不满足，build 当场就会失败，而不是等到真用的时候才发现：

```dockerfile
# ★ 构建期自检
RUN bash -c 'source /opt/ros/humble/setup.bash && \
             echo "ROS_DISTRO=$ROS_DISTRO" && \
             ros2 pkg prefix rviz2' \
 && command -v gazebo \
 && python3 --version
```

至于启动容器、以及进容器之后的自检脚本，各家写法差别不大，这里就不展开了。

### 7. 加挂载目录

```bash
docker run -it --name test \
  -v ~/containers/我的项目:/workspace \
  -w /workspace \
  22.04_humble:latest bash
```

- `-v 宿主机路径:容器路径` —— 把宿主机这个文件夹挂到容器里的那个位置。
- `-w /workspace` —— 进去后默认站在 `/workspace`。

## Ultralytics（YOLOv8）开发环境容器

### 官网有现成镜像，直接用

这个不用自己 build，官方就提供了镜像：

```bash
docker run -it --name test \
  -v ~/containers/我的项目:/workspace \
  -w /workspace \
  ultralytics/ultralytics:latest bash
```

### 配置显卡驱动（以 NVIDIA 显卡为例）

1. 先确认宿主机已经装好驱动——跑 `nvidia-smi` 能看到显卡信息就行。

2. 再装容器侧的支持（nvidia-container-toolkit）：

   ```bash
   # 加 NVIDIA 的软件源
   curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey \
     | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

   curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
     | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
     | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list >/dev/null

   # 安装
   sudo apt update
   sudo apt install -y nvidia-container-toolkit

   # 让 docker 用上它
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker
   ```

3. 之后 run 容器时加上 `--gpus all`，就能验证显卡是否透传进去了：

   ```bash
   docker run -it --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi
   ```

### 给容器加图形权限

想在容器里跑 Gazebo、RViz 这类带界面的程序，得先把宿主机 X 的权限开给容器：

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

## Label Studio（要对外提供网页服务 → 加端口）

### 有现成镜像

不用 build。

### 直接跑

```bash
docker run -d --name label-studio \
  -p 8080:8080 \
  -v ~/containers/label-studio-data:/label-studio/data \
  heartexlabs/label-studio:latest
```

跑起来之后，浏览器访问 <http://localhost:8080> 就行。

也可以把启动脚本配合 Chrome 打包成一个桌面应用。

### 设置开机自启

Label Studio 占用不大，可以让它常驻：

```bash
docker run -d --restart unless-stopped --name label-studio ...
```

## 管理命令大全

先记住镜像和容器的关系：

```text
Dockerfile
    │ build
    ▼
  Image ───────┐
    │ run      │  同一个镜像可以 run 出多个容器
    ▼          │
 Container ◀───┘
    │ stop
    ▼
 容器停止（容器还在，可以 start 回来）
    │ rm
    ▼
 删除容器（镜像仍然存在）
```

### 镜像

```bash
docker images             # 查看
docker rmi <image>        # 删除
```

### 容器

```bash
docker ps                 # 查看正在运行的
docker ps -a              # 查看全部（含已停止的）
docker start <容器>        # 启动
docker exec -it <容器> bash   # 进入
docker rm <容器>           # 删除
```

## 总结与建议

![从零搭建三类 Docker 容器全流程](/assets/images/2026_10_10/从零搭建三类%20Docker%20容器全流程.png)

Docker 的核心思想，是把复杂的软件环境封装成可复用的容器，从而实现环境隔离与快速部署：**用镜像管理环境，用容器运行程序，用挂载保存数据**。

iCAN、YOLO、Label Studio 用途各不相同，但本质都是一样的——借 Docker 得到一份稳定、可重复的开发环境。
