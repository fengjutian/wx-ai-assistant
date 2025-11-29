const { ipcRenderer } = require('electron');

const emit = (t) => {
  try { ipcRenderer.sendToHost('wx-copy', String(t || '').trim()); } catch (_){ }
};

const getSel = () => {
  try { return String((window.getSelection && window.getSelection().toString()) || '').trim(); } catch(_){ return ''; }
};

try {
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
    if (s) { try { window.__wx_last_sel__ = s; } catch(_){ } }
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
  try { console.log('__WX_COPY_INIT__'); } catch(_){ }
} catch(_){ }

