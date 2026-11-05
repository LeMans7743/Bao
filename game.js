// 《包記炊粿：手感炊粿大挑戰》
// 料理媽媽手感風格 7 道關卡 ＋ 3 級難度 ＋ 品質評價系統

/* =========================================================
   1. 音效引擎 (Web Audio API 合成音效)
========================================================= */
const AudioSys = {
  ctx: null,
  enabled: true,
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
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
    this.playTone(280 + Math.random() * 80, 0.05, "sawtooth", 0.14);
  },
  ouch() {
    this.playTone(180, 0.25, "sawtooth", 0.2);
    setTimeout(() => this.playTone(120, 0.3, "sawtooth", 0.2), 60);
  },
  pour() {
    this.playTone(400 + Math.random() * 100, 0.06, "sine", 0.1);
  },
  stir() {
    this.playTone(220 + Math.random() * 60, 0.07, "triangle", 0.1);
  },
  sizzle() {
    this.playTone(160 + Math.random() * 140, 0.04, "square", 0.08);
  },
  woodThump() {
    this.playTone(140, 0.12, "triangle", 0.2);
  },
  waterSplash() {
    this.playTone(320, 0.12, "sine", 0.15);
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
    this.playTone(600, 0.06, "square", 0.15);
  }
};

/* =========================================================
   2. 排行榜系統 (localStorage 持久化)
========================================================= */
const LB_KEY = "baoji_cooking_mama_lb_v1";
const DEFAULT_LB = [
  { name: "阿嬤炊粿王", score: 2850, level: "年貨大街", time: "09:30" },
  { name: "包記老掌櫃", score: 2320, level: "年貨大街", time: "11:15" },
  { name: "廟口快手伯", score: 1780, level: "廟口夜市", time: "14:20" },
  { name: "早市小神廚", score: 1250, level: "廟口夜市", time: "16:45" },
  { name: "炊粿學徒仔", score: 720, level: "老街早市", time: "18:10" }
];

const Leaderboard = {
  entries: [],
  load() {
    try {
      const raw = localStorage.getItem(LB_KEY);
      this.entries = raw ? JSON.parse(raw) : [...DEFAULT_LB];
    } catch (_) {
      this.entries = [...DEFAULT_LB];
    }
    this.sort();
  },
  save() {
    try {
      localStorage.setItem(LB_KEY, JSON.stringify(this.entries.slice(0, 12)));
    } catch (_) {}
  },
  sort() {
    this.entries.sort((a, b) => b.score - a.score);
  },
  add(name, score, level) {
    this.entries.forEach(e => e.isNew = false);
    this.entries.push({
      name: (name || "炊粿快手").trim().slice(0, 10) || "炊粿快手",
      score: Math.round(score),
      level,
      isNew: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    });
    this.sort();
    this.save();
    this.render();
  },
  reset() {
    this.entries = [...DEFAULT_LB];
    this.save();
    this.render();
  },
  render() {
    const renderRows = (list, limit = 6) => {
      return list.slice(0, limit).map((e, idx) => {
        const rank = idx + 1;
        const rankCls = rank <= 3 ? `rank-${rank}` : "";
        const newCls = e.isNew ? "is-player" : "";
        const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        return `
          <div class="lb-row ${rankCls} ${newCls}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${e.name}</span>
            <span class="lb-meta">${e.level}</span>
            <span class="lb-score">$${e.score}</span>
          </div>
        `;
      }).join("");
    };
    const hubEl = document.getElementById("hub-lb");
    const modalEl = document.getElementById("modal-lb");
    const resultEl = document.getElementById("result-lb");
    if (hubEl) hubEl.innerHTML = renderRows(this.entries, 5);
    if (modalEl) modalEl.innerHTML = renderRows(this.entries, 12);
    if (resultEl) resultEl.innerHTML = renderRows(this.entries, 5);
  }
};

/* =========================================================
   3. 關卡定義
========================================================= */
const LEVELS = [
  {
    id: 1,
    name: "老街早市",
    sub: "新手教學｜一次一籠",
    desc: "節奏悠閒，手勢指引清晰。細細磨練 7 道手感！",
    targetScore: 400,
    batchesCount: 1,
    timeScale: 1.0,
    hasRats: false,
    hasCustomers: false,
    stars: [350, 480, 580]
  },
  {
    id: 2,
    name: "廟口夜市",
    sub: "緊湊挑戰｜客人老鼠夾擊",
    desc: "限時大幅縮短！中途有貪吃鼠偷吃、客人急躁催單！",
    targetScore: 1000,
    batchesCount: 2,
    timeScale: 0.78,
    hasRats: true,
    hasCustomers: true,
    stars: [900, 1200, 1500]
  },
  {
    id: 3,
    name: "年貨大街",
    sub: "雙籠同步決戰｜極限多工",
    desc: "客似雲來！炊煮兩籠，這籠在炒、那籠在蒸，隨時切換顧火！",
    targetScore: 1800,
    batchesCount: 3,
    timeScale: 0.65,
    hasRats: true,
    hasCustomers: true,
    stars: [1600, 2200, 2700]
  }
];

/* =========================================================
   4. 遊戲核心狀態機
========================================================= */
const STEP_INFO = [
  { id: 0, num: "①", title: "刨絲", desc: "手指上下滑動削蘿蔔。跟隨節奏，太快會刨到手！" },
  { id: 1, num: "②", title: "調漿", desc: "按住倒水停在 3:1 刻度；接著畫圈攪拌打散粉粒！" },
  { id: 2, num: "③", title: "鐵鑊翻炒", desc: "點擊鏟掉鍋底焦點！糊化條進濃稠區起鍋！" },
  { id: 3, num: "④", title: "添柴", desc: "木柴甩進紅磚灶門，維持火力在綠區！" },
  { id: 4, num: "⑤", title: "蒸粿", desc: "大火快蒸，外鍋快沒水時按住水瓢補水防乾燒！" },
  { id: 5, num: "⑥", title: "竹籤驗收", desc: "抓準時機戳入竹籤，不沾黏才是完美熟透！" },
  { id: 6, num: "⑦", title: "切塊出貨", desc: "劃直線平均切塊，再把盤子甩上藍色發財車！" }
];

const Game = {
  playerName: "炊粿快手",
  currentLevelIndex: 0,
  currentBatchIndex: 0,
  currentStepIndex: 0,
  totalScore: 0,
  completedBatches: [], // 保存每籠的各步驟評價與售價

  // Canvas
  canvas: null,
  ctx: null,
  vw: 400,
  vh: 700,

  // Loop
  running: false,
  lastTime: 0,

  // 當前步驟內部狀態
  stepState: {},
  stepTimer: 0,
  stepMaxTime: 8,
  stepFinished: false,
  finishDelay: 0,

  // 突發事件 (老鼠 / 客人催單)
  distractions: [],
  distractionTimer: 0,

  // 浮動文字與特效粒子
  floatingTexts: [],
  particles: []
};

/* =========================================================
   5. 7 個手感步驟的邏輯實作
========================================================= */

// ---------------------------------------------------------
// 步驟 ①：刨絲 (上下滑動削蘿蔔)
// ---------------------------------------------------------
function initStep1_Shred() {
  const ts = LEVELS[Game.currentLevelIndex].timeScale;
  Game.stepMaxTime = 8.5 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.stepState = {
    progress: 0,       // 0 ~ 100
    targetProgress: 100,
    shredGrams: 0,     // 0 ~ 1200g
    radishY: 0,        // 蘿蔔上下位置
    lastPointerY: null,
    strokeSpeed: 0,    // 當前滑動速度
    speedMeter: 0,     // 速度計
    hurtTimer: 0,      // 刨到手凍結時間
    cutsCount: 0,      // 受傷次數
    goodStrokes: 0,    // 有效削片數
    shredParticles: []
  };
}

function updateStep1(dt) {
  const s = Game.stepState;
  if (s.hurtTimer > 0) {
    s.hurtTimer -= dt;
    s.strokeSpeed = 0;
    return;
  }
  // 速度計平滑衰減
  s.speedMeter = Math.max(0, s.speedMeter - dt * 2.8);

  // 更新飛出的蘿蔔絲粒子
  for (let i = s.shredParticles.length - 1; i >= 0; i--) {
    const p = s.shredParticles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 800 * dt;
    p.alpha -= dt * 2;
    if (p.alpha <= 0) s.shredParticles.splice(i, 1);
  }

  // 檢查完成
  if (s.progress >= 100 && !Game.stepFinished) {
    let grade = "PERFECT";
    if (s.cutsCount > 1 || Game.stepTimer <= 1.0) grade = "FAIL";
    else if (s.cutsCount === 1) grade = "GOOD";
    finishStep(grade, grade === "PERFECT" ? "絲條均勻無損！" : s.cutsCount > 0 ? "小心削到手！" : "及格完成！");
  }
}

function drawStep1(ctx, w, h) {
  const s = Game.stepState;

  // 繪製刨絲木盆底桌
  ctx.fillStyle = "#8d5b32";
  ctx.fillRect(w * 0.1, h * 0.45, w * 0.8, h * 0.45);
  ctx.fillStyle = "#5c3a1e";
  ctx.fillRect(w * 0.12, h * 0.47, w * 0.76, h * 0.41);

  // 刨絲板 (金屬斜板)
  ctx.save();
  ctx.translate(w * 0.5, h * 0.62);
  ctx.fillStyle = "#bdc3c7";
  ctx.roundRect(-75, -110, 150, 220, 8);
  ctx.fill();
  ctx.strokeStyle = "#7f8c8d";
  ctx.lineWidth = 4;
  ctx.stroke();

  // 刨刀刀刃細孔
  ctx.fillStyle = "#2c3e50";
  for (let r = -80; r <= 80; r += 22) {
    for (let c = -45; c <= 45; c += 24) {
      ctx.fillRect(c, r, 12, 4);
    }
  }
  ctx.restore();

  // 累積的蘿蔔絲 (在盆底堆疊)
  const heapHeight = (s.progress / 100) * 80;
  ctx.fillStyle = "#f8f9fa";
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h * 0.82, w * 0.32, heapHeight * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // 飛出的蘿蔔絲粒子
  for (const p of s.shredParticles) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + p.vx * 0.05, p.y + p.vy * 0.05);
    ctx.stroke();
  }

  // 蘿蔔本體 (跟隨手勢上下移動)
  const radishY = h * 0.52 + s.radishY;
  ctx.save();
  ctx.translate(w * 0.5, radishY);

  // 綠葉頂端
  ctx.fillStyle = "#27ae60";
  ctx.beginPath();
  ctx.moveTo(0, -90);
  ctx.lineTo(-25, -130);
  ctx.lineTo(0, -115);
  ctx.lineTo(25, -130);
  ctx.closePath();
  ctx.fill();

  // 白蘿蔔身
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#dcdde1";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 48, 85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 削出的紋路
  ctx.strokeStyle = "#e1b12c";
  ctx.lineWidth = 2;
  for (let i = -40; i <= 40; i += 18) {
    ctx.beginPath();
    ctx.arc(0, i, 35, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  ctx.restore();

  // 受傷包紮特效
  if (s.hurtTimer > 0) {
    ctx.fillStyle = "rgba(231, 76, 60, 0.4)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#c0392b";
    ctx.font = "900 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("💥 唉唷！刨到手了！", w * 0.5, h * 0.38);
    ctx.font = "800 16px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText("太快失控！停頓痛擊中...", w * 0.5, h * 0.42);
  }

  // 速度指示計 (Meter)
  drawRhythmSpeedMeter(ctx, w * 0.88, h * 0.55, 24, 180, s.speedMeter);

  // 進度提示
  ctx.fillStyle = "#fff";
  ctx.font = "900 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`🥕 白蘿蔔絲：${s.shredGrams}g / 1200g`, w * 0.5, h * 0.23);

  // 手勢導引
  ctx.fillStyle = "#ffdf6b";
  ctx.font = "800 15px sans-serif";
  ctx.fillText("👆 手指在蘿蔔上「來回上下刷」保持綠區節奏！", w * 0.5, h * 0.27);
}

function handlePointerStep1(type, x, y) {
  const s = Game.stepState;
  if (s.hurtTimer > 0) return;

  if (type === "down") {
    s.lastPointerY = y;
  } else if (type === "move") {
    if (s.lastPointerY === null) s.lastPointerY = y;
    const dy = y - s.lastPointerY;
    s.radishY = Math.max(-60, Math.min(60, s.radishY + dy * 0.6));

    if (Math.abs(dy) > 10) {
      const speed = Math.abs(dy) / 10;
      s.speedMeter = Math.min(1.0, s.speedMeter + speed * 0.08);

      // 檢查是否太快刨到手！
      if (s.speedMeter > 0.88) {
        s.hurtTimer = 1.3;
        s.cutsCount += 1;
        s.speedMeter = 0;
        AudioSys.ouch();
        shakeScreen(15);
        addFloatingText("🩸 刨到手 -30分！", Game.vw * 0.5, Game.vh * 0.4, "#ff7675");
        return;
      }

      // 有效削蘿蔔
      if (s.speedMeter >= 0.25 && s.speedMeter <= 0.85) {
        s.progress = Math.min(100, s.progress + 4.5);
        s.shredGrams = Math.min(1200, Math.round((s.progress / 100) * 1200));
        s.goodStrokes++;
        AudioSys.chop();

        // 噴出蘿蔔絲
        for (let i = 0; i < 2; i++) {
          s.shredParticles.push({
            x: Game.vw * 0.5 + (Math.random() - 0.5) * 60,
            y: Game.vh * 0.62 + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 200,
            vy: -150 - Math.random() * 200,
            alpha: 1.0
          });
        }
      }
    }
    s.lastPointerY = y;
  } else if (type === "up") {
    s.lastPointerY = null;
    s.radishY = 0;
  }
}

// ---------------------------------------------------------
// 步驟 ②：調漿 (按住倒水停在 3:1 ＋ 畫圈攪拌打散粉粒)
// ---------------------------------------------------------
function initStep2_Batter() {
  const ts = LEVELS[Game.currentLevelIndex].timeScale;
  Game.stepMaxTime = 10 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.stepState = {
    subPhase: "POUR", // POUR (倒水) -> STIR (攪拌)
    waterRatio: 0,    // 0 ~ 1.0 (目標是 0.65，即 3:1)
    isHoldingWater: false,
    pourGrade: null,

    // 攪拌階段
    stirProgress: 0,  // 0 ~ 100%
    lumps: Array.from({ length: 12 }, () => ({
      x: (Math.random() - 0.5) * 160,
      y: (Math.random() - 0.5) * 160,
      r: 10 + Math.random() * 8,
      alive: true
    })),
    lastAngle: null,
    stirAngleSum: 0,
    whiskAngle: 0
  };
}

function updateStep2(dt) {
  const s = Game.stepState;
  if (s.subPhase === "POUR") {
    if (s.isHoldingWater) {
      s.waterRatio = Math.min(1.0, s.waterRatio + dt * 0.35);
      AudioSys.pour();
    }
  } else if (s.subPhase === "STIR") {
    if (s.stirProgress >= 100 && !Game.stepFinished) {
      let grade = "PERFECT";
      if (s.pourGrade === "FAIL" || Game.stepTimer <= 1.0) grade = "FAIL";
      else if (s.pourGrade === "GOOD") grade = "GOOD";
      finishStep(grade, grade === "PERFECT" ? "3:1 黃金比例，粉粒全消！" : "漿質及格！");
    }
  }
}

function drawStep2(ctx, w, h) {
  const s = Game.stepState;

  // 攪拌盆 (陶瓷深大盆)
  ctx.save();
  ctx.translate(w * 0.5, h * 0.58);
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.ellipse(0, 0, 160, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ecf0f1";
  ctx.beginPath();
  ctx.ellipse(0, 0, 150, 150, 0, 0, Math.PI * 2);
  ctx.fill();

  // 米漿液面
  if (s.waterRatio > 0.1) {
    const whiteDepth = Math.min(1.0, s.waterRatio);
    ctx.fillStyle = `rgba(247, 241, 227, ${0.5 + whiteDepth * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 142, 142, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 尚未溶解的粉粒
  if (s.subPhase === "STIR") {
    ctx.fillStyle = "#dfe4ea";
    for (const lump of s.lumps) {
      if (lump.alive) {
        ctx.beginPath();
        ctx.arc(lump.x, lump.y, lump.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 攪拌木匙 / 拂子
    ctx.save();
    ctx.rotate(s.whiskAngle);
    ctx.fillStyle = "#cd6133";
    ctx.fillRect(-8, -130, 16, 120);
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  // Phase 1：倒水刻度柱
  if (s.subPhase === "POUR") {
    // 水量計在左側
    const barX = w * 0.12;
    const barY = h * 0.38;
    const barW = 32;
    const barH = 220;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();

    // 3:1 黃金目標線 (大約 65% 位置)
    const targetY = barY + barH * (1 - 0.65);
    ctx.fillStyle = "rgba(46, 204, 113, 0.4)";
    ctx.fillRect(barX, targetY - 14, barW, 28);
    ctx.strokeStyle = "#2ecc71";
    ctx.lineWidth = 3;
    ctx.strokeRect(barX, targetY - 14, barW, 28);

    // 當前水位
    const fillH = barH * s.waterRatio;
    ctx.fillStyle = "#3498db";
    ctx.fillRect(barX + 2, barY + barH - fillH, barW - 4, fillH);

    ctx.fillStyle = "#fff";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("3:1 黃金線", barX + barW + 8, targetY + 5);

    // 水壺倒水畫面
    if (s.isHoldingWater) {
      ctx.fillStyle = "#3498db";
      ctx.fillRect(w * 0.48, h * 0.35, 12, h * 0.22);
    }

    // 提示與按鈕
    ctx.fillStyle = "#fff";
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚰 按住倒冷水，停在 3:1 刻度線！", w * 0.5, h * 0.23);

    ctx.fillStyle = s.isHoldingWater ? "#27ae60" : "#e67e22";
    ctx.beginPath();
    ctx.roundRect(w * 0.25, h * 0.84, w * 0.5, 60, 16);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 19px sans-serif";
    ctx.fillText(s.isHoldingWater ? "💧 正在注水...放開停！" : "👉 按住此處倒水", w * 0.5, h * 0.88);
  } else {
    // Phase 2：畫圈攪拌提示
    ctx.fillStyle = "#fff";
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🥣 畫圈攪拌打散粉粒：${Math.round(s.stirProgress)}%`, w * 0.5, h * 0.23);

    ctx.fillStyle = "#ffdf6b";
    ctx.font = "800 15px sans-serif";
    ctx.fillText("手指在盆子裡「順時針連續畫圈」打散結塊！", w * 0.5, h * 0.27);
  }
}

function handlePointerStep2(type, x, y) {
  const s = Game.stepState;
  if (s.subPhase === "POUR") {
    if (type === "down") {
      s.isHoldingWater = true;
    } else if (type === "up") {
      if (s.isHoldingWater) {
        s.isHoldingWater = false;
        // 判定倒水準確度 (目標 0.65，範圍 0.58 ~ 0.72 為完美)
        const diff = Math.abs(s.waterRatio - 0.65);
        if (diff <= 0.07) {
          s.pourGrade = "PERFECT";
          AudioSys.perfectDing();
          addFloatingText("✨ 3:1 黃金比例！完美！", Game.vw * 0.5, Game.vh * 0.45, "#2ecc71");
        } else if (diff <= 0.16) {
          s.pourGrade = "GOOD";
          AudioSys.goodDing();
          addFloatingText("👌 水量還行！", Game.vw * 0.5, Game.vh * 0.45, "#f1c40f");
        } else {
          s.pourGrade = "FAIL";
          AudioSys.failBuzz();
          addFloatingText(s.waterRatio < 0.58 ? "⚠️ 水太少太濃稠！" : "⚠️ 水太多太稀！", Game.vw * 0.5, Game.vh * 0.45, "#e74c3c");
        }
        // 切換到攪拌階段
        setTimeout(() => {
          s.subPhase = "STIR";
        }, 700);
      }
    }
  } else if (s.subPhase === "STIR") {
    if (type === "down" || type === "move") {
      const cx = Game.vw * 0.5;
      const cy = Game.vh * 0.58;
      const angle = Math.atan2(y - cy, x - cx);
      s.whiskAngle = angle;

      if (s.lastAngle !== null) {
        let da = angle - s.lastAngle;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        if (Math.abs(da) > 0.1) {
          s.stirAngleSum += Math.abs(da);
          s.stirProgress = Math.min(100, (s.stirAngleSum / (Math.PI * 10)) * 100);
          AudioSys.stir();

          // 粉粒逐漸消失
          const aliveCount = Math.round((1 - s.stirProgress / 100) * s.lumps.length);
          for (let i = 0; i < s.lumps.length; i++) {
            s.lumps[i].alive = i < aliveCount;
          }
        }
      }
      s.lastAngle = angle;
    } else if (type === "up") {
      s.lastAngle = null;
    }
  }
}

// ---------------------------------------------------------
// 步驟 ③：鐵鑊翻炒 (點掉焦黑焦點 ＋ 濃稠區起鍋)
// ---------------------------------------------------------
function initStep3_Wok() {
  const ts = LEVELS[Game.currentLevelIndex].timeScale;
  Game.stepMaxTime = 11 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.stepState = {
    gelatinProgress: 15, // 糊化進度 0 ~ 100 (目標 80 ~ 93)
    hotspots: [],
    spawnTimer: 0.6,
    burntCount: 0,
    hasStopped: false,
    flameAlpha: 0
  };
}

function updateStep3(dt) {
  const s = Game.stepState;
  if (s.hasStopped) return;

  // 糊化進度持續上升
  s.gelatinProgress = Math.min(100, s.gelatinProgress + dt * 11);

  // 焦點生成
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0 && s.hotspots.length < 5) {
    s.spawnTimer = 0.8 + Math.random() * 0.6;
    const r = Math.random() * 110;
    const theta = Math.random() * Math.PI * 2;
    s.hotspots.push({
      x: Math.cos(theta) * r,
      y: Math.sin(theta) * r * 0.7,
      timer: 1.8, // 1.8秒不鏟掉就焦黑起火
      radius: 18 + Math.random() * 8
    });
    AudioSys.sizzle();
  }

  // 焦點倒數
  for (let i = s.hotspots.length - 1; i >= 0; i--) {
    const h = s.hotspots[i];
    h.timer -= dt;
    if (h.timer <= 0) {
      s.hotspots.splice(i, 1);
      s.burntCount++;
      s.flameAlpha = 1.0;
      AudioSys.ouch();
      shakeScreen(12);
      addFloatingText("🔥 焦底起火 -25分！", Game.vw * 0.5, Game.vh * 0.5, "#e74c3c");
    }
  }

  s.flameAlpha = Math.max(0, s.flameAlpha - dt * 1.5);

  // 若超過 98% 自動焦死
  if (s.gelatinProgress >= 98 && !Game.stepFinished) {
    s.hasStopped = true;
    finishStep("FAIL", "糊化過頭！全部燒焦結硬塊了！");
  }
}

function drawStep3(ctx, w, h) {
  const s = Game.stepState;

  // 大鐵鑊外型 (俯視橢圓)
  ctx.save();
  ctx.translate(w * 0.5, h * 0.54);
  ctx.fillStyle = "#1e272e";
  ctx.beginPath();
  ctx.ellipse(0, 0, 175, 140, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#485460";
  ctx.lineWidth = 8;
  ctx.stroke();

  // 鑊內半熟米糰 (顏色從淡米白轉濃黃金稠)
  const gRatio = s.gelatinProgress / 100;
  ctx.fillStyle = gRatio > 0.8 ? "#f5cd79" : "#f7f1e3";
  ctx.beginPath();
  ctx.ellipse(0, 0, 155, 120, 0, 0, Math.PI * 2);
  ctx.fill();

  // 油蔥酥碎屑
  ctx.fillStyle = "#833471";
  for (let i = 0; i < 18; i++) {
    const ox = ((i * 37) % 190) - 95;
    const oy = ((i * 53) % 150) - 75;
    ctx.fillRect(ox, oy, 6, 4);
  }

  // 冒出的焦點 (需要快速點擊鏟除！)
  for (const h of s.hotspots) {
    const urgency = 1 - (h.timer / 1.8);
    ctx.fillStyle = urgency > 0.6 ? "#e74c3c" : "#e67e22";
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.radius * (0.8 + urgency * 0.4), 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "900 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("鏟！", h.x, h.y + 4);
  }

  // 燒焦起火特效
  if (s.flameAlpha > 0) {
    ctx.fillStyle = `rgba(231, 76, 60, ${s.flameAlpha * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 160, 125, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // 頂部糊化進度條
  const barW = w * 0.75;
  const barH = 22;
  const barX = w * 0.125;
  const barY = h * 0.18;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.roundRect(barX, barY, barW, barH, 8);
  ctx.fill();

  // 綠色濃稠黃金區 (80% ~ 93%)
  const zoneX = barX + barW * 0.8;
  const zoneW = barW * 0.13;
  ctx.fillStyle = "rgba(46, 204, 113, 0.5)";
  ctx.fillRect(zoneX, barY, zoneW, barH);
  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 2;
  ctx.strokeRect(zoneX, barY, zoneW, barH);

  // 填色
  ctx.fillStyle = s.gelatinProgress > 93 ? "#e74c3c" : "#f39c12";
  ctx.fillRect(barX + 2, barY + 2, (barW - 4) * (s.gelatinProgress / 100), barH - 4);

  ctx.fillStyle = "#fff";
  ctx.font = "900 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("濃稠黃金區", zoneX + zoneW * 0.5, barY - 6);

  // 起鍋按鈕
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.roundRect(w * 0.22, h * 0.82, w * 0.56, 58, 16);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "900 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🍳 起鍋收手！", w * 0.5, h * 0.86);

  // 提示
  ctx.fillStyle = "#fff";
  ctx.font = "800 15px sans-serif";
  ctx.fillText("快點「鏟掉焦黑點」！米糰進濃稠區點起鍋！", w * 0.5, h * 0.25);
}

function handlePointerStep3(type, x, y) {
  const s = Game.stepState;
  if (s.hasStopped) return;

  if (type === "down") {
    // 檢查是否點擊起鍋按鈕
    const btnX = Game.vw * 0.22;
    const btnY = Game.vh * 0.82;
    const btnW = Game.vw * 0.56;
    const btnH = 58;
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      s.hasStopped = true;
      const g = s.gelatinProgress;
      if (g >= 78 && g <= 94 && s.burntCount === 0) {
        finishStep("PERFECT", "濃稠成糰，晶瑩剔透！完美！");
      } else if (g >= 68 && g <= 97) {
        finishStep("GOOD", s.burntCount > 0 ? "些許焦底，香氣仍存！" : "及格起鍋！");
      } else {
        finishStep("FAIL", g < 68 ? "太早起鍋，米漿未熟成團！" : "起鍋太晚，米糰過硬！");
      }
      return;
    }

    // 檢查是否點擊消滅焦點
    const cx = Game.vw * 0.5;
    const cy = Game.vh * 0.54;
    for (let i = s.hotspots.length - 1; i >= 0; i--) {
      const h = s.hotspots[i];
      const hx = cx + h.x;
      const hy = cy + h.y;
      if (Math.hypot(x - hx, y - hy) <= h.radius + 15) {
        s.hotspots.splice(i, 1);
        AudioSys.chop();
        addFloatingText("✨ 鏟掉！", hx, hy - 15, "#2ecc71");
        return;
      }
    }
  }
}

// ---------------------------------------------------------
// 步驟 ④：添柴 (木柴甩進紅磚灶門，維持綠區)
// ---------------------------------------------------------
function initStep4_Stoke() {
  const ts = LEVELS[Game.currentLevelIndex].timeScale;
  Game.stepMaxTime = 8 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.stepState = {
    temp: 50,             // 火力溫度 0 ~ 100 (綠區 72 ~ 88)
    inGreenDuration: 0,   // 在綠區累積秒數
    requiredGreen: 4.2 * ts,
    woodLogs: [
      { id: 1, x: 80, y: 560, isDragging: false },
      { id: 2, x: 180, y: 560, isDragging: false },
      { id: 3, x: 280, y: 560, isDragging: false }
    ],
    activeWood: null,
    dragOffset: { x: 0, y: 0 },
    bellowsPressed: false
  };
}

function updateStep4(dt) {
  const s = Game.stepState;
  // 火力自然隨機波動衰退
  s.temp = Math.max(15, s.temp - dt * (12 + Math.random() * 8));

  // 綠區計時
  if (s.temp >= 68 && s.temp <= 90) {
    s.inGreenDuration += dt;
  }

  // 補充木柴
  if (s.woodLogs.length < 3) {
    s.woodLogs.push({
      id: Date.now() + Math.random(),
      x: 60 + Math.random() * 240,
      y: 560,
      isDragging: false
    });
  }

  if (s.inGreenDuration >= s.requiredGreen && !Game.stepFinished) {
    finishStep("PERFECT", "火候均勻旺盛！柴香四溢！");
  } else if (Game.stepTimer <= 0.1 && !Game.stepFinished) {
    const ratio = s.inGreenDuration / s.requiredGreen;
    finishStep(ratio >= 0.6 ? "GOOD" : "FAIL", ratio >= 0.6 ? "火候尚可！" : "火力不穩，爐溫失控！");
  }
}

function drawStep4(ctx, w, h) {
  const s = Game.stepState;

  // 紅磚大灶門
  ctx.save();
  ctx.translate(w * 0.5, h * 0.44);

  // 灶台紅磚
  ctx.fillStyle = "#c0392b";
  ctx.roundRect(-140, -110, 280, 220, 16);
  ctx.fill();
  ctx.strokeStyle = "#7f1d1d";
  ctx.lineWidth = 6;
  ctx.stroke();

  // 灶門洞口 (目標甩柴區)
  ctx.fillStyle = "#1e120d";
  ctx.beginPath();
  ctx.arc(0, 10, 75, Math.PI, 0, false);
  ctx.rect(-75, 10, 150, 80);
  ctx.fill();

  // 洞內火焰光芒
  const fireScale = s.temp / 100;
  const grad = ctx.createRadialGradient(0, 40, 10, 0, 40, 80 * fireScale);
  grad.addColorStop(0, "#f39c12");
  grad.addColorStop(0.7, "#e74c3c");
  grad.addColorStop(1, "rgba(231,76,60,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 40, 75, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 火力條 (溫度計)
  const meterX = w * 0.88;
  const meterY = h * 0.32;
  const meterH = 170;
  drawThermometer(ctx, meterX, meterY, 26, meterH, s.temp, 68, 90);

  // 柴堆區
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.roundRect(w * 0.08, h * 0.72, w * 0.84, 90, 14);
  ctx.fill();

  // 木柴繪製
  for (const wood of s.woodLogs) {
    ctx.save();
    ctx.translate(wood.x, wood.y);
    ctx.fillStyle = "#a0522d";
    ctx.roundRect(-35, -16, 70, 32, 8);
    ctx.fill();
    ctx.strokeStyle = "#5c2c16";
    ctx.lineWidth = 3;
    ctx.stroke();
    // 年輪
    ctx.strokeStyle = "#d29054";
    ctx.beginPath();
    ctx.arc(-22, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 提示
  ctx.fillStyle = "#fff";
  ctx.font = "900 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`🔥 柴火溫控：${Math.round(s.temp)}°C`, w * 0.5, h * 0.18);

  ctx.fillStyle = "#ffdf6b";
  ctx.font = "800 15px sans-serif";
  ctx.fillText("「把木柴拖甩進灶門」維持在綠區！", w * 0.5, h * 0.22);
}

function handlePointerStep4(type, x, y) {
  const s = Game.stepState;
  if (type === "down") {
    for (const wood of s.woodLogs) {
      if (Math.hypot(x - wood.x, y - wood.y) <= 40) {
        s.activeWood = wood;
        wood.isDragging = true;
        s.dragOffset.x = x - wood.x;
        s.dragOffset.y = y - wood.y;
        break;
      }
    }
  } else if (type === "move") {
    if (s.activeWood) {
      s.activeWood.x = x - s.dragOffset.x;
      s.activeWood.y = y - s.dragOffset.y;
    }
  } else if (type === "up") {
    if (s.activeWood) {
      // 檢查是否投進灶門 (座標中心約 w*0.5, h*0.46)
      const doorDist = Math.hypot(s.activeWood.x - Game.vw * 0.5, s.activeWood.y - Game.vh * 0.46);
      if (doorDist <= 90) {
        s.temp = Math.min(100, s.temp + 26);
        AudioSys.woodThump();
        addFloatingText("🪵 添柴大火 +26°C！", Game.vw * 0.5, Game.vh * 0.4, "#f39c12");
        const idx = s.woodLogs.indexOf(s.activeWood);
        if (idx !== -1) s.woodLogs.splice(idx, 1);
      } else {
        // 放回柴堆
        s.activeWood.y = 560;
      }
      s.activeWood.isDragging = false;
      s.activeWood = null;
    }
  }
}

// ---------------------------------------------------------
// 步驟 ⑤：蒸粿 (大火快蒸 ＋ 補水防乾燒)
// ---------------------------------------------------------
function initStep5_Steam() {
  const ts = LEVELS[Game.currentLevelIndex].timeScale;
  Game.stepMaxTime = 10 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.stepState = {
    steamCook: 0,        // 0 ~ 100%
    waterLevel: 75,      // 0 ~ 100%
    isPouringWater: false,
    dryBoilCount: 0,
    steamPuffs: []
  };
}

function updateStep5(dt) {
  const s = Game.stepState;

  // 水位消耗
  s.waterLevel = Math.max(0, s.waterLevel - dt * 14);

  // 補水
  if (s.isPouringWater) {
    s.waterLevel = Math.min(100, s.waterLevel + dt * 45);
    AudioSys.waterSplash();
  }

  // 若沒水乾燒
  if (s.waterLevel <= 0) {
    s.dryBoilCount += dt;
    shakeScreen(8);
  } else {
    // 正常蒸氣烹煮
    s.steamCook = Math.min(100, s.steamCook + dt * 18);
  }

  // 蒸氣粒子
  if (s.waterLevel > 0) {
    s.steamPuffs.push({
      x: Game.vw * 0.5 + (Math.random() - 0.5) * 80,
      y: Game.vh * 0.38,
      vy: -120 - Math.random() * 80,
      r: 12 + Math.random() * 10,
      alpha: 0.6
    });
  }

  for (let i = s.steamPuffs.length - 1; i >= 0; i--) {
    const sp = s.steamPuffs[i];
    sp.y += sp.vy * dt;
    sp.r += dt * 12;
    sp.alpha -= dt * 0.8;
    if (sp.alpha <= 0) s.steamPuffs.splice(i, 1);
  }

  if (s.steamCook >= 100 && !Game.stepFinished) {
    const grade = s.dryBoilCount > 1.2 ? "FAIL" : s.dryBoilCount > 0 ? "GOOD" : "PERFECT";
    finishStep(grade, grade === "PERFECT" ? "蒸氣充足！米香完全激發！" : s.dryBoilCount > 0 ? "稍有乾燒驚險！" : "熟透！");
  } else if (Game.stepTimer <= 0.1 && !Game.stepFinished) {
    finishStep("FAIL", "乾燒過久，未蒸透！");
  }
}

function drawStep5(ctx, w, h) {
  const s = Game.stepState;

  // 蒸籠蒸氣
  for (const sp of s.steamPuffs) {
    ctx.fillStyle = `rgba(255,255,255,${sp.alpha})`;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 巨型竹蒸籠塔
  ctx.save();
  ctx.translate(w * 0.5, h * 0.52);

  // 底層外鍋 (金屬水鍋)
  ctx.fillStyle = "#7f8c8d";
  ctx.roundRect(-110, 40, 220, 60, 10);
  ctx.fill();

  // 竹編蒸籠本體 (兩層)
  for (let i = 0; i < 2; i++) {
    const y = -35 + i * 42;
    ctx.fillStyle = "#e67e22";
    ctx.roundRect(-95, y, 190, 38, 8);
    ctx.fill();
    ctx.strokeStyle = "#b35400";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 竹條編織紋理
    ctx.strokeStyle = "#f39c12";
    for (let x = -85; x <= 85; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.lineTo(x, y + 36);
      ctx.stroke();
    }
  }

  // 頂蓋
  ctx.fillStyle = "#d35400";
  ctx.beginPath();
  ctx.moveTo(-105, -35);
  ctx.lineTo(0, -75);
  ctx.lineTo(105, -35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // 外鍋水位量筒 (右側)
  const wX = w * 0.86;
  const wY = h * 0.42;
  const wH = 140;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.roundRect(wX, wY, 26, wH, 6);
  ctx.fill();

  const fillH = (s.waterLevel / 100) * wH;
  ctx.fillStyle = s.waterLevel < 25 ? "#e74c3c" : "#3498db";
  ctx.fillRect(wX + 2, wY + wH - fillH, 22, fillH);

  ctx.fillStyle = "#fff";
  ctx.font = "900 12px sans-serif";
  ctx.fillText("外鍋水", wX + 13, wY - 6);

  // 蒸熟進度條
  const pW = w * 0.7;
  const pX = w * 0.15;
  const pY = h * 0.18;
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.roundRect(pX, pY, pW, 18, 6);
  ctx.fill();
  ctx.fillStyle = "#2ecc71";
  ctx.fillRect(pX + 2, pY + 2, (pW - 4) * (s.steamCook / 100), 14);

  // 補水大按鈕 (按住持續補水)
  ctx.fillStyle = s.isPouringWater ? "#2980b9" : "#3498db";
  ctx.beginPath();
  ctx.roundRect(w * 0.2, h * 0.82, w * 0.6, 60, 16);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "900 20px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(s.isPouringWater ? "🚰 注入沸水中..." : "👉 按住水瓢補水！", w * 0.5, h * 0.86);

  // 乾燒警告
  if (s.waterLevel < 20) {
    ctx.fillStyle = "#e74c3c";
    ctx.font = "900 18px sans-serif";
    ctx.fillText("🚨 警告：水位不足！快按住補水防乾燒！", w * 0.5, h * 0.28);
  } else {
    ctx.fillStyle = "#ffdf6b";
    ctx.font = "800 15px sans-serif";
    ctx.fillText("一邊大火蒸粿，一邊補水切勿乾燒！", w * 0.5, h * 0.28);
  }
}

function handlePointerStep5(type, x, y) {
  const s = Game.stepState;
  const btnX = Game.vw * 0.2;
  const btnY = Game.vh * 0.82;
  const btnW = Game.vw * 0.6;
  const btnH = 60;

  if (type === "down") {
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      s.isPouringWater = true;
    }
  } else if (type === "up") {
    s.isPouringWater = false;
  }
}

// ---------------------------------------------------------
// 步驟 ⑥：竹籤驗收 (指針進綠區時精準點擊，驗證不沾黏)
// ---------------------------------------------------------
function initStep6_Skewer() {
  const ts = LEVELS[Game.currentLevelIndex].timeScale;
  Game.stepMaxTime = 6.5 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.stepState = {
    needlePos: 0,      // 0 ~ 1.0 (往返擺動)
    direction: 1,
    hasPlunged: false,
    skewerY: 0,        // 插下動畫
    resultGrade: null,
    needleSpeed: 1.1 / ts
  };
}

function updateStep6(dt) {
  const s = Game.stepState;
  if (!s.hasPlunged) {
    s.needlePos += s.direction * s.needleSpeed * dt;
    if (s.needlePos >= 1.0) {
      s.needlePos = 1.0;
      s.direction = -1;
    } else if (s.needlePos <= 0) {
      s.needlePos = 0;
      s.direction = 1;
    }
  } else {
    // 插拔動畫
    s.skewerY = Math.min(80, s.skewerY + dt * 260);
  }
}

function drawStep6(ctx, w, h) {
  const s = Game.stepState;

  // 剛出爐白嫩菜頭粿 (盆裝)
  ctx.save();
  ctx.translate(w * 0.5, h * 0.6);

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

  // 竹籤本體
  const skY = -120 + s.skewerY;
  ctx.fillStyle = "#d29054";
  ctx.beginPath();
  ctx.moveTo(-4, skY);
  ctx.lineTo(4, skY);
  ctx.lineTo(1, skY + 110);
  ctx.lineTo(0, skY + 115);
  ctx.lineTo(-1, skY + 110);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // 精密時機儀表板 (Meter Arc)
  const barW = w * 0.78;
  const barH = 28;
  const barX = w * 0.11;
  const barY = h * 0.25;

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.roundRect(barX, barY, barW, barH, 10);
  ctx.fill();

  // 左區半生紅區 (0 ~ 45%)
  ctx.fillStyle = "rgba(231,76,60,0.4)";
  ctx.fillRect(barX, barY, barW * 0.45, barH);

  // 中央完美熟透綠區 (45% ~ 65%)
  const gzX = barX + barW * 0.45;
  const gzW = barW * 0.2;
  ctx.fillStyle = "rgba(46,204,113,0.7)";
  ctx.fillRect(gzX, barY, gzW, barH);
  ctx.strokeStyle = "#2ecc71";
  ctx.lineWidth = 3;
  ctx.strokeRect(gzX, barY, gzW, barH);

  // 右區過熟焦硬區 (65% ~ 100%)
  ctx.fillStyle = "rgba(230,126,34,0.4)";
  ctx.fillRect(barX + barW * 0.65, barY, barW * 0.35, barH);

  // 擺動指針
  const needleX = barX + barW * s.needlePos;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(needleX, barY - 8);
  ctx.lineTo(needleX - 7, barY + barH + 6);
  ctx.lineTo(needleX + 7, barY + barH + 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2ecc71";
  ctx.font = "900 13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("熟透不沾黏", gzX + gzW * 0.5, barY - 12);

  // 提示
  ctx.fillStyle = "#fff";
  ctx.font = "900 20px sans-serif";
  ctx.fillText("🍢 竹籤針試法：指針進綠區時點螢幕！", w * 0.5, h * 0.18);

  ctx.fillStyle = "#ffdf6b";
  ctx.font = "800 15px sans-serif";
  ctx.fillText("「不沾黏、不生、不過熟」彈牙美味的關鍵！", w * 0.5, h * 0.33);
}

function handlePointerStep6(type, x, y) {
  const s = Game.stepState;
  if (s.hasPlunged) return;

  if (type === "down") {
    s.hasPlunged = true;
    const p = s.needlePos;
    if (p >= 0.45 && p <= 0.65) {
      AudioSys.perfectDing();
      finishStep("PERFECT", "竹籤潔淨光滑！熟透軟Q！");
    } else if (p < 0.45) {
      AudioSys.failBuzz();
      finishStep("FAIL", "太早插籤！裡面半生粉漿沾滿竹籤！");
    } else {
      AudioSys.goodDing();
      finishStep("GOOD", "稍嫌蒸過頭，口感略偏硬！");
    }
  }
}

// ---------------------------------------------------------
// 步驟 ⑦：切塊出貨 (劃 3 刀直線 ＋ 盤子甩上發財車)
// ---------------------------------------------------------
function initStep7_CutDeliver() {
  const ts = LEVELS[Game.currentLevelIndex].timeScale;
  Game.stepMaxTime = 9 * ts;
  Game.stepTimer = Game.stepMaxTime;
  Game.stepState = {
    subPhase: "SLICE", // SLICE -> FLICK
    slicesMade: 0,
    requiredSlices: 3,
    sliceLines: [],
    plateY: 0,
    plateVy: 0,
    isDelivered: false
  };
}

function updateStep7(dt) {
  const s = Game.stepState;
  if (s.subPhase === "FLICK" && s.plateVy < 0) {
    s.plateY += s.plateVy * dt;
    s.plateVy += 300 * dt; // 阻力
    if (s.plateY <= -160 && !s.isDelivered) {
      s.isDelivered = true;
      AudioSys.fanfare();
      finishStep("PERFECT", "精準入車！大獲好評大賣特賣！");
    }
  }
}

function drawStep7(ctx, w, h) {
  const s = Game.stepState;

  if (s.subPhase === "SLICE") {
    // 砧板與整塊菜頭粿
    ctx.save();
    ctx.translate(w * 0.5, h * 0.56);

    ctx.fillStyle = "#8d5b32";
    ctx.roundRect(-150, -110, 300, 220, 14);
    ctx.fill();

    // 菜頭粿本體 (正方大磚)
    ctx.fillStyle = "#fdfbf7";
    ctx.roundRect(-120, -85, 240, 170, 8);
    ctx.fill();
    ctx.strokeStyle = "#e8dfd0";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 刀痕虛線指引 (3 刀)
    ctx.strokeStyle = "rgba(192, 57, 43, 0.4)";
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

    // 已切好的刀痕
    for (const sl of s.sliceLines) {
      ctx.strokeStyle = "#c0392b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sl.x1 - w * 0.5, sl.y1 - h * 0.56);
      ctx.lineTo(sl.x2 - w * 0.5, sl.y2 - h * 0.56);
      ctx.stroke();
    }

    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🔪 切塊刀工：${s.slicesMade} / 3 刀`, w * 0.5, h * 0.2);

    ctx.fillStyle = "#ffdf6b";
    ctx.font = "800 15px sans-serif";
    ctx.fillText("「由上往下劃直線」切成均勻塊狀！", w * 0.5, h * 0.24);
  } else {
    // Phase 2：發財車在頂部，盤子在底部，向上滑動甩出！
    ctx.save();
    ctx.translate(w * 0.5, h * 0.26);

    // 藍色三輪發財車後斗
    ctx.fillStyle = "#2980b9";
    ctx.roundRect(-110, -50, 220, 90, 12);
    ctx.fill();
    ctx.strokeStyle = "#1a5276";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "900 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚚 藍色發財車 (目標區)", 0, 5);
    ctx.restore();

    // 淋醬菜頭粿盤子 (隨甩動向上飛出)
    ctx.save();
    ctx.translate(w * 0.5, h * 0.68 + s.plateY);

    // 瓷盤
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 95, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#bdc3c7";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 切塊菜頭粿 + 蒜蓉醬油膏 + 甜辣醬
    for (let c = -55; c <= 55; c += 35) {
      ctx.fillStyle = "#f5cd79";
      ctx.fillRect(c - 12, -18, 24, 32);
      ctx.fillStyle = "#5c2c16"; // 醬油膏
      ctx.fillRect(c - 8, -10, 16, 6);
      ctx.fillStyle = "#e74c3c"; // 甜辣醬
      ctx.fillRect(c - 5, -2, 10, 4);
    }
    ctx.restore();

    ctx.fillStyle = "#fff";
    ctx.font = "900 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚚 裝盤出貨！「向上滑動甩進發財車」！", w * 0.5, h * 0.12);
  }
}

function handlePointerStep7(type, x, y) {
  const s = Game.stepState;
  if (s.subPhase === "SLICE") {
    if (type === "down") {
      s.startX = x;
      s.startY = y;
    } else if (type === "up") {
      if (s.startY !== undefined) {
        const dy = y - s.startY;
        if (Math.abs(dy) > 40) {
          s.slicesMade++;
          AudioSys.chop();
          s.sliceLines.push({ x1: s.startX, y1: s.startY, x2: x, y2: y });

          if (s.slicesMade >= s.requiredSlices) {
            AudioSys.perfectDing();
            addFloatingText("✨ 刀工俐落！淋上蒜蓉甜辣醬！", Game.vw * 0.5, Game.vh * 0.45, "#2ecc71");
            setTimeout(() => {
              s.subPhase = "FLICK";
            }, 600);
          }
        }
      }
      s.startY = undefined;
    }
  } else if (s.subPhase === "FLICK") {
    if (type === "down") {
      s.flickStartY = y;
    } else if (type === "up") {
      if (s.flickStartY !== undefined) {
        const dy = y - s.flickStartY;
        if (dy < -60) {
          // 向上快甩！
          s.plateVy = -750;
          AudioSys.swat();
        }
      }
      s.flickStartY = undefined;
    }
  }
}

/* =========================================================
   6. 步驟切換、計分與結算邏輯
========================================================= */
function initStep(index) {
  Game.currentStepIndex = index;
  Game.stepFinished = false;
  Game.finishDelay = 0;

  switch (index) {
    case 0: initStep1_Shred(); break;
    case 1: initStep2_Batter(); break;
    case 2: initStep3_Wok(); break;
    case 3: initStep4_Stoke(); break;
    case 4: initStep5_Steam(); break;
    case 5: initStep6_Skewer(); break;
    case 6: initStep7_CutDeliver(); break;
  }
}

function finishStep(grade, comment) {
  if (Game.stepFinished) return;
  Game.stepFinished = true;
  Game.finishDelay = 1.3;

  if (grade === "PERFECT") AudioSys.perfectDing();
  else if (grade === "GOOD") AudioSys.goodDing();
  else AudioSys.failBuzz();

  // 儲存當前籠的步驟評價
  if (!Game.currentBatchResults) Game.currentBatchResults = [];
  Game.currentBatchResults.push({
    stepId: Game.currentStepIndex,
    grade,
    comment
  });

  addFloatingText(
    grade === "PERFECT" ? "👑 完美！" : grade === "GOOD" ? "👍 不錯！" : "💥 失敗！",
    Game.vw * 0.5,
    Game.vh * 0.4,
    grade === "PERFECT" ? "#2ecc71" : grade === "GOOD" ? "#f1c40f" : "#e74c3c"
  );
}

function evaluateCompletedBatch() {
  const results = Game.currentBatchResults || [];
  let scoreQ = 0;
  let scoreAroma = 0;
  let scoreLook = 0;

  const scoreMap = { PERFECT: 100, GOOD: 70, FAIL: 35 };

  // Q 度：刨絲(40%) + 調漿(30%) + 竹籤(30%)
  scoreQ = (scoreMap[results[0]?.grade || "FAIL"] * 0.4) +
           (scoreMap[results[1]?.grade || "FAIL"] * 0.3) +
           (scoreMap[results[5]?.grade || "FAIL"] * 0.3);

  // 香氣：翻炒(40%) + 添柴(30%) + 蒸粿(30%)
  scoreAroma = (scoreMap[results[2]?.grade || "FAIL"] * 0.4) +
               (scoreMap[results[3]?.grade || "FAIL"] * 0.3) +
               (scoreMap[results[4]?.grade || "FAIL"] * 0.3);

  // 賣相：調漿無粉粒(20%) + 蒸粿(30%) + 切塊出貨(50%)
  scoreLook = (scoreMap[results[1]?.grade || "FAIL"] * 0.2) +
              (scoreMap[results[4]?.grade || "FAIL"] * 0.3) +
              (scoreMap[results[6]?.grade || "FAIL"] * 0.5);

  const avgQuality = (scoreQ + scoreAroma + scoreLook) / 3;
  // 售價計算：Base $200 * 品質係數 (0.6 ~ 3.5)
  const price = Math.round(200 * (avgQuality / 100) * (avgQuality > 90 ? 3.5 : avgQuality > 75 ? 2.4 : 1.2));

  const batchSummary = {
    batchNum: Game.currentBatchIndex + 1,
    q: Math.round(scoreQ),
    aroma: Math.round(scoreAroma),
    look: Math.round(scoreLook),
    price,
    results: [...results]
  };

  Game.completedBatches.push(batchSummary);
  Game.totalScore += price;
  Game.currentBatchResults = [];
}

/* =========================================================
   7. 突發干擾事件 (老鼠突襲 ＆ 客人急躁催單)
========================================================= */
function updateDistractions(dt) {
  const lv = LEVELS[Game.currentLevelIndex];
  if (!lv.hasRats && !lv.hasCustomers) return;

  Game.distractionTimer -= dt;
  if (Game.distractionTimer <= 0) {
    Game.distractionTimer = 4.5 + Math.random() * 3.5;

    // 隨機生成老鼠或客人催單
    const isRat = lv.hasRats && Math.random() < 0.6;
    if (isRat) {
      Game.distractions.push({
        type: "RAT",
        x: Math.random() < 0.5 ? -40 : Game.vw + 40,
        y: Game.vh * (0.4 + Math.random() * 0.3),
        vx: Math.random() < 0.5 ? 180 : -180,
        alive: true
      });
      AudioSys.swat();
    } else if (lv.hasCustomers) {
      Game.distractions.push({
        type: "CUSTOMER",
        x: Game.vw * 0.5 + (Math.random() - 0.5) * 160,
        y: Game.vh * 0.32,
        timer: 3.5,
        alive: true
      });
    }
  }

  for (let i = Game.distractions.length - 1; i >= 0; i--) {
    const d = Game.distractions[i];
    if (d.type === "RAT") {
      d.x += d.vx * dt;
      if (d.x < -60 || d.x > Game.vw + 60) {
        Game.distractions.splice(i, 1);
      }
    } else if (d.type === "CUSTOMER") {
      d.timer -= dt;
      if (d.timer <= 0) {
        Game.distractions.splice(i, 1);
        addFloatingText("😡 客人催單生氣扣分！", d.x, d.y, "#e74c3c");
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
      ctx.ellipse(d.x, d.y, 24, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("🐭", d.x, d.y + 8);
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
      ctx.fillText("💢 老闆快點啦！(點我)", d.x, d.y + 5);
    }
  }
}

function checkDistractionClick(x, y) {
  for (let i = Game.distractions.length - 1; i >= 0; i--) {
    const d = Game.distractions[i];
    if (!d.alive) continue;
    if (d.type === "RAT") {
      if (Math.hypot(x - d.x, y - d.y) <= 45) {
        d.alive = false;
        AudioSys.swat();
        addFloatingText("💥 一巴掌打飛偷吃鼠 +$50！", d.x, d.y, "#2ecc71");
        Game.totalScore += 50;
        Game.distractions.splice(i, 1);
        return true;
      }
    } else if (d.type === "CUSTOMER") {
      if (x >= d.x - 70 && x <= d.x + 70 && y >= d.y - 20 && y <= d.y + 20) {
        d.alive = false;
        AudioSys.perfectDing();
        addFloatingText("🍵 安撫客人成功！", d.x, d.y, "#2ecc71");
        Game.distractions.splice(i, 1);
        return true;
      }
    }
  }
  return false;
}

/* =========================================================
   8. 主遊戲迴圈 (Update & Render)
========================================================= */
let screenShake = 0;
function shakeScreen(amount) {
  screenShake = amount;
}

function addFloatingText(text, x, y, color = "#fff") {
  Game.floatingTexts.push({ text, x, y, alpha: 1.0, color, vy: -50 });
}

function gameLoop(now) {
  if (!Game.running) return;
  const dt = Math.min(0.06, (now - Game.lastTime) / 1000);
  Game.lastTime = now;

  // 1. 步驟倒數與更新
  if (!Game.stepFinished) {
    Game.stepTimer = Math.max(0, Game.stepTimer - dt);
    if (Game.stepTimer <= 0) {
      finishStep("FAIL", "時間到！手腳太慢！");
    }
  }

  // 調度各步驟 logic
  switch (Game.currentStepIndex) {
    case 0: updateStep1(dt); break;
    case 1: updateStep2(dt); break;
    case 2: updateStep3(dt); break;
    case 3: updateStep4(dt); break;
    case 4: updateStep5(dt); break;
    case 5: updateStep6(dt); break;
    case 6: updateStep7(dt); break;
  }

  // 干擾事件
  updateDistractions(dt);

  // 步驟完成後倒數切換下一步
  if (Game.stepFinished) {
    Game.finishDelay -= dt;
    if (Game.finishDelay <= 0) {
      if (Game.currentStepIndex < 6) {
        initStep(Game.currentStepIndex + 1);
      } else {
        // 完成一整籠
        evaluateCompletedBatch();
        const lv = LEVELS[Game.currentLevelIndex];
        Game.currentBatchIndex++;
        if (Game.currentBatchIndex < lv.batchesCount) {
          // 下一籠
          initStep(0);
        } else {
          // 結算
          finishGame();
          return;
        }
      }
    }
  }

  // 浮動文字更新
  for (let i = Game.floatingTexts.length - 1; i >= 0; i--) {
    const ft = Game.floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.alpha -= dt * 0.9;
    if (ft.alpha <= 0) Game.floatingTexts.splice(i, 1);
  }

  // 2. 渲染畫布
  renderGameCanvas();

  requestAnimationFrame(gameLoop);
}

function renderGameCanvas() {
  const ctx = Game.ctx;
  const w = Game.vw;
  const h = Game.vh;

  ctx.save();

  // 震屏效果
  if (screenShake > 0) {
    const sx = (Math.random() - 0.5) * screenShake;
    const sy = (Math.random() - 0.5) * screenShake;
    ctx.translate(sx, sy);
    screenShake = Math.max(0, screenShake - 0.8);
  }

  // 背景
  ctx.fillStyle = "#2c1d12";
  ctx.fillRect(0, 0, w, h);

  // 頂部 HUD (關卡名、當前第幾籠、步驟標題、限時條、即時累計營收)
  drawHUD(ctx, w, h);

  // 繪製當前步驟
  switch (Game.currentStepIndex) {
    case 0: drawStep1(ctx, w, h); break;
    case 1: drawStep2(ctx, w, h); break;
    case 2: drawStep3(ctx, w, h); break;
    case 3: drawStep4(ctx, w, h); break;
    case 4: drawStep5(ctx, w, h); break;
    case 5: drawStep6(ctx, w, h); break;
    case 6: drawStep7(ctx, w, h); break;
  }

  // 干擾老鼠與客人
  drawDistractions(ctx);

  // 浮動得分文字
  for (const ft of Game.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = "900 20px sans-serif";
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

function drawHUD(ctx, w, h) {
  const lv = LEVELS[Game.currentLevelIndex];
  const step = STEP_INFO[Game.currentStepIndex];

  // 頂部深色膠囊
  ctx.fillStyle = "rgba(18, 10, 5, 0.92)";
  ctx.fillRect(0, 0, w, 75);

  ctx.fillStyle = "#ffdf6b";
  ctx.font = "900 14px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`📍 ${lv.name} (第 ${Game.currentBatchIndex + 1} / ${lv.batchesCount} 籠)`, 14, 26);

  ctx.fillStyle = "#2ecc71";
  ctx.font = "900 16px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`💰 營收：$${Game.totalScore}`, w - 14, 26);

  // 當前步驟大標籤
  ctx.fillStyle = "#fff";
  ctx.font = "900 20px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${step.num} ${step.title}`, 14, 58);

  // 步驟限時倒數條
  const tRatio = Game.stepTimer / Game.stepMaxTime;
  const barW = w * 0.42;
  const barX = w - barW - 14;
  const barY = 44;

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.roundRect(barX, barY, barW, 14, 6);
  ctx.fill();

  ctx.fillStyle = tRatio < 0.3 ? "#e74c3c" : "#f1c40f";
  ctx.roundRect(barX, barY, barW * tRatio, 14, 6);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${Game.stepTimer.toFixed(1)}s`, barX - 6, 56);
}

// 輔助繪製：節奏速度計
function drawRhythmSpeedMeter(ctx, x, y, w, h, ratio) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.roundRect(x, y, w, h, 6);
  ctx.fill();

  // 綠區 (0.25 ~ 0.85)
  const gzY = y + h * (1 - 0.85);
  const gzH = h * 0.6;
  ctx.fillStyle = "rgba(46,204,113,0.5)";
  ctx.fillRect(x, gzY, w, gzH);

  // 紅區 (0.85 ~ 1.0)
  ctx.fillStyle = "rgba(231,76,60,0.6)";
  ctx.fillRect(x, y, w, h * 0.15);

  // 水位指針
  const curY = y + h * (1 - ratio);
  ctx.fillStyle = ratio > 0.85 ? "#e74c3c" : "#f1c40f";
  ctx.fillRect(x + 2, curY, w - 4, 6);

  ctx.fillStyle = "#fff";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("節奏", x + w * 0.5, y - 8);
  ctx.restore();
}

// 輔助繪製：溫度計
function drawThermometer(ctx, x, y, w, h, temp, minG, maxG) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();

  // 綠區
  const gzY = y + h * (1 - maxG / 100);
  const gzH = h * ((maxG - minG) / 100);
  ctx.fillStyle = "rgba(46,204,113,0.6)";
  ctx.fillRect(x, gzY, w, gzH);

  // 當前溫度
  const curH = h * (temp / 100);
  ctx.fillStyle = temp > maxG ? "#e74c3c" : temp < minG ? "#f39c12" : "#2ecc71";
  ctx.fillRect(x + 2, y + h - curH, w - 4, curH);

  ctx.fillStyle = "#fff";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("火力", x + w * 0.5, y - 6);
  ctx.restore();
}

/* =========================================================
   9. 結算畫面與流程控制
========================================================= */
function startGame() {
  AudioSys.init();
  const nameInput = document.getElementById("player-name-input");
  if (nameInput && nameInput.value.trim()) {
    Game.playerName = nameInput.value.trim().slice(0, 10);
  }

  Game.currentBatchIndex = 0;
  Game.totalScore = 0;
  Game.completedBatches = [];
  Game.distractions = [];
  Game.distractionTimer = 3;
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

  const lv = LEVELS[Game.currentLevelIndex];
  const passed = Game.totalScore >= lv.targetScore;

  // 星級
  let stars = 1;
  if (Game.totalScore >= lv.stars[2]) stars = 3;
  else if (Game.totalScore >= lv.stars[1]) stars = 2;

  // 登錄排行榜
  Leaderboard.add(Game.playerName, Game.totalScore, lv.name);

  showScreen("screen-result");

  const poster = document.getElementById("result-poster");
  poster.src = passed ? "assets/ui_win.jpg" : "assets/ui_lose.jpg";

  document.getElementById("result-stars").textContent = passed ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆";
  document.getElementById("result-title").textContent = passed ? "通關成功！大豐收！" : "糟糕！虧損收攤！";
  document.getElementById("result-sub").textContent = `${Game.playerName} 師傅在【${lv.name}】共炊出 ${Game.completedBatches.length} 籠粿，總營收 $${Game.totalScore}！`;

  // 渲染每籠的詳細手感品質報告
  const batchListEl = document.getElementById("result-batches");
  if (batchListEl) {
    batchListEl.innerHTML = Game.completedBatches.map(b => `
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
          ${b.results.map(r => `<span>${STEP_INFO[r.stepId].num} ${r.grade === "PERFECT" ? "👑" : r.grade === "GOOD" ? "👍" : "💥"}</span>`).join(" ")}
        </div>
      </div>
    `).join("");
  }

  // 下一關按鈕狀態
  const btnNext = document.getElementById("btn-next");
  if (btnNext) {
    btnNext.style.display = (passed && Game.currentLevelIndex < 2) ? "block" : "none";
    btnNext.onclick = () => {
      Game.currentLevelIndex++;
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
    Leaderboard.render();
    renderLevelSelection();
  }
}

function renderLevelSelection() {
  const listEl = document.getElementById("level-list");
  if (!listEl) return;
  listEl.innerHTML = LEVELS.map((lv, idx) => `
    <div class="level-card ${idx === Game.currentLevelIndex ? "selected" : ""}" data-idx="${idx}">
      <div class="level-badge">
        <span>Lv.${lv.id}</span>
      </div>
      <div class="level-info">
        <div class="level-title-row">
          <div class="level-name">${lv.name}</div>
          <div class="level-stars">${lv.sub}</div>
        </div>
        <div class="level-desc">${lv.desc}</div>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".level-card").forEach(card => {
    card.addEventListener("click", () => {
      Game.currentLevelIndex = parseInt(card.dataset.idx, 10);
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

  Game.vw = rect.width;
  Game.vh = rect.height;
  Game.ctx.scale(dpr, dpr);
}

/* =========================================================
   10. 事件監聽 (全螢幕手勢系統)
========================================================= */
window.addEventListener("DOMContentLoaded", () => {
  Leaderboard.load();
  Leaderboard.render();
  renderLevelSelection();

  Game.canvas = document.getElementById("game-canvas");
  Game.ctx = Game.canvas.getContext("2d");

  window.addEventListener("resize", () => {
    if (Game.running) resizeCanvas();
  });

  // 手勢座標映射
  function getCanvasPos(e) {
    const rect = Game.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  Game.canvas.addEventListener("pointerdown", e => {
    if (!Game.running) return;
    const { x, y } = getCanvasPos(e);

    // 先檢查是否點到干擾老鼠或催單
    if (checkDistractionClick(x, y)) return;

    switch (Game.currentStepIndex) {
      case 0: handlePointerStep1("down", x, y); break;
      case 1: handlePointerStep2("down", x, y); break;
      case 2: handlePointerStep3("down", x, y); break;
      case 3: handlePointerStep4("down", x, y); break;
      case 4: handlePointerStep5("down", x, y); break;
      case 5: handlePointerStep6("down", x, y); break;
      case 6: handlePointerStep7("down", x, y); break;
    }
  });

  Game.canvas.addEventListener("pointermove", e => {
    if (!Game.running) return;
    const { x, y } = getCanvasPos(e);
    switch (Game.currentStepIndex) {
      case 0: handlePointerStep1("move", x, y); break;
      case 1: handlePointerStep2("move", x, y); break;
      case 2: handlePointerStep3("move", x, y); break;
      case 3: handlePointerStep4("move", x, y); break;
      case 4: handlePointerStep5("move", x, y); break;
      case 5: handlePointerStep6("move", x, y); break;
      case 6: handlePointerStep7("move", x, y); break;
    }
  });

  const onPointerUp = e => {
    if (!Game.running) return;
    const { x, y } = getCanvasPos(e);
    switch (Game.currentStepIndex) {
      case 0: handlePointerStep1("up", x, y); break;
      case 1: handlePointerStep2("up", x, y); break;
      case 2: handlePointerStep3("up", x, y); break;
      case 3: handlePointerStep4("up", x, y); break;
      case 4: handlePointerStep5("up", x, y); break;
      case 5: handlePointerStep6("up", x, y); break;
      case 6: handlePointerStep7("up", x, y); break;
    }
  };

  Game.canvas.addEventListener("pointerup", onPointerUp);
  Game.canvas.addEventListener("pointercancel", onPointerUp);

  // 主按鈕綁定
  document.getElementById("btn-start").addEventListener("click", startGame);
  document.getElementById("btn-retry").addEventListener("click", startGame);
  document.getElementById("btn-home").addEventListener("click", () => showScreen("screen-title"));

  // 音效切換
  const btnSound = document.getElementById("btn-sound");
  if (btnSound) {
    btnSound.addEventListener("click", () => {
      AudioSys.enabled = !AudioSys.enabled;
      btnSound.textContent = AudioSys.enabled ? "🔊" : "🔇";
    });
  }

  // 排行榜重置
  document.getElementById("btn-reset-lb").addEventListener("click", () => {
    Leaderboard.reset();
  });

  // 彈窗開啟關閉
  document.getElementById("btn-howto").addEventListener("click", () => {
    document.getElementById("howto-modal").classList.remove("hidden");
  });
  document.getElementById("btn-lb").addEventListener("click", () => {
    Leaderboard.render();
    document.getElementById("lb-modal").classList.remove("hidden");
  });
  document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.dataset.close;
      if (modalId) document.getElementById(modalId).classList.add("hidden");
    });
  });
});
