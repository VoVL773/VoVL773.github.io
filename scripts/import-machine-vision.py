#!/usr/bin/env python3
"""把原项目的 md 教程导入 Jekyll；只写博客，不修改原项目。"""
import argparse
import json
from pathlib import Path
import re
import shutil
from urllib.parse import quote, unquote

ROOT = Path(__file__).resolve().parents[1]
REPO = 'https://github.com/VoVL773/Machine_vision-_color_sorting_system'
CHAPTERS = [
    ('README (目录).md', '00-overview', '课程介绍与学习路线', '课程导读', '从纯 Python 视觉模块到 ROS 2 服务，按项目结构逐步构建颜色分拣系统。'),
    ('一.接口包(color_sorting_interfaces).md', '01-interfaces', '接口包与消息定义', '基础与接口', '创建 color_sorting_interfaces，定义视觉模块与 ROS 2 之间的消息接口。'),
    ('二.包骨架创建与 HSV 配置层.md', '02-hsv-config', '包骨架与 HSV 配置', '基础与接口', '创建 Python 包，用 HSVConfig 管理颜色阈值、参数校验与配置持久化。'),
    ('三.检测与跟踪层：color_detector.py.md', '03-color-detector', '颜色检测与目标跟踪', '纯 Python 视觉模块', '从颜色掩码、形态学处理到轮廓筛选，输出可跟踪的目标列表。'),
    ('四.可视化层：visualization.py.md', '04-visualization', '检测结果可视化', '纯 Python 视觉模块', '绘制目标信息并拼接颜色掩码，把检测结果变成直观的调试画面。'),
    ('五.中文调参面板：gui.py.md', '05-gui', '交互调参与控制面板', '纯 Python 视觉模块', '通过 OpenCV 滑块实时修改 HSV 参数，与检测器共享配置。'),
    ('六.合成测试场景：image_sources.py.md', '06-image-sources', '合成图像与测试场景', '纯 Python 视觉模块', '没有相机也能测试：生成多色移动目标与噪点，验证完整视觉流水线。'),
    ('七.ROS视觉服务端：Mvc_sorting_server.py.md', '07-ros-server', 'ROS 2 视觉服务端', '接入 ROS 2', '读取图像、发布目标消息，并提供配置保存与加载服务。'),
    ('八.订阅客户端：Mvc_sorting_client.py.md', '08-ros-client', 'ROS 2 订阅客户端', '接入 ROS 2', '订阅检测结果，验证机器人侧接收到的目标数据。'),
    ('九.配置、launch与测试.md', '09-launch-testing', '配置、启动与测试', '接入 ROS 2', '整理默认配置、launch 与测试，在新工作区中复现整个系统。'),
]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='原项目 md 目录的绝对路径')
    args = parser.parse_args()
    source = args.source.resolve()
    # 先检查完整输入，再写入，避免目录选错时留下半套教程。
    for filename, *_ in CHAPTERS:
        if not (source / filename).is_file():
            parser.error('缺少教程文件：' + filename)
    if not (source / 'assets/image').is_dir():
        parser.error('缺少 assets/image 图片目录')
    output = ROOT / '_tutorials/machine-vision'
    output.mkdir(parents=True, exist_ok=True)
    image_output = ROOT / 'assets/images/tutorials/machine-vision'
    shutil.copytree(source / 'assets/image', image_output, dirs_exist_ok=True)
    urls = {item[0]: '/tutorials/machine-vision/' + item[1] + '/' for item in CHAPTERS}

    def rewrite(match):
        target = unquote(match.group(2).strip('<>'))
        path, sep, fragment = target.partition('#')
        if path.startswith('./assets/image/'):
            image = path.removeprefix('./assets/image/')
            if not (source / 'assets/image' / image).is_file():
                raise ValueError('图片不存在：' + path)
            url = "{{ '/assets/images/tutorials/machine-vision/" + image + "' | relative_url }}"
        elif path.removeprefix('./') in urls:
            url = "{{ '" + urls[path.removeprefix('./')] + "' | relative_url }}"
        elif path.startswith('../'):
            relative = path.removeprefix('../')
            kind = 'tree' if path.endswith('/') else 'blob'
            url = REPO + '/' + kind + '/main/' + quote(relative, safe='/')
        else:
            return match.group(0)
        if sep:
            url += '#' + quote(fragment)
        return match.group(1) + url + ')'

    for order, (filename, slug, title, group, description) in enumerate(CHAPTERS):
        text = (source / filename).read_text()
        text = re.sub(r'<!-- chapter-navigation -->.*?<!-- /chapter-navigation -->', '', text, flags=re.S)
        text = text.strip()
        text = re.sub(r'^---\s*\n', '', text).strip()
        if order == 0:
            text = text.replace('![项目结构](./assets/image/项目结构.png)', '').strip()
            text = '## 开始之前\n\n' + text + '\n\n## 项目结构\n\n![项目结构](./assets/image/项目结构.png)\n'
        # 只改 Markdown 文本；代码围栏内的源码保持原样。
        pieces = re.split(r'(^```[^\n]*\n.*?^```\s*$)', text, flags=re.M | re.S)
        for index in range(0, len(pieces), 2):
            piece = pieces[index]
            # kramdown 的表格需要与上下段落分开；原文部分表格紧贴正文。
            piece = re.sub(r'(?m)(^\|[^\n]*\|[ \t]*\n?)+', lambda match: '\n' + match.group(0).rstrip() + '\n\n', piece)
            if order != 0:
                piece = re.sub(r'^(#{1,5}) ', r'#\1 ', piece, flags=re.M)
            else:
                piece = re.sub(r'^# 目录$', '## 课程目录', piece, flags=re.M)
            pieces[index] = re.sub(r'(!?\[[^\]\n]*\]\()(<[^>\n]+>|[^)\n]+)\)', rewrite, piece)
        metadata = {'title': title, 'course': 'machine-vision', 'order': order, 'group': group,
                    'description': description, 'source_doc': filename}
        frontmatter = '\n'.join(key + ': ' + json.dumps(value, ensure_ascii=False) for key, value in metadata.items())
        (output / (slug + '.md')).write_text('---\n' + frontmatter + '\n---\n\n' + ''.join(pieces).strip() + '\n')
    print('已导入课程导读、9 章教程和图片。原项目未修改。')


if __name__ == '__main__':
    main()
