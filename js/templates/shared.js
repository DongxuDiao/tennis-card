/* 模板公共绘制库：几何/文字/图片/占位图/NTRP 段位等跨模板复用的部分 */
'use strict';

var CardShared = (function () {

  const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Source Han Sans SC",system-ui,sans-serif';

  /* ---------- 基础工具 ---------- */

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function setFont(ctx, weight, size) { ctx.font = weight + ' ' + size + 'px ' + FONT; }

  /** 字号自适应：缩小到不超过 maxW（返回最终字号，ctx.font 已设好） */
  function fitFont(ctx, text, maxW, weight, size) {
    let s = size;
    setFont(ctx, weight, s);
    while (ctx.measureText(text).width > maxW && s > 12) {
      s -= 1;
      setFont(ctx, weight, s);
    }
    return s;
  }

  /** box 内 contain 适配绘制（支持缩放/旋转/垂直偏移/底部锚定/投影） */
  function drawImg(ctx, img, box, o) {
    o = o || {};
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const s = Math.min(box.w / iw, box.h / ih) * (o.scale || 1);
    const w = iw * s, h = ih * s;
    let cx = box.x + box.w / 2;
    let cy = box.y + box.h / 2;
    if (o.anchor === 'bottom') cy = box.y + box.h - h / 2;
    cy += (o.dy || 0) * box.h;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(((o.rot || 0) * Math.PI) / 180);
    if (o.shadow) {
      ctx.shadowColor = o.shadowColor || 'rgba(24,30,52,0.16)';
      ctx.shadowBlur = o.shadowBlur || 24;
      ctx.shadowOffsetY = o.shadowOffsetY != null ? o.shadowOffsetY : 8;
    }
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function normItem(it) {
    it = it || {};
    return {
      img: it.img || null,
      scale: it.scale || 1,
      rot: it.rot || 0,
      dy: it.dy || 0,
      label: it.label || '',
    };
  }

  /** 四角星光（钻石段位装饰） */
  function sparkle(ctx, x, y, s, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha != null ? alpha : 0.95;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x, y, x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
    ctx.quadraticCurveTo(x, y, x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ---------- NTRP 段位（整数段取整，小数归下一层） ---------- */

  /**
   * 1.x 白 / 2.x 青铜 / 3.x 白银 / 4.x 黄金 / 5.0+ 钻石
   * 返回渐变两端基准色，各模板自行映射文字/描边色
   */
  function ntrpTier(v) {
    let n = parseFloat(v);
    if (isNaN(n)) n = 1;
    n = Math.min(7, Math.max(1, n));
    const t = Math.floor(n);
    if (t <= 1) return { key: 'white', a: '#FFFFFF', b: '#E2E5EA' };
    if (t === 2) return { key: 'bronze', a: '#D9A874', b: '#9C6B3C' };
    if (t === 3) return { key: 'silver', a: '#F4F6FA', b: '#A9B2C2' };
    if (t === 4) return { key: 'gold', a: '#EACB82', b: '#C4983E' };
    return { key: 'diamond', a: '#D6F1FC', b: '#6FB6E8' };
  }

  /* ---------- 数据格（四格字号/基线严格一致，颜色由主题决定） ---------- */

  function drawStat(ctx, x, yTop, cellW, st, C) {
    st = st || {};
    C = C || {};
    const val = String(st.value != null && st.value !== '' ? st.value : '–');
    const unit = st.unit ? String(st.unit) : '';
    const VB = 38; // 数值基准字号，同时是固定基线偏移
    const unitSize = function (vs) { return Math.max(15, Math.round(vs * 0.56)); };

    let vs = VB;
    for (;;) {
      setFont(ctx, 700, vs);
      let w = ctx.measureText(val).width;
      if (unit) {
        setFont(ctx, 600, unitSize(vs));
        w += ctx.measureText(unit).width + 10;
      }
      if (w <= cellW - 24 || vs <= 14) break;
      vs -= 2;
    }

    const baseY = yTop + VB;
    setFont(ctx, 700, vs);
    const vw = ctx.measureText(val).width;
    ctx.fillStyle = C.value || '#2440C8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(val, x, baseY);
    if (unit) {
      setFont(ctx, 600, unitSize(vs));
      ctx.fillStyle = C.unit || C.value || '#2440C8';
      ctx.fillText(unit, x + vw + 10, baseY);
    }
    ctx.fillStyle = C.label || '#8A8F99';
    setFont(ctx, 500, 20);
    ctx.fillText(st.label || '', x, yTop + VB + 34);
  }

  /* ---------- 占位图（未上传照片时） ---------- */

  function phPerson(ctx, cx, cy, c) {
    ctx.save();
    ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy - 62, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 78, cy + 92);
    ctx.quadraticCurveTo(cx - 66, cy - 10, cx, cy - 12);
    ctx.quadraticCurveTo(cx + 66, cy - 10, cx + 78, cy + 92);
    ctx.stroke();
    ctx.restore();
  }

  function phRacket(ctx, cx, cy, c) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((-25 * Math.PI) / 180);
    ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(0, -58, 44, 56, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.save();
    ctx.beginPath(); ctx.ellipse(0, -58, 40, 52, 0, 0, Math.PI * 2); ctx.clip();
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) { ctx.moveTo(i * 16, -114); ctx.lineTo(i * 16, -2); }
    for (let j = -2; j <= 2; j++) { ctx.moveTo(-44, -58 + j * 20); ctx.lineTo(44, -58 + j * 20); }
    ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, -6); ctx.lineTo(-4, 32);
    ctx.moveTo(12, -6); ctx.lineTo(4, 32);
    ctx.stroke();
    roundRect(ctx, -6, 30, 12, 66, 5); ctx.stroke();
    ctx.restore();
  }

  function phShoe(ctx, cx, cy, c) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-78, 24);
    ctx.quadraticCurveTo(-72, -26, -30, -30);
    ctx.quadraticCurveTo(6, -34, 28, -8);
    ctx.quadraticCurveTo(48, 10, 82, 14);
    ctx.lineTo(82, 24);
    ctx.lineTo(-78, 24);
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-34, -18); ctx.lineTo(-12, -26);
    ctx.moveTo(-26, -4); ctx.lineTo(-2, -12);
    ctx.moveTo(-16, 10); ctx.lineTo(10, 2);
    ctx.stroke();
    ctx.restore();
  }

  function phStrings(ctx, cx, cy, c) {
    ctx.save();
    ctx.strokeStyle = c; ctx.lineCap = 'round';
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.arc(cx - 10, cy, 40, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx - 10, cy, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 26, cy + 14);
    ctx.quadraticCurveTo(cx + 62, cy + 22, cx + 78, cy);
    ctx.stroke();
    ctx.restore();
  }

  function phGrip(ctx, cx, cy, c) {
    ctx.save();
    ctx.strokeStyle = c; ctx.lineWidth = 4;
    [-24, 0, 24].forEach(function (a) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((a * Math.PI) / 180);
      roundRect(ctx, -9, -52, 18, 104, 9);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  /** kind: person / racket / shoes / strings / grip；C: {stroke, text, draw} */
  function placeholder(ctx, box, kind, tip, C) {
    C = C || {};
    const stroke = C.stroke || '#C7CBD3';
    const text = C.text || '#A9AFBA';
    const draw = C.draw || '#DCE0E7';
    ctx.save();
    ctx.setLineDash([9, 9]);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    roundRect(ctx, box.x + 4, box.y + 4, box.w - 8, box.h - 8, 18);
    ctx.stroke();
    ctx.setLineDash([]);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2 - 10;
    if (kind === 'person') phPerson(ctx, cx, cy, draw);
    else if (kind === 'racket') phRacket(ctx, cx, cy, draw);
    else if (kind === 'shoes') phShoe(ctx, cx, cy, draw);
    else if (kind === 'strings') phStrings(ctx, cx, cy, draw);
    else if (kind === 'grip') phGrip(ctx, cx, cy, draw);
    ctx.fillStyle = text;
    setFont(ctx, 500, 20);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tip, cx, box.y + box.h - 30);
    ctx.restore();
  }

  /* ---------- 噪点纹理（深色模板背景颗粒感） ---------- */

  let _noiseCanvas = null;
  function noisePattern(ctx) {
    if (!_noiseCanvas) {
      const c = document.createElement('canvas');
      c.width = 140; c.height = 140;
      const g = c.getContext('2d');
      const id = g.createImageData(140, 140);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 30 + Math.random() * 60;
        id.data[i] = v;
        id.data[i + 1] = v * 0.92;
        id.data[i + 2] = v * 0.8;
        id.data[i + 3] = Math.random() * 26;
      }
      g.putImageData(id, 0, 0);
      _noiseCanvas = c;
    }
    return ctx.createPattern(_noiseCanvas, 'repeat');
  }

  return {
    FONT: FONT,
    roundRect: roundRect,
    setFont: setFont,
    fitFont: fitFont,
    drawImg: drawImg,
    normItem: normItem,
    sparkle: sparkle,
    ntrpTier: ntrpTier,
    drawStat: drawStat,
    placeholder: placeholder,
    noisePattern: noisePattern,
  };

})();
