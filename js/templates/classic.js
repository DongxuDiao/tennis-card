/* 模板一：经典白 · Classic —— 白底金标蓝色数据（复刻首版参考图） */
'use strict';

(function () {

  const CS = CardShared;

  const W = 970, H = 1620;        // 逻辑画布
  const M = 25, GAP = 20;         // 页边距 / 卡片间距
  const CW = W - M * 2;           // 920 卡片宽
  const C1H = 520;                // 信息卡高
  const PH = 330;                 // 装备卡高

  const COL = {
    pageA: '#F5F6F8', pageB: '#EBEDF1',
    cardA: '#FFFFFF', cardB: '#F6F7F9',
    line: '#D8DBE0', grid: '#E5E7EB',
    name: '#16181D', en: '#3A3D45', hand: '#4A4E57',
    label: '#8A8F99', blue: '#2440C8',
    prodLabel: '#17181D',
    phStroke: '#C7CBD3', phText: '#A9AFBA', phDraw: '#DCE0E7',
  };

  // 段位徽章浅色系映射
  const TIER_LIGHT = {
    white:   { text: '#4A4E57', border: '#C6CBD4', gloss: false },
    bronze:  { text: '#3D2410', border: '#8A5A2E', gloss: true },
    silver:  { text: '#3A4150', border: '#98A2B3', gloss: true },
    gold:    { text: '#42310C', border: '#B08A34', gloss: true },
    diamond: { text: '#0E3A5C', border: '#57A0D8', gloss: true, sparkle: true },
  };

  /* ---------- 卡片绘制 ---------- */

  function cardBg(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
    g.addColorStop(0, COL.cardA);
    g.addColorStop(1, COL.cardB);
    ctx.fillStyle = g;
    CS.roundRect(ctx, x, y, w, h, 26);
    ctx.fill();
  }

  /** NTRP 段位胶囊徽章（浅色填充 + 段位描边/高光） */
  function drawNtrpBadge(ctx, d, rightX, topY) {
    const ntrpText = 'NTRP ' + String(d.ntrp != null && d.ntrp !== '' ? d.ntrp : '');
    const tier = CS.ntrpTier(d.ntrp);
    const extra = TIER_LIGHT[tier.key];
    CS.setFont(ctx, 700, 30);
    const tw = ctx.measureText(ntrpText).width;
    const pillW = tw + 52, pillH = 56;
    const pillX = rightX - pillW, pillY = topY;

    const gg = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
    gg.addColorStop(0, tier.a);
    gg.addColorStop(1, tier.b);
    ctx.fillStyle = gg;
    CS.roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = extra.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (extra.gloss) {
      ctx.save();
      CS.roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(pillX, pillY, pillW, pillH * 0.5);
      ctx.restore();
    }
    if (extra.sparkle) {
      CS.sparkle(ctx, pillX + 15, pillY + 15, 6, 0.95);
      CS.sparkle(ctx, pillX + pillW - 14, pillY + pillH - 13, 5, 0.9);
      CS.sparkle(ctx, pillX + pillW * 0.56, pillY + 9, 3.5, 0.8);
    }
    ctx.fillStyle = extra.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ntrpText, pillX + pillW / 2, pillY + pillH / 2 + 1);
  }

  /** 装备卡：居中大图 + 底部居中名称 */
  function productCard(ctx, x, y, w, h, item, kind, tip) {
    cardBg(ctx, x, y, w, h);
    ctx.save();
    CS.roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 24);
    ctx.clip();
    const box = { x: x + 24, y: y + 16, w: w - 48, h: h - 100 };
    if (item.img) {
      CS.drawImg(ctx, item.img, box, { scale: item.scale, rot: item.rot, dy: item.dy, shadow: true });
    } else {
      CS.placeholder(ctx, box, kind, tip, { stroke: COL.phStroke, text: COL.phText, draw: COL.phDraw });
    }
    ctx.restore();
    const label = (item.label || '').trim();
    if (label) {
      ctx.fillStyle = COL.prodLabel;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      CS.fitFont(ctx, label, w - 48, 700, 26);
      ctx.fillText(label, x + w / 2, y + h - 44);
    }
  }

  /* ---------- 主渲染 ---------- */

  function render(ctx, d) {
    // 页面底色
    const pg = ctx.createLinearGradient(0, 0, 0, H);
    pg.addColorStop(0, COL.pageA);
    pg.addColorStop(1, COL.pageB);
    ctx.fillStyle = pg;
    ctx.fillRect(0, 0, W, H);

    /* ===== 卡一：人物信息 ===== */
    const c1y = M;
    cardBg(ctx, M, c1y, CW, C1H);

    ctx.save();
    CS.roundRect(ctx, M, c1y, CW, C1H, 26);
    ctx.clip();

    // 头像背后的装饰圆
    ctx.fillStyle = '#E9EDF4';
    ctx.beginPath();
    ctx.arc(M + 175, c1y + 240, 150, 0, Math.PI * 2);
    ctx.fill();

    const av = CS.normItem(d.avatar);
    const avBox = { x: M + 8, y: c1y + 4, w: 350, h: C1H - 8 };
    if (av.img) {
      CS.drawImg(ctx, av.img, avBox, { scale: av.scale, rot: av.rot, dy: av.dy, anchor: 'bottom', shadow: true });
    } else {
      CS.placeholder(ctx, avBox, 'person', '上传人物照片', { stroke: COL.phStroke, text: COL.phText, draw: COL.phDraw });
    }

    // 左下白色圆形裁切装饰
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.97;
    ctx.beginPath();
    ctx.arc(M + 52, c1y + C1H + 4, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();

    // NTRP 段位徽章（右上）
    drawNtrpBadge(ctx, d, M + CW - 26, c1y + 30);

    // 右侧信息面板
    const rx = M + 385, rw = CW - 385 - 26;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = COL.name;
    CS.fitFont(ctx, d.name || '', rw, 700, 48);
    ctx.fillText(d.name || '', rx, c1y + 142);

    ctx.fillStyle = COL.en;
    CS.fitFont(ctx, d.nameEn || '', rw, 600, 28);
    ctx.fillText(d.nameEn || '', rx, c1y + 186);

    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx, c1y + 210);
    ctx.lineTo(rx + rw, c1y + 210);
    ctx.stroke();

    ctx.fillStyle = COL.hand;
    CS.fitFont(ctx, d.hand || '', rw, 600, 26);
    ctx.fillText(d.hand || '', rx, c1y + 252);

    // 2×2 数据网格
    const gx = rx, gy = c1y + 292, gw = rw, gh = C1H - 292 - 20;
    const cw2 = gw / 2, ch2 = gh / 2;
    ctx.strokeStyle = COL.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx + cw2, gy + 10);
    ctx.lineTo(gx + cw2, gy + gh - 10);
    ctx.moveTo(gx + 24, gy + ch2);
    ctx.lineTo(gx + gw - 24, gy + ch2);
    ctx.stroke();

    const stats = [d.height, d.weight, d.shoe, d.tension];
    const statCol = { value: COL.blue, unit: COL.blue, label: COL.label };
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = (i / 2) | 0;
      const x = gx + col * cw2 + (col ? 34 : 4);
      const yTop = gy + row * ch2 + 6;
      CS.drawStat(ctx, x, yTop, cw2 - 40, stats[i], statCol);
    }

    /* ===== 卡二：球拍 ===== */
    const c2y = M + C1H + GAP;
    productCard(ctx, M, c2y, CW, PH, CS.normItem(d.racket), 'racket', '上传球拍照片');

    /* ===== 卡三：球鞋 ===== */
    const c3y = c2y + PH + GAP;
    productCard(ctx, M, c3y, CW, PH, CS.normItem(d.shoes), 'shoes', '上传球鞋照片');

    /* ===== 卡四：球线 + 手胶（双列） ===== */
    const c4y = c3y + PH + GAP;
    const half = (CW - GAP) / 2;
    productCard(ctx, M, c4y, half, PH, CS.normItem(d.strings), 'strings', '上传球线照片');
    productCard(ctx, M + half + GAP, c4y, half, PH, CS.normItem(d.grip), 'grip', '上传手胶照片');
  }

  TemplateRegistry.register({
    id: 'classic',
    name: '经典白 · Classic',
    width: W,
    height: H,
    render: render,
  });

})();
