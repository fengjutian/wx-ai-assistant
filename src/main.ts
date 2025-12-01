import dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain, dialog, clipboard } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { fileURLToPath } from "url";
import OpenAI from 'openai';

dotenv.config();

type ModelConfig = {
  apiKey: string;
  url: string;
  name: string;
};

let modelConfig: ModelConfig = {
  apiKey: process.env.MODEL_API_KEY || '',
  url: process.env.MODEL_URL || '',
  name: process.env.MODEL_NAME || 'kimi-k2-0905-preview',
};

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// 处理 __dirname（ESM 里默认没有）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let collection: any = null;

 const createWindow = async () => {

  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      // 更全面地禁用可能导致警告的功能
      disableBlinkFeatures: 'Autofill,AutofillProfiles,AutofillServerCommunication',
      // 禁用一些可能导致警告的功能
      spellcheck: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // 打开DevTools并配置以捕获所有日志
  // 注意：Autofill相关错误是Electron DevTools的常见警告，不影响应用功能
  // 生产环境中可以不打开DevTools
  mainWindow.webContents.openDevTools({
    mode: 'detach', // 分离模式打开DevTools，方便查看日志
    activate: true  // 自动激活DevTools
  });
  
  // 捕获渲染进程的控制台消息并输出到主进程控制台
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[渲染进程] ${message} (${sourceId}:${line})`);
  });
};

ipcMain.handle("rag:ingest", async (_, { id, text, embedding }) => {
  if (!collection) return false;
  await collection.add({ ids: [id], documents: [text], embeddings: [embedding] });
  return true;
});

ipcMain.handle("rag:search", async (_, { embedding, topK }) => {
  if (!collection) return { ids: [], documents: [], distances: [] };
  return await collection.query({ queryEmbeddings: [embedding], nResults: topK ?? 5 });
});

function splitText(text: string, size = 300) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    out.push(text.slice(i, i + size));
  }
  return out;
}

ipcMain.handle('rag:ingestFileBlob', async (_evt, payload: { name: string; type?: string; data: ArrayBuffer }) => {
  try {
    const name = payload?.name || '';
    const type = payload?.type || '';
    const buf = Buffer.from(new Uint8Array(payload?.data || new ArrayBuffer(0)));

    let text = '';
    const isPdf = type.includes('pdf') || name.endsWith('.pdf');
    if (isPdf) {
      const mod: any = await import('pdf-parse');
      const pdfParse = mod.default || mod;
      const pdf = await pdfParse(buf);
      text = pdf.text || '';
    } else {
      text = buf.toString('utf-8');
    }

    const chunks = splitText(text, 300);
    const base = (modelConfig.url || process.env.MODEL_URL || '').replace(/\/chat\/completions$/, '') || 'https://api.moonshot.cn/v1';
    const client = new OpenAI({ apiKey: modelConfig.apiKey || process.env.MODEL_API_KEY || '', baseURL: base });
    const model = process.env.MODEL_EMBED_NAME || modelConfig.name || process.env.MODEL_NAME || 'kimi-k2-0905-preview';

    const items: Array<{ id: string; text: string; embedding: number[] }> = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const res = await client.embeddings.create({ model, input: chunk });
      const emb = (res.data && res.data[0] && res.data[0].embedding) || [];
      items.push({ id: `${name}#${i}`, text: chunk, embedding: emb as any });
    }
    return { items };
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
});

// 处理渲染进程的模型调用请求（使用 ipcMain.handle）
// 请在环境变量中配置 MODEL_API_KEY 并在这里使用（不要把密钥写到客户端）
// 下面示例展示如何调用通用 REST 接口（以 OpenAI 风格为例），用户需替换为实际的大模型 API
ipcMain.handle('model:chat', async (event, { prompt, history }) => {
  if (!prompt || typeof prompt !== 'string') return { error: 'invalid prompt' };

  // 调试日志 - 检查环境变量是否被加载
  console.log('Environment Variables:');
  console.log('- MODEL_API_KEY exists:', !!process.env.MODEL_API_KEY);
  console.log('- MODEL_URL:', process.env.MODEL_URL || 'not set');
  console.log('- MODEL_NAME:', process.env.MODEL_NAME || 'not set');

  const API_KEY = modelConfig.apiKey || process.env.MODEL_API_KEY || '';
  if (!API_KEY) return { error: 'MODEL_API_KEY not set in environment' };

  try {
    // 使用正确的Moonshot API路径和格式
    // const apiUrl = process.env.MODEL_URL === 'https://api.moonshot.cn/v1'
    //   ? 'https://api.moonshot.cn/v1/chat/completions'
    //   : process.env.MODEL_URL || '';

    // Node 18+ 自带 fetch
    // 发起聊天请求到模型接口（Moonshot/OpenAI 风格）
    // 注意：开启 stream:true 后返回为 SSE（text/event-stream），下方已做流式解析
    // URL 应指向完整的 chat/completions 端点，且不要打印或泄露 API Key
    const res = await fetch(modelConfig.url || process.env.MODEL_URL || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      // 请求体为标准 Chat Completions 参数
      body: JSON.stringify({
        // 模型名称需有效，如 kimi-k2-0905-preview；可通过设置弹窗修改
        model: modelConfig.name || process.env.MODEL_NAME || 'kimi-k2-0905-preview',
        // 消息数组必须包含 role 与 content，历史记录在渲染层传入
        messages: [...(history || []), { role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
        // 开启流式返回，服务端将以 data: JSON 的 SSE 片段返回
        stream: true,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { error: `api error: ${res.status} ${text}` };
    }

    const ct = res.headers.get('content-type') || '';
    const isSSE = ct.includes('text/event-stream');
    if (isSSE && (res.body as any)?.getReader) {
      const reader = (res.body as any).getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let lastObj: any = null;
      let out = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith('data:')) continue;
          const payload = l.slice(5).trim();
          if (!payload) continue;
          if (payload === '[DONE]') {
            buffer = '';
            break;
          }
          try {
            const obj = JSON.parse(payload);
            lastObj = obj;
            const piece = (obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content)
              || (obj.choices && obj.choices[0] && obj.choices[0].message && obj.choices[0].message.content)
              || obj.result
              || '';
            if (piece) out += piece;
          } catch { continue; }
        }
      }
      return { text: out, raw: lastObj };
    } else {
      const json = await res.json();
      const assistantMsg =
        json.choices && json.choices[0] && json.choices[0].message
          ? json.choices[0].message.content
          : json.result || JSON.stringify(json);
      return { text: assistantMsg, raw: json };
    }
  } catch (err) {
    return { error: err.message };
  }
});

ipcMain.handle('config:get', async () => {
  return modelConfig;
});

ipcMain.handle('config:update', async (event, cfg: Partial<ModelConfig>) => {
  modelConfig = {
    apiKey: cfg.apiKey ?? modelConfig.apiKey,
    url: cfg.url ?? modelConfig.url,
    name: cfg.name ?? modelConfig.name,
  };
  const filePath = path.join(app.getPath('userData'), 'model_config.json');
  await fs.writeFile(filePath, JSON.stringify(modelConfig), 'utf-8');
  return { ok: true };
});

ipcMain.handle('config:reset', async () => {
  modelConfig = {
    apiKey: process.env.MODEL_API_KEY || '',
    url: process.env.MODEL_URL || '',
    name: process.env.MODEL_NAME || 'kimi-k2-0905-preview',
  };
  const filePath = path.join(app.getPath('userData'), 'model_config.json');
  await fs.writeFile(filePath, JSON.stringify(modelConfig), 'utf-8');
  return { ok: true };
});

ipcMain.handle('content:save', async (event, {
  suggestedName,
  content,
}: { suggestedName?: string; content: string }) => {
  const defaultPath = path.join(app.getPath('documents'), suggestedName || `assistant-${Date.now()}.md`);
  const result = await dialog.showSaveDialog({
    title: '保存到本地',
    defaultPath,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] },
    ],
  });
  if (result.canceled || !result.filePath) return { error: 'canceled' };
  await fs.writeFile(result.filePath, content, 'utf-8');
  return { ok: true, path: result.filePath };
});

ipcMain.handle('clipboard:read', async () => {
  try {
    const text = clipboard.readText();
    return { text };
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
});

ipcMain.handle('fs:resolve', async (event, relPath: string) => {
  try {
    const p = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
    return { path: p };
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
});

app.whenReady().then(async () => {
  const filePath = path.join(app.getPath('userData'), 'model_config.json');
  let content = '';
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch {
    await fs.writeFile(filePath, JSON.stringify(modelConfig), 'utf-8');
  }
  if (content) {
    const parsed = JSON.parse(content);
    modelConfig = {
      apiKey: parsed.apiKey ?? modelConfig.apiKey,
      url: parsed.url ?? modelConfig.url,
      name: parsed.name ?? modelConfig.name,
    };
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
