import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 添加详细的调试日志
console.log('🌱 Renderer.tsx开始执行 - 检查React和ReactDOM是否加载成功');
console.log('React版本:', React.version);
console.log('ReactDOM是否可用:', !!ReactDOM);

// 查找根元素
console.log('🔍 开始查找根元素#app');
const appElement = document.getElementById('app');
console.log('✅ 根元素查找完成');
console.log('根元素ID:', appElement?.id);
console.log('根元素类型:', typeof appElement);
console.log('根元素HTML:', appElement?.outerHTML);

if (!appElement) {
  console.error('❌ 错误: 未找到#app元素!');
  // 创建备用元素
  const fallbackElement = document.createElement('div');
  fallbackElement.id = 'app';
  document.body.appendChild(fallbackElement);
  console.log('🔄 创建了备用的#app元素并添加到body');
}

// 创建根元素并渲染React应用
console.log('🧱 开始创建React根');
const root = ReactDOM.createRoot(
  appElement || document.createElement('div')
);
console.log('✅ React根创建成功');

console.log('🚀 准备渲染App组件');
try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('🎉 App组件渲染完成');
  
  // 验证渲染结果
  setTimeout(() => {
    const renderedContent = document.getElementById('app')?.innerHTML;
    console.log('📊 渲染后的内容长度:', renderedContent?.length || 0);
    console.log('📊 渲染后的内容:', renderedContent);
  }, 1000);
} catch (error) {
  console.error('❌ 渲染App组件时出错:', error);
}
