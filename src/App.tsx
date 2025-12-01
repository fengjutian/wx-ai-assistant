import React, { useState, useRef, useEffect } from 'react';
import { Message } from './preload';
import './index.css';
import AssistantDashboard from './components/assistant_dashboard';
import RagPage from './components/rag/RagPage';
import ArticleEditor from "./components/article_editor";
import Edit from "./components/edit";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

const WEIXINURL = 'https://weread.qq.com/';

const App: React.FC = () => {
  const [webviewSrc, setWebviewSrc] = useState<string>(WEIXINURL);
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appLoaded, setAppLoaded] = useState<boolean>(false);
  const [leftRatio, setLeftRatio] = useState<number>(0.6);
  const [dragging, setDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const webviewRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showRag, setShowRag] = useState<boolean>(false);
  
  // 检查是否在Electron环境中
  const isElectron = typeof window !== 'undefined' && window.api;
  
  // 组件加载完成
  useEffect(() => {
    console.log('App component mounted');
    console.log('Running in Electron environment:', isElectron);
    setAppLoaded(true);
  }, [isElectron]);

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // webview新窗口事件处理 - 仅在Electron环境中执行
  useEffect(() => {
    if (!isElectron) return;
    
    const handleNewWindow = (e: Event) => {
      // 更安全地处理 CustomEvent
      if ('detail' in e && typeof e.detail === 'object' && e.detail !== null && 'url' in e.detail) {
        window.api?.openExternal?.(e.detail.url);
      }
    };

    const webview = webviewRef.current;
    if (webview) {
      webview.addEventListener('new-window', handleNewWindow);
    }

    return () => {
      if (webview) {
        webview.removeEventListener('new-window', handleNewWindow);
      }
    };
  }, [isElectron]);

  // 键盘快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const urlInput = document.getElementById('url-input') as HTMLInputElement;
        urlInput?.focus();
        urlInput?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const sendMessage = async () => {
    const text = prompt.trim();
    if (!text) return;

    const newUserMessage: Message = { role: 'user', content: text };

    setMessages(prev => [...prev, newUserMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      // 检查window.api是否存在
      if (!window.api?.callModel) {
        throw new Error('API not available - running in development mode');
      }
      
      // 使用展开操作符创建副本，避免闭包问题
      const res = await window.api.callModel(text, [...messages, newUserMessage]);

      if (res.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `错误: ${res.error}` }]);
      } else {
        const reply = res.text || JSON.stringify(res.raw || res);
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `调用失败: ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (ev: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ev.clientX - rect.left;
      let r = x / rect.width;
      if (r < 0.1) r = 0.1;
      if (r > 0.9) r = 0.9;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setLeftRatio(r));
    };
    const onUp = () => setDragging(false);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!isElectron) return;
    const webview = webviewRef.current as any;
    if (!webview) return;
    (async () => {
      try {
        const r = await window.api?.resolveFsPath?.('src/webview-preload.js');
        const p = r?.path;
        if (p) {
          try { webview.setAttribute('preload', p); } catch(_){ void 0; }
          try { if (webview.getURL && webview.getURL()) { webview.reload(); } } catch(_){ void 0; }
        }
      } catch (_) { void 0; }
    })();
    const onConsoleMessage = (e: any) => {
      const msg = e.message || '';
      const prefix = '__WX_COPY__:';
      if (typeof msg === 'string' && msg.startsWith(prefix)) {
        const text = msg.slice(prefix.length).trim();
        if (text) setPrompt(text);
      }
    };
    const inject = () => {
      try {
        webview.executeJavaScript(`(function(){
          if (window.__wx_copy_hook__) return;
          window.__wx_copy_hook__ = true;
          const emit = (t) => { try { console.log('__WX_COPY__:' + String(t || '').trim()); } catch(_){} };
          const getSel = () => { try { return String((window.getSelection && window.getSelection().toString()) || '').trim(); } catch(_){ return ''; } };
          console.log('__WX_COPY_INIT__');
          document.addEventListener('copy', function(e){
            let s = '';
            try { s = e.clipboardData && e.clipboardData.getData && e.clipboardData.getData('text/plain') || ''; } catch(_){ }
            if (!s) { s = getSel(); }
            s = String(s || '').trim();
            if (s) emit(s);
          }, true);
          document.addEventListener('cut', function(){
            const s = getSel();
            if (s) emit(s);
          }, true);
          document.addEventListener('keydown', function(e){
            const k = (e.key || '').toLowerCase();
            if ((e.ctrlKey || e.metaKey) && k === 'c') {
              const s = getSel();
              if (s) emit(s);
            }
          }, true);
          document.addEventListener('selectionchange', function(){
            const s = getSel();
            if (s) { window.__wx_last_sel__ = s; }
          }, true);
          document.addEventListener('mouseup', function(){
            const s = getSel();
            if (s) emit(s);
          }, true);
          try {
            const orig = (navigator.clipboard && navigator.clipboard.writeText) || null;
            if (orig) {
              navigator.clipboard.writeText = function(t){ try { emit(t); } catch(_){ } return orig.call(this, t); };
            }
          } catch(_){ }
        })();`);
      } catch (_) { void 0; }
    };
    webview.addEventListener('console-message', onConsoleMessage);
    const onIpcMessage = (e: any) => {
      try {
        const ch = e.channel;
        if (ch === 'wx-copy') {
          const text = String((e.args && e.args[0]) || '').trim();
          if (text) { setPrompt(text); setPromptKey((k) => k + 1); }
        }
      } catch (_) { void 0; }
    };
    webview.addEventListener('ipc-message', onIpcMessage);
    const onDomReady = () => inject();
    const onDidNavigate = () => inject();
    const onDidStopLoading = () => inject();
    webview.addEventListener('dom-ready', onDomReady);
    webview.addEventListener('did-navigate', onDidNavigate);
    webview.addEventListener('did-stop-loading', onDidStopLoading);
    inject();
    return () => {
      try {
        webview.removeEventListener('console-message', onConsoleMessage);
        webview.removeEventListener('dom-ready', onDomReady);
        webview.removeEventListener('did-navigate', onDidNavigate);
        webview.removeEventListener('did-stop-loading', onDidStopLoading);
        webview.removeEventListener('ipc-message', onIpcMessage);
      } catch (_) { void 0; }
    };
  }, [isElectron]);

  const handleCaptureSelection = async () => {
    if (!isElectron) return;
    const webview = webviewRef.current as any;
    if (!webview) return;
    try {
      const text = await webview.executeJavaScript('String((window.getSelection && window.getSelection().toString()) || "")');
      const t = String(text || '').trim();
      if (t) setPrompt(t);
    } catch (_) { void 0; }
  };

  return (
    <div id="container" ref={containerRef} style={{ backgroundColor: '#f5f5f5', display: 'flex' }}>
      {/* 显示加载状态 */}
      {!appLoaded && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          fontSize: '18px',
          color: '#333'
        }}>
          应用加载中...
        </div>
      )}
      
      {appLoaded && (
        <>
          {!isElectron && (
            <div style={{ 
              padding: '10px', 
              backgroundColor: '#e3f2fd', 
              color: '#1976d2',
              borderBottom: '1px solid #bbdefb'
            }}>
              开发环境模式 - 部分功能可能不可用
            </div>
          )}
          
          <div id="left" style={{ width: `${Math.round(leftRatio * 100)}%` }}>
            {isElectron ? (
              <webview
                ref={webviewRef}
                id="webview"
                src={webviewSrc}
                style={{ width: '100%', height: '100%' }}
                partition="persist:webview"
              />
            ) : (
              <iframe
                ref={webviewRef}
                id="webview"
                src={webviewSrc}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </div>
          <div id="resizer" onMouseDown={(e) => { e.preventDefault(); setDragging(true); }} />

          <div id="right" style={{ width: `${Math.round((1 - leftRatio) * 100)}%` }}>
            <Edit/>
            {/* <ArticleEditor /> */}
            <div style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowRag(false)}>助手</button>
              <button onClick={() => setShowRag(true)}>RAG</button>
            </div>
            {showRag ? (
              <RagPage />
            ) : (
              <AssistantDashboard
                messages={messages}
                isLoading={isLoading}
                messagesEndRef={messagesEndRef}
                prompt={prompt}
                onPromptChange={setPrompt}
                onSubmit={sendMessage}
                onCaptureSelection={handleCaptureSelection}
              />
            )}
          </div>
          {dragging && (
            <div
              style={{ position: 'fixed', inset: 0, cursor: 'col-resize', zIndex: 999, background: 'transparent' }}
              onMouseMove={(ev) => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;
                const x = ev.clientX - rect.left;
                let r = x / rect.width;
                if (r < 0.1) r = 0.1;
                if (r > 0.9) r = 0.9;
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = requestAnimationFrame(() => setLeftRatio(r));
              }}
              onMouseUp={() => setDragging(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
