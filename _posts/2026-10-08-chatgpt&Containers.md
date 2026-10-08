---
layout: post
title: "ChatGPT的使用&ContainerTools插件的使用"
tags: [随笔，教程]
---

这是一个教程向的博客，简单介绍一下怎么配置ChatGPT和容器插件的使用


## ChatGPT的使用

首次在国内需要代理才可以使用ChatGPT

首先下载最新版的[Clash](https://clashsource.com/zh-CN/download.html)(也可以是其它的，这里我以这个为例)

之后按照使用说明购买和配置代理 
1. 启用虚拟网卡模式 
2. 单独设置ChatGPT的加速节点(因为默认加速香港可能用不了)

现在注册ChatGPT账号 可以有多种办法注册 这里我使用谷歌账号登陆

下载ChatGPT软件(codex) 进入软件我们会发现需要网页版验证 最后使用国外手机号的验证码

现在就是本篇博客的第一个重点了 介绍一个谷歌浏览器的开源项目[codex-auth-helper](https://github.com/zhishile/codex-auth-helper)

克隆该仓库的内容

进入Chrome浏览器 
1. 输入`chrome://extensions/` 进入拓展选项 
2. 开启开发者模式 
3. 点击加载未打包的拓展程序选择克隆仓库的extension目录即可加载拓展
4. 登陆网页版的ChatGPT点击插件导出身份信息
5. 将下载的auth.json文件放入Codex的安装目录下即可(可以借助AI工具辅助)


## VScode容器管理插件 Container Tools的使用

介绍一下插件界面 

![容器面板](/assets/images/容器面板新手指南.png)

接下来介绍进入容器的终端界面

![容器流程](/assets/images/容器仿真运行流程指南.png)

容器常用指令清单

查看正在运行的容器的文件 `docker ps`

启动 `docker start 容器名`

停止 `docker stop ican-delivery`

重启 `docker restart ican-delivery`

进入容器 `docker exec -it 容器名 bash`

查看镜像 `docker images`

删除镜像(危险操作可能会影响后面容器的使用) `docker rmi ican-delivery:humble`

查看容器日志 `docker logs 容器名`

退出容器 `exit`

其余命令与Linux相同

本文的两张图片均为ChatGPT生成也算是检验配置结果了