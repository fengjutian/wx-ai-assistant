import React, { useState, useRef, useEffect } from 'react';
import { Message, ModelResponse } from './preload';
import './index.css';
import { XMarkdown } from '@ant-design/x-markdown';
import { Welcome, Sender } from '@ant-design/x';
import { injectWeChatReadingCopyHook } from './utils/webview-inject';

const WEIXINURL = 'https://weread.qq.com/';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>(WEIXINURL);
  const [webviewSrc, setWebviewSrc] = useState<string>(WEIXINURL);
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appLoaded, setAppLoaded] = useState<boolean>(false);
  const [leftWidth, setLeftWidth] = useState<number>(60); // 左侧默认占60%
  const webviewRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizerRef = useRef<HTMLDivElement>(null);
  
  // 检查是否在Electron环境中
  const isElectron = typeof window !== 'undefined' && window.api;
  
  // 组件加载完成
  useEffect(() => {
    console.log('App component mounted - VERSION 6');
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

  // 导航到URL
  const navigateTo = () => {
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }
    setWebviewSrc(finalUrl);
  };

  const sendMessage = async () => {
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
  };

  // 使用最简单、最可靠的拖拽实现
  useEffect(() => {
    console.log('Setting up resize event handlers - VERSION 6');
    
    let isDragging = false;
    let originalCursor = '';
    let originalUserSelect = '';
    
    const startResize = (e: MouseEvent) => {
      // 确保只有当点击的是分隔线元素时才开始拖拽
      if (e.target !== resizerRef.current && 
          !resizerRef.current?.contains(e.target as Node)) {
        return;
      }
      
      console.log('START RESIZE DETECTED!');
      
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
      
      console.log('RESIZE IN PROGRESS!');
      
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
      
      console.log(`SETTING LEFT WIDTH TO ${newWidth}%`);
      setLeftWidth(newWidth);
    };
    
    const stopResize = () => {
      if (isDragging) {
        console.log('STOPPING RESIZE!');
        
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
      console.log('Cleaning up resize event handlers');
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

  // WebView相关事件处理
  const webview = webviewRef.current;
  const onDomReady = () => injectWeChatReadingCopyHook(webview);
  const onDidNavigate = () => injectWeChatReadingCopyHook(webview);
  const onDidStopLoading = () => injectWeChatReadingCopyHook(webview);

  return (
    <div 
      id="container" 
      ref={containerRef}
      style={{ 
        backgroundColor: '#f5f5f5', 
        display: 'flex',
        height: '100vh',
        width: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
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
              borderBottom: '1px solid #bbdefb',
              width: '100%'
            }}>
              开发环境模式 - 部分功能可能不可用
            </div>
          )}
          
          {/* 左侧面板 */}
          <div 
            id="left" 
            style={{ 
              width: `${leftWidth}%`, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {websiteUrlInput()}
            {isElectron ? (
              <webview
                ref={webviewRef}
                id="webview"
                src={webviewSrc}
                style={{ width: '100%', height: '100%' }}
                partition="persist:webview"
                ondomready={onDomReady}
                ondidnavigate={onDidNavigate}
                ondidstoploading={onDidStopLoading}
              />
            ) : (
              <iframe
                ref={webviewRef}
                id="webview"
                src={webviewSrc}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
            {isElectron && injectWeChatReadingCopyHook(webview)}
          </div>

          {/* 分隔线 - 大尺寸，高可见性 */}
          <div 
            id="resizer"
            ref={resizerRef}
            style={{
              width: '20px', // 非常大的可点击区域
              height: '100%',
              backgroundColor: '#808080', // 更明显的颜色
              cursor: 'col-resize',
              zIndex: 1000, // 确保在最上层
              position: 'relative'
            }}
          >
            {/* 明显的分隔线指示器 */}
            <div style={{
              position: 'absolute',
              left: '9px', // 居中
              top: '50%',
              transform: 'translateY(-50%)',
              width: '2px',
              height: '100px',
              backgroundColor: '#ffffff'
            }}></div>
          </div>

          {/* 右侧面板 */}
          <div 
            id="right" 
            style={{ 
              width: `${100 - leftWidth}%`, 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div id="chat-area" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div id="messages" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                <Welcome
                  icon="https://mdn.alipayobjects.com/huamei_iwk9zp/afts/img/A*s5sNRo5LjfQAAAAAAAAAAAAADgCCAQ/fmt.webp"
                  title="Hello, 我是你的阅读助手"
                  description="Base on Ant Design, AGI product interface solution, create a better intelligent vision~"
                />
                {messages.map((msg, index) => (
                  <div key={index} className={`message ${msg.role}`}>
                    {msg.role === 'assistant' ? (
                      <XMarkdown content={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="message bot">正在请求模型，请稍候...</div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div id="controls" style={{ padding: '20px', borderTop: '1px solid #e0e0e0' }}>
                <Sender
                  value={prompt}
                  onChange={(val) => setPrompt(val)}
                  onSubmit={sendMessage}
                  placeholder="向大模型提问..."
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;