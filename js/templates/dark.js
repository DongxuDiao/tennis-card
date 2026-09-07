/* 模板二：黑金 · Dark —— 深色奢华风（深炭底 + 香槟金 + 暖橙光晕 + 颗粒质感） */
'use strict';

(function () {

  const CS = CardShared;

  const W = 970, H = 1620;        // 与经典白同构
  const M = 25, GAP = 20;
  const CW = W - M * 2;
  const C1H = 520;
  const PH = 330;

  const COL = {
    pageA: '#17150F', pageB: '#0C0B08',   // 深炭（暖黑）
    cardA: '#262117', cardB: '#1B1813',   // 卡片深棕黑渐变
    border: 'rgba(190,166,110,0.72)',     // 香槟金描边
    gold: '#C9B57E',                      // 香槟金文字
    goldDim: '#B8A56A',
    white: '#F5F2EA',                     // 暖白
    line: 'rgba(201,181,126,0.42)',       // 姓名下分隔线
    grid: 'rgba(201,181,126,0.26)',       // 数据格分隔线
    prodLabel: '#D6C48D',
    phStroke: 'rgba(190,166,110,0.38)', phText: '#8A7F63', phDraw: '#4E4636',
  };

  // 段位徽章深色系映射：深色底 + 段位色描边/文字
  const TIER_DARK = {
    white:   { text: '#E9EBF0' },
    bronze:  { text: '#E3B389' },
    silver:  { text: '#EDF0F5' },
    gold:    { text: '#F0DCA6' },
    diamond: { text: '#BFE6FA', sparkle: true },
  };

  /* ---------- 卡片绘制 ---------- */

  /** 深色卡：渐变底 + 香槟金细描边 */
  function cardBg(ctx, x, y, w, h) {
    const g = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
    g.addColorStop(0, COL.cardA);
    g.addColorStop(1, COL.cardB);
    ctx.fillStyle = g;
    CS.roundRect(ctx, x, y, w, h, 26);
    ctx.fill();
    ctx.strokeStyle = COL.border;
    ctx.lineWidth = 1.5;
    CS.roundRect(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 25);
    ctx.stroke();
  }

  /** NTRP 段位徽章：深色底 + 段位色描边渐变与文字 */
  function drawNtrpBadge(ctx, d, rightX, topY) {
    const ntrpText = 'NTRP ' + String(d.ntrp != null && d.ntrp !== '' ? d.ntrp : '');
    const tier = CS.ntrpTier(d.ntrp);
    const extra = TIER_DARK[tier.key];
    CS.setFont(ctx, 700, 30);
    const tw = ctx.measureText(ntrpText).width;
    const pillW = tw + 52, pillH = 56;
    const pillX = rightX - pillW, pillY = topY;

    // 深色底
    ctx.fillStyle = '#151310';
    CS.roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    // 段位色描边
    const bg = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY);
    bg.addColorStop(0, tier.a);
    bg.addColorStop(1, tier.b);
    ctx.strokeStyle = bg;
    ctx.lineWidth = 2;
    CS.roundRect(ctx, pillX + 1, pillY + 1, pillW - 2, pillH - 2, (pillH - 2) / 2);
    ctx.stroke();
    if (extra.sparkle) {
      CS.sparkle(ctx, pillX + 15, pillY + 15, 6, 0.95);
      CS.sparkle(ctx, pillX + pillW - 14, pillY + pillH - 13, 5, 0.9);
    }
    ctx.fillStyle = extra.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ntrpText, pillX + pillW / 2, pillY + pillH / 2 + 1);
  }

  /** 装备卡 */
  function productCard(ctx, x, y, w, h, item, kind, tip) {
    cardBg(ctx, x, y, w, h);
    ctx.save();
    CS.roundRect(ctx, x + 2, y + 2, w - 4, h - 4, 24);
    ctx.clip();
    const box = { x: x + 24, y: y + 16, w: w - 48, h: h - 100 };
    if (item.img) {
      CS.drawImg(ctx, item.img, box, {
        scale: item.scale, rot: item.rot, dy: item.dy, shadow: true,
        shadowColor: 'rgba(0,0,0,0.55)', shadowBlur: 30, shadowOffsetY: 12,
      });
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
    // 页面底色 + 颗粒质感
    const pg = ctx.createLinearGradient(0, 0, 0, H);
    pg.addColorStop(0, COL.pageA);
    pg.addColorStop(1, COL.pageB);
    ctx.fillStyle = pg;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = CS.noisePattern(ctx);
    ctx.fillRect(0, 0, W, H);

    /* ===== 卡一：人物信息 ===== */
    const c1y = M;
    cardBg(ctx, M, c1y, CW, C1H);

    ctx.save();
    CS.roundRect(ctx, M, c1y, CW, C1H, 26);
    ctx.clip();

    // 暖橙光晕（人物背后，落日光感）
    const glow = ctx.createRadialGradient(M + 185, c1y + 215, 30, M + 185, c1y + 215, 230);
    glow.addColorStop(0, 'rgba(233,158,84,0.34)');
    glow.addColorStop(0.6, 'rgba(233,158,84,0.12)');
    glow.addColorStop(1, 'rgba(233,158,84,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(M, c1y, CW, C1H);

    const av = CS.normItem(d.avatar);
    const avBox = { x: M + 8, y: c1y + 4, w: 350, h: C1H - 8 };
    if (av.img) {
      CS.drawImg(ctx, av.img, avBox, {
        scale: av.scale, rot: av.rot, dy: av.dy, anchor: 'bottom', shadow: true,
        shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 34, shadowOffsetY: 14,
      });
    } else {
      CS.placeholder(ctx, avBox, 'person', '上传人物照片', { stroke: COL.phStroke, text: COL.phText, draw: COL.phDraw });
    }

    // 左下深色圆形裁切装饰（金色勾边呼应）
    ctx.fillStyle = '#1C1914';
    ctx.beginPath();
    ctx.arc(M + 52, c1y + C1H + 4, 118, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // NTRP 段位徽章（右上）
    drawNtrpBadge(ctx, d, M + CW - 26, c1y + 30);

    // 右侧信息面板：白色姓名 + 金色副文字
    const rx = M + 385, rw = CW - 385 - 26;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = COL.white;
    CS.fitFont(ctx, d.name || '', rw, 700, 48);
    ctx.fillText(d.name || '', rx, c1y + 142);

    ctx.fillStyle = COL.gold;
    CS.fitFont(ctx, d.nameEn || '', rw, 600, 28);
    ctx.fillText(d.nameEn || '', rx, c1y + 186);

    ctx.strokeStyle = COL.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rx, c1y + 210);
    ctx.lineTo(rx + rw, c1y + 210);
    ctx.stroke();

    ctx.fillStyle = COL.gold;
    CS.fitFont(ctx, d.hand || '', rw, 600, 26);
    ctx.fillText(d.hand || '', rx, c1y + 252);

    // 2×2 数据网格：白色数值 + 金色单位/标签 + 金色分隔线
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
    const statCol = { value: COL.white, unit: COL.gold, label: COL.goldDim };
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
    id: 'dark',
    name: '黑金 · Dark',
    width: W,
    height: H,
    render: render,
  });

})();
