/**
 * WebView注入工具函数
 * 用于向WebView中注入JavaScript代码
 */

/**
 * 注入微信阅读复制钩子
 * @param webview WebView元素
 */
export const injectWeChatReadingCopyHook = (webview: HTMLElement): void => {
  try {
    // 检查webview是否有executeJavaScript方法
    if (!('executeJavaScript' in webview)) {
      console.error('WebView does not have executeJavaScript method');
      return;
    }
    
    // 执行注入的JavaScript代码
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
