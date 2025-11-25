### 一、 核心架构思路：不仅仅是浏览器

不要把 Electron 仅仅当作一个壳。核心思路应当是 **“双层架构”**：

1.  **底层（View Layer）：** `BrowserView` 或 `Webview` 加载微信读书官方网页，保持原汁原味的阅读体验。
2.  **顶层（Intelligence Layer）：** 通过 `preload.js` 注入脚本，监听 DOM 事件（选词、翻页、笔记），并将数据传给 Electron 主进程。主进程对接 AI（OpenAI/Claude/本地 LLM），并通过侧边栏或悬浮窗反馈给用户。

**差异化定位：**

  * **普通助手：** 查词、翻译。
  * **你的助手：** 建立书籍之间的连接、自动化笔记整理、RAG（检索增强生成）私有知识库。

-----

### 二、 功能点规划（由浅入深）

#### 1\. 基础增强功能 (Base Experience)

  * **沉浸式禅模式：** 移除网页版顶部导航栏、右下角浮窗，仅保留书本内容，提供真正的全屏阅读体验。
  * **AI 智能划线助手（Floating Action Menu）：**
      * 当用户在书中划线时，在原有的“写想法/复制”菜单旁注入一个 **AI 图标**。
      * **功能：** 深度解释（Deep Explain）、总结这段话、润色重写、翻译、提取关键词。
  * **TTS 朗读升级：** 微信读书自带的语音较机械。利用 Electron 调用 Azure TTS 或 OpenAI TTS，提供极其逼真的“听书”体验。

#### 2\. 深度阅读功能 (Deep Reading)

  * **章节 AI 导读 (Chapter Briefing)：**
      * 在进入新章节时，侧边栏自动生成该章节的“核心观点预览”或“人物关系图谱”。
  * **苏格拉底式提问 (Socratic Questioning)：**
      * AI 不仅回答问题，还主动向用户提问。读完一章后，AI 弹窗：“你认为作者在这里提出的观点，是否存在幸存者偏差？” 强迫用户思考。
  * **反向关联 (Counter-Argument)：**
      * 当你阅读某个观点时，AI 自动联网搜索或在你的**其他书籍**中搜索相反的观点，展示在侧边栏，培养批判性思维。

#### 3\. 知识管理与 RAG (Knowledge Management)

  * **全库语义搜索 (The Killer Feature)：**
      * 这是最大的痛点。微信读书只能搜书名。
      * **思路：** 抓取用户已读的笔记和书摘，存入本地向量数据库（如 SQLite VSS 或 LanceDB）。
      * **场景：** 用户问 AI：“我想写一篇关于‘长期主义’的文章，我读过的书里有哪些相关素材？” AI 检索你所有读过的书并给出答案。
  * **自动化笔记导出与同步：**
      * 配置 Obsidian/Notion/Logseq 的 API。
      * **AI 整理：** 导出时，AI 自动为笔记打标签（Tagging）、生成标题、并转化为 Markdown 格式。

#### 4\. 交互创新 (UX Innovation)

  * **“与书对话” (Chat with Book)：**
      * 将当前书籍的内容（如果能获取全文或基于已读部分）作为 Context。
      * 用户可以直接在侧边栏打字：“这本书关于 A 概念是怎么定义的？”
  * **每日回顾 (Flashcards)：**
      * 利用艾宾浩斯遗忘曲线，AI 每天从你过去的笔记中抽取 3 条，生成一张“知识卡片”推送到桌面，复习旧知识。

-----

### 三、 技术栈推荐

为了快速开发且保证性能，建议如下技术选型：

| 模块 | 技术/库 | 说明 |
| :--- | :--- | :--- |
| **框架** | **Electron (Forge/Vite)** | 基础框架，建议结合 React 或 Vue 开发 UI。 |
| **网页嵌入** | **BrowserView** | 比 `iframe` 或 `webview` 性能更好，且拥有独立进程，不易崩溃。 |
| **脚本注入** | **Preload.js** | 用于读取微信读书 DOM（获取选中文本、监听 URL 变化）。 |
| **本地数据库** | **PouchDB** 或 **RxDB** | 存储用户的笔记、AI 对话记录。 |
| **向量检索** | **LangChain.js** + **MemoryVectorStore** | 实现轻量级的本地 RAG（检索已读内容）。 |
| **AI 接口** | **OpenAI SDK** (兼容模式) | 支持用户输入 Key (OpenAI, DeepSeek, Azure) 或连接本地 Ollama。 |

-----

### 四、 核心代码逻辑演示 (伪代码)

这是一个简单的思路，展示如何通过 Electron 监听微信读书的选词并触发 AI：

**1. Preload 脚本 (注入到微信读书页面):**

```javascript
// preload.js
const { ipcRenderer } = require('electron');

document.addEventListener('mouseup', () => {
  const selection = window.getSelection().toString().trim();
  if (selection.length > 0) {
    // 获取选中文本的上下文（前后文），帮助 AI 理解
    // 发送给主进程
    ipcRenderer.send('text-selected', {
      text: selection,
      context: getContextAroundSelection()
    });
  }
});

// 监听 DOM 变化，识别章节标题等
// ...
```

**2. 主进程 (处理 AI 请求):**

```javascript
// main.js
ipcMain.on('text-selected', async (event, data) => {
  // 1. 可以在 UI 上弹出一个浮窗图标
  showFloatingButton();

  // 2. 如果用户点击“AI 解释”
  // const aiResponse = await aiService.explain(data.text);
  // event.reply('ai-result', aiResponse);
});
```

-----

### 五、 风险与注意事项

1.  **版权与 TOS：**
      * **不要**尝试批量爬取全书内容下载到本地，这违反腾讯服务条款且不仅涉及封号风险，还有法律风险。
      * **合规做法：** 仅处理用户“当前浏览页面”的内容，或者用户“主动划线/复制”的内容。将产品定义为“阅读辅助工具”而非“下载器”。
2.  **API 限制：**
      * 微信读书使用了 Canvas 渲染还是 DOM 渲染？（目前大部分是 DOM，但如果未来转 Canvas，抓取文字会变难，需要 OCR）。需要提前调研当前网页版的渲染机制。
3.  **Token 消耗：**
      * 长文本分析消耗 Token 较多。建议允许用户配置自己的 API Key，或者接入 DeepSeek（价格极低）作为默认后端。

-----
