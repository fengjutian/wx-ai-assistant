const webview = document.getElementById('webview');
const urlInput = document.getElementById('url-input');
const goBtn = document.getElementById('go-btn');
const sendBtn = document.getElementById('send');
const promptInput = document.getElementById('prompt');
const messagesDiv = document.getElementById('messages');

// 简单消息历史（可用来发送上下文给模型）
const history = [];

function appendMessage(text, cls = 'bot') {
  const d = document.createElement('div');
  d.className = 'message ' + (cls === 'user' ? 'user' : 'bot');
  d.textContent = text;
  messagesDiv.appendChild(d);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// 导航 webview
function navigateTo(url) {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  webview.src = url;
}

goBtn.addEventListener('click', () => navigateTo(urlInput.value.trim()));
urlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigateTo(urlInput.value.trim());
});

// 发送消息
sendBtn.addEventListener('click', async () => {
  const text = promptInput.value.trim();
  if (!text) return;

  appendMessage(text, 'user');
  promptInput.value = '';

  history.push({ role: 'user', content: text });

  appendMessage('正在请求模型，请稍候...', 'bot');

  try {
    const res = await window.api.callModel(text, history);

    const allMsgs = messagesDiv.querySelectorAll('.message');
    const last = allMsgs[allMsgs.length - 1];
    if (last && last.textContent.includes('正在请求模型')) last.remove();

    if (res.error) {
      appendMessage('错误: ' + res.error, 'bot');
    } else {
      const reply = res.text || JSON.stringify(res.raw || res);
      appendMessage(reply, 'bot');
      history.push({ role: 'assistant', content: reply });
    }
  } catch (err) {
    appendMessage('调用失败: ' + err.message, 'bot');
  }
});

// webview 新窗口事件：改为系统浏览器打开
webview.addEventListener('new-window', (e) => {
  window.api.openExternal(e.url);
});

// ctrl + L 聚焦 URL 输入
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
    e.preventDefault();
    urlInput.focus();
    urlInput.select();
  }
});
