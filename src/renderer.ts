import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('👋 This message is being logged by "renderer.ts", included via Vite');

// 创建根元素并渲染React应用
const root = ReactDOM.createRoot(
  document.getElementById('app') || document.createElement('div')
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
