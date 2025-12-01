const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { ChromaClient } = require("chromadb");

let chroma = null;
let collection = null;

async function initChroma() {
  chroma = new ChromaClient({
    path: "file://" + path.join(__dirname, "vector-db")
  });

  collection = await chroma.getOrCreateCollection({
    name: "local_rag",
    metadata: { "hnsw:space": "cosine" }
  });
}

// 安全提醒：启用 webviewTag 会降低渲染进程隔离安全性。仅在受信任环境下使用。
async function createWindow() {
  await initChroma();

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false,
      webviewTag: true, // 允许使用 <webview>
    },
  });

  win.loadFile('index.html');
}

/*** RAG 接口：文档 ingest ***/
ipcMain.handle("rag:ingest", async (_, { id, text, embedding }) => {
  await collection.add({
    ids: [id],
    documents: [text],
    embeddings: [embedding]
  });
  return true;
});

/*** RAG 接口：相似度搜索 ***/
ipcMain.handle("rag:search", async (_, { embedding, topK }) => {
  return await collection.query({
    queryEmbeddings: [embedding],
    nResults: topK ?? 5
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// 处理渲染进程的模型调用请求（使用 ipcMain.handle）
// 请在环境变量中配置 MODEL_API_KEY 并在这里使用（不要把密钥写到客户端）
// 下面示例展示如何调用通用 REST 接口（以 OpenAI 风格为例），用户需替换为实际的大模型 API
ipcMain.handle('model:chat', async (event, { prompt, history }) => {
  // basic validation
  if (!prompt || typeof prompt !== 'string') return { error: 'invalid prompt' };

  const API_KEY = process.env.MODEL_API_KEY || '';
  if (!API_KEY) return { error: 'MODEL_API_KEY not set in environment' };

  try {
    // Node 18+ 自带 fetch
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [...(history || []), { role: 'user', content: prompt }],
        max_tokens: 800,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `api error: ${res.status} ${text}` };
    }

    const json = await res.json();
    // 根据调用的 API 不同，返回路径会不同。以下基于 OpenAI ChatCompletion 格式
    const assistantMsg =
      json.choices && json.choices[0] && json.choices[0].message
        ? json.choices[0].message.content
        : json.result || JSON.stringify(json);

    return { text: assistantMsg, raw: json };
  } catch (err) {
    return { error: err.message };
  }
});
