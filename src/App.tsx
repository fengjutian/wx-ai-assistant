d:\GitHub\wx-ai-assistant\src\App.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Message, ModelResponse } from './preload';
import './index.css';

// 为 webview 元素添加类型声明
declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        partition?: string;
        plugins?: string;
      };
    }
  }
}

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('https://weread.qq.com/');
  const [webviewSrc, setWebviewSrc] = useState<string>('https://example.com');
  const [prompt, setPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const webviewRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到最新消息
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // webview新窗口事件处理
  useEffect(() => {
    const handleNewWindow = (e: Event) => {
      // 更安全地处理 CustomEvent
      if ('detail' in e && typeof e.detail === 'object' && e.detail !== null && 'url' in e.detail) {
        window.api.openExternal(e.detail.url);
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
  }, []);

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

  // 发送消息
  const sendMessage = async () => {
    const text = prompt.trim();
    if (!text) return;

    const newUserMessage: Message = { role: 'user', content: text };
    // 立即更新消息列表并获取最新状态
    setMessages(prev => [...prev, newUserMessage]);
    setPrompt('');
    setIsLoading(true);

    try {
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

  // 处理输入框回车事件
  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') navigateTo();
  };

  const handlePromptKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div id="container">
      <div id="left">
        <div id="nav-bar">
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleUrlKeyDown}
            placeholder="输入 URL 并按回车 (例如 https://example.com)"
          />
          <button id="go-btn" onClick={navigateTo}>Go</button>
        </div>
        <webview
          ref={webviewRef}
          id="webview"
          src={webviewSrc}
          style={{ width: '100%', height: '100%' }}
          partition="persist:webview"
        />
      </div>

      <div id="right">
        <div id="chat-area">
          <div id="messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="message bot">正在请求模型，请稍候...</div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div id="controls">
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handlePromptKeyDown}
              placeholder="向大模型提问...(Ctrl+Enter 发送)"
              rows={3}
              disabled={isLoading}
            />
            <button id="send" onClick={sendMessage} disabled={isLoading}>
              发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;