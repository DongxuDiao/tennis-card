/* 抠图引擎
 * 1) mattingLocal(img, opts)  —— 纯本地：边缘泛洪去纯色背景 + 羽化 + 去色晕，无网络依赖
 * 2) aiRemoveBackground(...) —— AI 语义分割（@imgly/background-removal，动态加载 CDN，需联网）
 */
'use strict';

/* ===================== 本地抠图 ===================== */

/**
 * @param {HTMLImageElement} img
 * @param {{tolerance?:number, feather?:number, maxDim?:number}} opts
 *   tolerance 0-100，越大抠除越多；feather 羽化像素半径 0-4
 * @returns {HTMLCanvasElement} 带 _mattingInfo = { removedRatio, bg }
 */
function mattingLocal(img, opts) {
  opts = opts || {};
  const tolerance = opts.tolerance != null ? opts.tolerance : 30;
  const feather = opts.feather != null ? opts.feather : 2;
  const maxDim = opts.maxDim || 1500;

  const w0 = img.naturalWidth || img.width;
  const h0 = img.naturalHeight || img.height;
  const k = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.max(1, Math.round(w0 * k));
  const h = Math.max(1, Math.round(h0 * k));

  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const d = id.data;
  const N = w * h;

  // 1) 用四边像素估算背景参考色（各取 2px 边框求均值）
  let rs = 0, gs = 0, bs = 0, cnt = 0;
  const acc = function (x, y) {
    const i = (y * w + x) * 4;
    rs += d[i]; gs += d[i + 1]; bs += d[i + 2]; cnt++;
  };
  for (let x = 0; x < w; x++) { acc(x, 0); acc(x, h - 1); if (h > 2) { acc(x, 1); acc(x, h - 2); } }
  for (let y = 0; y < h; y++) { acc(0, y); acc(w - 1, y); if (w > 2) { acc(1, y); acc(w - 2, y); } }
  const bg = [rs / cnt, gs / cnt, bs / cnt];

  // 2) 从边缘泛洪：与背景色距离在容差内的连通区域标记为背景
  const tol = tolerance * 3.2; // 0-100 → 0-320 RGB 色距
  const tol2 = tol * tol;
  const mask = new Uint8Array(N); // 1 = 背景
  const stack = new Int32Array(N);
  let sp = 0;
  const isBg = function (idx) {
    const j = idx * 4;
    const dr = d[j] - bg[0], dg = d[j + 1] - bg[1], db = d[j + 2] - bg[2];
    return dr * dr + dg * dg + db * db <= tol2;
  };
  const seed = function (x, y) {
    const idx = y * w + x;
    if (!mask[idx] && isBg(idx)) { mask[idx] = 1; stack[sp++] = idx; }
  };
  for (let x = 0; x < w; x++) { seed(x, 0); seed(x, h - 1); }
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
  while (sp > 0) {
    const idx = stack[--sp];
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }

  let removed = 0;
  for (let i = 0; i < N; i++) removed += mask[i];
  const removedRatio = removed / N;

  // 3) alpha：前景 255 / 背景 0，再盒式模糊做羽化
  let alpha = new Float32Array(N);
  for (let i = 0; i < N; i++) alpha[i] = mask[i] ? 0 : 255;
  const r = Math.round(feather);
  if (r > 0) alpha = boxBlur(alpha, w, h, r);

  // 4) 边缘去色晕：半透明像素的颜色按 alpha 反解，减掉混入的背景色
  const unmix = function (c, b, a) {
    const v = (c - (1 - a) * b) / a;
    return v < 0 ? 0 : v > 255 ? 255 : v;
  };
  for (let i = 0; i < N; i++) {
    const a = alpha[i] / 255;
    const j = i * 4;
    if (a <= 0.004) { d[j + 3] = 0; continue; }
    if (a < 0.98) {
      d[j] = unmix(d[j], bg[0], a);
      d[j + 1] = unmix(d[j + 1], bg[1], a);
      d[j + 2] = unmix(d[j + 2], bg[2], a);
    }
    d[j + 3] = Math.max(0, Math.min(255, Math.round(alpha[i])));
  }
  ctx.putImageData(id, 0, 0);
  cv._mattingInfo = { removedRatio: removedRatio, bg: bg };
  return cv;
}

/** 可分离盒式模糊（用于 alpha 通道羽化） */
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const cl = function (v, hi) { return v < 0 ? 0 : v > hi ? hi : v; };
  const win = r * 2 + 1;
  for (let y = 0; y < h; y++) {
    const off = y * w;
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[off + cl(x, w - 1)];
    for (let x = 0; x < w; x++) {
      tmp[off + x] = acc / win;
      acc += src[off + cl(x + r + 1, w - 1)] - src[off + cl(x - r, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[cl(y, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / win;
      acc += tmp[cl(y + r + 1, h - 1) * w + x] - tmp[cl(y - r, h - 1) * w + x];
    }
  }
  return out;
}

/* ===================== AI 抠图（联网，按需加载） ===================== */

let _aiModule = null;
function aiModuleLoaded() { return !!_aiModule; }

const AI_IMPORT_URLS = [
  'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5/+esm',
  'https://fastly.jsdelivr.net/npm/@imgly/background-removal@1.5/+esm',
];

async function loadAIModule() {
  if (_aiModule) return _aiModule;
  let err = null;
  for (let i = 0; i < AI_IMPORT_URLS.length; i++) {
    try {
      _aiModule = await import(AI_IMPORT_URLS[i]);
      return _aiModule;
    } catch (e) { err = e; }
  }
  throw new Error('AI 模块加载失败（需联网访问 cdn.jsdelivr.net）：' + ((err && err.message) || err));
}

/**
 * @param {Blob} blob 输入图片
 * @param {(msg:string)=>void} [onProgress]
 * @returns {Promise<Blob>} 抠好的 PNG
 */
async function aiRemoveBackground(blob, onProgress) {
  const m = await loadAIModule();
  const fn = m.removeBackground || (m.default && m.default.removeBackground);
  if (!fn) throw new Error('AI 模块接口异常');
  return await fn(blob, {
    progress: function (key, cur, total) {
      if (!onProgress) return;
      if (key && key.indexOf('fetch') === 0 && total) {
        onProgress('下载模型 ' + Math.round((cur / total) * 100) + '%');
      } else {
        onProgress('识别中…');
      }
    },
    output: { format: 'image/png' },
  });
}
