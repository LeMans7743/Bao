// 《包記炊粿：顧粿沒那麼簡單》
// 手感 7 道關卡 ＋ 3 級營業場地 ＋ 全手繪真實透明 Sprite 貼圖 ＋ 自適應 Canvas 引擎

/* =========================================================
   1. 音效合成系統 (Web Audio API)
========================================================= */
const AudioSys = {
  ctx: null,
  enabled: true,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },
  playTone(freq = 440, duration = 0.08, type = "sine", vol = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) {}
  },
  chop() {
    this.playTone(280 + Math.random() * 90, 0.05, "sawtooth", 0.14);
  },
  ouch() {
    this.playTone(180, 0.25, "sawtooth", 0.2);
    setTimeout(() => this.playTone(120, 0.28, "sawtooth", 0.22), 65);
  },
  pour() {
    this.playTone(420 + Math.random() * 80, 0.05, "sine", 0.08);
  },
  stir() {
    this.playTone(230 + Math.random() * 70, 0.06, "triangle", 0.09);
  },
  sizzle() {
    this.playTone(180 + Math.random() * 140, 0.04, "square", 0.07);
  },
  woodThump() {
    this.playTone(130, 0.14, "triangle", 0.22);
  },
  waterSplash() {
    this.playTone(340, 0.1, "sine", 0.14);
    setTimeout(() => this.playTone(480, 0.1, "sine", 0.12), 40);
  },
  perfectDing() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, "sine", 0.16), i * 65);
    });
  },
  goodDing() {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.16, "sine", 0.13), i * 75);
    });
  },
  failBuzz() {
    [260, 220, 180].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.18, "sawtooth", 0.16), i * 90);
    });
  },
  fanfare() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25, "triangle", 0.18), i * 90);
    });
  },
  swat() {
    this.playTone(580, 0.06, "square", 0.15);
  }
};

/* =========================================================
   2. 貼圖素材加載器 (Sprites & Photos Loader)
========================================================= */
const Sprites = {
  // 主角與品牌透明貼圖
  heroBoss: new Image(),
  heroGua: new Image(),
  bossPanic: new Image(),

  // 7 步驟核心透明貼圖
  radish: new Image(),
  grater: new Image(),
  bowl: new Image(),
  wok: new Image(),
  spatula: new Image(),
  firewood: new Image(),
  stove: new Image(),
  steamer: new Image(),
  skewer: new Image(),
  cakeBlock: new Image(),
  plate: new Image(),
  truck: new Image(),
  rat: new Image(),

  // 場景背景
  bgKitchen: new Image(),
  bgPrep: new Image(),
  bgWok: new Image(),
  bgFire: new Image()
};

// 綁定檔案路徑
Sprites.heroBoss.src = "assets/sprites/hero_boss.png";
Sprites.heroGua.src = "assets/sprites/hero_gua.png";
Sprites.bossPanic.src = "assets/sprites/boss_panic.png";

Sprites.radish.src = "assets/sprites/radish.png";
Sprites.grater.src = "assets/sprites/grater.png";
Sprites.bowl.src = "assets/sprites/bowl.png";
Sprites.wok.src = "assets/sprites/wok.png";
Sprites.spatula.src = "assets/sprites/spatula.png";
Sprites.firewood.src = "assets/sprites/firewood.png";
Sprites.stove.src = "assets/sprites/stove.png";
Sprites.steamer.src = "assets/sprites/steamer.png";
Sprites.skewer.src = "assets/sprites/skewer.png";
Sprites.cakeBlock.src = "assets/sprites/cake_block.png";
Sprites.plate.src = "assets/sprites/plate.png";
Sprites.truck.src = "assets/sprites/truck.png";
Sprites.rat.src = "assets/sprites/rat.png";

Sprites.bgKitchen.src = "assets/ui_kitchen_scene.jpg";
Sprites.bgPrep.src = "assets/station_prep.jpg";
Sprites.bgWok.src = "assets/station_wok.jpg";
Sprites.bgFire.src = "assets/station_fire.jpg";

// 安全繪製 Sprite 輔助函式
function drawSprite(ctx, img, cx, cy, w, h, angle = 0, alpha = 1) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  ctx.save();
  ctx.translate(cx, cy);
  if (angle !== 0) ctx.rotate(angle);
  if (alpha < 1) ctx.globalAlpha = Math.max(0, alpha);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/* =========================================================
   3. 排行榜持久化系統 (Leaderboard)
========================================================= */
const LB_STORAGE_KEY = "bao_cooking_mama_lb_v3";
const DEFAULT_LB_DATA = [
  { name: "阿嬤炊粿王", score: 2680, level: "年貨大街", time: "09:15" },
  { name: "包記大掌櫃", score: 2180, level: "年貨大街", time: "11:30" },
  { name: "廟口快手伯", score: 1650, level: "廟口夜市", time: "14:40" },
  { name: "早市小當家", score: 1120, level: "廟口夜市", time: "16:20" },
  { name: "炊粿學徒仔", score: 680, level: "老街早市", time: "18:05" }
];

const LeaderboardSys = {
  list: [],
  load() {
    try {
      const raw = localStorage.getItem(LB_STORAGE_KEY);
      this.list = raw ? JSON.parse(raw) : [...DEFAULT_LB_DATA];
    } catch (_) {
      this.list = [...DEFAULT_LB_DATA];
    }
    this.sort();
  },
  save() {
    try {
      localStorage.setItem(LB_STORAGE_KEY, JSON.stringify(this.list.slice(0, 15)));
    } catch (_) {}
  },
  sort() {
    this.list.sort((a, b) => b.score - a.score);
  },
  add(name, score, level) {
    this.list.forEach(e => e.isJustAdded = false);
    this.list.push({
      name: (name || "炊粿快手").trim().slice(0, 8) || "炊粿快手",
      score: Math.round(score),
      level,
      isJustAdded: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
    this.sort();
    this.save();
    this.render();
  },
  reset() {
    this.list = [...DEFAULT_LB_DATA];
    this.save();
    this.render();
  },
  render() {
    const makeRows = (items, limit = 5) => {
      return items.slice(0, limit).map((e, idx) => {
        const rank = idx + 1;
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        const rankCls = rank <= 3 ? `rank-${rank}` : "";
        const playerCls = e.isJustAdded ? "is-player" : "";
        return `
          <div class="lb-row ${rankCls} ${playerCls}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${e.name}</span>
            <span class="lb-meta">${e.level}</span>
            <span class="lb-score">$${e.score}</span>
          </div>
        `;
      }).join("");
    };

    const hubEl = document.getElementById("hub-lb-container");
    const modalEl = document.getElementById("modal-lb-container");
    const resultEl = document.getElementById("result-lb-container");

    if (hubEl) hubEl.innerHTML = makeRows(this.list, 5);
    if (modalEl) modalEl.innerHTML = makeRows(this.list, 15);
    if (resultEl) resultEl.innerHTML = makeRows(this.list, 5);
  }
};

/* =========================================================
   4. 關卡與步驟規格設定
========================================================= */
const LEVELS = [
  {
    id: 1,
    name: "老街早市",
    tag: "新手教學・1籠出餐",
    desc: "限時充裕，手指引導明確。細細體會 7 道傳統工序手感！",
    targetScore: 350,
    batches: 1,
    timeScale: 1.0,
    hasRats: false,
    hasCustomers: false,
    stars: [320, 450, 580]
  },
  {
    id: 2,
    name: "廟口夜市",
    tag: "爆單挑戰・2籠連續",
    desc: "步驟限時縮短！中途會有老鼠偷吃、急躁客人敲碗催單！",
    targetScore: 900,
    batches: 2,
    timeScale: 0.8,
    hasRats: true,
    hasCustomers: true,
    stars: [850, 1150, 1450]
  },
  {
    id: 3,
    name: "年貨大街",
    tag: "極限決戰・雙籠併行",
    desc: "過年大爆單！炒這籠顧那籠，頂部背景籠蒸煮中需適時補水！",
    targetScore: 1600,
    batches: 3,
    timeScale: 0.65,
    hasRats: true,
    hasCustomers: true,
    stars: [1500, 2000, 2500]
  }
];

const STEPS = [
  { id: 0, num: "①", title: "刨絲", actionHint: "手指在蘿蔔上「來回上下滑動」刨絲！保持在綠區節奏！" },
  { id: 1, num: "②", title: "調漿", actionHint: "按住倒冷水停在「3:1黃金線」！接著「順時針畫圈」攪拌！" },
  { id: 2, num: "③", title: "鐵鑊翻炒", actionHint: "點擊鏟除鍋底焦點！糊化條進濃稠區點起鍋！" },
  { id: 3, num: "④", title: "添柴", actionHint: "拖曳真實木柴甩入紅磚灶門！將火力維持在綠區！" },
  { id: 4, num: "⑤", title: "蒸粿", actionHint: "大火快蒸，水位低時長按水瓢補水，切勿乾燒！" },
  { id: 5, num: "⑥", title: "竹籤驗收", actionHint: "竹籤指針擺動進「中央綠區」時點擊插籤驗收！" },
  { id: 6, num: "⑦", title: "切塊出貨", actionHint: "劃 3 刀直線切塊，再把盛盤向上滑動甩上發財車！" }
];

/* =========================================================
   5. 遊戲主狀態管理器 (State)
========================================================= */
const GW = 420; // 虛擬標準寬度
const GH = 750; // 虛擬標準高度

const Game = {
  playerName: "炊粿快手",
  levelIdx: 0,
  batchIdx: 0,
  stepIdx: 0,
  totalScore: 0,
  completedBatches: [],
  currentBatchSteps: [],

  // Canvas
  canvas: null,
  ctx: null,
  scale: 1,
  offsetX: 0,
  offsetY: 0,

  // Loop
  running: false,
  lastTime: 0,

  // 步驟內部狀態
  stepState: {},
  stepTimer: 0,
  stepMaxTime: 8,
  stepDone: false,
  delayToNext: 0,

  // Level 3 雙籠併行狀態 (背景籠蒸煮)
  dualSteamer: {
    active: false,
    water: 80,
    boilSec: 0,
    dryWarning: false
  },

  // 干擾事件 (老鼠 / 客人)
  distractions: [],
  distractionTimer: 0,

  // 特效與浮動反饋文字
  floatingTexts: [],
  shakeTime: 0,
  bossMood: "NORMAL", // NORMAL, PANIC, HAPPY
  bossSpeech: "「顧粿沒那麼簡單，看準手感！」"
};

/* =========================================================
   6. 7 道手感關卡的邏輯與全 Sprite 貼圖繪製
========================================================= */

// ---------------------------------------------------------
// ① 刨絲 (刨絲板 + 蘿蔔 + 陶瓷大盆)
// ---------------------------------------------------------
function initStep0() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 8.5 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「跟著節奏刨，太急太快會刨到手喔！」";

  Game.stepState = {
    progress: 0, // 0 ~ 100
    grams: 0,    // 0 ~ 1200g
    radishY: 0,
    radishAngle: 0.1,
    lastY: null,
    speedMeter: 0,
    hurtTimer: 0,
    cutsCount: 0,
    particles: []
  };
}

function updateStep0(dt) {
  const s = Game.stepState;
  if (s.hurtTimer > 0) {
    s.hurtTimer -= dt;
    s.speedMeter = 0;
    Game.bossMood = "PANIC";
    Game.bossSpeech = "「唉唷痛痛痛！刨到手指啦！」";
    return;
  } else if (Game.bossMood === "PANIC") {
    Game.bossMood = "NORMAL";
    Game.bossSpeech = "「穩住節奏，再來！」";
  }

  s.speedMeter = Math.max(0, s.speedMeter - dt * 2.5);

  // 刨落蘿蔔絲粒子更新
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 850 * dt;
    p.alpha -= dt * 2.4;
    if (p.alpha <= 0) s.particles.splice(i, 1);
  }

  if (s.progress >= 100 && !Game.stepDone) {
    let grade = "PERFECT";
    if (s.cutsCount > 1 || Game.stepTimer <= 1.0) grade = "FAIL";
    else if (s.cutsCount === 1) grade = "GOOD";
    finishCurrentStep(grade, grade === "PERFECT" ? "粗細均勻無傷手！" : s.cutsCount > 0 ? "削到手指扣分！" : "及格削完！");
  }
}

function drawStep0(ctx) {
  const s = Game.stepState;

  // 1. 場景背景
  drawBackdrop(ctx, Sprites.bgPrep, 0.4);

  // 2. 接絲的青花瓷大盆 (Sprite)
  drawSprite(ctx, Sprites.bowl, 210, 560, 290, 290);

  // 3. 累積在盆裡的潔白蘿蔔絲堆
  const heapRatio = s.progress / 100;
  if (heapRatio > 0.05) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
    ctx.beginPath();
    ctx.ellipse(210, 560, 105 * heapRatio, 55 * heapRatio, 0, 0, Math.PI * 2);
    ctx.fill();
    // 絲狀線條
    ctx.strokeStyle = "#e8dfd0";
    ctx.lineWidth = 2;
    for (let i = 0; i < 12 * heapRatio; i++) {
      ctx.beginPath();
      ctx.arc(210 + (Math.sin(i * 1.5) * 60 * heapRatio), 560 + (Math.cos(i * 2.1) * 25 * heapRatio), 14, 0, Math.PI);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 4. 刨絲板 (Sprite) 傾斜架在盆上
  drawSprite(ctx, Sprites.grater, 210, 440, 165, 295, -0.06);

  // 5. 噴濺蘿蔔絲粒子
  for (const p of s.particles) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.vx * 0.04, p.y + p.vy * 0.04);
    ctx.stroke();
  }

  // 6. 白蘿蔔本體 (Sprite) 隨玩家手勢在刨絲板上上下摩擦滑動
  const ry = 425 + s.radishY;
  const rx = 210 + Math.sin(s.radishY * 0.05) * 12;
  drawSprite(ctx, Sprites.radish, rx, ry, 120, 185, s.radishAngle);

  // 7. 削到手紅閃提示
  if (s.hurtTimer > 0) {
    ctx.fillStyle = "rgba(231, 76, 60, 0.45)";
    ctx.fillRect(0, 0, GW, GH);
    drawSprite(ctx, Sprites.bossPanic, 210, 290, 140, 140);
    ctx.fillStyle = "#fff";
    ctx.font = "900 24px sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#800";
    ctx.lineWidth = 4;
    ctx.strokeText("🩸 刨到手啦！痛擊停頓中...", 210, 380);
    ctx.fillText("🩸 刨到手啦！痛擊停頓中...", 210, 380);
  }

  // 8. 速度計 (右側)
  drawSpeedGauge(ctx, 370, 390, 22, 180, s.speedMeter);

  // 9. 頂部任務橫幅
  drawStepBanner(ctx, `🥕 白蘿蔔刨絲：${s.grams}g / 1200g`, STEPS[0].actionHint);
}

function handlePointerStep0(type, x, y) {
  const s = Game.stepState;
  if (s.hurtTimer > 0) return;

  if (type === "down") {
    s.lastY = y;
  } else if (type === "move") {
    if (s.lastY === null) s.lastY = y;
    const dy = y - s.lastY;
    s.radishY = Math.max(-85, Math.min(85, s.radishY + dy * 0.7));
    s.radishAngle = (dy > 0 ? 0.15 : -0.15);

    if (Math.abs(dy) > 8) {
      const spd = Math.abs(dy) / 8;
      s.speedMeter = Math.min(1.0, s.speedMeter + spd * 0.085);

      // 太快削到手！
      if (s.speedMeter > 0.88) {
        s.hurtTimer = 1.35;
        s.cutsCount++;
        s.speedMeter = 0;
        AudioSys.ouch();
        shake(14);
        addFloatingNotice("🩸 刨到手扣分！", 210, 330, "#ff7675");
        return;
      }

      // 綠區有效削絲
      if (s.speedMeter >= 0.22 && s.speedMeter <= 0.85) {
        s.progress = Math.min(100, s.progress + 4.0);
        s.grams = Math.min(1200, Math.round((s.progress / 100) * 1200));
        AudioSys.chop();

        for (let i = 0; i < 3; i++) {
          s.particles.push({
            x: 210 + (Math.random() - 0.5) * 60,
            y: 460 + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 220,
            vy: -140 - Math.random() * 180,
            alpha: 1.0
          });
        }
      }
    }
    s.lastY = y;
  } else if (type === "up") {
    s.lastY = null;
    s.radishY = 0;
    s.radishAngle = 0.1;
  }
}

// ---------------------------------------------------------
// ② 調漿 (注水停在 3:1 ＋ 青花瓷盆畫圈攪拌消粉粒)
// ---------------------------------------------------------
function initStep1() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 10 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「倒水要看準 3:1，接著快把粉粒攪散！」";

  Game.stepState = {
    phase: "POUR", // POUR -> STIR
    waterRatio: 0,
    holdingPour: false,
    pourGrade: null,

    // 攪拌
    stirProgress: 0,
    lumps: Array.from({ length: 15 }, () => ({
      x: (Math.random() - 0.5) * 140,
      y: (Math.random() - 0.5) * 140,
      r: 10 + Math.random() * 8,
      alive: true
    })),
    lastAngle: null,
    totalAngle: 0,
    whiskAngle: 0.5,
    whiskX: 260,
    whiskY: 460
  };
}

function updateStep1(dt) {
  const s = Game.stepState;
  if (s.phase === "POUR") {
    if (s.holdingPour) {
      s.waterRatio = Math.min(1.0, s.waterRatio + dt * 0.38);
      AudioSys.pour();
    }
  } else if (s.phase === "STIR") {
    if (s.stirProgress >= 100 && !Game.stepDone) {
      let grade = "PERFECT";
      if (s.pourGrade === "FAIL" || Game.stepTimer <= 1.0) grade = "FAIL";
      else if (s.pourGrade === "GOOD") grade = "GOOD";
      finishCurrentStep(grade, grade === "PERFECT" ? "3:1 黃金比例，粉粒全散！" : "粉漿完成！");
    }
  }
}

function drawStep1(ctx) {
  const s = Game.stepState;
  drawBackdrop(ctx, Sprites.bgPrep, 0.4);

  // 1. 青花瓷大米漿盆 (Sprite)
  drawSprite(ctx, Sprites.bowl, 210, 460, 310, 310);

  // 2. 盆中米漿液體
  if (s.waterRatio > 0.05) {
    const alpha = Math.min(0.95, 0.45 + s.waterRatio * 0.5);
    ctx.fillStyle = `rgba(247, 243, 233, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(210, 460, 110, 110, 0, 0, Math.PI * 2);
    ctx.fill();

    // 蘿蔔碎絲沈浸在盆內
    ctx.fillStyle = "#eedfc8";
    for (let i = 0; i < 18; i++) {
      const ox = 210 + Math.sin(i * 1.8) * 75;
      const oy = 460 + Math.cos(i * 1.8) * 75;
      ctx.fillRect(ox, oy, 7, 3);
    }
  }

  // 3. 麵粉顆粒 (結塊)
  if (s.phase === "STIR") {
    ctx.fillStyle = "#e0d6c3";
    for (const lump of s.lumps) {
      if (lump.alive) {
        ctx.beginPath();
        ctx.arc(210 + lump.x, 460 + lump.y, lump.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#c8bca7";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // 攪拌木柄鍋鏟 (Sprite) 跟隨旋轉
    drawSprite(ctx, Sprites.spatula, s.whiskX, s.whiskY, 150, 150, s.whiskAngle);
  }

  // Phase 1：注水刻度柱
  if (s.phase === "POUR") {
    const bx = 32;
    const by = 290;
    const bw = 34;
    const bh = 250;

    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();

    // 3:1 目標線 (約 65% 高度)
    const targetY = by + bh * (1 - 0.65);
    ctx.fillStyle = "rgba(46, 204, 113, 0.55)";
    ctx.fillRect(bx, targetY - 16, bw, 32);
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, targetY - 16, bw, 32);

    // 當前水位
    const fillH = bh * s.waterRatio;
    ctx.fillStyle = "#3498db";
    ctx.fillRect(bx + 2, by + bh - fillH, bw - 4, fillH);

    ctx.fillStyle = "#fff";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("3:1 黃金刻度", bx + bw + 8, targetY + 5);

    // 水柱效果
    if (s.holdingPour) {
      ctx.fillStyle = "#5dade2";
      ctx.fillRect(205, 270, 10, 190);
    }

    // 長按倒水大按鈕
    ctx.fillStyle = s.holdingPour ? "#27ae60" : "#d35400";
    ctx.beginPath();
    ctx.roundRect(75, 640, 270, 58, 16);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(s.holdingPour ? "💧 注水中...看準放開！" : "👉 按住此處注水", 210, 676);

    drawStepBanner(ctx, "🚰 倒冷水調米粉：停在 3:1 刻度！", STEPS[1].actionHint);
  } else {
    // Phase 2：畫圈攪拌
    drawStepBanner(ctx, `🥣 畫圈攪拌消粉粒：${Math.round(s.stirProgress)}%`, "手指在青花瓷盆「順時針畫大圈」打散結塊！");
  }
}

function handlePointerStep1(type, x, y) {
  const s = Game.stepState;
  if (s.phase === "POUR") {
    if (type === "down") {
      s.holdingPour = true;
    } else if (type === "up") {
      if (s.holdingPour) {
        s.holdingPour = false;
        const diff = Math.abs(s.waterRatio - 0.65);
        if (diff <= 0.08) {
          s.pourGrade = "PERFECT";
          AudioSys.perfectDing();
          addFloatingNotice("✨ 3:1 完美比例！", 210, 360, "#2ecc71");
        } else if (diff <= 0.17) {
          s.pourGrade = "GOOD";
          AudioSys.goodDing();
          addFloatingNotice("👌 水量及格！", 210, 360, "#f1c40f");
        } else {
          s.pourGrade = "FAIL";
          AudioSys.failBuzz();
          addFloatingNotice(s.waterRatio < 0.58 ? "⚠️ 水太少太乾！" : "⚠️ 水太多太稀！", 210, 360, "#e74c3c");
        }
        setTimeout(() => {
          s.phase = "STIR";
          Game.bossSpeech = "「快畫圈打散粉粒，不能有結塊！」";
        }, 600);
      }
    }
  } else if (s.phase === "STIR") {
    if (type === "down" || type === "move") {
      const cx = 210;
      const cy = 460;
      const angle = Math.atan2(y - cy, x - cx);
      s.whiskAngle = angle + 0.8;
      s.whiskX = x;
      s.whiskY = y;

      if (s.lastAngle !== null) {
        let da = angle - s.lastAngle;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > 0.08) {
          s.totalAngle += Math.abs(da);
          s.stirProgress = Math.min(100, (s.totalAngle / (Math.PI * 8.5)) * 100);
          AudioSys.stir();

          const remain = Math.round((1 - s.stirProgress / 100) * s.lumps.length);
          for (let i = 0; i < s.lumps.length; i++) s.lumps[i].alive = i < remain;
        }
      }
      s.lastAngle = angle;
    } else if (type === "up") {
      s.lastAngle = null;
    }
  }
}

// ---------------------------------------------------------
// ③ 鐵鑊翻炒 (大黑鐵鑊 + 木柄鍋鏟 + 焦點消滅 + 起鍋)
// ---------------------------------------------------------
function initStep2() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 11 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「鍋底冒焦點要快鏟掉，米糰到濃稠黃金區起鍋！」";

  Game.stepState = {
    gelatin: 15, // 0 ~ 100
    hotspots: [],
    spawnTimer: 0.5,
    burntCount: 0,
    stopped: false,
    flameFx: 0,
    spatulaPos: { x: 270, y: 460, angle: 0.6 }
  };
}

function updateStep2(dt) {
  const s = Game.stepState;
  if (s.stopped) return;

  s.gelatin = Math.min(100, s.gelatin + dt * 11);

  // 焦點生成
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0 && s.hotspots.length < 5) {
    s.spawnTimer = 0.7 + Math.random() * 0.5;
    const r = Math.random() * 95;
    const a = Math.random() * Math.PI * 2;
    s.hotspots.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r * 0.72,
      timer: 1.7,
      radius: 20 + Math.random() * 8
    });
    AudioSys.sizzle();
  }

  // 焦點燃燒倒數
  for (let i = s.hotspots.length - 1; i >= 0; i--) {
    const h = s.hotspots[i];
    h.timer -= dt;
    if (h.timer <= 0) {
      s.hotspots.splice(i, 1);
      s.burntCount++;
      s.flameFx = 1.0;
      AudioSys.ouch();
      shake(10);
      Game.bossMood = "PANIC";
      Game.bossSpeech = "「燒焦起火啦！快鏟快鏟！」";
      addFloatingNotice("🔥 焦底起火扣分！", 210, 420, "#e74c3c");
    }
  }

  s.flameFx = Math.max(0, s.flameFx - dt * 1.5);

  if (s.gelatin >= 98 && !Game.stepDone) {
    s.stopped = true;
    finishCurrentStep("FAIL", "起鍋太晚！全部燒焦結硬團了！");
  }
}

function drawStep2(ctx) {
  const s = Game.stepState;
  drawBackdrop(ctx, Sprites.bgWok, 0.4);

  // 1. 大黑鐵鑊 (Sprite)
  drawSprite(ctx, Sprites.wok, 210, 430, 340, 280);

  // 2. 鐵鑊中米糰成團 (隨糊化變深金黃)
  const gRatio = s.gelatin / 100;
  ctx.save();
  ctx.translate(210, 430);
  ctx.fillStyle = gRatio > 0.8 ? "#f3d18c" : "#f7f1e3";
  ctx.beginPath();
  ctx.ellipse(0, 0, 115, 88, 0, 0, Math.PI * 2);
  ctx.fill();

  // 紅蔥頭爆香顆粒
  ctx.fillStyle = "#8e3a24";
  for (let i = 0; i < 18; i++) {
    const ox = ((i * 37) % 170) - 85;
    const oy = ((i * 53) % 120) - 60;
    ctx.fillRect(ox, oy, 7, 4);
  }

  // 3. 焦點斑塊
  for (const h of s.hotspots) {
    const urgency = 1 - (h.timer / 1.7);
    ctx.fillStyle = urgency > 0.6 ? "#e74c3c" : "#e67e22";
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius * (0.8 + urgency * 0.4), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("鏟！", h.x, h.y + 4);
  }

  // 燒焦紅閃
  if (s.flameFx > 0) {
    ctx.fillStyle = `rgba(231, 76, 60, ${s.flameFx * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 120, 92, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. 木柄鍋鏟 (Sprite) 隨點擊揮動
  drawSprite(ctx, Sprites.spatula, s.spatulaPos.x, s.spatulaPos.y, 140, 140, s.spatulaPos.angle);

  // 5. 糊化進度指示條
  const bx = 45;
  const by = 210;
  const bw = 330;
  const bh = 24;

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();

  // 濃稠黃金區 (78% ~ 93%)
  const zx = bx + bw * 0.78;
  const zw = bw * 0.15;
  ctx.fillStyle = "rgba(46, 204, 113, 0.6)";
  ctx.fillRect(zx, by, zw, bh);
  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(zx, by, zw, bh);

  // 當前糊化條
  ctx.fillStyle = s.gelatin > 93 ? "#e74c3c" : "#f39c12";
  ctx.fillRect(bx + 2, by + 2, (bw - 4) * (s.gelatin / 100), bh - 4);

  ctx.fillStyle = "#fff";
  ctx.font = "900 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("濃稠黃金區", zx + zw * 0.5, by - 6);

  // 起鍋按鈕
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.roundRect(75, 630, 270, 60, 16);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "900 21px sans-serif";
  ctx.fillText("🍳 起鍋出鑊！", 210, 668);

  drawStepBanner(ctx, `🥘 糊化翻炒：${Math.round(s.gelatin)}%`, STEPS[2].actionHint);
}

function handlePointerStep2(type, x, y) {
  const s = Game.stepState;
  if (s.stopped) return;

  if (type === "down") {
    // 檢查點擊起鍋按鈕
    if (x >= 75 && x <= 345 && y >= 630 && y <= 690) {
      s.stopped = true;
      const g = s.gelatin;
      if (g >= 78 && g <= 94 && s.burntCount === 0) {
        finishCurrentStep("PERFECT", "濃稠成糰、晶瑩剔透！");
      } else if (g >= 68 && g <= 97) {
        finishCurrentStep("GOOD", s.burntCount > 0 ? "些許焦香，成糰良好！" : "及格起鍋！");
      } else {
        finishCurrentStep("FAIL", g < 68 ? "太早起鍋，粉漿半生！" : "起鍋太晚，米糰過硬！");
      }
      return;
    }

    // 揮鏟動作
    s.spatulaPos.x = x;
    s.spatulaPos.y = y;
    s.spatulaPos.angle = -0.4;
    setTimeout(() => { s.spatulaPos.angle = 0.6; }, 180);

    // 檢查點擊鏟除焦點
    const cx = 210;
    const cy = 430;
    for (let i = s.hotspots.length - 1; i >= 0; i--) {
      const h = s.hotspots[i];
      if (Math.hypot(x - (cx + h.x), y - (cy + h.y)) <= h.radius + 24) {
        s.hotspots.splice(i, 1);
        AudioSys.chop();
        addFloatingNotice("✨ 鏟掉！", cx + h.x, cy + h.y - 15, "#2ecc71");
        return;
      }
    }
  }
}

// ---------------------------------------------------------
// ④ 添柴 (紅磚柴燒大灶 + 真實相思木木柴拖甩 + 火力綠區)
// ---------------------------------------------------------
function initStep3() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 8.5 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「把相思木柴甩進灶門，火候要顧在綠區！」";

  Game.stepState = {
    temp: 50,
    inGreenSec: 0,
    requiredGreenSec: 4.0 * ts,
    logs: [
      { id: 1, x: 90, y: 590, angle: -0.1 },
      { id: 2, x: 210, y: 590, angle: 0.05 },
      { id: 3, x: 330, y: 590, angle: 0.12 }
    ],
    dragLog: null,
    dragOff: { x: 0, y: 0 }
  };
}

function updateStep3(dt) {
  const s = Game.stepState;
  s.temp = Math.max(15, s.temp - dt * (13 + Math.random() * 8));

  if (s.temp >= 70 && s.temp <= 90) {
    s.inGreenSec += dt;
  }

  // 補充柴堆
  if (s.logs.length < 3) {
    s.logs.push({
      id: Date.now() + Math.random(),
      x: 80 + Math.random() * 260,
      y: 590,
      angle: (Math.random() - 0.5) * 0.2
    });
  }

  if (s.inGreenSec >= s.requiredGreenSec && !Game.stepDone) {
    finishCurrentStep("PERFECT", "灶火旺盛均勻，柴香撲鼻！");
  } else if (Game.stepTimer <= 0.1 && !Game.stepDone) {
    const r = s.inGreenSec / s.requiredGreenSec;
    finishCurrentStep(r >= 0.55 ? "GOOD" : "FAIL", r >= 0.55 ? "火候尚可！" : "爐溫失控，火候不均！");
  }
}

function drawStep3(ctx) {
  const s = Game.stepState;
  drawBackdrop(ctx, Sprites.bgFire, 0.4);

  // 1. 紅磚大柴灶 (Sprite)
  drawSprite(ctx, Sprites.stove, 210, 400, 310, 220);

  // 2. 灶門內火焰光與粒子
  const fRatio = s.temp / 100;
  ctx.save();
  ctx.translate(210, 420);
  const grad = ctx.createRadialGradient(0, 15, 8, 0, 15, 65 * fRatio);
  grad.addColorStop(0, "#f39c12");
  grad.addColorStop(0.65, "#e74c3c");
  grad.addColorStop(1, "rgba(231,76,60,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 15, 65, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. 火力溫度計
  drawThermometer(ctx, 370, 280, 24, 180, s.temp, 70, 90);

  // 4. 下方柴薪置放托盤
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.roundRect(30, 535, 360, 110, 16);
  ctx.fill();
  ctx.strokeStyle = "#8d5b32";
  ctx.lineWidth = 3;
  ctx.stroke();

  // 5. 真實相思木木柴 (Sprite)
  for (const log of s.logs) {
    drawSprite(ctx, Sprites.firewood, log.x, log.y, 115, 68, log.angle);
  }

  drawStepBanner(ctx, `🔥 柴火溫控：${Math.round(s.temp)}°C`, STEPS[3].actionHint);
}

function handlePointerStep3(type, x, y) {
  const s = Game.stepState;
  if (type === "down") {
    for (const log of s.logs) {
      if (Math.hypot(x - log.x, y - log.y) <= 48) {
        s.dragLog = log;
        s.dragOff.x = x - log.x;
        s.dragOff.y = y - log.y;
        break;
      }
    }
  } else if (type === "move") {
    if (s.dragLog) {
      s.dragLog.x = x - s.dragOff.x;
      s.dragLog.y = y - s.dragOff.y;
    }
  } else if (type === "up") {
    if (s.dragLog) {
      // 投進紅磚灶門 (210, 420)
      if (Math.hypot(s.dragLog.x - 210, s.dragLog.y - 420) <= 90) {
        s.temp = Math.min(100, s.temp + 26);
        AudioSys.woodThump();
        addFloatingNotice("🪵 添相思柴 +26°C！", 210, 330, "#f39c12");
        const idx = s.logs.indexOf(s.dragLog);
        if (idx !== -1) s.logs.splice(idx, 1);
      } else {
        s.dragLog.y = 590;
      }
      s.dragLog = null;
    }
  }
}

// ---------------------------------------------------------
// ⑤ 蒸粿 (竹蒸籠 + 滾沸蒸氣 + 長按補水防乾燒)
// ---------------------------------------------------------
function initStep4() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 10 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「大火快蒸，外鍋快沒水時按住水瓢補水！」";

  Game.stepState = {
    cook: 0,
    water: 75,
    holdingWater: false,
    dryCount: 0,
    puffs: []
  };
}

function updateStep4(dt) {
  const s = Game.stepState;
  s.water = Math.max(0, s.water - dt * 14.5);

  if (s.holdingWater) {
    s.water = Math.min(100, s.water + dt * 45);
    AudioSys.waterSplash();
  }

  if (s.water <= 0) {
    s.dryCount += dt;
    shake(8);
    Game.bossMood = "PANIC";
    Game.bossSpeech = "「乾燒啦！快按住補水，不然粿要毀了！」";
  } else {
    s.cook = Math.min(100, s.cook + dt * 18.5);
    if (Game.bossMood === "PANIC") {
      Game.bossMood = "NORMAL";
      Game.bossSpeech = "「蒸氣充足，很好！」";
    }
  }

  // 蒸氣白霧
  if (s.water > 0) {
    s.puffs.push({
      x: 210 + (Math.random() - 0.5) * 90,
      y: 330,
      vy: -140 - Math.random() * 80,
      r: 14 + Math.random() * 12,
      alpha: 0.7
    });
  }

  for (let i = s.puffs.length - 1; i >= 0; i--) {
    const p = s.puffs[i];
    p.y += p.vy * dt;
    p.r += dt * 15;
    p.alpha -= dt * 0.95;
    if (p.alpha <= 0) s.puffs.splice(i, 1);
  }

  if (s.cook >= 100 && !Game.stepDone) {
    const grade = s.dryCount > 1.2 ? "FAIL" : s.dryCount > 0 ? "GOOD" : "PERFECT";
    finishCurrentStep(grade, grade === "PERFECT" ? "蒸氣充足！米香純郁軟熟！" : s.dryCount > 0 ? "乾燒驚險及格！" : "蒸透出爐！");
  } else if (Game.stepTimer <= 0.1 && !Game.stepDone) {
    finishCurrentStep("FAIL", "乾燒過久未熟透！");
  }
}

function drawStep4(ctx) {
  const s = Game.stepState;
  drawBackdrop(ctx, Sprites.bgKitchen, 0.4);

  // 1. 蒸氣粒子
  for (const p of s.puffs) {
    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. 底下紅磚灶 (Sprite)
  drawSprite(ctx, Sprites.stove, 210, 520, 260, 180);

  // 3. 巨型竹蒸籠 (Sprite)
  drawSprite(ctx, Sprites.steamer, 210, 420, 220, 290);

  // 4. 外鍋水位管 (右側)
  const wx = 370;
  const wy = 330;
  const wh = 170;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.roundRect(wx, wy, 24, wh, 6);
  ctx.fill();

  const fillH = (s.water / 100) * wh;
  ctx.fillStyle = s.water < 22 ? "#e74c3c" : "#3498db";
  ctx.fillRect(wx + 2, wy + wh - fillH, 20, fillH);

  ctx.fillStyle = "#fff";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("外鍋水", wx + 12, wy - 6);

  // 5. 蒸煮進度
  const bx = 45;
  const by = 210;
  const bw = 330;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.roundRect(bx, by, bw, 20, 8);
  ctx.fill();
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(bx + 2, by + 2, (bw - 4) * (s.cook / 100), 16);

  // 6. 補水大按鈕
  ctx.fillStyle = s.holdingWater ? "#2980b9" : "#3498db";
  ctx.beginPath();
  ctx.roundRect(75, 630, 270, 60, 16);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "900 21px sans-serif";
  ctx.fillText(s.holdingWater ? "🚰 注入沸水中..." : "👉 按住水瓢補水！", 210, 668);

  drawStepBanner(ctx, `♨️ 大火炊熟中：${Math.round(s.cook)}%`, STEPS[4].actionHint);
}

function handlePointerStep4(type, x, y) {
  const s = Game.stepState;
  if (type === "down") {
    if (x >= 75 && x <= 345 && y >= 630 && y <= 690) {
      s.holdingWater = true;
    }
  } else if (type === "up") {
    s.holdingWater = false;
  }
}

// ---------------------------------------------------------
// ⑥ 竹籤驗收 (整塊菜頭粿 + 竹籤指針判定)
// ---------------------------------------------------------
function initStep5() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 6.5 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「竹籤針試法！插下去拔出不沾生漿才是熟透！」";

  Game.stepState = {
    needle: 0,
    dir: 1,
    plunged: false,
    skewerY: 0,
    speed: 1.15 / ts
  };
}

function updateStep5(dt) {
  const s = Game.stepState;
  if (!s.plunged) {
    s.needle += s.dir * s.speed * dt;
    if (s.needle >= 1.0) { s.needle = 1.0; s.dir = -1; }
    else if (s.needle <= 0) { s.needle = 0; s.dir = 1; }
  } else {
    s.skewerY = Math.min(85, s.skewerY + dt * 290);
  }
}

function drawStep5(ctx) {
  const s = Game.stepState;
  drawBackdrop(ctx, Sprites.bgKitchen, 0.4);

  // 1. 出爐整塊菜頭粿 (Sprite)
  drawSprite(ctx, Sprites.cakeBlock, 210, 490, 300, 200);

  // 2. 懸掛竹籤 (Sprite) 動畫
  const sy = 330 + s.skewerY;
  drawSprite(ctx, Sprites.skewer, 210, sy, 35, 170);

  // 3. 時機判定條
  const bx = 45;
  const by = 240;
  const bw = 330;
  const bh = 28;

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.roundRect(bx, by, bw, bh, 10);
  ctx.fill();

  // 半生紅區 (0 ~ 45%)
  ctx.fillStyle = "rgba(231,76,60,0.45)";
  ctx.fillRect(bx, by, bw * 0.45, bh);

  // 綠區 (45% ~ 65%)
  const gzx = bx + bw * 0.45;
  const gzw = bw * 0.2;
  ctx.fillStyle = "rgba(46,204,113,0.75)";
  ctx.fillRect(gzx, by, gzw, bh);
  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 3;
  ctx.strokeRect(gzx, by, gzw, bh);

  // 過熟老化區 (65% ~ 100%)
  ctx.fillStyle = "rgba(230,126,34,0.45)";
  ctx.fillRect(bx + bw * 0.65, by, bw * 0.35, bh);

  // 擺動指針
  const nx = bx + bw * s.needle;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(nx, by - 8);
  ctx.lineTo(nx - 7, by + bh + 6);
  ctx.lineTo(nx + 7, by + bh + 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2ecc71";
  ctx.font = "900 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("熟透不沾黏", gzx + gzw * 0.5, by - 12);

  drawStepBanner(ctx, "🍢 竹籤驗收：指針進綠區時點螢幕！", STEPS[5].actionHint);
}

function handlePointerStep5(type, x, y) {
  const s = Game.stepState;
  if (s.plunged) return;

  if (type === "down") {
    s.plunged = true;
    const p = s.needle;
    if (p >= 0.45 && p <= 0.65) {
      AudioSys.perfectDing();
      finishCurrentStep("PERFECT", "竹籤潔淨無粉漿！軟Q熟透！");
    } else if (p < 0.45) {
      AudioSys.failBuzz();
      finishCurrentStep("FAIL", "太早起籠！裡面半生粉漿黏竹籤！");
    } else {
      AudioSys.goodDing();
      finishCurrentStep("GOOD", "稍嫌蒸過久，口感偏硬！");
    }
  }
}

// ---------------------------------------------------------
// ⑦ 切塊出貨 (劃 3 刀直線 ＋ 盛盤甩上三輪發財車)
// ---------------------------------------------------------
function initStep6() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 9 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「劃 3 刀均勻切塊，再把盤子甩上發財車！」";

  Game.stepState = {
    subPhase: "SLICE",
    slices: 0,
    sliceLines: [],
    plateY: 0,
    plateVy: 0,
    delivered: false
  };
}

function updateStep6(dt) {
  const s = Game.stepState;
  if (s.subPhase === "FLICK" && s.plateVy < 0) {
    s.plateY += s.plateVy * dt;
    s.plateVy += 320 * dt;
    if (s.plateY <= -240 && !s.delivered) {
      s.delivered = true;
      AudioSys.fanfare();
      finishCurrentStep("PERFECT", "完美上車！客人搶購一空！");
    }
  }
}

function drawStep6(ctx) {
  const s = Game.stepState;

  if (s.subPhase === "SLICE") {
    drawBackdrop(ctx, Sprites.bgPrep, 0.4);

    // 1. 菜頭粿本體 (Sprite) 在木砧板上
    drawSprite(ctx, Sprites.cakeBlock, 210, 450, 310, 210);

    // 2. 指引虛線
    ctx.strokeStyle = "rgba(192, 57, 43, 0.55)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    for (let i = 1; i <= 3; i++) {
      const sx = 100 + i * 55;
      ctx.beginPath();
      ctx.moveTo(sx, 370);
      ctx.lineTo(sx, 530);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 3. 已切刀痕
    for (const sl of s.sliceLines) {
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sl.x1, sl.y1);
      ctx.lineTo(sl.x2, sl.y2);
      ctx.stroke();
    }

    drawStepBanner(ctx, `🔪 刀工切塊：${s.slices} / 3 刀`, STEPS[6].actionHint);
  } else {
    // 發財車出貨階段
    drawBackdrop(ctx, Sprites.bgKitchen, 0.4);

    // 1. 藍色三輪發財車 (Sprite) 在上方
    drawSprite(ctx, Sprites.truck, 210, 260, 260, 230);

    // 2. 盛盤切塊菜頭粿 (Sprite) 隨甩動向上飛入發財車
    const py = 560 + s.plateY;
    drawSprite(ctx, Sprites.plate, 210, py, 260, 180);

    drawStepBanner(ctx, "🚚 裝盤出貨：向上滑動甩上發財車！", "快把盤子「向上滑甩進發財車後斗」！");
  }
}

function handlePointerStep6(type, x, y) {
  const s = Game.stepState;
  if (s.subPhase === "SLICE") {
    if (type === "down") {
      s.sy = y;
      s.sx = x;
    } else if (type === "up") {
      if (s.sy !== undefined) {
        if (Math.abs(y - s.sy) > 35) {
          s.slices++;
          AudioSys.chop();
          s.sliceLines.push({ x1: s.sx, y1: s.sy, x2: x, y2: y });

          if (s.slices >= 3) {
            AudioSys.perfectDing();
            addFloatingNotice("✨ 刀工俐落！淋上蒜蓉甜辣醬！", 210, 350, "#2ecc71");
            setTimeout(() => {
              s.subPhase = "FLICK";
              Game.bossSpeech = "「把熱騰騰的盤子甩上發財車出發！」";
            }, 600);
          }
        }
      }
      s.sy = undefined;
    }
  } else if (s.subPhase === "FLICK") {
    if (type === "down") {
      s.fy = y;
    } else if (type === "up") {
      if (s.fy !== undefined && y - s.fy < -50) {
        s.plateVy = -780;
        AudioSys.swat();
      }
      s.fy = undefined;
    }
  }
}

/* =========================================================
   7. 步驟轉移與品質評分結算
========================================================= */
function initStep(idx) {
  Game.stepIdx = idx;
  Game.stepDone = false;
  Game.delayToNext = 0;

  switch (idx) {
    case 0: initStep0(); break;
    case 1: initStep1(); break;
    case 2: initStep2(); break;
    case 3: initStep3(); break;
    case 4: initStep4(); break;
    case 5: initStep5(); break;
    case 6: initStep6(); break;
  }
}

function finishCurrentStep(grade, comment) {
  if (Game.stepDone) return;
  Game.stepDone = true;
  Game.delayToNext = 1.35;

  if (grade === "PERFECT") {
    AudioSys.perfectDing();
    Game.bossMood = "HAPPY";
    Game.bossSpeech = "「水啦！這步做得太完美了！」";
  } else if (grade === "GOOD") {
    AudioSys.goodDing();
    Game.bossMood = "NORMAL";
    Game.bossSpeech = "「還不錯，保持下去！」";
  } else {
    AudioSys.failBuzz();
    Game.bossMood = "PANIC";
    Game.bossSpeech = "「慘了！這步沒做好，等等品質扣分！」";
  }

  Game.currentBatchSteps.push({
    stepId: Game.stepIdx,
    grade,
    comment
  });

  const txt = grade === "PERFECT" ? "👑 完美！" : grade === "GOOD" ? "👍 不錯！" : "💥 失敗！";
  const clr = grade === "PERFECT" ? "#2ecc71" : grade === "GOOD" ? "#f1c40f" : "#e74c3c";
  addFloatingNotice(txt, 210, 360, clr);
}

function evaluateCurrentBatch() {
  const steps = Game.currentBatchSteps || [];
  const map = { PERFECT: 100, GOOD: 70, FAIL: 35 };

  // 1. Q度：刨絲(40%) + 調漿(30%) + 竹籤(30%)
  const q = Math.round(
    (map[steps[0]?.grade || "FAIL"] * 0.4) +
    (map[steps[1]?.grade || "FAIL"] * 0.3) +
    (map[steps[5]?.grade || "FAIL"] * 0.3)
  );

  // 2. 香氣：翻炒(40%) + 添柴(30%) + 蒸粿(30%)
  const aroma = Math.round(
    (map[steps[2]?.grade || "FAIL"] * 0.4) +
    (map[steps[3]?.grade || "FAIL"] * 0.3) +
    (map[steps[4]?.grade || "FAIL"] * 0.3)
  );

  // 3. 賣相：調漿無粉粒(20%) + 蒸粿不塌陷(30%) + 切塊出貨(50%)
  const look = Math.round(
    (map[steps[1]?.grade || "FAIL"] * 0.2) +
    (map[steps[4]?.grade || "FAIL"] * 0.3) +
    (map[steps[6]?.grade || "FAIL"] * 0.5)
  );

  const avg = (q + aroma + look) / 3;
  // 售價加權：$200 基底，完美可達 $650+
  const price = Math.round(200 * (avg / 100) * (avg >= 90 ? 3.4 : avg >= 75 ? 2.2 : 1.15));

  Game.completedBatches.push({
    batchNum: Game.batchIdx + 1,
    q,
    aroma,
    look,
    price,
    steps: [...steps]
  });

  Game.totalScore += price;
  Game.currentBatchSteps = [];
}

/* =========================================================
   8. 突發干擾事件 (老鼠突襲 ＆ 客人催單 ＆ 雙籠蒸煮)
========================================================= */
function updateDistractions(dt) {
  const lv = LEVELS[Game.levelIdx];

  // Level 3 雙籠蒸煮機制：背景蒸籠水溫消耗
  if (Game.dualSteamer.active) {
    Game.dualSteamer.water = Math.max(0, Game.dualSteamer.water - dt * 6.5);
    if (Game.dualSteamer.water < 20) {
      Game.dualSteamer.dryWarning = true;
    } else {
      Game.dualSteamer.dryWarning = false;
    }
  }

  if (!lv.hasRats && !lv.hasCustomers) return;

  Game.distractionTimer -= dt;
  if (Game.distractionTimer <= 0) {
    Game.distractionTimer = 4.2 + Math.random() * 3.5;
    const isRat = lv.hasRats && Math.random() < 0.6;
    if (isRat) {
      Game.distractions.push({
        type: "RAT",
        x: Math.random() < 0.5 ? -35 : GW + 35,
        y: 350 + Math.random() * 200,
        vx: Math.random() < 0.5 ? 160 : -160,
        alive: true
      });
      AudioSys.swat();
    } else if (lv.hasCustomers) {
      Game.distractions.push({
        type: "CUSTOMER",
        x: 120 + Math.random() * 180,
        y: 280,
        timer: 3.2,
        alive: true
      });
    }
  }

  for (let i = Game.distractions.length - 1; i >= 0; i--) {
    const d = Game.distractions[i];
    if (d.type === "RAT") {
      d.x += d.vx * dt;
      if (d.x < -60 || d.x > GW + 60) Game.distractions.splice(i, 1);
    } else if (d.type === "CUSTOMER") {
      d.timer -= dt;
      if (d.timer <= 0) {
        Game.distractions.splice(i, 1);
        addFloatingNotice("😡 客人催單扣分！", d.x, d.y, "#e74c3c");
        Game.totalScore = Math.max(0, Game.totalScore - 40);
      }
    }
  }
}

function drawDistractions(ctx) {
  // 1. Level 3 頂部背景蒸籠狀態卡
  if (Game.dualSteamer.active) {
    ctx.save();
    ctx.fillStyle = Game.dualSteamer.dryWarning ? "rgba(231,76,60,0.85)" : "rgba(33, 19, 11, 0.85)";
    ctx.roundRect(GW - 130, 115, 115, 45, 8);
    ctx.fill();
    ctx.strokeStyle = "#f39c12";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawSprite(ctx, Sprites.steamer, GW - 110, 137, 34, 34);
    ctx.fillStyle = "#fff";
    ctx.font = "900 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("第1籠蒸煮", GW - 90, 132);
    ctx.fillText(`水:${Math.round(Game.dualSteamer.water)}% (點補)`, GW - 90, 148);
    ctx.restore();
  }

  // 2. 老鼠 (真實 Sprite 貼圖) 與催單客人
  for (const d of Game.distractions) {
    if (!d.alive) continue;
    if (d.type === "RAT") {
      const angle = d.vx > 0 ? 0 : Math.PI;
      drawSprite(ctx, Sprites.rat, d.x, d.y, 65, 52, 0);
    } else if (d.type === "CUSTOMER") {
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      ctx.roundRect(d.x - 70, d.y - 20, 140, 40, 12);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = "900 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("💢 老闆快點！(點我)", d.x, d.y + 5);
    }
  }
}

function checkDistractionTap(x, y) {
  // 檢查 Level 3 蒸籠快速補水
  if (Game.dualSteamer.active && x >= GW - 130 && x <= GW - 15 && y >= 115 && y <= 160) {
    Game.dualSteamer.water = Math.min(100, Game.dualSteamer.water + 35);
    AudioSys.waterSplash();
    addFloatingNotice("💧 背景籠補水完成！", GW - 70, 180, "#3498db");
    return true;
  }

  // 檢查老鼠或客人
  for (let i = Game.distractions.length - 1; i >= 0; i--) {
    const d = Game.distractions[i];
    if (!d.alive) continue;
    if (d.type === "RAT" && Math.hypot(x - d.x, y - d.y) <= 45) {
      d.alive = false;
      AudioSys.swat();
      addFloatingNotice("💥 打飛偷吃鼠 +$50！", d.x, d.y, "#2ecc71");
      Game.totalScore += 50;
      Game.distractions.splice(i, 1);
      return true;
    } else if (d.type === "CUSTOMER" && x >= d.x - 70 && x <= d.x + 70 && y >= d.y - 20 && y <= d.y + 20) {
      d.alive = false;
      AudioSys.perfectDing();
      addFloatingNotice("🍵 安撫客人成功！", d.x, d.y, "#2ecc71");
      Game.distractions.splice(i, 1);
      return true;
    }
  }
  return false;
}

/* =========================================================
   9. 視覺繪製輔助 (Backdrop, Banner, Gauges, Boss Avatar)
========================================================= */
function drawBackdrop(ctx, img, opacity = 0.5) {
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, 0, 0, GW, GH);
    ctx.restore();
  }
}

function drawStepBanner(ctx, title, hint) {
  ctx.fillStyle = "rgba(18, 10, 5, 0.9)";
  ctx.roundRect(20, 115, 380, 72, 14);
  ctx.fill();
  ctx.strokeStyle = "#c88a4b";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, 210, 142);

  ctx.fillStyle = "#ffdf6b";
  ctx.font = "800 13px sans-serif";
  ctx.fillText(hint, 210, 168);
}

function drawSpeedGauge(ctx, x, y, w, h, ratio) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  // 綠區
  const gy = y + h * (1 - 0.85);
  const gh = h * 0.63;
  ctx.fillStyle = "rgba(46,204,113,0.6)";
  ctx.fillRect(x, gy, w, gh);

  // 紅區 (危險太快)
  ctx.fillStyle = "rgba(231,76,60,0.7)";
  ctx.fillRect(x, y, w, h * 0.15);

  // 指標
  const cy = y + h * (1 - ratio);
  ctx.fillStyle = ratio > 0.85 ? "#e74c3c" : "#f1c40f";
  ctx.fillRect(x + 2, cy, w - 4, 6);

  ctx.fillStyle = "#fff";
  ctx.font = "900 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("節奏", x + w * 0.5, y - 6);
  ctx.restore();
}

function drawThermometer(ctx, x, y, w, h, temp, minG, maxG) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  // 綠區
  const gy = y + h * (1 - maxG / 100);
  const gh = h * ((maxG - minG) / 100);
  ctx.fillStyle = "rgba(46,204,113,0.65)";
  ctx.fillRect(x, gy, w, gh);

  // 當前溫度條
  const ch = h * (temp / 100);
  ctx.fillStyle = temp > maxG ? "#e74c3c" : temp < minG ? "#f39c12" : "#2ecc71";
  ctx.fillRect(x + 2, y + h - ch, w - 4, ch);

  ctx.fillStyle = "#fff";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("火力", x + w * 0.5, y - 6);
  ctx.restore();
}

function drawHUD(ctx) {
  const lv = LEVELS[Game.levelIdx];
  const step = STEPS[Game.stepIdx];

  // 頂部儀表底板
  ctx.fillStyle = "rgba(18, 10, 5, 0.95)";
  ctx.fillRect(0, 0, GW, 105);

  ctx.fillStyle = "#ffdf6b";
  ctx.font = "900 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`📍 ${lv.name} (第 ${Game.batchIdx + 1} / ${lv.batches} 籠)`, 16, 28);

  ctx.fillStyle = "#2ecc71";
  ctx.font = "900 16px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`💰 營收：$${Game.totalScore}`, GW - 16, 28);

  // 7 步驟進度膠囊
  const pillW = 44;
  const pillStartX = 18;
  for (let i = 0; i < 7; i++) {
    const px = pillStartX + i * 56;
    const py = 42;
    const isCur = i === Game.stepIdx;
    const isPast = i < Game.stepIdx;

    ctx.fillStyle = isCur ? "#f39c12" : isPast ? "#27ae60" : "rgba(255,255,255,0.18)";
    ctx.roundRect(px, py, pillW, 20, 6);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "900 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(STEPS[i].num, px + pillW * 0.5, py + 14);
  }

  // 步驟標題與倒數限時條
  ctx.fillStyle = "#fff";
  ctx.font = "900 19px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${step.num} ${step.title}`, 16, 92);

  const tRatio = Game.stepTimer / Game.stepMaxTime;
  const barW = 160;
  const barX = GW - barW - 16;
  const barY = 76;

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.roundRect(barX, barY, barW, 16, 6);
  ctx.fill();

  ctx.fillStyle = tRatio < 0.3 ? "#e74c3c" : "#f1c40f";
  ctx.roundRect(barX, barY, barW * tRatio, 16, 6);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${Game.stepTimer.toFixed(1)}s`, barX - 6, 88);
}

function drawBossAvatarBubble(ctx) {
  // 右下角包老闆透明貼圖立繪（正常端盤 / 失控起火）
  const avatarImg = Game.bossMood === "PANIC" ? Sprites.bossPanic : Sprites.heroBoss;
  drawSprite(ctx, avatarImg, GW - 45, GH - 45, 80, 80);

  // 漫畫對話氣泡
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.roundRect(16, GH - 62, GW - 110, 38, 12);
  ctx.fill();
  ctx.strokeStyle = "#3e200e";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#21130b";
  ctx.font = "900 12.5px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(Game.bossSpeech, 26, GH - 38);
}

function addFloatingNotice(text, x, y, color = "#fff") {
  Game.floatingTexts.push({ text, x, y, alpha: 1.0, color, vy: -50 });
}

function shake(amt) {
  Game.shakeTime = amt;
}

/* =========================================================
   10. 遊戲主迴圈 (Main Loop)
========================================================= */
function gameLoop(now) {
  if (!Game.running) return;
  const dt = Math.min(0.06, (now - Game.lastTime) / 1000);
  Game.lastTime = now;

  // 1. 步驟倒數
  if (!Game.stepDone) {
    Game.stepTimer = Math.max(0, Game.stepTimer - dt);
    if (Game.stepTimer <= 0) {
      finishCurrentStep("FAIL", "時間到！手腳太慢！");
    }
  }

  // 2. 步驟內部邏輯更新
  switch (Game.stepIdx) {
    case 0: updateStep0(dt); break;
    case 1: updateStep1(dt); break;
    case 2: updateStep2(dt); break;
    case 3: updateStep3(dt); break;
    case 4: updateStep4(dt); break;
    case 5: updateStep5(dt); break;
    case 6: updateStep6(dt); break;
  }

  // 3. 干擾老鼠與客人
  updateDistractions(dt);

  // 4. 步驟轉移
  if (Game.stepDone) {
    Game.delayToNext -= dt;
    if (Game.delayToNext <= 0) {
      if (Game.stepIdx < 6) {
        initStep(Game.stepIdx + 1);
      } else {
        // 完成一籠
        evaluateCurrentBatch();
        const lv = LEVELS[Game.levelIdx];
        Game.batchIdx++;
        if (Game.batchIdx < lv.batches) {
          // Level 3 啟動雙籠蒸煮
          if (Game.levelIdx === 2) {
            Game.dualSteamer.active = true;
            Game.dualSteamer.water = 85;
          }
          initStep(0);
        } else {
          finishGame();
          return;
        }
      }
    }
  }

  // 5. 浮動反饋字更新
  for (let i = Game.floatingTexts.length - 1; i >= 0; i--) {
    const ft = Game.floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.alpha -= dt * 0.9;
    if (ft.alpha <= 0) Game.floatingTexts.splice(i, 1);
  }

  // 6. 渲染畫布
  renderGameCanvas();

  requestAnimationFrame(gameLoop);
}

function renderGameCanvas() {
  const ctx = Game.ctx;

  // 清除背景
  ctx.fillStyle = "#140b06";
  ctx.fillRect(0, 0, Game.canvas.width, Game.canvas.height);

  ctx.save();
  // 虛擬座標變換
  ctx.translate(Game.offsetX, Game.offsetY);
  ctx.scale(Game.scale, Game.scale);

  // 震屏
  if (Game.shakeTime > 0) {
    const sx = (Math.random() - 0.5) * Game.shakeTime;
    const sy = (Math.random() - 0.5) * Game.shakeTime;
    ctx.translate(sx, sy);
    Game.shakeTime = Math.max(0, Game.shakeTime - 0.8);
  }

  // 底色
  ctx.fillStyle = "#24150d";
  ctx.fillRect(0, 0, GW, GH);

  // 步驟具體繪製
  switch (Game.stepIdx) {
    case 0: drawStep0(ctx); break;
    case 1: drawStep1(ctx); break;
    case 2: drawStep2(ctx); break;
    case 3: drawStep3(ctx); break;
    case 4: drawStep4(ctx); break;
    case 5: drawStep5(ctx); break;
    case 6: drawStep6(ctx); break;
  }

  // 干擾事件 (老鼠 / 客人 / 雙籠蒸煮)
  drawDistractions(ctx);

  // 頂部 HUD
  drawHUD(ctx);

  // 包老闆頭像與台詞氣泡
  drawBossAvatarBubble(ctx);

  // 浮動文字
  for (const ft of Game.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = "900 24px sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#1e120d";
    ctx.lineWidth = 4;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  ctx.restore();
}

/* =========================================================
   11. 遊戲生命週期 (Start / Finish / Screens)
========================================================= */
function startGame() {
  AudioSys.init();
  const nameInput = document.getElementById("player-name-input");
  if (nameInput && nameInput.value.trim()) {
    Game.playerName = nameInput.value.trim().slice(0, 8);
  }

  Game.batchIdx = 0;
  Game.totalScore = 0;
  Game.completedBatches = [];
  Game.distractions = [];
  Game.distractionTimer = 3.5;
  Game.dualSteamer.active = false;
  Game.running = true;

  showScreen("screen-play");
  resizeCanvas();
  initStep(0);

  Game.lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function finishGame() {
  Game.running = false;
  AudioSys.fanfare();

  const lv = LEVELS[Game.levelIdx];
  const passed = Game.totalScore >= lv.targetScore;

  let stars = 1;
  if (Game.totalScore >= lv.stars[2]) stars = 3;
  else if (Game.totalScore >= lv.stars[1]) stars = 2;

  // 登錄排行榜
  LeaderboardSys.add(Game.playerName, Game.totalScore, lv.name);

  showScreen("screen-result");

  const posterBg = document.getElementById("result-poster-bg");
  if (posterBg) posterBg.src = passed ? "assets/ui_win.jpg" : "assets/ui_lose.jpg";

  const bossSticker = document.getElementById("result-boss-sticker");
  if (bossSticker) bossSticker.src = passed ? "assets/sprites/hero_boss.png" : "assets/sprites/boss_panic.png";

  document.getElementById("result-star-row").textContent = passed ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆";
  document.getElementById("result-main-title").textContent = passed ? "通關成功！大豐收！" : "虧損！手忙腳亂收攤！";
  document.getElementById("result-main-sub").textContent = `${Game.playerName} 師傅在【${lv.name}】共炊出 ${Game.completedBatches.length} 籠粿，總營收 $${Game.totalScore}！`;

  // 渲染每籠品質報告
  const listEl = document.getElementById("result-batches-list");
  if (listEl) {
    listEl.innerHTML = Game.completedBatches.map(b => `
      <div class="batch-card">
        <div class="batch-card-head">
          <span>🍱 第 ${b.batchNum} 籠菜頭粿</span>
          <span class="batch-card-price">售價 $${b.price}</span>
        </div>
        <div class="batch-card-attrs">
          <div>彈牙 Q度: <b>${b.q}分</b></div>
          <div>柴火香氣: <b>${b.aroma}分</b></div>
          <div>刀工賣相: <b>${b.look}分</b></div>
        </div>
        <div class="batch-card-steps">
          ${b.steps.map(r => `<span>${STEPS[r.stepId].num} ${r.grade === "PERFECT" ? "👑" : r.grade === "GOOD" ? "👍" : "💥"}</span>`).join(" ")}
        </div>
      </div>
    `).join("");
  }

  // 下一關按鈕
  const btnNext = document.getElementById("btn-result-next");
  if (btnNext) {
    btnNext.style.display = (passed && Game.levelIdx < 2) ? "block" : "none";
    btnNext.onclick = () => {
      Game.levelIdx++;
      renderLevelSelection();
      startGame();
    };
  }
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  if (id === "screen-title") {
    LeaderboardSys.render();
    renderLevelSelection();
  }
}

function renderLevelSelection() {
  const container = document.getElementById("level-selector-list");
  if (!container) return;
  container.innerHTML = LEVELS.map((lv, idx) => `
    <div class="level-card ${idx === Game.levelIdx ? "selected" : ""}" data-idx="${idx}">
      <div class="level-badge-box">
        <img src="assets/sprites/${idx === 0 ? "radish" : idx === 1 ? "wok" : "steamer"}.png" class="level-badge-img" alt="${lv.name}" />
      </div>
      <div class="level-content">
        <div class="level-header-row">
          <div class="level-title">${lv.name}</div>
          <div class="level-tag">${lv.tag}</div>
        </div>
        <div class="level-sub-desc">${lv.desc}</div>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".level-card").forEach(c => {
    c.addEventListener("click", () => {
      Game.levelIdx = parseInt(c.dataset.idx, 10);
      AudioSys.chop();
      renderLevelSelection();
    });
  });
}

function resizeCanvas() {
  const canvas = Game.canvas;
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;

  // 計算自適應居中縮放 (Scale & Center Offset)
  const scaleX = rect.width / GW;
  const scaleY = rect.height / GH;
  const scale = Math.min(scaleX, scaleY);

  Game.scale = scale * dpr;
  Game.offsetX = ((rect.width - GW * scale) / 2) * dpr;
  Game.offsetY = ((rect.height - GH * scale) / 2) * dpr;
}

/* =========================================================
   12. 全螢幕手勢映射與按鈕事件綁定
========================================================= */
window.addEventListener("DOMContentLoaded", () => {
  LeaderboardSys.load();
  LeaderboardSys.render();
  renderLevelSelection();

  Game.canvas = document.getElementById("game-canvas");
  Game.ctx = Game.canvas.getContext("2d");

  window.addEventListener("resize", () => {
    if (Game.running) resizeCanvas();
  });

  // 將螢幕真實觸控映射為虛擬座標 (0 ~ GW, 0 ~ GH)
  function getVirtualPos(e) {
    const rect = Game.canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const actualScale = Game.scale / (window.devicePixelRatio || 1);
    const actualOffsetX = Game.offsetX / (window.devicePixelRatio || 1);
    const actualOffsetY = Game.offsetY / (window.devicePixelRatio || 1);

    return {
      x: (clientX - rect.left - actualOffsetX) / actualScale,
      y: (clientY - rect.top - actualOffsetY) / actualScale
    };
  }

  Game.canvas.addEventListener("pointerdown", e => {
    if (!Game.running) return;
    const { x, y } = getVirtualPos(e);

    if (checkDistractionTap(x, y)) return;

    switch (Game.stepIdx) {
      case 0: handlePointerStep0("down", x, y); break;
      case 1: handlePointerStep1("down", x, y); break;
      case 2: handlePointerStep2("down", x, y); break;
      case 3: handlePointerStep3("down", x, y); break;
      case 4: handlePointerStep4("down", x, y); break;
      case 5: handlePointerStep5("down", x, y); break;
      case 6: handlePointerStep6("down", x, y); break;
    }
  });

  Game.canvas.addEventListener("pointermove", e => {
    if (!Game.running) return;
    const { x, y } = getVirtualPos(e);
    switch (Game.stepIdx) {
      case 0: handlePointerStep0("move", x, y); break;
      case 1: handlePointerStep1("move", x, y); break;
      case 2: handlePointerStep2("move", x, y); break;
      case 3: handlePointerStep3("move", x, y); break;
      case 4: handlePointerStep4("move", x, y); break;
      case 5: handlePointerStep5("move", x, y); break;
      case 6: handlePointerStep6("move", x, y); break;
    }
  });

  const onPointerUp = e => {
    if (!Game.running) return;
    const { x, y } = getVirtualPos(e);
    switch (Game.stepIdx) {
      case 0: handlePointerStep0("up", x, y); break;
      case 1: handlePointerStep1("up", x, y); break;
      case 2: handlePointerStep2("up", x, y); break;
      case 3: handlePointerStep3("up", x, y); break;
      case 4: handlePointerStep4("up", x, y); break;
      case 5: handlePointerStep5("up", x, y); break;
      case 6: handlePointerStep6("up", x, y); break;
    }
  };

  Game.canvas.addEventListener("pointerup", onPointerUp);
  Game.canvas.addEventListener("pointercancel", onPointerUp);

  // 畫面按鈕
  document.getElementById("btn-start-game").addEventListener("click", startGame);
  document.getElementById("btn-result-retry").addEventListener("click", startGame);
  document.getElementById("btn-result-home").addEventListener("click", () => showScreen("screen-title"));

  // 音效開關
  const btnSound = document.getElementById("btn-sound-toggle");
  if (btnSound) {
    btnSound.addEventListener("click", () => {
      AudioSys.enabled = !AudioSys.enabled;
      btnSound.textContent = AudioSys.enabled ? "🔊" : "🔇";
    });
  }

  // 重置排行榜
  document.getElementById("btn-reset-lb").addEventListener("click", () => {
    LeaderboardSys.reset();
  });

  // 彈窗開關
  document.getElementById("btn-open-rules").addEventListener("click", () => {
    document.getElementById("modal-rules").classList.remove("hidden");
  });
  document.getElementById("btn-open-lb").addEventListener("click", () => {
    LeaderboardSys.render();
    document.getElementById("modal-lb").classList.remove("hidden");
  });
  document.querySelectorAll(".modal-close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.close;
      if (modalId) document.getElementById(modalId).classList.add("hidden");
    });
  });
});
