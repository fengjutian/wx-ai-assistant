/**
 * WebView 注入工具集合
 *
 * 说明：
 * - 所有方法都通过 `webview.executeJavaScript` 在目标页面中注入代码
 * - 每个注入都带有幂等标识（如 `window.__wx_*__`），避免重复注入
 * - 行为输出统一通过控制台日志（console.log）抛出，便于主进程捕获或渲染层监听
 *
 * 控制台前缀约定：
 * - 复制事件：`__WX_COPY__:`
 * - 文章元信息：`__WX_ARTICLE__:`
 * - 自动滚动就绪：`__WX_AUTOSCROLL_READY__`
 * - 链接点击：`__WX_LINK__:`
 * - 图片收集：`__WX_IMAGES__:`
 */

/**
 * 注入微信阅读复制钩子
 * @param webview WebView元素
 *
 * 功能：
 * - 监听 copy/cut/selectionchange/mouseup/快捷键 Ctrl/C 事件
 * - 优先读取剪贴板文本，若无则读取当前选区文本
 * - 重载 `navigator.clipboard.writeText`，拦截写入以便记录
 * - 将采集到的文本以 `__WX_COPY__:` 前缀输出到控制台
 */
export const injectWeChatReadingCopyHook = (webview: HTMLElement): void => {
  try {
    if (!('executeJavaScript' in webview)) {
      console.error('WebView does not have executeJavaScript method');
      return;
    }
    
    (webview as any).executeJavaScript(`(function(){
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
  } catch (error) {
    console.error('Error injecting WeChat reading copy hook:', error);
  }
};

/**
 * 放宽页面选择限制（解除 user-select 限制）
 * @param webview WebView元素
 *
 * 功能：
 * - 注入样式，强制开启文本选择能力，提升复制体验
 */
export const injectRelaxSelection = (webview: HTMLElement): void => {
  try {
    if (!('executeJavaScript' in webview)) return;
    (webview as any).executeJavaScript(`(function(){
      if (window.__wx_relax__) return; window.__wx_relax__ = true;
      try { const style = document.createElement('style'); style.textContent = '*{-webkit-user-select:text!important;user-select:text!important}'; document.head.appendChild(style); } catch(_){ }
    })();`);
  } catch (error) {
    console.error('injectRelaxSelection error', error);
  }
};

/**
 * 注入文章信息采集钩子
 * @param webview WebView元素
 *
 * 功能：
 * - 尝试读取标题/作者/发布时间/规范 URL（canonical）
 * - 适配通用与微信文章常见选择器
 * - 以 `__WX_ARTICLE__:` 前缀输出 JSON 到控制台
 */
export const injectArticleInfoHook = (webview: HTMLElement): void => {
  try {
    if (!('executeJavaScript' in webview)) return;
    (webview as any).executeJavaScript(`(function(){
      if (window.__wx_meta__) return; window.__wx_meta__ = true;
      function pickText(sel){ try { const el = document.querySelector(sel); return el ? String(el.textContent||'').trim() : ''; } catch(_){ return ''; } }
      function pickAttr(sel, attr){ try { const el = document.querySelector(sel); return el ? String(el.getAttribute(attr)||'').trim() : ''; } catch(_){ return ''; } }
      const title = pickText('#activity-name') || pickAttr('meta[property="og:title"]','content') || document.title || '';
      const author = pickText('#js_name') || pickAttr('meta[name="author"]','content') || '';
      const time = pickText('#publish_time') || pickAttr('meta[property="article:published_time"]','content') || '';
      const canon = pickAttr('link[rel="canonical"]','href') || location.href;
      const out = { title, author, time, url: canon };
      try { console.log('__WX_ARTICLE__:' + JSON.stringify(out)); } catch(_){ }
    })();`);
  } catch (error) {
    console.error('injectArticleInfoHook error', error);
  }
};

/**
 * 注入自动滚动能力（仅注入，不自动启动）
 * @param webview WebView元素
 * @param step 每次滚动像素步长（默认 200）
 * @param interval 定时滚动间隔毫秒（默认 300ms）
 *
 * 功能：
 * - 在 `window.__wx_autoscroll__` 上挂载 `{ start, stop }` 方法
 * - 通过 setInterval 周期性触发 `window.scrollBy(0, step)`
 */
export const injectAutoScrollHook = (webview: HTMLElement, step = 200, interval = 300): void => {
  try {
    if (!('executeJavaScript' in webview)) return;
    const s = Number(step) || 200;
    const i = Number(interval) || 300;
    (webview as any).executeJavaScript(`(function(){
      if (window.__wx_autoscroll__) return; window.__wx_autoscroll__ = { timer: null, start: function(s,i){ try { if (this.timer) clearInterval(this.timer); const ss = Number(s)||200; const ii = Number(i)||300; this.timer = setInterval(function(){ try{ window.scrollBy(0, ss); } catch(_){} }, ii); } catch(_){} }, stop: function(){ try{ if (this.timer) clearInterval(this.timer); this.timer = null; } catch(_){} } };
      try { console.log('__WX_AUTOSCROLL_READY__'); } catch(_){ }
    })();`);
  } catch (error) {
    console.error('injectAutoScrollHook error', error);
  }
};

/**
 * 注入链接点击记录钩子
 * @param webview WebView元素
 *
 * 功能：
 * - 捕获页面上的超链接点击事件，提取 `href` 与可见文本
 * - 以 `__WX_LINK__:` 前缀输出 JSON 到控制台
 */
export const injectLinkLoggerHook = (webview: HTMLElement): void => {
  try {
    if (!('executeJavaScript' in webview)) return;
    (webview as any).executeJavaScript(`(function(){
      if (window.__wx_link_log__) return; window.__wx_link_log__ = true;
      function emit(href, text){ try { console.log('__WX_LINK__:' + JSON.stringify({ href: String(href||''), text: String(text||'').trim() })); } catch(_){} }
      document.addEventListener('click', function(e){
        try { const a = e.target && (e.target.closest ? e.target.closest('a') : null); if (!a) return; const href = a.getAttribute('href') || a.href || ''; const text = a.textContent || ''; if (href) emit(href, text); } catch(_){ }
      }, true);
    })();`);
  } catch (error) {
    console.error('injectLinkLoggerHook error', error);
  }
};

/**
 * 注入图片收集钩子
 * @param webview WebView元素
 *
 * 功能：
 * - 收集页面中所有 `<img>` 的 `src/currentSrc` 与 `alt` 文本
 * - 以 `__WX_IMAGES__:` 前缀输出 JSON 数组到控制台
 */
export const injectImageCollectorHook = (webview: HTMLElement): void => {
  try {
    if (!('executeJavaScript' in webview)) return;
    (webview as any).executeJavaScript(`(function(){
      if (window.__wx_images__) return; window.__wx_images__ = true;
      try { const imgs = Array.from(document.querySelectorAll('img')).map((img)=>({ src: img.currentSrc || img.src || '', alt: img.alt || '' })).filter((it)=>it.src); console.log('__WX_IMAGES__:' + JSON.stringify(imgs)); } catch(_){ }
    })();`);
  } catch (error) {
    console.error('injectImageCollectorHook error', error);
  }
};
