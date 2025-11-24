const { contextBridge, ipcRenderer, shell } = require('electron');


contextBridge.exposeInMainWorld('api', {
callModel: async (prompt, history = []) => {
return await ipcRenderer.invoke('model:chat', { prompt, history });
},
openExternal: (url) => {
// 打开外部链接到系统默认浏览器
try { shell.openExternal(url); } catch (e) { console.warn('openExternal failed', e); }
}
});
