import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('👋 Renderer.tsx is executing');

// 查找根元素
const appElement = document.getElementById('app');
console.log('Root element found:', !!appElement);

// 创建根元素并渲染React应用
const root = ReactDOM.createRoot(
  appElement || document.createElement('div')
);

console.log('React root created, attempting to render App component');
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('App component has been rendered');
