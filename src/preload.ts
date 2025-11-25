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
});

// 声明全局类型
declare global {
  interface Window {
    api: ElectronAPI;
  }
}
