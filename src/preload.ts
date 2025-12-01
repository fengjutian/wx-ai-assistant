import { contextBridge, ipcRenderer, shell } from 'electron';

// 定义API接口类型
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ModelResponse {
  text?: string;
  raw?: any;
  error?: string;
}

export interface ElectronAPI {
  callModel: (prompt: string, history?: Message[]) => Promise<ModelResponse>;
  openExternal: (url: string) => void;
  getModelConfig: () => Promise<{ apiKey: string; url: string; name: string }>;
  setModelConfig: (cfg: { apiKey?: string; url?: string; name?: string }) => Promise<{ ok: boolean }>;
  resetModelConfig: () => Promise<{ ok: boolean }>;
  saveContent: (payload: { suggestedName?: string; content: string }) => Promise<{ ok?: boolean; path?: string; error?: string }>;
  readClipboard: () => Promise<{ text?: string; error?: string }>;
  resolveFsPath: (rel: string) => Promise<{ path?: string; error?: string }>;
}

// 暴露API给渲染进程
contextBridge.exposeInMainWorld('api', {
  callModel: async (prompt: string, history: Message[] = []) => {
    return await ipcRenderer.invoke('model:chat', { prompt, history });
  },
  openExternal: (url: string) => {
    try {
      shell.openExternal(url);
    } catch (e) {
      console.warn('openExternal failed', e);
    }
  },
  getModelConfig: async () => {
    return await ipcRenderer.invoke('config:get');
  },
  setModelConfig: async (cfg: { apiKey?: string; url?: string; name?: string }) => {
    return await ipcRenderer.invoke('config:update', cfg);
  },
  resetModelConfig: async () => {
    return await ipcRenderer.invoke('config:reset');
  },
  saveContent: async (payload: { suggestedName?: string; content: string }) => {
    return await ipcRenderer.invoke('content:save', payload);
  },
  readClipboard: async () => {
    return await ipcRenderer.invoke('clipboard:read');
  },
  resolveFsPath: async (rel: string) => {
    return await ipcRenderer.invoke('fs:resolve', rel);
  },
});

type RagIngestPayload = { id: string; text: string; embedding: number[] };
type RagSearchPayload = { embedding: number[]; topK?: number };

contextBridge.exposeInMainWorld("rag", {
  ingest: (data: RagIngestPayload) => ipcRenderer.invoke("rag:ingest", data),
  search: (data: RagSearchPayload) => ipcRenderer.invoke("rag:search", data),
  ingestFileBlob: (payload: { name: string; type?: string; data: ArrayBuffer }) =>
    ipcRenderer.invoke('rag:ingestFileBlob', payload),
  embed: (payload: { text: string }) => ipcRenderer.invoke('rag:embed', payload),
  delete: (payload: { name: string }) => ipcRenderer.invoke('rag:delete', payload),
  list: () => ipcRenderer.invoke('rag:list'),
});



// 声明全局类型
declare global {
  interface Window {
    api: ElectronAPI;
  }
}
