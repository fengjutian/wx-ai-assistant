import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, ModelResponse } from './preload';
import './index.css';
import WebviewPanel from './components/webview';
import OperatorPanel from './components/operator';
import { injectWeChatReadingCopyHook } from './utils/webview-inject';
import styles from './app.module.css';

const WEIXINURL = 'https://weread.qq.com/';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>(WEIXINURL);
  const [webviewSrc, setWebviewSrc] = useState<string>(WEIXINURL);
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appLoaded, setAppLoaded] = useState<boolean>(false);
  const [leftWidth, setLeftWidth] = useState<number>(60); // 左侧默认占60%
  
  // 更精确的类型定义
  const webviewRef = useRef<Electron.WebviewTag | HTMLIFrameElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);

  const isElectron = typeof window !== 'undefined' && window.api;

  useEffect(() => {
    setAppLoaded(true);
  }, [isElectron]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isElectron) return;

    const handleNewWindow = (e: Event & { detail?: { url?: string } }) => {
      const url = (e as any)?.detail?.url as string | undefined;
      if (url) {
        window.api?.openExternal?.(url);
      }
    };

    const webview = webviewRef.current as Electron.WebviewTag;
    if (webview) {
      webview.addEventListener('new-window', handleNewWindow);
    }

    return () => {
      if (webview) {
        webview.removeEventListener('new-window', handleNewWindow);
      }
    };
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron) return;
    
    const webview = webviewRef.current as Electron.WebviewTag;
    if (!webview) return;
    
    const onDomReady = () => {
      injectWeChatReadingCopyHook(webview);
    };
    
    const onDidNavigate = () => {
      injectWeChatReadingCopyHook(webview);
    };
    
    const onDidStopLoading = () => {
      injectWeChatReadingCopyHook(webview);
    };
    
    // 绑定事件监听器
    webview.addEventListener('dom-ready', onDomReady);
    webview.addEventListener('did-navigate', onDidNavigate);
    webview.addEventListener('did-stop-loading', onDidStopLoading);
    
    // 初始注入
    onDomReady();
    
    return () => {
      // 清理事件监听器
      webview.removeEventListener('dom-ready', onDomReady);
      webview.removeEventListener('did-navigate', onDidNavigate);
      webview.removeEventListener('did-stop-loading', onDidStopLoading);
    };
  }, [isElectron]);

  // 键盘快捷键处理 - 修复不存在元素的问题
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        // 移除对不存在元素的引用
        console.log('Focus URL input shortcut pressed (element not implemented)');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 发送消息 - 使用useCallback优化
  const sendMessage = useCallback(async () => {
    const text = prompt.trim();
    if (!text) return;

    const newUserMessage: Message = { role: 'user', content: text };

    setMessages(prev => [...prev, newUserMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
      if (!window.api?.callModel) {
        throw new Error('API not available - running in development mode');
      }
      
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
  }, [prompt, messages]);

  // 拖拽分隔线实现 - 优化性能
  useEffect(() => {
    let isDragging = false;
    let originalCursor = '';
    let originalUserSelect = '';
    
    const startResize = (e: MouseEvent) => {
      // 确保只有当点击的是分隔线元素时才开始拖拽
      if (e.target !== resizerRef.current && 
          !resizerRef.current?.contains(e.target as Node)) {
        return;
      }
      
      // 阻止默认行为和冒泡
      e.preventDefault();
      e.stopPropagation();
      
      isDragging = true;
      originalCursor = document.body.style.cursor;
      originalUserSelect = document.body.style.userSelect;
      
      // 设置全局鼠标样式
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };
    
    const doResize = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const container = containerRef.current;
      if (!container) {
        console.error('Container not found during resize!');
        return;
      }
      
      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      
      // 计算鼠标相对于容器左侧的位置
      const relativeX = e.clientX - rect.left;
      
      // 计算并设置新宽度，限制在20%-80%范围内
      const newWidth = Math.max(20, Math.min(80, (relativeX / containerWidth) * 100));
      
      setLeftWidth(newWidth);
    };
    
    const stopResize = () => {
      if (isDragging) {
        isDragging = false;
        
        // 恢复默认样式
        document.body.style.cursor = originalCursor;
        document.body.style.userSelect = originalUserSelect;
      }
    };
    
    // 直接在document上绑定事件监听器
    document.addEventListener('mousedown', startResize);
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
    document.addEventListener('mouseleave', stopResize);
    
    // 组件卸载时清理
    return () => {
      document.removeEventListener('mousedown', startResize);
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
      document.removeEventListener('mouseleave', stopResize);
      
      // 确保恢复默认样式
      document.body.style.cursor = originalCursor;
      document.body.style.userSelect = originalUserSelect;
    };
  }, []);

  const websiteUrlInput = () => (
    <div></div>
  );

  return (
    <div
      id="container" 
      ref={containerRef}
      className={styles.container}
    >
      {/* 显示加载状态 */}
      {!appLoaded && (
        <div className={styles.loading}>
          应用加载中...
        </div>
      )}
      
      {appLoaded && (
        <>
          <WebviewPanel
            isElectron={isElectron as any}
            webviewRef={webviewRef as any}
            webviewSrc={webviewSrc}
            leftWidth={leftWidth}
            renderUrlInput={websiteUrlInput}
          />

          <div
            id="resizer"
            ref={resizerRef}
            className={styles.resizer}
          >
            {/* 明显的分隔线指示器 */}
            <div className={styles.resizerIndicator}></div>
          </div>

          <OperatorPanel
            rightWidth={100 - leftWidth}
            messages={messages}
            isLoading={isLoading}
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={sendMessage}
            messagesEndRef={messagesEndRef}
          />
        </>
      )}
    </div>
  );
};

export default App;
