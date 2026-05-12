# ZHUANG-AI Retouch

> AI 修图项目矩阵：已完成的 Photoshop UXP 插件、规划中的 ZHUANG-AI mini 手机端，以及 ZHUANG-AI pro 加强版非线性修图工作流。  
> AI retouch project suite: a completed Photoshop UXP plugin, upcoming ZHUANG-AI mini for mobile, and ZHUANG-AI pro for nonlinear retouch workflows.

## 官网 / Website

- 官网 / Website: https://gqetugts-boop.github.io/ZHUANG-AI/
- GitHub: https://github.com/gqetugts-boop/ZHUANG-AI-Retouch
- 插件交流群 / QQ Group: `1103212650`
- 作者 / Author: 庄泽 / 零柒zero

## 项目矩阵 / Project Suite

### ZHUANG-AI 1.3.5 正式版

当前已完成并可下载的 Photoshop UXP 插件。

ZHUANG-AI is the completed and downloadable Photoshop UXP plugin.

核心定位：把 AI 生图、文字对话、参考图、提示词预设、批处理和 Photoshop 回图流程放进一个原生面板里。

Core idea: bring AI image generation, text chat, reference images, prompt presets, batch processing, and Photoshop placement into one native panel.

### ZHUANG-AI mini

手机端项目预告，暂不可下载。

Mobile version preview, not available for download yet.

### ZHUANG-AI pro

加强版非线性修图工作流预告，暂不可下载。

Pro nonlinear retouch workflow preview, not available for download yet.

## 核心功能 / Features

- Photoshop 选区图生图 / Photoshop selection-based image generation
- 最多 4 张参考图 / Up to 4 reference images
- 参考图预览、删除、重新抓取 / Preview, remove, and recapture reference images
- 提示词预设 / Prompt presets
- 批处理任务 / Batch tasks
- GRS 文字对话 / GRS text chat
- Photoshop 选区图文问答 / Multimodal chat with Photoshop selection context
- SD WebUI 工作流 / SD WebUI workflow
- 日志与设置管理 / Logs and settings
- 普通对齐不改变 Photoshop 画布大小 / Normal alignment does not resize the Photoshop canvas

## 模型接入 / Model Support

### 生图模型 / Image Models

- claude Imagine-2
- Nano Banana 全系列 / Nano Banana full series

### 文字模型 / Text Models

- Gemini 全系列 / Gemini full series
- claude 全系列 / claude full series

## 下载 / Download

可以从官网首页下载：

Download from the website:

https://gqetugts-boop.github.io/ZHUANG-AI/

仓库内也包含发布包：

The release package is also included in this repository:

- `ZHUANG-AI 1.3.5.zip`
- `ZHUANG-AI 1.3.5/`

## 安装 / Installation

### 方法 1：复制到 Photoshop 插件目录

1. 退出 Photoshop。
2. 解压 `ZHUANG-AI 1.3.5.zip`。
3. 把整个 `ZHUANG-AI 1.3.5` 文件夹复制到 Photoshop 的 `Plug-ins` 插件目录。
4. 重新打开 Photoshop。
5. 在顶部菜单 `插件 / Plugins` 中打开 `ZHUANG-AI 修图插件`。

### Method 1: Copy to Photoshop Plug-ins folder

1. Quit Photoshop.
2. Extract `ZHUANG-AI 1.3.5.zip`.
3. Copy the whole `ZHUANG-AI 1.3.5` folder to Photoshop `Plug-ins`.
4. Reopen Photoshop.
5. Open `ZHUANG-AI 修图插件` from `Plugins`.

### 方法 2：UXP Developer Tool

1. 打开 UXP Developer Tool。
2. 点击 `Add Plugin`。
3. 选择 `ZHUANG-AI 1.3.5/manifest.json`。
4. 点击 `Load` 或 `Reload`。

### Method 2: UXP Developer Tool

1. Open UXP Developer Tool.
2. Click `Add Plugin`.
3. Select `ZHUANG-AI 1.3.5/manifest.json`.
4. Click `Load` or `Reload`.

## 使用教程 / Tutorial

- 官网教程 / Website tutorial: https://gqetugts-boop.github.io/ZHUANG-AI/tutorial.html
- 本地教程 / Local tutorial: `ZHUANG-AI 1.3.5/使用教程.html`

## 版本 / Version

### 1.3.5 正式版

- 新增多参考图功能，最多支持 4 张参考图。
- 参考图可预览、删除、重新抓取。
- 参考图可随预设和批处理任务保存。
- 优化生图界面布局。
- 修复回图可能改变 Photoshop 画布大小的问题。
- 更新官网、教程和发布包。

### 1.3.5 Stable

- Added multi-reference image support, up to 4 reference images.
- Reference images can be previewed, removed, and recaptured.
- Reference images are preserved in presets and batch tasks.
- Improved image generation UI layout.
- Fixed an issue where image placement could resize the Photoshop canvas.
- Updated website, tutorial, and release package.

## 声明 / Notice

ZHUANG-AI 插件完全免费。如果你从任何渠道付费获取本插件，请立即举报商家。

ZHUANG-AI is completely free. If someone sells this plugin to you, please report it.

本插件仅供合法图像后期处理、学习和创作使用。

This plugin is intended for lawful image retouching, learning, and creative workflows only.
