/* 应用层：状态管理、编辑器联动、抠图管线、PNG 导出、localStorage 持久化 */
'use strict';

/* ===================== 配置 ===================== */

const IMG_SECTIONS = [
  { key: 'avatar',  title: '头像',   tip: '上传人物照片', defLabel: '' },
  { key: 'racket',  title: '球拍',   tip: '上传球拍照片', defRot: -30, defLabel: 'Wilson Pro Staff RF97 Autograph' },
  { key: 'shoes',   title: '球鞋',   tip: '上传球鞋照片', defLabel: 'NikeCourt Air Zoom Vapor RF' },
  { key: 'strings', title: '网球线', tip: '上传球线照片', defLabel: 'Wilson Natural Gut 16' },
  { key: 'grip',    title: '手胶',   tip: '上传手胶照片', defLabel: 'Wilson Leather Grip' },
];

const STATS = [
  { key: 'height',  label: '身高', value: '185', unit: 'cm' },
  { key: 'weight',  label: '体重', value: '85',  unit: 'kg' },
  { key: 'shoe',    label: '鞋码', value: '45',  unit: '' },
  { key: 'tension', label: '磅数', value: '48',  unit: 'lbs' },
];

const LS_KEY = 'tennis_card_state_v1';
const PREVIEW_DPR = 2;

/* ===================== 状态 ===================== */

function defaultState() {
  const s = {
    templateId: 'classic',
    name: '罗杰·费德勒',
    nameEn: 'Roger Federer',
    hand: '右手',
    ntrp: '7.0',
  };
  STATS.forEach(function (st) {
    s[st.key] = { label: st.label, value: st.value, unit: st.unit };
  });
  IMG_SECTIONS.forEach(function (sec) {
    s[sec.key] = {
      src: null, processed: null, img: null,
      mode: 'local', tol: 30, feather: 2,
      scale: 1, rot: sec.defRot || 0, dy: 0,
      label: sec.defLabel || '',
    };
  });
  return s;
}

function loadPersisted() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    const base = defaultState();
    ['templateId', 'name', 'nameEn', 'hand', 'ntrp'].forEach(function (k) {
      if (o[k] !== undefined && o[k] !== null) base[k] = o[k];
    });
    STATS.forEach(function (st) {
      if (o[st.key] && typeof o[st.key] === 'object') {
        base[st.key] = Object.assign(base[st.key], o[st.key]);
      }
    });
    IMG_SECTIONS.forEach(function (sec) {
      if (o[sec.key] && typeof o[sec.key] === 'object') {
        base[sec.key] = Object.assign(defaultState()[sec.key], o[sec.key], { img: null });
      }
    });
    return base;
  } catch (e) {
    console.warn('读取本地缓存失败', e);
    return null;
  }
}

let persistTimer = null;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(function () {
    if (!tryLocalStorage(true)) tryLocalStorage(false);
  }, 400);
}

/** @param withImages 存图失败（超配额）时降级为仅存文字 */
function tryLocalStorage(withImages) {
  try {
    const o = JSON.parse(JSON.stringify(state, function (k, v) {
      return k === 'img' ? undefined : v; // HTMLImageElement 不可序列化
    }));
    if (!withImages) {
      IMG_SECTIONS.forEach(function (sec) {
        o[sec.key].src = null;
        o[sec.key].processed = null;
      });
    }
    localStorage.setItem(LS_KEY, JSON.stringify(o));
    return true;
  } catch (e) {
    return false;
  }
}

let state = loadPersisted() || defaultState();

/* ===================== 工具 ===================== */

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

function loadImage(src) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    img.onload = function () { resolve(img); };
    img.onerror = function () { reject(new Error('图片加载失败')); };
    img.src = src;
  });
}

function readFileAsDataURL(file) {
  return new Promise(function (resolve, reject) {
    const r = new FileReader();
    r.onload = function () { resolve(r.result); };
    r.onerror = function () { reject(new Error('文件读取失败')); };
    r.readAsDataURL(file);
  });
}

function blobToDataURL(blob) {
  return new Promise(function (resolve, reject) {
    const r = new FileReader();
    r.onload = function () { resolve(r.result); };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

let toastTimer = null;
function toast(msg, ms) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 2600);
}

/* ===================== 渲染 ===================== */

const canvas = document.getElementById('card');

function currentTemplate() {
  return TemplateRegistry.get(state.templateId) || TemplateRegistry.list()[0];
}

function render() {
  const t = currentTemplate();
  if (!t) return;
  canvas.width = t.width * PREVIEW_DPR;
  canvas.height = t.height * PREVIEW_DPR;
  canvas.style.aspectRatio = t.width + '/' + t.height;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(PREVIEW_DPR, 0, 0, PREVIEW_DPR, 0, 0);
  ctx.clearRect(0, 0, t.width, t.height);
  t.render(ctx, state);
}

/* ===================== 编辑器 UI ===================== */

const ui = {}; // 每个 img section 的 DOM 引用

function buildStatsUI() {
  const grid = document.getElementById('statsGrid');
  STATS.forEach(function (st) {
    const row = el('div', 'stat-row');
    row.innerHTML =
      '<input class="s-label" type="text" maxlength="6" placeholder="标签">' +
      '<input class="s-value" type="text" maxlength="10" placeholder="数值">' +
      '<input class="s-unit" type="text" maxlength="8" placeholder="单位">';
    const labelI = row.querySelector('.s-label');
    const valueI = row.querySelector('.s-value');
    const unitI = row.querySelector('.s-unit');
    labelI.addEventListener('input', function () { state[st.key].label = labelI.value; render(); persist(); });
    valueI.addEventListener('input', function () { state[st.key].value = valueI.value; render(); persist(); });
    unitI.addEventListener('input', function () { state[st.key].unit = unitI.value; render(); persist(); });
    row.dataset.key = st.key;
    grid.appendChild(row);
  });
}

function buildBasicUI() {
  const bind = function (id, key) {
    document.getElementById(id).addEventListener('input', function (e) {
      state[key] = e.target.value;
      render();
      persist();
    });
  };
  bind('inName', 'name');
  bind('inNameEn', 'nameEn');
  bind('inHand', 'hand');

  // NTRP：实时预览 + 失焦时收敛为 1.0~7.0 的一位小数
  const ntrpInput = document.getElementById('inNtrp');
  ntrpInput.addEventListener('input', function (e) {
    state.ntrp = e.target.value;
    render();
    persist();
  });
  ntrpInput.addEventListener('change', function () {
    let v = parseFloat(ntrpInput.value);
    if (isNaN(v)) v = 2.0;
    v = Math.round(Math.min(7, Math.max(1, v)) * 10) / 10;
    const s = v.toFixed(1);
    ntrpInput.value = s;
    state.ntrp = s;
    render();
    persist();
  });
}

function buildTemplateSelect() {
  const sel = document.getElementById('templateSelect');
  TemplateRegistry.list().forEach(function (t) {
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', function () {
    state.templateId = sel.value;
    render();
    persist();
  });
}

function buildImageSections() {
  const wrap = document.getElementById('imageSections');
  IMG_SECTIONS.forEach(function (sec) {
    const box = el('div', 'sec img-sec');
    box.innerHTML =
      '<div class="sec-head"><h3>' + sec.title + '</h3>' +
      '<button class="linkbtn remove hidden">移除照片</button></div>' +
      '<div class="upload-row">' +
      '  <label class="upload-btn">📁 选择照片<input type="file" accept="image/*" hidden></label>' +
      '  <div class="thumb checker"><img alt=""></div>' +
      '  <div class="proc-status"></div>' +
      '</div>' +
      '<div class="ctrl"><span class="lbl">抠图</span>' +
      '  <select class="mode">' +
      '    <option value="local">自动去底（纯色背景）</option>' +
      '    <option value="ai">AI 智能抠图（联网）</option>' +
      '    <option value="none">保留原图</option>' +
      '  </select>' +
      '</div>' +
      '<div class="ctrl local-only"><span class="lbl">容差</span><input class="tol" type="range" min="5" max="80" step="1"><input class="tol-num num-input" type="number" min="5" max="80" step="1"></div>' +
      '<div class="ctrl local-only"><span class="lbl">羽化</span><input class="feather" type="range" min="0" max="4" step="1"><input class="feather-num num-input" type="number" min="0" max="4" step="1"></div>' +
      '<div class="ctrl"><span class="lbl">缩放</span><input class="scale" type="range" min="0.2" max="2.5" step="0.05"><input class="scale-num num-input" type="number" min="0.2" max="2.5" step="0.05"></div>' +
      '<div class="ctrl"><span class="lbl">旋转</span><input class="rot" type="range" min="-180" max="180" step="1"><input class="rot-num num-input" type="number" min="-180" max="180" step="1"></div>' +
      '<div class="ctrl"><span class="lbl">位置</span><input class="dy" type="range" min="-0.4" max="0.4" step="0.02"><input class="dy-num num-input" type="number" min="-0.4" max="0.4" step="0.02"></div>' +
      (sec.key !== 'avatar'
        ? '<div class="ctrl"><span class="lbl">名称</span><input class="label-input" type="text" maxlength="60" placeholder="卡片底部显示的文字"></div>'
        : '');
    wrap.appendChild(box);

    const refs = {
      root: box,
      fileInput: box.querySelector('input[type="file"]'),
      thumb: box.querySelector('.thumb'),
      thumbImg: box.querySelector('.thumb img'),
      status: box.querySelector('.proc-status'),
      removeBtn: box.querySelector('.remove'),
      mode: box.querySelector('.mode'),
      tol: box.querySelector('.tol'),
      feather: box.querySelector('.feather'),
      scale: box.querySelector('.scale'),
      rot: box.querySelector('.rot'),
      dy: box.querySelector('.dy'),
      tolNum: box.querySelector('.tol-num'),
      featherNum: box.querySelector('.feather-num'),
      scaleNum: box.querySelector('.scale-num'),
      rotNum: box.querySelector('.rot-num'),
      dyNum: box.querySelector('.dy-num'),
      labelInput: box.querySelector('.label-input'),
    };
    refs.status.setText = function (msg, cls) {
      refs.status.textContent = msg || '';
      refs.status.className = 'proc-status' + (cls ? ' ' + cls : '');
    };
    ui[sec.key] = refs;

    /* --- 事件 --- */
    refs.fileInput.addEventListener('change', async function () {
      const file = refs.fileInput.files && refs.fileInput.files[0];
      refs.fileInput.value = '';
      if (!file) return;
      try {
        const it = state[sec.key];
        it.src = await readFileAsDataURL(file);
        it.processed = null;
        it.img = null;
        refreshSectionUI(sec.key);
        persist();
        await processItem(sec);
      } catch (e) {
        toast('图片读取失败：' + e.message);
      }
    });

    refs.mode.addEventListener('change', async function () {
      state[sec.key].mode = refs.mode.value;
      refreshSectionUI(sec.key);
      if (state[sec.key].src) await processItem(sec);
      persist();
    });

    const reprocess = debounce(function () { processItem(sec); }, 300);
    bindAdjust(refs.tol, refs.tolNum, { min: 5, max: 80, step: 1, commit: function (v) {
      state[sec.key].tol = v;
      if (state[sec.key].src && state[sec.key].mode === 'local') reprocess();
      persist();
    } });
    bindAdjust(refs.feather, refs.featherNum, { min: 0, max: 4, step: 1, commit: function (v) {
      state[sec.key].feather = v;
      if (state[sec.key].src && state[sec.key].mode === 'local') reprocess();
      persist();
    } });
    bindAdjust(refs.scale, refs.scaleNum, { min: 0.2, max: 2.5, step: 0.05, fmt: 2, commit: function (v) {
      state[sec.key].scale = v;
      render();
      persist();
    } });
    bindAdjust(refs.rot, refs.rotNum, { min: -180, max: 180, step: 1, commit: function (v) {
      state[sec.key].rot = v;
      render();
      persist();
    } });
    bindAdjust(refs.dy, refs.dyNum, { min: -0.4, max: 0.4, step: 0.02, fmt: 2, commit: function (v) {
      state[sec.key].dy = v;
      render();
      persist();
    } });

    if (refs.labelInput) {
      refs.labelInput.addEventListener('input', function () {
        state[sec.key].label = refs.labelInput.value;
        render();
        persist();
      });
    }

    refs.removeBtn.addEventListener('click', async function () {
      const it = state[sec.key];
      it.src = null;
      it.processed = null;
      it.img = null;
      refs.status.setText('');
      refreshSectionUI(sec.key);
      render();
      persist();
    });
  });
}

function debounce(fn, ms) {
  let t = null;
  return function () {
    clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

/**
 * 滑杆 + 数字输入框双向同步：
 * - 拖滑杆 → 数字框实时回显
 * - 键入数字 → 实时预览（不做钳制），失焦(change) 时收敛到 [min,max] 并对齐 step
 * opts: { min, max, step, fmt?: 小数位数, commit(value) }
 */
function bindAdjust(range, num, opts) {
  const fmtVal = function (v) {
    return opts.fmt != null ? (+v).toFixed(opts.fmt) : String(+v);
  };
  const clamp = function (v) {
    v = Math.min(opts.max, Math.max(opts.min, v));
    v = Math.round(v / opts.step) * opts.step;
    return +v.toFixed(4);
  };
  range.addEventListener('input', function () {
    const v = +range.value;
    num.value = fmtVal(v);
    opts.commit(v);
  });
  num.addEventListener('input', function () {
    const v = parseFloat(num.value);
    if (isNaN(v)) return;
    range.value = v; // 超范围时滑杆自行停端点
    opts.commit(v);
  });
  num.addEventListener('change', function () {
    let v = parseFloat(num.value);
    if (isNaN(v)) v = +range.value;
    v = clamp(v);
    range.value = v;
    num.value = fmtVal(v);
    opts.commit(v);
  });
}

/** 同步某个区块的控件显示（值 / 缩略图 / 可见性） */
function refreshSectionUI(key) {
  const refs = ui[key];
  const it = state[key];
  if (!refs || !it) return;
  refs.mode.value = it.mode;
  const isLocal = it.mode === 'local';
  refs.root.querySelectorAll('.local-only').forEach(function (n) { n.classList.toggle('hidden', !isLocal); });
  refs.tol.value = it.tol; refs.tolNum.value = it.tol;
  refs.feather.value = it.feather; refs.featherNum.value = it.feather;
  refs.scale.value = it.scale; refs.scaleNum.value = (+it.scale).toFixed(2);
  refs.rot.value = it.rot; refs.rotNum.value = it.rot;
  refs.dy.value = it.dy; refs.dyNum.value = (+it.dy).toFixed(2);
  if (refs.labelInput) refs.labelInput.value = it.label || '';
  if (it.src) {
    refs.thumbImg.src = it.src;
    refs.thumb.classList.add('show');
    refs.removeBtn.classList.remove('hidden');
  } else {
    refs.thumbImg.removeAttribute('src');
    refs.thumb.classList.remove('show');
    refs.removeBtn.classList.add('hidden');
  }
}

/** 基本信息输入框回填 */
function syncBasicUI() {
  document.getElementById('inName').value = state.name || '';
  document.getElementById('inNameEn').value = state.nameEn || '';
  document.getElementById('inHand').value = state.hand || '右手';
  document.getElementById('inNtrp').value = state.ntrp || '';
  document.getElementById('templateSelect').value = state.templateId;
  STATS.forEach(function (st) {
    const row = document.querySelector('.stat-row[data-key="' + st.key + '"]');
    if (!row) return;
    row.querySelector('.s-label').value = state[st.key].label || '';
    row.querySelector('.s-value').value = state[st.key].value || '';
    row.querySelector('.s-unit').value = state[st.key].unit || '';
  });
}

/* ===================== 抠图管线 ===================== */

const procTimers = {};
function scheduleProcess(key) {
  clearTimeout(procTimers[key]);
  procTimers[key] = setTimeout(function () {
    const sec = IMG_SECTIONS.find(function (s) { return s.key === key; });
    if (sec) processItem(sec);
  }, 300);
}

async function processItem(sec) {
  const it = state[sec.key];
  const refs = ui[sec.key];
  if (!it.src) {
    it.img = null;
    render();
    return;
  }
  try {
    refs.status.setText('处理中…');
    if (it.mode === 'none') {
      it.processed = null;
      it.img = await loadImage(it.src);
      refs.status.setText('已保留原图', 'ok');
    } else if (it.mode === 'local') {
      const img0 = await loadImage(it.src);
      const cv = mattingLocal(img0, { tolerance: it.tol, feather: it.feather });
      const info = cv._mattingInfo || {};
      it.processed = cv.toDataURL('image/png');
      it.img = await loadImage(it.processed);
      if (info.removedRatio > 0.985) {
        refs.status.setText('⚠ 背景较复杂，去底效果可能不佳，建议改用 AI 抠图', 'err');
      } else {
        refs.status.setText('✓ 已自动去底', 'ok');
      }
    } else if (it.mode === 'ai') {
      if (!aiModuleLoaded()) refs.status.setText('首次使用需联网下载模型（约 40MB）…');
      const blob = await fetch(it.src).then(function (r) { return r.blob(); });
      const out = await aiRemoveBackground(blob, function (p) {
        refs.status.setText('AI 抠图：' + p);
      });
      it.processed = await blobToDataURL(out);
      it.img = await loadImage(it.processed);
      refs.status.setText('✓ AI 抠图完成', 'ok');
    }
  } catch (e) {
    console.error('processItem failed:', e);
    refs.status.setText('✗ 处理失败：' + ((e && e.message) || e), 'err');
    try { it.img = await loadImage(it.src); } catch (_) { /* ignore */ }
  }
  render();
  persist();
}

/** 从 localStorage 恢复图片（优先用已处理的版本，否则静默重抠） */
async function hydrateImages() {
  await Promise.all(IMG_SECTIONS.map(async function (sec) {
    const it = state[sec.key];
    if (!it.src) return;
    try {
      if (it.processed) {
        it.img = await loadImage(it.processed);
      } else {
        const img0 = await loadImage(it.src);
        if (it.mode === 'local') {
          const cv = mattingLocal(img0, { tolerance: it.tol, feather: it.feather });
          it.processed = cv.toDataURL('image/png');
          it.img = await loadImage(it.processed);
        } else {
          it.img = img0;
        }
      }
      const refs = ui[sec.key];
      if (refs) refs.status.setText(it.mode === 'none' ? '' : '✓ 已恢复上次照片', 'ok');
    } catch (e) {
      console.warn('恢复图片失败', sec.key, e);
    }
  }));
  render();
}

/* ===================== 导出 / 重置 ===================== */

function exportPNG() {
  const t = currentTemplate();
  if (!t) return;
  const scale = +document.getElementById('exportScale').value || 2;
  const cv = document.createElement('canvas');
  cv.width = t.width * scale;
  cv.height = t.height * scale;
  const ctx = cv.getContext('2d');
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  try {
    t.render(ctx, state);
  } catch (e) {
    console.error(e);
    toast('导出失败：' + e.message);
    return;
  }
  cv.toBlob(function (blob) {
    if (!blob) { toast('导出失败'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '网球名片-' + (state.name || 'card') + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    toast('✓ 已导出 PNG（' + cv.width + '×' + cv.height + '）');
  }, 'image/png');
}

function resetAll() {
  if (!confirm('恢复示例数据？当前内容（含已上传图片）将被清除。')) return;
  try { localStorage.removeItem(LS_KEY); } catch (e) { /* ignore */ }
  state = defaultState();
  IMG_SECTIONS.forEach(function (sec) {
    if (ui[sec.key]) ui[sec.key].status.setText('');
  });
  syncBasicUI();
  IMG_SECTIONS.forEach(function (sec) { refreshSectionUI(sec.key); });
  render();
  toast('已恢复示例数据');
}

/* ===================== 启动 ===================== */

buildTemplateSelect();
buildBasicUI();
buildStatsUI();
buildImageSections();
syncBasicUI();
IMG_SECTIONS.forEach(function (sec) { refreshSectionUI(sec.key); });

document.getElementById('btnDownload').addEventListener('click', exportPNG);
document.getElementById('btnReset').addEventListener('click', resetAll);

render();
hydrateImages();
