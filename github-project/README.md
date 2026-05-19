# ZHUANG-AI Retouch

> AI 修图项目矩阵：已完成的 Photoshop UXP 插件、已发布的 ZHUANG-AI mini 手机端，以及规划中的 ZHUANG-AI pro 加强版非线性修图工作流。  
> AI retouch project suite: a completed Photoshop UXP plugin, a released ZHUANG-AI mini mobile app, and a planned ZHUANG-AI pro nonlinear retouch workflow.

## 第三方参考与署名 / Third-Party Attribution

本项目中 RunningHub 接入流程的部分实现参考了小T（PixelRunner / 小T修图助手）的公开思路与接口组织方式。

Some parts of the RunningHub integration flow in this project were implemented with reference to the publicly shared ideas and API organization from 小T (PixelRunner / 小T修图助手).

- 参考方向 / Referenced areas:
  - RunningHub 应用 ID 归一化 / app ID normalization
  - RunningHub 应用解析流程 / app metadata parsing flow
  - RunningHub 任务提交与轮询 / task submission and polling flow
- 署名保留 / Attribution retained: 小T
- 当前项目作者 / Current project author: 庄泽 / 零柒zero

如分发包含这部分参考实现的版本，请保留仓库内 `NOTICE` 文件中的署名说明。

## 项目结构 / Project Structure

- `../zhuang-ai-plugin/` — Photoshop UXP 插件源文件 / Photoshop UXP plugin source files
- `../mini/` — ZHUANG-AI mini 手机端 Web / PWA 源文件 / mobile Web / PWA source files
- `./docs/` — GitHub Pages 官网与教程 / website and tutorials for GitHub Pages
- `./dist/` — 发布包与下载文件 / release packages and downloadable files
- `./ZHUANG-AI 1.4.1/` — Photoshop 插件发布目录 / Photoshop plugin release folder
- `./ZHUANG-AI 1.4.1.zip` — Photoshop 插件发布压缩包 / Photoshop plugin release ZIP

如果只想安装到 Photoshop `Plug-ins` 目录，推荐使用干净的拖拽安装包：

For direct installation into Photoshop `Plug-ins`, use the clean drag-and-drop package:

- `dist/ZHUANG-AI-PS-Plugins.zip`

解压后把整个 `ZHUANG-AI-PS-Plugins` 文件夹拖入或复制到 Photoshop 的 `Plug-ins` 目录。

After extracting it, drag or copy the whole `ZHUANG-AI-PS-Plugins` folder into Photoshop `Plug-ins`.

## 官网 / Website

- 官网 / Website: https://gqetugts-boop.github.io/ZHUANG-AI-Retouch/
- 个人网站：https://www.syyyy.online
- GitHub: https://github.com/gqetugts-boop/ZHUANG-AI-Retouch
- 插件交流群 / QQ Group: `1103212650`
- 作者 / Author: 庄泽 / 零柒zero

## 项目矩阵 / Project Suite

### ZHUANG-AI 1.4.1 正式版

当前已完成并可下载的 Photoshop UXP 插件。

ZHUANG-AI is the completed and downloadable Photoshop UXP plugin.

核心定位：把 AI 生图、文字对话、参考图、提示词预设、批处理、VFX 小应用、合成辅助器、特效迁移、AI超清、SD WebUI 和 RunningHub 应用流程放进一个 Photoshop 原生面板里。

Core idea: bring AI image generation, text chat, reference images, prompt presets, batch processing, VFX apps, compositing helper maps, effect transfer, AI super-resolution, SD WebUI, RunningHub apps, and Photoshop placement into one native panel.

### ZHUANG-AI mini

已发布的手机端 Web / PWA 轻量应用，支持主图、参考图、提示词预设、对话分析、历史记录与本地设置保存，并可直接连接 GRS API。

Released mobile Web / PWA app with main image upload, reference images, prompt presets, chat analysis, history, local settings, and direct GRS API connection.

- 在线入口 / Live app: https://gqetugts-boop.github.io/ZHUANG-AI-Retouch/mini/
- 打包下载 / Packages:
  - `dist/ZHUANG-AI-mini.zip`
  - `dist/ZHUANG-AI-mini-PWA.zip`

### ZHUANG-AI pro

加强版非线性修图工作流预告，暂不可下载。

Pro nonlinear retouch workflow preview, not available for download yet.

## 核心功能 / Features

- Photoshop 选区图生图 / Photoshop selection-based image generation
- 最多 4 张参考图 / Up to 4 reference images
- 参考图预览、删除、重新抓取 / Preview, remove, and recapture reference images
- VFX 特效小应用 / VFX effect app
- 合成辅助器：深度图、法线图、分割图、雾效遮罩、高光反射图、边缘线稿 / Composite helper maps
- 特效迁移：分析后迁移、双图直接参考迁移 / Effect transfer with two workflows
- AI超清：切片式 Nano Banana 2 4K 放大 / Tiled Nano Banana 2 4K AI super-resolution
- RunningHub 应用导入、解析、图片上传、任务提交与轮询 / RunningHub app import and execution
- SD WebUI 工作流 / SD WebUI workflow
- 提示词预设与批处理任务 / Prompt presets and batch tasks
- GRS 文字对话与 Photoshop 选区图文问答 / GRS text chat and multimodal selection chat
- 所有小应用生成默认自然比例，不强制 1:1 或固定区域大小 / Small apps use natural aspect ratio by default
- 普通对齐不改变 Photoshop 画布大小 / Normal alignment does not resize the Photoshop canvas

## 模型接入 / Model Support

### 生图模型 / Image Models

- claude Imagine-2
- Nano Banana 全系列 / Nano Banana full series
- Nano Banana 2 4K / Nano Banana 2 4K
- RunningHub 应用 / RunningHub apps
- SD WebUI 本地模型 / local SD WebUI models

### 文字模型 / Text Models

- Gemini 全系列 / Gemini full series
- claude 全系列 / claude full series
- GRS 对话模型 / GRS chat models

## 下载 / Download

可以从官网首页下载：

Download from the website:

https://gqetugts-boop.github.io/ZHUANG-AI-Retouch/

仓库内也包含发布包：

The release package is also included in this repository:

- `ZHUANG-AI 1.4.1.zip`
- `ZHUANG-AI 1.4.1/`
- `dist/ZHUANG-AI-mini.zip`
- `dist/ZHUANG-AI-mini-PWA.zip`

## 安装 / Installation

### 方法 1：复制到 Photoshop 插件目录

1. 退出 Photoshop。
2. 解压 `ZHUANG-AI 1.4.1.zip`。
3. 把整个 `ZHUANG-AI 1.4.1` 文件夹复制到 Photoshop 的 `Plug-ins` 插件目录。
4. 重新打开 Photoshop。
5. 在顶部菜单 `插件 / Plugins` 中打开 `ZHUANG-AI 修图插件`。

### Method 1: Copy to Photoshop Plug-ins folder

1. Quit Photoshop.
2. Extract `ZHUANG-AI 1.4.1.zip`.
3. Copy the whole `ZHUANG-AI 1.4.1` folder to Photoshop `Plug-ins`.
4. Reopen Photoshop.
5. Open `ZHUANG-AI 修图插件` from `Plugins`.

### 方法 2：UXP Developer Tool

1. 打开 UXP Developer Tool。
2. 点击 `Add Plugin`。
3. 选择 `ZHUANG-AI 1.4.1/manifest.json`。
4. 点击 `Load` 或 `Reload`。

### Method 2: UXP Developer Tool

1. Open UXP Developer Tool.
2. Click `Add Plugin`.
3. Select `ZHUANG-AI 1.4.1/manifest.json`.
4. Click `Load` or `Reload`.

## 使用教程 / Tutorial

- 官网教程 / Website tutorial: https://gqetugts-boop.github.io/ZHUANG-AI-Retouch/tutorial.html
- 本地教程 / Local tutorial: `ZHUANG-AI 1.4.1/使用教程.html`

## 版本 / Version

### 1.4.1 正式版

- 新增并完善应用/小应用工作区：VFX 特效、合成辅助器、特效迁移、AI超清、SD WebUI 和 RunningHub 应用集中管理。
- VFX 特效、合成辅助器、特效迁移、AI超清和 RunningHub 生成流程默认使用自然比例，不再强制 1:1 或固定区域大小。
- 合成辅助器可通过原图 + 专用提示词直接生成深度图、法线图、分割图、雾效遮罩、高光反射图、边缘线稿等辅助图。
- 特效迁移提供两种方案：先分析特效图生成提示词后迁移，或原图 + 特效图直接作为参考迁移。
- AI超清支持 2x / 3x / 4x 自动切片，使用 Nano Banana 2 4K 进行 tile 级超清放大并回贴。
- WebUI 已进入应用页，新增返回小应用按钮，重绘幅度改为文字输入框。
- RunningHub 应用支持更稳定的导入、解析、图片上传、任务提交、轮询和删除。
- 应用页主要下拉框改为内联伪下拉框，修复展开时遮挡文本输入区域的问题。
- 修复 UXP 环境下 `FileReader is not defined` 的图片处理问题。
- 修复参考图预览刷新与多格式 base64/data URL 兼容问题。
- 所有小应用结果图层默认使用正常混合模式。
- 同步教程、官网、README、发布包与插件版本号到 1.4.1。

### 1.4.1 Stable

- Added and improved the Apps workspace for VFX, Composite Assistant, Effect Transfer, AI Super Resolution, SD WebUI, and RunningHub apps.
- Small-app image generation now uses natural aspect ratio by default instead of forcing 1:1 or fixed generation regions.
- Composite Assistant can generate depth, normal, segmentation, fog mask, reflection, edge, and luminance helper maps directly from source image and dedicated prompts.
- Effect Transfer supports both analyze-then-generate and direct two-image reference workflows.
- AI Super Resolution supports tiled 2x / 3x / 4x Nano Banana 2 4K enhancement.
- WebUI now lives inside Apps, includes a back button, and uses a text input for denoising strength.
- RunningHub app import, parsing, image upload, task polling, and deletion are more stable.
- App dropdowns use inline pseudo selects to avoid overlapping text fields in UXP.
- Fixed UXP image processing without FileReader and improved reference preview compatibility.
- Synced tutorials, website, README, release copies, and plugin version to 1.4.1.

## 声明 / Notice

ZHUANG-AI 插件完全免费。如果你从任何渠道付费获取本插件，请立即举报商家。

ZHUANG-AI is completely free. If someone sells this plugin to you, please report it.

本插件仅供合法图像后期处理、学习和创作使用。

This plugin is intended for lawful image retouching, learning, and creative workflows only.
