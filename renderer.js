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
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigateTo(urlInput.value.trim()); });


// 处理发送
sendBtn.addEventListener('click', async () => {
const text = promptInput.value.trim();
if (!text) return;
appendMessage(text, 'user');
promptInput.value = '';


// 将用户消息加入历史
history.push({ role: 'user', content: text });


appendMessage('正在请求模型，请稍候...', 'bot');
try {
const res = await window.api.callModel(text, history);
// 移除上一个 loading 提示（最简单方式：移除最后一个 bot 消息如果是 loading）
const allMsgs = messagesDiv.querySelectorAll('.message');
const last = allMsgs[allMsgs.length - 1];
if (last && last.textContent.includes('正在请求模型')) last.remove();


if (res.error) {
appendMessage('错误: ' + res.error, 'bot');
} else {
const reply = res.text || JSON.stringify(res.raw || res);
appendMessage(reply, 'bot');
// 加入历史
history.push({ role: 'assistant', content: reply });
}
} catch (err) {
});