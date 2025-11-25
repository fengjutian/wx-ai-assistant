import React, { useState, useRef, useEffect } from 'react';
import { Message, ModelResponse } from './preload';
import './index.css';
import { XMarkdown } from '@ant-design/x-markdown';
import { Welcome, Sender } from '@ant-design/x';
import SenderComponent  from './components/sender/Sender';

const WEIXINURL = 'https://weread.qq.com/';

const App: React.FC = () => {
  const [url, setUrl] = useState<string>(WEIXINURL);
  const [webviewSrc, setWebviewSrc] = useState<string>(WEIXINURL);
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [appLoaded, setAppLoaded] = useState<boolean>(false);
  const webviewRef = useRef<HTMLElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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


  // const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (e.key === 'Enter') navigateTo();
  // };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const websiteUrlInput = () => (
    <div></div>
    // <div id="nav-bar">
    //   <input
    //     id="url-input"
    //     type="text"
    //     value={url}
    //     onChange={(e) => setUrl(e.target.value)}
    //     onKeyDown={handleUrlKeyDown}
    //     placeholder="输入 URL 并按回车 (例如 https://example.com)"
    //   />
    //   <button id="go-btn" onClick={navigateTo}>Go</button>
    // </div>
  );
  

  return (
    <div id="container" style={{ backgroundColor: '#f5f5f5' }}>
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
          {/* 在开发环境中显示提示信息 */}
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
          
          <div id="left">
            {websiteUrlInput()}
            {/* 在Electron环境中使用webview元素，否则使用iframe作为替代 */}
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

          <div id="right">
            <div id="chat-area">
              <div id="messages">
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
              <SenderComponent/>
              <div id="controls">
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