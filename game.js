// 《包記炊粿：手感炊粿大挑戰》
// 料理媽媽手感 7 道關卡 ＋ 3 級營業場地 ＋ 虛擬高解析自適應 Canvas 引擎

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
   2. 素材圖片預載器 (Preloader)
========================================================= */
const Assets = {
  isoRoom: new Image(),
  prep: new Image(),
  wok: new Image(),
  fire: new Image(),
  kitchenScene: new Image(),
  truck: new Image(),
  win: new Image(),
  lose: new Image(),
  bossFront: new Image(),
  bossBack: new Image(),
  bossPanic: new Image()
};

Assets.isoRoom.src = "assets/iso_kitchen_room.jpg";
Assets.prep.src = "assets/station_prep.jpg";
Assets.wok.src = "assets/station_wok.jpg";
Assets.fire.src = "assets/station_fire.jpg";
Assets.kitchenScene.src = "assets/ui_kitchen_scene.jpg";
Assets.truck.src = "assets/ui_rush_truck.jpg";
Assets.win.src = "assets/ui_win.jpg";
Assets.lose.src = "assets/ui_lose.jpg";
Assets.bossFront.src = "正面.jfif";
Assets.bossBack.src = "背面.jfif";
Assets.bossPanic.src = "assets/boss_panic.jpg";

/* =========================================================
   3. 排行榜持久化系統 (Leaderboard)
========================================================= */
const LB_STORAGE_KEY = "bao_cooking_mama_lb_v2";
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
   4. 關卡與步驟設定
========================================================= */
const LEVELS = [
  {
    id: 1,
    name: "老街早市",
    tag: "新手教學・1籠出餐",
    desc: "限時充裕，手指引導明確。細細體會 7 道工序的傳統手感！",
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
    desc: "步驟限時縮短！中途會有貪吃鼠竄出偷吃、急躁客人敲碗催單！",
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
    tag: "極限決戰・3籠連發",
    desc: "過年人潮洶湧！節奏飛快，手感與反應力的終極考驗！",
    targetScore: 1600,
    batches: 3,
    timeScale: 0.65,
    hasRats: true,
    hasCustomers: true,
    stars: [1500, 2000, 2500]
  }
];

const STEPS = [
  { id: 0, num: "①", title: "刨絲", actionHint: "手指在蘿蔔上「來回上下滑動」刨絲！保持綠區節奏！" },
  { id: 1, num: "②", title: "調漿", actionHint: "按住倒冷水停在「3:1黃金線」！接著「順時針畫圈」攪拌！" },
  { id: 2, num: "③", title: "鐵鑊翻炒", actionHint: "點擊鏟除鍋底焦點！糊化條進濃稠區點起鍋！" },
  { id: 3, num: "④", title: "添柴", actionHint: "拖曳木柴甩入紅磚灶門！將火力維持在綠區！" },
  { id: 4, num: "⑤", title: "蒸粿", actionHint: "大火快蒸，水位低時長按水瓢補水，切勿乾燒！" },
  { id: 5, num: "⑥", title: "竹籤驗收", actionHint: "竹籤指針擺動進「中央綠區」時點擊插籤驗收！" },
  { id: 6, num: "⑦", title: "切塊出貨", actionHint: "劃 3 刀直線切塊，再把盛盤向上滑動甩上發財車！" }
];

/* =========================================================
   5. 遊戲主狀態管理器 (State)
========================================================= */
const GW = 420; // 虛擬標準寬度 (Virtual Width)
const GH = 750; // 虛擬標準高度 (Virtual Height)

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

  // 干擾事件 (老鼠 / 客人)
  distractions: [],
  distractionTimer: 0,

  // 特效與浮動反饋文字
  floatingTexts: [],
  shakeTime: 0,
  bossMood: "NORMAL", // NORMAL, PANIC, HAPPY
  bossSpeech: "「看準時機，用心炊粿！」"
};

/* =========================================================
   6. 7 道手感關卡的邏輯與繪製 (Cooking Mama Mechanics)
========================================================= */

// ---------------------------------------------------------
// ① 刨絲 (上下來回滑動，控制速度計在綠區)
// ---------------------------------------------------------
function initStep0() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 8.5 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「跟著節奏刨，太快會刨到手喔！」";

  Game.stepState = {
    progress: 0, // 0 ~ 100
    grams: 0,    // 0 ~ 1200g
    radishY: 0,
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
    Game.bossSpeech = "「唉唷！小心刨到手了！」";
    return;
  } else if (Game.bossMood === "PANIC") {
    Game.bossMood = "NORMAL";
    Game.bossSpeech = "「穩住節奏，再來！」";
  }

  s.speedMeter = Math.max(0, s.speedMeter - dt * 2.6);

  // 粒子更新
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 800 * dt;
    p.alpha -= dt * 2.2;
    if (p.alpha <= 0) s.particles.splice(i, 1);
  }

  if (s.progress >= 100 && !Game.stepDone) {
    let grade = "PERFECT";
    if (s.cutsCount > 1 || Game.stepTimer <= 1.0) grade = "FAIL";
    else if (s.cutsCount === 1) grade = "GOOD";
    finishCurrentStep(grade, grade === "PERFECT" ? "粗細均勻無傷手！" : s.cutsCount > 0 ? "些微削到手！" : "及格削完！");
  }
}

function drawStep0(ctx) {
  const s = Game.stepState;

  // 1. 刨絲桌木盆背景
  drawBackdrop(ctx, Assets.prep, 0.45);

  // 2. 刨絲木盆台
  ctx.fillStyle = "#8d5b32";
  ctx.fillRect(40, 360, 340, 290);
  ctx.fillStyle = "#5c3a1e";
  ctx.fillRect(55, 375, 310, 260);

  // 金屬斜面刨絲板
  ctx.save();
  ctx.translate(210, 480);
  ctx.fillStyle = "#bdc3c7";
  ctx.roundRect(-80, -110, 160, 220, 10);
  ctx.fill();
  ctx.strokeStyle = "#7f8c8d";
  ctx.lineWidth = 4;
  ctx.stroke();

  // 刀孔
  ctx.fillStyle = "#2c3e50";
  for (let r = -85; r <= 85; r += 24) {
    for (let c = -50; c <= 50; c += 26) {
      ctx.fillRect(c, r, 12, 4);
    }
  }
  ctx.restore();

  // 累積的蘿蔔絲堆
  const heapH = (s.progress / 100) * 85;
  ctx.fillStyle = "#f8f9fa";
  ctx.beginPath();
  ctx.ellipse(210, 610, 130, heapH * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // 噴濺蘿蔔絲
  for (const p of s.particles) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.vx * 0.04, p.y + p.vy * 0.04);
    ctx.stroke();
  }

  // 白蘿蔔本體 (隨手勢上下滑動)
  const ry = 410 + s.radishY;
  ctx.save();
  ctx.translate(210, ry);

  // 綠葉
  ctx.fillStyle = "#27ae60";
  ctx.beginPath();
  ctx.moveTo(0, -95);
  ctx.lineTo(-24, -135);
  ctx.lineTo(0, -120);
  ctx.lineTo(24, -135);
  ctx.closePath();
  ctx.fill();

  // 白蘿蔔
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#dcdde1";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, 52, 90, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 削切紋理
  ctx.strokeStyle = "#e1b12c";
  ctx.lineWidth = 2.5;
  for (let i = -45; i <= 45; i += 20) {
    ctx.beginPath();
    ctx.arc(0, i, 38, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.restore();

  // 刨到手紅閃提示
  if (s.hurtTimer > 0) {
    ctx.fillStyle = "rgba(231, 76, 60, 0.45)";
    ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = "#c0392b";
    ctx.font = "900 26px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🩸 唉唷！刨到手了！", 210, 310);
    ctx.font = "800 16px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText("太急躁失控！停頓痛擊中...", 210, 340);
  }

  // 速度計 (右側)
  drawSpeedGauge(ctx, 365, 410, 22, 180, s.speedMeter);

  // 頂部目標說明
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
    s.radishY = Math.max(-65, Math.min(65, s.radishY + dy * 0.65));

    if (Math.abs(dy) > 8) {
      const spd = Math.abs(dy) / 8;
      s.speedMeter = Math.min(1.0, s.speedMeter + spd * 0.08);

      // 太快削到手！
      if (s.speedMeter > 0.88) {
        s.hurtTimer = 1.3;
        s.cutsCount++;
        s.speedMeter = 0;
        AudioSys.ouch();
        shake(14);
        addFloatingNotice("🩸 刨到手扣分！", 210, 320, "#ff7675");
        return;
      }

      // 綠區有效削絲
      if (s.speedMeter >= 0.22 && s.speedMeter <= 0.85) {
        s.progress = Math.min(100, s.progress + 4.2);
        s.grams = Math.min(1200, Math.round((s.progress / 100) * 1200));
        AudioSys.chop();

        for (let i = 0; i < 2; i++) {
          s.particles.push({
            x: 210 + (Math.random() - 0.5) * 60,
            y: 500 + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 220,
            vy: -160 - Math.random() * 200,
            alpha: 1.0
          });
        }
      }
    }
    s.lastY = y;
  } else if (type === "up") {
    s.lastY = null;
    s.radishY = 0;
  }
}

// ---------------------------------------------------------
// ② 調漿 (按住倒水停在 3:1 ＋ 順時針畫圈攪拌打散粉粒)
// ---------------------------------------------------------
function initStep1() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 10 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「倒水要準，米粉才不會結塊！」";

  Game.stepState = {
    phase: "POUR", // POUR -> STIR
    waterRatio: 0,
    holdingPour: false,
    pourGrade: null,

    // 攪拌
    stirProgress: 0,
    lumps: Array.from({ length: 14 }, () => ({
      x: (Math.random() - 0.5) * 170,
      y: (Math.random() - 0.5) * 170,
      r: 9 + Math.random() * 7,
      alive: true
    })),
    lastAngle: null,
    totalAngle: 0,
    whiskAngle: 0
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
      finishCurrentStep(grade, grade === "PERFECT" ? "黃金 3:1 粉粒全散，質地絲滑！" : "粉漿完成！");
    }
  }
}

function drawStep1(ctx) {
  const s = Game.stepState;
  drawBackdrop(ctx, Assets.prep, 0.45);

  // 陶瓷大米漿盆 (俯視)
  ctx.save();
  ctx.translate(210, 460);

  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.ellipse(0, 0, 160, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ecf0f1";
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 150, 0, 0, Math.PI * 2);
  ctx.fill();

  // 米漿液體
  if (s.waterRatio > 0.08) {
    const alpha = Math.min(1.0, 0.4 + s.waterRatio * 0.6);
    ctx.fillStyle = `rgba(247, 241, 227, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 142, 142, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 麵粉顆粒 (Stir 階段)
  if (s.phase === "STIR") {
    ctx.fillStyle = "#dfe4ea";
    for (const lump of s.lumps) {
      if (lump.alive) {
        ctx.beginPath();
        ctx.arc(lump.x, lump.y, lump.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 攪拌木杓
    ctx.save();
    ctx.rotate(s.whiskAngle);
    ctx.fillStyle = "#cd6133";
    ctx.fillRect(-7, -135, 14, 125);
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // Phase 1：注水刻度柱
  if (s.phase === "POUR") {
    const bx = 38;
    const by = 310;
    const bw = 32;
    const bh = 240;

    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();

    // 3:1 目標線 (約 65% 高度)
    const targetY = by + bh * (1 - 0.65);
    ctx.fillStyle = "rgba(46, 204, 113, 0.5)";
    ctx.fillRect(bx, targetY - 15, bw, 30);
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, targetY - 15, bw, 30);

    // 當前水位
    const fillH = bh * s.waterRatio;
    ctx.fillStyle = "#3498db";
    ctx.fillRect(bx + 2, by + bh - fillH, bw - 4, fillH);

    ctx.fillStyle = "#fff";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("3:1 黃金線", bx + bw + 8, targetY + 5);

    // 水柱效果
    if (s.holdingPour) {
      ctx.fillStyle = "#3498db";
      ctx.fillRect(205, 300, 10, 160);
    }

    // 長按倒水大按鈕
    ctx.fillStyle = s.holdingPour ? "#27ae60" : "#e67e22";
    ctx.beginPath();
    ctx.roundRect(80, 640, 260, 58, 16);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 19px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(s.holdingPour ? "💧 注水中...放開停！" : "👉 按住此處注水", 210, 676);

    drawStepBanner(ctx, "🚰 倒冷水調米粉：停在 3:1 刻度！", STEPS[1].actionHint);
  } else {
    // Phase 2：畫圈攪拌
    drawStepBanner(ctx, `🥣 畫圈攪拌消粉粒：${Math.round(s.stirProgress)}%`, "手指在盆中「順時針畫大圈」打散結塊！");
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
      s.whiskAngle = angle;

      if (s.lastAngle !== null) {
        let da = angle - s.lastAngle;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > 0.08) {
          s.totalAngle += Math.abs(da);
          s.stirProgress = Math.min(100, (s.totalAngle / (Math.PI * 9)) * 100);
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
// ③ 鐵鑊翻炒 (點擊消除鍋底焦點 ＋ 濃稠區按起鍋)
// ---------------------------------------------------------
function initStep2() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 11 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「鍋底冒黑斑要快鏟掉，米糰到濃稠區起鍋！」";

  Game.stepState = {
    gelatin: 15, // 0 ~ 100
    hotspots: [],
    spawnTimer: 0.5,
    burntCount: 0,
    stopped: false,
    flameFx: 0
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
    const r = Math.random() * 110;
    const a = Math.random() * Math.PI * 2;
    s.hotspots.push({
      x: Math.cos(a) * r,
      y: Math.sin(a) * r * 0.72,
      timer: 1.7,
      radius: 19 + Math.random() * 8
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
  drawBackdrop(ctx, Assets.wok, 0.45);

  // 大鐵鑊外型
  ctx.save();
  ctx.translate(210, 430);

  ctx.fillStyle = "#1e272e";
  ctx.beginPath();
  ctx.ellipse(0, 0, 185, 145, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#485460";
  ctx.lineWidth = 9;
  ctx.stroke();

  // 鍋中米糰 (隨糊化加深顏色)
  const gRatio = s.gelatin / 100;
  ctx.fillStyle = gRatio > 0.8 ? "#f5cd79" : "#f7f1e3";
  ctx.beginPath();
  ctx.ellipse(0, 0, 162, 125, 0, 0, Math.PI * 2);
  ctx.fill();

  // 油蔥酥爆香點
  ctx.fillStyle = "#833471";
  for (let i = 0; i < 20; i++) {
    const ox = ((i * 41) % 210) - 105;
    const oy = ((i * 59) % 160) - 80;
    ctx.fillRect(ox, oy, 6, 4);
  }

  // 焦點斑塊
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
    ctx.fillStyle = `rgba(231, 76, 60, ${s.flameFx * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 165, 128, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 糊化指示條
  const bx = 45;
  const by = 210;
  const bw = 330;
  const bh = 24;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();

  // 綠區 (78% ~ 93%)
  const zx = bx + bw * 0.78;
  const zw = bw * 0.15;
  ctx.fillStyle = "rgba(46, 204, 113, 0.55)";
  ctx.fillRect(zx, by, zw, bh);
  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(zx, by, zw, bh);

  // 進度
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

    // 檢查點擊鏟除焦點
    const cx = 210;
    const cy = 430;
    for (let i = s.hotspots.length - 1; i >= 0; i--) {
      const h = s.hotspots[i];
      if (Math.hypot(x - (cx + h.x), y - (cy + h.y)) <= h.radius + 18) {
        s.hotspots.splice(i, 1);
        AudioSys.chop();
        addFloatingNotice("✨ 鏟掉！", cx + h.x, cy + h.y - 15, "#2ecc71");
        return;
      }
    }
  }
}

// ---------------------------------------------------------
// ④ 添柴 (將木柴拖甩進紅磚灶門，維持火力在綠區)
// ---------------------------------------------------------
function initStep3() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 8.5 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「把柴火甩進灶門，火溫要維持在綠區！」";

  Game.stepState = {
    temp: 50,
    inGreenSec: 0,
    requiredGreenSec: 4.0 * ts,
    logs: [
      { id: 1, x: 90, y: 590 },
      { id: 2, x: 210, y: 590 },
      { id: 3, x: 330, y: 590 }
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
      x: 70 + Math.random() * 280,
      y: 590
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
  drawBackdrop(ctx, Assets.fire, 0.45);

  // 紅磚大灶門
  ctx.save();
  ctx.translate(210, 390);

  ctx.fillStyle = "#c0392b";
  ctx.roundRect(-140, -110, 280, 210, 16);
  ctx.fill();
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 6;
  ctx.stroke();

  // 灶門黑洞 (目標)
  ctx.fillStyle = "#1e120d";
  ctx.beginPath();
  ctx.arc(0, 15, 75, Math.PI, 0, false);
  ctx.rect(-75, 15, 150, 75);
  ctx.fill();

  // 洞內火焰光
  const fRatio = s.temp / 100;
  const grad = ctx.createRadialGradient(0, 45, 10, 0, 45, 80 * fRatio);
  grad.addColorStop(0, "#f39c12");
  grad.addColorStop(0.7, "#e74c3c");
  grad.addColorStop(1, "rgba(231,76,60,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 45, 75, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 溫度計
  drawThermometer(ctx, 365, 290, 24, 180, s.temp, 70, 90);

  // 柴堆托盤
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.roundRect(30, 540, 360, 100, 16);
  ctx.fill();

  // 木柴
  for (const log of s.logs) {
    ctx.save();
    ctx.translate(log.x, log.y);
    ctx.fillStyle = "#a0522d";
    ctx.roundRect(-36, -18, 72, 36, 9);
    ctx.fill();
    ctx.strokeStyle = "#5c2c16";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = "#d29054";
    ctx.beginPath();
    ctx.arc(-22, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawStepBanner(ctx, `🔥 柴火溫控：${Math.round(s.temp)}°C`, STEPS[3].actionHint);
}

function handlePointerStep3(type, x, y) {
  const s = Game.stepState;
  if (type === "down") {
    for (const log of s.logs) {
      if (Math.hypot(x - log.x, y - log.y) <= 42) {
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
      // 投進灶門 (210, 400)
      if (Math.hypot(s.dragLog.x - 210, s.dragLog.y - 400) <= 95) {
        s.temp = Math.min(100, s.temp + 28);
        AudioSys.woodThump();
        addFloatingNotice("🪵 添柴大火 +28°C！", 210, 330, "#f39c12");
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
// ⑤ 蒸粿 (快蒸 ＋ 長按水瓢補水防乾燒)
// ---------------------------------------------------------
function initStep4() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 10 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「大火快蒸，外鍋水快沒了要趕快補！」";

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

  // 蒸氣
  if (s.water > 0) {
    s.puffs.push({
      x: 210 + (Math.random() - 0.5) * 80,
      y: 350,
      vy: -130 - Math.random() * 80,
      r: 12 + Math.random() * 10,
      alpha: 0.65
    });
  }

  for (let i = s.puffs.length - 1; i >= 0; i--) {
    const p = s.puffs[i];
    p.y += p.vy * dt;
    p.r += dt * 14;
    p.alpha -= dt * 0.9;
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
  drawBackdrop(ctx, Assets.kitchenScene, 0.45);

  // 蒸氣粒子
  for (const p of s.puffs) {
    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 巨型竹蒸籠
  ctx.save();
  ctx.translate(210, 440);

  // 外鍋金屬水槽
  ctx.fillStyle = "#7f8c8d";
  ctx.roundRect(-120, 50, 240, 60, 10);
  ctx.fill();

  // 竹蒸籠兩層
  for (let i = 0; i < 2; i++) {
    const y = -35 + i * 44;
    ctx.fillStyle = "#e67e22";
    ctx.roundRect(-100, y, 200, 40, 8);
    ctx.fill();
    ctx.strokeStyle = "#b35400";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.strokeStyle = "#f39c12";
    for (let x = -90; x <= 90; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y + 38);
      ctx.stroke();
    }
  }

  // 頂蓋
  ctx.fillStyle = "#d35400";
  ctx.beginPath();
  ctx.moveTo(-110, -35);
  ctx.lineTo(0, -78);
  ctx.lineTo(110, -35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 外鍋水位管 (右側)
  const wx = 365;
  const wy = 330;
  const wh = 170;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect(wx, wy, 24, wh, 6);
  ctx.fill();

  const fillH = (s.water / 100) * wh;
  ctx.fillStyle = s.water < 22 ? "#e74c3c" : "#3498db";
  ctx.fillRect(wx + 2, wy + wh - fillH, 20, fillH);

  ctx.fillStyle = "#fff";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("外鍋水", wx + 12, wy - 6);

  // 蒸煮進度
  const bx = 45;
  const by = 210;
  const bw = 330;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect(bx, by, bw, 20, 8);
  ctx.fill();
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(bx + 2, by + 2, (bw - 4) * (s.cook / 100), 16);

  // 補水大按鈕
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
// ⑥ 竹籤驗收 (指針進入綠區時精準點擊，驗證不沾黏)
// ---------------------------------------------------------
function initStep5() {
  const ts = LEVELS[Game.levelIdx].timeScale;
  Game.stepMaxTime = 6.5 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.bossMood = "NORMAL";
  Game.bossSpeech = "「竹籤針試法！插下去拔出不沾黏才是熟透！」";

  Game.stepState = {
    needle: 0,
    dir: 1,
    plunged: false,
    skewerY: 0,
    speed: 1.1 / ts
  };
}

function updateStep5(dt) {
  const s = Game.stepState;
  if (!s.plunged) {
    s.needle += s.dir * s.speed * dt;
    if (s.needle >= 1.0) { s.needle = 1.0; s.dir = -1; }
    else if (s.needle <= 0) { s.needle = 0; s.dir = 1; }
  } else {
    s.skewerY = Math.min(85, s.skewerY + dt * 280);
  }
}

function drawStep5(ctx) {
  const s = Game.stepState;
  drawBackdrop(ctx, Assets.kitchenScene, 0.45);

  // 熱騰騰出爐菜頭粿
  ctx.save();
  ctx.translate(210, 480);

  ctx.fillStyle = "#bdc3c7";
  ctx.beginPath();
  ctx.ellipse(0, 30, 160, 75, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(0, 15, 145, 65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ecf0f1";
  ctx.lineWidth = 4;
  ctx.stroke();

  // 竹籤動畫
  const sy = -130 + s.skewerY;
  ctx.fillStyle = "#d29054";
  ctx.beginPath();
  ctx.moveTo(-4, sy);
  ctx.lineTo(4, sy);
  ctx.lineTo(1, sy + 115);
  ctx.lineTo(0, sy + 120);
  ctx.lineTo(-1, sy + 115);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 精密時機條
  const bx = 45;
  const by = 240;
  const bw = 330;
  const bh = 28;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect(bx, by, bw, bh, 10);
  ctx.fill();

  // 半生紅區 (0 ~ 45%)
  ctx.fillStyle = "rgba(231,76,60,0.4)";
  ctx.fillRect(bx, by, bw * 0.45, bh);

  // 綠區 (45% ~ 65%)
  const gzx = bx + bw * 0.45;
  const gzw = bw * 0.2;
  ctx.fillStyle = "rgba(46,204,113,0.7)";
  ctx.fillRect(gzx, by, gzw, bh);
  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 3;
  ctx.strokeRect(gzx, by, gzw, bh);

  // 過熟硬區 (65% ~ 100%)
  ctx.fillStyle = "rgba(230,126,34,0.4)";
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
// ⑦ 切塊出貨 (劃 3 刀直線 ＋ 向上滑動甩上發財車)
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
    if (s.plateY <= -170 && !s.delivered) {
      s.delivered = true;
      AudioSys.fanfare();
      finishCurrentStep("PERFECT", "完美上車！客人搶購一空！");
    }
  }
}

function drawStep6(ctx) {
  const s = Game.stepState;

  if (s.subPhase === "SLICE") {
    drawBackdrop(ctx, Assets.prep, 0.45);

    // 木砧板
    ctx.save();
    ctx.translate(210, 440);
    ctx.fillStyle = "#8d5b32";
    ctx.roundRect(-150, -110, 300, 220, 14);
    ctx.fill();

    // 菜頭粿本體
    ctx.fillStyle = "#fdfbf7";
    ctx.roundRect(-120, -85, 240, 170, 8);
    ctx.fill();
    ctx.strokeStyle = "#e8dfd0";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3 刀指引虛線
    ctx.strokeStyle = "rgba(192, 57, 43, 0.45)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    for (let i = 1; i <= 3; i++) {
      const sx = -120 + i * 60;
      ctx.beginPath();
      ctx.moveTo(sx, -85);
      ctx.lineTo(sx, 85);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 已切刀痕
    for (const sl of s.sliceLines) {
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sl.x1 - 210, sl.y1 - 440);
      ctx.lineTo(sl.x2 - 210, sl.y2 - 440);
      ctx.stroke();
    }
    ctx.restore();

    drawStepBanner(ctx, `🔪 刀工切塊：${s.slices} / 3 刀`, STEPS[6].actionHint);
  } else {
    // 發財車出貨階段
    drawBackdrop(ctx, Assets.truck, 0.4);

    // 發財車後斗目標區
    ctx.save();
    ctx.translate(210, 240);
    ctx.fillStyle = "#2980b9";
    ctx.roundRect(-110, -50, 220, 90, 12);
    ctx.fill();
    ctx.strokeStyle = "#1a5276";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "900 17px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚚 藍色發財車 (目標區)", 0, 5);
    ctx.restore();

    // 盛盤菜頭粿 (隨甩動向上飛出)
    ctx.save();
    ctx.translate(210, 560 + s.plateY);

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 100, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#bdc3c7";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 切塊淋醬
    for (let c = -60; c <= 60; c += 35) {
      ctx.fillStyle = "#f5cd79";
      ctx.fillRect(c - 12, -18, 24, 34);
      ctx.fillStyle = "#5c2c16"; // 醬油膏
      ctx.fillRect(c - 8, -10, 16, 6);
      ctx.fillStyle = "#e74c3c"; // 甜辣醬
      ctx.fillRect(c - 5, -2, 10, 4);
    }
    ctx.restore();

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
   8. 突發干擾事件 (老鼠突襲 ＆ 客人急躁催單)
========================================================= */
function updateDistractions(dt) {
  const lv = LEVELS[Game.levelIdx];
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
  for (const d of Game.distractions) {
    if (!d.alive) continue;
    if (d.type === "RAT") {
      ctx.fillStyle = "#2c3e50";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 22, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🐭", d.x, d.y + 7);
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
  if (img.complete && img.naturalWidth > 0) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, 0, 0, GW, GH);
    ctx.restore();
  }
}

function drawStepBanner(ctx, title, hint) {
  // 提示卡
  ctx.fillStyle = "rgba(18, 10, 5, 0.88)";
  ctx.roundRect(20, 115, 380, 72, 14);
  ctx.fill();
  ctx.strokeStyle = "#c88a4b";
  ctx.lineWidth = 2;
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
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  // 綠區
  const gy = y + h * (1 - 0.85);
  const gh = h * 0.63;
  ctx.fillStyle = "rgba(46,204,113,0.55)";
  ctx.fillRect(x, gy, w, gh);

  // 紅區 (危險太快)
  ctx.fillStyle = "rgba(231,76,60,0.65)";
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
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  // 綠區
  const gy = y + h * (1 - maxG / 100);
  const gh = h * ((maxG - minG) / 100);
  ctx.fillStyle = "rgba(46,204,113,0.6)";
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

  // 頂部儀表板
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

  // 7 步驟進度膠囊 (Step Pills)
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
  // 右下角包老闆頭像與台詞氣泡
  const bx = GW - 55;
  const by = GH - 45;

  ctx.save();
  ctx.fillStyle = "#1e120d";
  ctx.beginPath();
  ctx.arc(bx, by, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#c82829";
  ctx.lineWidth = 3;
  ctx.stroke();

  // 頭像裁切
  ctx.save();
  ctx.beginPath();
  ctx.arc(bx, by, 30, 0, Math.PI * 2);
  ctx.clip();
  const avatarImg = Game.bossMood === "PANIC" ? Assets.bossPanic : Assets.bossBack;
  if (avatarImg.complete && avatarImg.naturalWidth > 0) {
    ctx.drawImage(avatarImg, bx - 30, by - 30, 60, 60);
  }
  ctx.restore();

  // 漫畫對話氣泡
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.roundRect(20, GH - 62, GW - 120, 36, 12);
  ctx.fill();
  ctx.strokeStyle = "#4a2815";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#231710";
  ctx.font = "900 12.5px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(Game.bossSpeech, 30, GH - 40);
  ctx.restore();
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
  ctx.fillStyle = "#150d08";
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

  // 預設底色
  ctx.fillStyle = "#2c1d12";
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

  // 干擾事件
  drawDistractions(ctx);

  // HUD
  drawHUD(ctx);

  // 包老闆頭像與語音泡泡
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

  const poster = document.getElementById("result-poster-img");
  poster.src = passed ? "assets/ui_win.jpg" : "assets/ui_lose.jpg";

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
        <span class="level-badge-id">Lv.${lv.id}</span>
        <span class="level-badge-icon">${idx === 0 ? "🏮" : idx === 1 ? "🌙" : "🧧"}</span>
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
