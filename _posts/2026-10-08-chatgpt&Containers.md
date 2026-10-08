---
layout: post
title: "ChatGPT 与 Container Tools 插件的配置记录"
tags: [随笔, 教程]
---

这是一篇教程向的记录：怎么在国内把 ChatGPT（以及它自带的 Codex 客户端）配起来，再用 VS Code 的容器插件管理 Docker。

## 一：ChatGPT

### 1. 先解决网络

国内需要代理才能访问 ChatGPT。

1. 下载最新版 [Clash](https://clashsource.com/zh-CN/download.html)（用别的代理工具也行，这里以它为例）。
2. 按说明购买并配置好节点。
3. 启用**虚拟网卡模式**。
4. 单独给 ChatGPT 指定加速节点——默认的香港节点可能用不了。

### 2. 注册账号

注册方式有不少，我用的是**谷歌账号**直接登录。

### 3. 装客户端并登录

下载 ChatGPT 桌面客户端（里面自带 Codex）。打开后会要求做一次**网页版验证**，最后还需要一个**国外手机号**收验证码。

### 4. 把登录态导给 Codex

这里介绍一个开源项目 [codex-auth-helper](https://github.com/zhishile/codex-auth-helper)，它是一个 Chrome 扩展。把仓库克隆下来之后：

1. Chrome 地址栏输入 `chrome://extensions/` 进入扩展页。
2. 打开右上角的**开发者模式**。
3. 点**加载已解压的扩展程序**，选择仓库里的 `extension` 目录。
4. 登录网页版 ChatGPT，点插件图标导出身份信息，浏览器会下载一个 `auth.json`。
5. 把它放进 **Codex 的配置目录**——注意，**不是安装目录**。

我一开始在 Windows 上习惯了去安装目录里翻，换到 Linux 后怎么也找不到所谓的"安装目录"，后来才想明白：这两个位置本来就是分开的。**程序**装在 `/usr/lib/chatgpt/`（Windows 在 `%LOCALAPPDATA%`），而**登录态**永远在用户目录下的 `.codex/` 里。Codex 认的环境变量是 `CODEX_HOME`，默认就指向它。

```text
Windows        %USERPROFILE%\.codex\auth.json
Linux / macOS  ~/.codex/auth.json
```

命令行操作（Linux / macOS）：

```bash
mkdir -p ~/.codex
install -m 600 ~/下载/auth.json ~/.codex/auth.json    # 权限收到 600：里面是敏感凭证
```

放好后重启客户端即可。想确认有没有生效，可以跑一句 `codex login status`，正常会输出 `Logged in using ChatGPT`。

> **⚠️ 风险提示**
>
> 这类扩展的原理，是读取你浏览器里的 ChatGPT 会话（其中包含**长期有效的 `refresh_token`**），再拼成 Codex 需要的 `auth.json`；而它生成的 `id_token` 其实是伪造的（JWT 头是 `alg: none`，Codex 只做格式校验）。所以有三点值得留意：
>
> - 即便作者声称"100% 本地、零上传"，**你也没法自行核实**——动手前建议读一眼 `background.js` 和 `popup.js`；
> - 更稳妥的做法是**直接在客户端里登录**（客户端点 Sign in，或命令行 `codex login`，会拉起浏览器），让 OpenAI 自己签发凭证，效果完全一样；
> - 如果已经不打算再用这个扩展了，可以去 ChatGPT 网页版的「设置 → 安全 → 登出所有设备」，把这批凭证一次性作废。

## 二：VS Code 容器管理插件 Container Tools

插件名是 **Container Tools**（扩展 ID `ms-azuretools.vscode-containers`），在扩展市场里搜名字就能装。

### 界面

![容器面板](/assets/images/容器面板新手指南.png)

左侧活动栏的容器面板里，本机已有的镜像和正在运行的容器一目了然，也能直接对它们做启动 / 停止 / 删除。

### 进容器终端

![容器仿真运行流程指南](/assets/images/容器仿真运行流程指南.png)

右键容器 → **Attach Shell**（或者点面板里的终端图标），就能拿到一个容器内的 bash。下面这些命令我习惯直接在容器里敲：

### 常用命令

```bash
docker ps                            # 查看正在运行的容器
docker ps -a                         # 连已停止的容器一起看
docker images                        # 查看本地镜像
docker start   ican-delivery         # 启动容器
docker stop    ican-delivery         # 停止容器
docker restart ican-delivery         # 重启容器
docker exec -it ican-delivery bash   # 进入容器（等价于面板里的 Attach Shell）
docker logs    ican-delivery         # 查看容器日志
docker rmi     ican-delivery:humble  # 删除镜像（危险操作：删了得重新 build）
exit                                 # 退出容器
```

其余命令和直接在 Linux 上敲是一样的。（示例里的 `ican-delivery` 是我自己的仿真容器，换成你的容器名即可。）

---

文中的两张截图都是用 ChatGPT 生成的，也算顺带检验了一下配置是通的。
