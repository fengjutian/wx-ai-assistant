# wx-ai-assistant

## 项目简介

wx-ai-assistant 是一款基于 Electron 和 React 开发的智能助手桌面应用，集成了网页浏览和 AI 聊天功能，为用户提供一站式的信息获取和智能交互体验。

## 功能特性

- 🖥️ **集成网页浏览器**：左侧面板内置网页浏览功能，支持访问任意网站
- 💬 **AI 聊天助手**：右侧面板提供 AI 模型交互功能，支持向大模型提问
- ⚡ **快捷键支持**：使用 Ctrl/Cmd+L 快速聚焦到地址栏
- 📱 **自适应界面**：响应式设计，提供流畅的用户体验
- 🌐 **双环境支持**：在 Electron 环境和开发环境中都能正常运行

## 技术栈

- **前端框架**：React 18 + TypeScript
- **桌面应用框架**：Electron 39
- **构建工具**：Electron Forge + Vite
- **样式**：CSS (原生)

## 安装指南

### 前置要求

- Node.js (推荐 v16 或更高版本)
- npm 或 yarn 包管理器

### 本地开发环境设置

1. 克隆项目仓库：

```bash
git clone https://github.com/fengjutian/wx-ai-assistant.git
cd wx-ai-assistant
```

2. 安装依赖：

```bash
npm install
# 或
yarn install
```

3. 启动开发服务器：

```bash
npm run dev
# 或
yarn dev
```

## 使用方法

### 网页浏览

- 在左侧地址栏输入网址，按 Enter 键或点击 "Go" 按钮导航到该网站
- 使用快捷键 Ctrl/Cmd+L 快速聚焦到地址栏

### AI 聊天

- 在右侧输入框中输入您的问题
- 按 Ctrl/Cmd+Enter 发送消息或点击 "发送" 按钮
- AI 助手将处理您的请求并返回回复

## 开发说明

### 主要文件结构

- `src/` - 源代码目录
  - `App.tsx` - 主应用组件
  - `main.ts` - Electron 主进程入口
  - `preload.ts` - 预加载脚本
  - `index.css` - 全局样式
- `index.html` - HTML 入口文件
- `vite.renderer.config.ts` - Vite 渲染进程配置

### 开发命令

- `npm run dev` - 启动开发服务器
- `npm run lint` - 运行 ESLint 代码检查
- `npm run prettier` - 格式化代码
- `npm run prettier:check` - 检查代码格式化

### 构建和打包

```bash
# 打包应用（生成可执行文件，但不创建安装包）
npm run package

# 创建安装包（根据当前操作系统生成相应格式的安装包）
npm run make

# 发布应用（可选）
npm run publish
```

## 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 贡献

欢迎提交 Issues 和 Pull Requests 来改进这个项目！

## 联系作者

- **作者**：fengjutian
- **邮箱**：fjutian@foxmail.com

## 警告 

- **不能下载微信读书**：
  - **不要** 尝试批量爬取全书内容下载到本地，这违反腾讯服务条款且不仅涉及封号风险，还有法律风险。
  - **合规做法**：仅处理用户"当前浏览页面"的内容，或者用户"主动划线/复制"的内容。将产品定义为"阅读辅助工具"而非"下载器"。
