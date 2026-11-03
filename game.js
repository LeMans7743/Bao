// 《包記炊粿：顧粿沒那麼簡單》核心遊戲邏輯

const SoundFX = {
  enabled: true,
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },
  playTone(freq = 440, duration = 0.1, type = "sine", vol = 0.12) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  },
  shred() {
    this.playTone(260 + Math.random() * 180, 0.06, "triangle", 0.08);
  },
  splash() {
    this.playTone(320, 0.12, "sine", 0.12);
    setTimeout(() => this.playTone(480, 0.1, "sine", 0.1), 50);
  },
  stir() {
    this.playTone(210 + Math.random() * 90, 0.07, "sine", 0.07);
  },
  warn() {
    this.playTone(170, 0.22, "sawtooth", 0.15);
  },
  success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.18, "triangle", 0.14), idx * 90);
    });
  },
  slice() {
    this.playTone(620, 0.08, "sawtooth", 0.1);
  }
};

// 預載入素材圖片供 Canvas 繪製使用
const Images = {
  front: new Image(),
  back: new Image()
};
Images.front.src = "正面.jfif";
Images.back.src = "背面.jfif";

// 全域遊戲狀態
const GameState = {
  stage: 1,
  totalScore: 100,
  stageScores: [20, 20, 20, 20, 20],
  timer: 0,
  timerInterval: null,
  animFrame: null,
  cleanupStage: null
};

// DOM 元素參考
const screens = {
  title: document.getElementById("screen-title"),
  play: document.getElementById("screen-play"),
  result: document.getElementById("screen-result")
};
const workbench = document.getElementById("workbench");
const stageTitleEl = document.getElementById("stage-title");
const bossDialogueEl = document.getElementById("boss-dialogue");
const stageTimerEl = document.getElementById("stage-timer");
const hudScoreEl = document.getElementById("hud-score");

// 初始化背景蒸氣粒子
function initBackgroundSteam() {
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  let w = (canvas.width = window.innerWidth);
  let h = (canvas.height = window.innerHeight);

  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  const puffs = Array.from({ length: 24 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: 18 + Math.random() * 36,
    vy: 0.35 + Math.random() * 0.65,
    vx: (Math.random() - 0.5) * 0.4,
    alpha: 0.12 + Math.random() * 0.2
  }));

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of puffs) {
      p.y -= p.vy;
      p.x += p.vx;
      if (p.y + p.r < 0) {
        p.y = h + p.r;
        p.x = Math.random() * w;
      }
      const grad = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
}

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "floating-toast";
  toast.textContent = text;
  workbench.appendChild(toast);
  setTimeout(() => toast.remove(), 900);
}

function adjustScore(delta, stageIdx = GameState.stage - 1) {
  GameState.stageScores[stageIdx] = Math.max(
    5,
    Math.min(20, GameState.stageScores[stageIdx] + delta)
  );
  GameState.totalScore = GameState.stageScores.reduce((a, b) => a + b, 0);
  hudScoreEl.textContent = Math.round(GameState.totalScore);
}

function updateStageNodes(currentStage) {
  document.querySelectorAll(".stage-node").forEach((node) => {
    const s = Number(node.dataset.stage);
    node.classList.remove("active", "done");
    if (s < currentStage) node.classList.add("done");
    else if (s === currentStage) node.classList.add("active");
  });
}

function clearStageTimers() {
  if (GameState.timerInterval) {
    clearInterval(GameState.timerInterval);
    GameState.timerInterval = null;
  }
  if (GameState.animFrame) {
    cancelAnimationFrame(GameState.animFrame);
    GameState.animFrame = null;
  }
  if (typeof GameState.cleanupStage === "function") {
    GameState.cleanupStage();
    GameState.cleanupStage = null;
  }
}

function startStageTimer(seconds, onExpire) {
  GameState.timer = seconds;
  stageTimerEl.textContent = GameState.timer.toFixed(1);
  GameState.timerInterval = setInterval(() => {
    GameState.timer = Math.max(0, GameState.timer - 0.1);
    stageTimerEl.textContent = GameState.timer.toFixed(1);
    if (GameState.timer <= 0) {
      clearInterval(GameState.timerInterval);
      GameState.timerInterval = null;
      if (onExpire) onExpire();
    }
  }, 100);
}

function startGame() {
  SoundFX.init();
  GameState.stage = 1;
  GameState.stageScores = [20, 20, 20, 20, 20];
  GameState.totalScore = 100;
  hudScoreEl.textContent = "100";
  showScreen("play");
  loadStage(1);
}

function nextStage() {
  clearStageTimers();
  SoundFX.success();
  if (GameState.stage < 5) {
    GameState.stage += 1;
    loadStage(GameState.stage);
  } else {
    showResultScreen();
  }
}

function loadStage(stageNum) {
  clearStageTimers();
  updateStageNodes(stageNum);
  if (stageNum === 1) setupStage1Shredding();
  else if (stageNum === 2) setupStage2Batter();
  else if (stageNum === 3) setupStage3Gelatinize();
  else if (stageNum === 4) setupStage4Steaming();
  else if (stageNum === 5) setupStage5SliceAndFry();
}

/* =========================================================
   第一關：刨白蘿蔔絲 (1200g)
========================================================= */
function setupStage1Shredding() {
  stageTitleEl.textContent = "第一關：削皮刨絲（備料 1200g 白蘿蔔）";
  bossDialogueEl.textContent =
    "「傳統菜頭粿要吃得到清甜蘿蔔絲！在畫布上左右來回滑動白蘿蔔（或連點按鈕）刨滿 1200 克！」";

  workbench.innerHTML = `
    <div class="stage-top-bar">
      <div class="meter-group">
        <div class="meter-label">
          <span>🥕 已刨白蘿蔔絲重量</span>
          <span id="radish-weight">0 / 1200 克</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="radish-bar"></div>
        </div>
      </div>
    </div>
    <div class="interactive-zone">
      <canvas id="stage1-canvas" class="stage-canvas" width="680" height="290"></canvas>
      <div class="control-row">
        <button id="btn-fast-shred" class="action-btn highlight" type="button">🥕 用力刨絲 (+80g)</button>
      </div>
    </div>
  `;

  const canvas = document.getElementById("stage1-canvas");
  const ctx = canvas.getContext("2d");
  const weightEl = document.getElementById("radish-weight");
  const barEl = document.getElementById("radish-bar");

  let weight = 0;
  const targetWeight = 1200;
  let radishX = 340;
  let radishY = 95;
  let isDragging = false;
  let lastX = null;
  const shreds = [];
  let finished = false;

  function addShredProgress(amount) {
    if (finished) return;
    weight = Math.min(targetWeight, weight + amount);
    weightEl.textContent = `${Math.round(weight)} / 1200 克`;
    barEl.style.width = `${(weight / targetWeight) * 100}%`;
    SoundFX.shred();

    for (let i = 0; i < 4; i++) {
      shreds.push({
        x: radishX + (Math.random() - 0.5) * 60,
        y: 145,
        vy: 2 + Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 1.5,
        len: 14 + Math.random() * 12,
        landed: false
      });
    }

    if (weight >= targetWeight) {
      finished = true;
      showToast("✨ 1200g 蘿蔔絲備料完成！");
      setTimeout(nextStage, 850);
    }
  }

  document.getElementById("btn-fast-shred").addEventListener("click", () => {
    radishX = 260 + Math.random() * 160;
    addShredProgress(80);
  });

  function onPointerMove(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    radishX = Math.max(180, Math.min(500, x));
    radishY = Math.max(60, Math.min(135, y));

    if (lastX !== null) {
      const dx = Math.abs(x - lastX);
      if (dx > 8) {
        addShredProgress(dx * 0.55);
      }
    }
    lastX = x;
  }

  canvas.addEventListener("pointerdown", (e) => {
    isDragging = true;
    onPointerMove(e.clientX, e.clientY);
  });
  window.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    onPointerMove(e.clientX, e.clientY);
  });
  window.addEventListener("pointerup", () => {
    isDragging = false;
    lastX = null;
  });

  startStageTimer(25, () => {
    if (!finished) {
      finished = true;
      adjustScore(-5, 0);
      showToast("⏰ 時間到！老闆幫你補齊蘿蔔絲！");
      setTimeout(nextStage, 900);
    }
  });

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製木盆
    ctx.fillStyle = "#d9a773";
    ctx.strokeStyle = "#6b4226";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(170, 210, 340, 65, [10, 10, 36, 36]);
    ctx.fill();
    ctx.stroke();

    // 盆內堆積的蘿蔔絲
    const pileHeight = (weight / targetWeight) * 52;
    if (pileHeight > 2) {
      ctx.fillStyle = "#fffdf7";
      ctx.beginPath();
      ctx.ellipse(340, 220, 140, pileHeight, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "#e2dccb";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 繪製金屬刨絲器
    ctx.save();
    ctx.translate(340, 150);
    ctx.fillStyle = "#bdc3c7";
    ctx.strokeStyle = "#7f8c8d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-140, -18, 280, 36, 10);
    ctx.fill();
    ctx.stroke();
    // 刨絲孔
    ctx.fillStyle = "#7f8c8d";
    for (let gx = -110; gx <= 110; gx += 22) {
      ctx.beginPath();
      ctx.arc(gx, -4, 3.5, 0, Math.PI * 2);
      ctx.arc(gx + 10, 6, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 掉落中的蘿蔔絲
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    for (const s of shreds) {
      if (!s.landed) {
        s.y += s.vy;
        s.x += s.vx;
        if (s.y >= 218) s.landed = true;
      }
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + 4, s.y + s.len);
      ctx.stroke();
    }

    // 繪製大白蘿蔔（隨進度變短）
    const scale = Math.max(0.45, 1 - (weight / targetWeight) * 0.5);
    ctx.save();
    ctx.translate(radishX, radishY);
    ctx.rotate(-0.18);
    ctx.scale(scale, scale);

    // 蘿蔔葉梗
    ctx.fillStyle = "#4d7c2b";
    ctx.beginPath();
    ctx.ellipse(-65, -8, 26, 8, -0.3, 0, Math.PI * 2);
    ctx.ellipse(-65, 8, 26, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 白蘿蔔本體
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#c8b9a6";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 65, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#6b4226";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("⇄ 左右滑動刨絲", 0, -40);
    ctx.restore();

    GameState.animFrame = requestAnimationFrame(render);
  }
  render();
}

/* =========================================================
   第二關：黃金比例調米漿（400g 在來米粉 + 400cc 冷水）
========================================================= */
function setupStage2Batter() {
  stageTitleEl.textContent = "第二關：黃金比例調米漿（3:1 比例 & 冷水調粉）";
  bossDialogueEl.textContent =
    "「1200g 蘿蔔配 400g 在來米粉就是 3:1 黃金比例！記得一定要加『冷水』400c.c.，千萬不能加生熱水，再攪拌均勻！」";

  workbench.innerHTML = `
    <div class="stage-top-bar">
      <div class="meter-group">
        <div class="meter-label">
          <span>🌾 在來米粉：<b id="flour-val">0 / 400g</b>｜💧 冷水：<b id="water-val">0 / 400c.c.</b></span>
          <span>🥣 溶解均勻度：<b id="stir-val">0%</b></span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="batter-bar"></div>
        </div>
      </div>
    </div>
    <div class="interactive-zone">
      <canvas id="stage2-canvas" class="stage-canvas" width="680" height="290"></canvas>
      <div class="control-row">
        <button id="btn-add-flour" class="action-btn" type="button">🌾 倒入在來米粉 (+100g)</button>
        <button id="btn-add-cold" class="action-btn" type="button">💧 加入冷水 (+100c.c.)</button>
        <button id="btn-add-hot" class="action-btn danger" type="button">♨️ 加入熱水 (小心結塊!)</button>
        <button id="btn-stir-batter" class="action-btn highlight" type="button" disabled>🥄 畫圈攪拌粉漿</button>
      </div>
    </div>
  `;

  const canvas = document.getElementById("stage2-canvas");
  const ctx = canvas.getContext("2d");
  const flourEl = document.getElementById("flour-val");
  const waterEl = document.getElementById("water-val");
  const stirEl = document.getElementById("stir-val");
  const barEl = document.getElementById("batter-bar");
  const btnFlour = document.getElementById("btn-add-flour");
  const btnCold = document.getElementById("btn-add-cold");
  const btnHot = document.getElementById("btn-add-hot");
  const btnStir = document.getElementById("btn-stir-batter");

  let flour = 0;
  let water = 0;
  let stirProgress = 0;
  let angle = 0;
  let finished = false;

  const lumps = Array.from({ length: 14 }, () => ({
    dist: 15 + Math.random() * 68,
    ang: Math.random() * Math.PI * 2,
    r: 6 + Math.random() * 6
  }));

  function checkReadyToStir() {
    if (flour === 400 && water === 400) {
      btnStir.disabled = false;
      bossDialogueEl.textContent =
        "「黃金比例完成！現在在調理盆裡畫圈滑動（或連點攪拌按鈕），把所有粉粒攪散至完全溶解！」";
    }
  }

  btnFlour.addEventListener("click", () => {
    if (flour < 400) {
      flour += 100;
      flourEl.textContent = `${flour} / 400g`;
      SoundFX.splash();
      if (flour === 400) btnFlour.disabled = true;
      checkReadyToStir();
    }
  });

  btnCold.addEventListener("click", () => {
    if (water < 400) {
      water += 100;
      waterEl.textContent = `${water} / 400c.c.`;
      SoundFX.splash();
      if (water === 400) btnCold.disabled = true;
      checkReadyToStir();
    }
  });

  btnHot.addEventListener("click", () => {
    SoundFX.warn();
    adjustScore(-3, 1);
    showToast("⚠️ 禁忌！熱水會讓在來米粉結塊！");
    bossDialogueEl.textContent =
      "「哎呀！調米漿千萬不能用熱水，粉粒外熟內生會結塊！快改用冷水！」";
  });

  function addStir(amount) {
    if (finished || flour < 400 || water < 400) return;
    stirProgress = Math.min(100, stirProgress + amount);
    angle += 0.35;
    stirEl.textContent = `${Math.round(stirProgress)}%`;
    barEl.style.width = `${stirProgress}%`;
    SoundFX.stir();

    if (stirProgress >= 100) {
      finished = true;
      showToast("✨ 絲滑無顆粒！黃金在來米漿完成！");
      setTimeout(nextStage, 850);
    }
  }

  btnStir.addEventListener("click", () => addStir(14));

  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons > 0 || e.pointerType === "touch") {
      addStir(1.6);
    }
  });

  startStageTimer(28, () => {
    if (!finished) {
      finished = true;
      adjustScore(-5, 1);
      showToast("⏰ 時間到！進入炒鍋糊化步驟！");
      setTimeout(nextStage, 900);
    }
  });

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製調理盆
    ctx.save();
    ctx.translate(340, 150);
    ctx.fillStyle = "#d5dde5";
    ctx.strokeStyle = "#5d6d7e";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 盆內液體與粉
    const fillRatio = (flour / 400 + water / 400) / 2;
    if (fillRatio > 0) {
      ctx.fillStyle = water > 0 ? "#fcfaf2" : "#f5ebd6";
      ctx.beginPath();
      ctx.arc(0, 0, 96 * Math.max(0.45, fillRatio), 0, Math.PI * 2);
      ctx.fill();
    }

    // 漩渦紋路
    if (stirProgress > 0) {
      ctx.strokeStyle = "#e5dec9";
      ctx.lineWidth = 3;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, i * 24, angle + i, angle + i + Math.PI * 1.25);
        ctx.stroke();
      }
    }

    // 未溶解粉粒（隨攪拌縮小消失）
    const remainScale = Math.max(0, 1 - stirProgress / 100);
    if (flour > 0 && remainScale > 0.05) {
      ctx.fillStyle = "#e8d8b9";
      for (const l of lumps) {
        const lx = Math.cos(l.ang + angle) * l.dist;
        const ly = Math.sin(l.ang + angle) * l.dist;
        ctx.beginPath();
        ctx.arc(lx, ly, l.r * remainScale, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 打蛋器/攪拌匙
    ctx.fillStyle = "#8e5a31";
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * 35, Math.sin(angle) * 35, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = "#6b4226";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      flour < 400 || water < 400
        ? "👇 先點擊下方按鈕加入 400g 在來米粉 與 400c.c. 冷水"
        : "🔄 在碗中畫圈滑動或點擊「畫圈攪拌粉漿」至 100%",
      340,
      276
    );

    GameState.animFrame = requestAnimationFrame(render);
  }
  render();
}

/* =========================================================
   第三關：爆香悶煮與關鍵「糊化」
========================================================= */
function setupStage3Gelatinize() {
  stageTitleEl.textContent = "第三關：古早味爆香與關鍵「微火糊化」";
  bossDialogueEl.textContent =
    "「先下油蔥酥、鹽巴與白胡椒粉悶出蘿蔔甜水，再倒入米漿轉小火快速翻炒，讓米漿吸水『糊化』成半熟濃稠米糰！」";

  workbench.innerHTML = `
    <div class="stage-top-bar">
      <div class="meter-group">
        <div class="meter-label">
          <span>🥘 粉漿糊化濃稠度</span>
          <span id="gel-val">0%（目標 100% 半熟米糰）</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="gel-bar"></div>
        </div>
      </div>
    </div>
    <div class="interactive-zone">
      <canvas id="stage3-canvas" class="stage-canvas" width="680" height="290"></canvas>
      <div class="control-row">
        <button id="btn-seasoning" class="action-btn highlight" type="button">🧅 1. 下油蔥酥・鹽・白胡椒爆香</button>
        <button id="btn-pour-slurry" class="action-btn" type="button" disabled>🥣 2. 分次倒入在來米漿</button>
        <button id="btn-stir-wok" class="action-btn" type="button" disabled>🍳 3. 小火快速翻炒糊化</button>
      </div>
    </div>
  `;

  const canvas = document.getElementById("stage3-canvas");
  const ctx = canvas.getContext("2d");
  const gelValEl = document.getElementById("gel-val");
  const gelBarEl = document.getElementById("gel-bar");
  const btnSeason = document.getElementById("btn-seasoning");
  const btnPour = document.getElementById("btn-pour-slurry");
  const btnStirWok = document.getElementById("btn-stir-wok");

  let step = 0; // 0: 爆香前, 1: 已爆香, 2: 已倒米漿翻炒中
  let gelProgress = 0;
  let spatulaX = 340;
  let finished = false;

  btnSeason.addEventListener("click", () => {
    step = 1;
    btnSeason.disabled = true;
    btnSeason.classList.remove("highlight");
    btnPour.disabled = false;
    btnPour.classList.add("highlight");
    SoundFX.splash();
    showToast("🧅 油蔥酥香氣撲鼻！蘿蔔絲釋放清甜湯汁！");
    bossDialogueEl.textContent =
      "「好香啊！蘿蔔絲已經變軟半透明了，快把調好的在來米漿分次倒進鍋裡！」";
  });

  btnPour.addEventListener("click", () => {
    step = 2;
    btnPour.disabled = true;
    btnPour.classList.remove("highlight");
    btnStirWok.disabled = false;
    btnStirWok.classList.add("highlight");
    SoundFX.splash();
    showToast("🥣 米漿入鍋！立刻轉小火不停翻炒！");
    bossDialogueEl.textContent =
      "「成敗關鍵來了！轉小火用鍋鏟不停翻炒（滑動鍋子或連點翻炒），阻力變大成團就立刻關火！」";
  });

  function stirWok(amount) {
    if (finished || step < 2) return;
    gelProgress = Math.min(100, gelProgress + amount);
    spatulaX = 280 + Math.sin(gelProgress * 0.4) * 75;
    gelValEl.textContent = `${Math.round(gelProgress)}%（濃稠米糰狀態）`;
    gelBarEl.style.width = `${gelProgress}%`;
    SoundFX.stir();

    if (gelProgress >= 100) {
      finished = true;
      showToast("🔥 完美糊化！立刻關火準備入模！");
      setTimeout(nextStage, 900);
    }
  }

  btnStirWok.addEventListener("click", () => stirWok(12));
  canvas.addEventListener("pointermove", (e) => {
    if ((e.buttons > 0 || e.pointerType === "touch") && step === 2) {
      stirWok(1.5);
    }
  });

  startStageTimer(28, () => {
    if (!finished) {
      finished = true;
      adjustScore(-5, 2);
      showToast("⏰ 時間到！米糊入模準備炊粿！");
      setTimeout(nextStage, 900);
    }
  });

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 瓦斯微火
    ctx.fillStyle = step === 2 ? "#3498db" : "#e67e22";
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(340 + i * 28, 252, 9 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 大炒鍋
    ctx.fillStyle = "#2c3e50";
    ctx.strokeStyle = "#1a252f";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(340, 130, 125, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // 鍋內食材
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(340, 185, 102, 42, 0, 0, Math.PI * 2);
    if (step === 0) {
      ctx.fillStyle = "#f4f1ea";
    } else if (step === 1) {
      ctx.fillStyle = "#f2e3c6";
    } else {
      // 隨糊化程度變得雪白濃稠
      ctx.fillStyle = "#fffcf5";
    }
    ctx.fill();

    // 油蔥酥顆粒
    if (step >= 1) {
      ctx.fillStyle = "#a04000";
      for (let i = 0; i < 16; i++) {
        const ox = 275 + ((i * 37) % 130);
        const oy = 168 + ((i * 19) % 34);
        ctx.beginPath();
        ctx.arc(ox, oy, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // 鍋鏟
    ctx.save();
    ctx.translate(spatulaX, 135);
    ctx.rotate(-0.35);
    ctx.fillStyle = "#bdc3c7";
    ctx.fillRect(-16, 15, 32, 26);
    ctx.fillStyle = "#8e5a31";
    ctx.fillRect(-5, -55, 10, 70);
    ctx.restore();

    ctx.fillStyle = "#6b4226";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      step === 0
        ? "步驟 1：點擊「下油蔥酥・鹽・白胡椒爆香」"
        : step === 1
        ? "步驟 2：點擊「分次倒入在來米漿」"
        : "步驟 3：在鍋中左右滑動或連點按鈕，小火翻炒至濃稠成團！",
      340,
      36
    );

    GameState.animFrame = requestAnimationFrame(render);
  }
  render();
}

/* =========================================================
   第四關：蒸籠顧粿（顧粿沒那麼簡單！+ 竹籤針試法）
========================================================= */
function setupStage4Steaming() {
  stageTitleEl.textContent = "第四關：入模炊粿（顧粿沒那麼簡單！）";
  bossDialogueEl.textContent =
    "「重頭戲來了！蒸菜頭粿要維持在『綠色黃金蒸氣區（55~85）』，水位太低要補熱水！蒸熟後還要用『竹籤針試法』測試中心熟度！」";

  workbench.innerHTML = `
    <div class="stage-top-bar">
      <div class="meter-group">
        <div class="meter-label">
          <span>♨️ 蒸籠熟透進度：<b id="steam-prog-val">0%</b></span>
          <span>🔥 蒸氣火力：<b id="heat-val">70</b>（理想區間 55～85）｜💧 水位：<b id="water-lvl-val">100%</b></span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="steam-bar"></div>
        </div>
      </div>
    </div>
    <div class="interactive-zone">
      <canvas id="stage4-canvas" class="stage-canvas" width="680" height="290"></canvas>
      <div class="control-row">
        <button id="btn-fire-up" class="action-btn highlight" type="button">🔥 添柴加火 (+14 火力)</button>
        <button id="btn-vent" class="action-btn" type="button">🌬️ 掀蓋透氣 (-12 火力)</button>
        <button id="btn-refill-water" class="action-btn" type="button">💧 外鍋補熱水</button>
        <button id="btn-skewer-test" class="action-btn highlight" type="button" disabled>🍢 竹籤插入中心「針試法」</button>
      </div>
    </div>
  `;

  const canvas = document.getElementById("stage4-canvas");
  const ctx = canvas.getContext("2d");
  const steamProgEl = document.getElementById("steam-prog-val");
  const heatValEl = document.getElementById("heat-val");
  const waterLvlEl = document.getElementById("water-lvl-val");
  const steamBarEl = document.getElementById("steam-bar");

  const btnFireUp = document.getElementById("btn-fire-up");
  const btnVent = document.getElementById("btn-vent");
  const btnWater = document.getElementById("btn-refill-water");
  const btnSkewer = document.getElementById("btn-skewer-test");

  let heat = 70;
  let waterLevel = 100;
  let steamProgress = 0;
  let readyForSkewer = false;
  let skewerTested = false;
  let finished = false;

  btnFireUp.addEventListener("click", () => {
    heat = Math.min(100, heat + 14);
    SoundFX.splash();
  });

  btnVent.addEventListener("click", () => {
    heat = Math.max(10, heat - 12);
    SoundFX.stir();
  });

  btnWater.addEventListener("click", () => {
    waterLevel = 100;
    SoundFX.splash();
    showToast("💧 外鍋熱水補足！蒸氣源源不絕！");
  });

  btnSkewer.addEventListener("click", () => {
    if (!readyForSkewer || finished) return;
    skewerTested = true;
    finished = true;
    SoundFX.success();
    showToast("🍢 竹籤拔出無沾黏白漿！完全熟透！");
    bossDialogueEl.textContent =
      "「漂亮！竹籤拔出來乾乾淨淨沒有沾黏生粉漿，這籠菜頭粿炊得太完美了！」";
    setTimeout(nextStage, 1200);
  });

  const simTick = setInterval(() => {
    if (finished) return;
    // 火力與水位自然遞減
    heat = Math.max(15, heat - 2.2);
    waterLevel = Math.max(0, waterLevel - 2.4);

    if (!readyForSkewer) {
      if (heat >= 55 && heat <= 85 && waterLevel > 20) {
        steamProgress = Math.min(100, steamProgress + 4.2);
      } else {
        steamProgress = Math.min(100, steamProgress + 1.2);
        if (waterLevel <= 15) {
          bossDialogueEl.textContent = "「⚠️ 外鍋快沒水啦！快按『外鍋補熱水』才不會乾燒！」";
        } else if (heat < 55) {
          bossDialogueEl.textContent = "「🔥 火力太小蒸不透喔！快按『添柴加火』保持中大火！」";
        } else if (heat > 85) {
          bossDialogueEl.textContent = "「🌬️ 蒸氣太猛表面會凹凸不平！按一下『掀蓋透氣』！」";
        }
      }

      steamProgEl.textContent = `${Math.round(steamProgress)}%`;
      steamBarEl.style.width = `${steamProgress}%`;

      if (steamProgress >= 100) {
        readyForSkewer = true;
        btnSkewer.disabled = false;
        bossDialogueEl.textContent =
          "「蒸滿時間囉！快按下『🍢 竹籤插入中心針試法』確認中心有沒有熟透！」";
        showToast("🍢 請執行「竹籤針試法」驗收！");
      }
    }

    heatValEl.textContent = Math.round(heat);
    waterLvlEl.textContent = `${Math.round(waterLevel)}%`;
  }, 250);

  GameState.cleanupStage = () => clearInterval(simTick);

  startStageTimer(32, () => {
    if (!finished) {
      finished = true;
      adjustScore(-5, 3);
      showToast("⏰ 炊粿時間結束！出爐放涼！");
      setTimeout(nextStage, 900);
    }
  });

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 左側繪製包老闆蒸籠立牌素材 (背面.jfif)
    if (Images.back.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(24, 24, 195, 240, 14);
      ctx.clip();
      ctx.fillStyle = "#fff";
      ctx.fillRect(24, 24, 195, 240);
      ctx.drawImage(Images.back, 24, 24, 195, 240);
      ctx.restore();
    }

    // 中央竹蒸籠塔
    const cx = 370;
    for (let layer = 0; layer < 3; layer++) {
      const ly = 185 - layer * 42;
      ctx.fillStyle = "#d49b57";
      ctx.strokeStyle = "#6b4226";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(cx - 95, ly, 190, 38, 8);
      ctx.fill();
      ctx.stroke();

      // 竹編紋理
      ctx.strokeStyle = "#8e5a31";
      ctx.beginPath();
      ctx.moveTo(cx - 95, ly + 19);
      ctx.lineTo(cx + 95, ly + 19);
      ctx.stroke();
    }

    // 蒸籠蓋
    ctx.fillStyle = "#b97d3b";
    ctx.beginPath();
    ctx.ellipse(cx, 100, 98, 22, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    // 針試法竹籤動畫
    if (readyForSkewer) {
      ctx.strokeStyle = "#f1c40f";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, 25);
      ctx.lineTo(cx, skewerTested ? 95 : 65);
      ctx.stroke();
    }

    // 右側溫度計與黃金區間條
    const barX = 560;
    const barY = 45;
    const barH = 200;
    ctx.fillStyle = "#eadbc8";
    ctx.strokeStyle = "#6b4226";
    ctx.lineWidth = 3;
    ctx.fillRect(barX, barY, 34, barH);
    ctx.strokeRect(barX, barY, 34, barH);

    // 黃金區間 (55~85)
    const greenTop = barY + barH * (1 - 0.85);
    const greenHeight = barH * (0.85 - 0.55);
    ctx.fillStyle = "rgba(77, 124, 43, 0.35)";
    ctx.fillRect(barX + 2, greenTop, 30, greenHeight);

    // 當前火力指針
    const curY = barY + barH * (1 - heat / 100);
    ctx.fillStyle = heat >= 55 && heat <= 85 ? "#4d7c2b" : "#c82829";
    ctx.beginPath();
    ctx.roundRect(barX - 8, curY - 7, 50, 14, 6);
    ctx.fill();

    ctx.fillStyle = "#251a14";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("理想蒸氣區", barX + 17, greenTop - 6);

    GameState.animFrame = requestAnimationFrame(render);
  }
  render();
}

/* =========================================================
   第五關：放涼定型、切塊與香煎上桌
========================================================= */
function setupStage5SliceAndFry() {
  stageTitleEl.textContent = "第五關：完全放涼定型、切塊與香煎「恰恰」";
  bossDialogueEl.textContent =
    "「剛出爐的菜頭粿很軟，千萬別急著切！先吹涼定型，再切塊煎到兩面金黃赤赤（恰恰）上桌！」";

  workbench.innerHTML = `
    <div class="stage-top-bar">
      <div class="meter-group">
        <div class="meter-label">
          <span>🍽️ 出爐裝盤進度</span>
          <span id="final-step-label">步驟 1/3：搧風放涼定型</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" id="final-bar"></div>
        </div>
      </div>
    </div>
    <div class="interactive-zone">
      <canvas id="stage5-canvas" class="stage-canvas" width="680" height="290"></canvas>
      <div class="control-row">
        <button id="btn-cool" class="action-btn highlight" type="button">❄️ 1. 搧風完全放涼定型</button>
        <button id="btn-slice" class="action-btn" type="button" disabled>🔪 2. 菜刀切塊 (0/3 刀)</button>
        <button id="btn-pan-fry" class="action-btn" type="button" disabled>🍳 3. 香煎至金黃「恰恰」</button>
      </div>
    </div>
  `;

  const canvas = document.getElementById("stage5-canvas");
  const ctx = canvas.getContext("2d");
  const labelEl = document.getElementById("final-step-label");
  const barEl = document.getElementById("final-bar");
  const btnCool = document.getElementById("btn-cool");
  const btnSlice = document.getElementById("btn-slice");
  const btnFry = document.getElementById("btn-pan-fry");

  let coolClicks = 0;
  let sliceCount = 0;
  let fryCount = 0;
  let finished = false;

  function updateOverallBar() {
    const pct = ((coolClicks / 3 + sliceCount / 3 + fryCount / 3) / 3) * 100;
    barEl.style.width = `${Math.min(100, pct)}%`;
  }

  btnCool.addEventListener("click", () => {
    coolClicks++;
    SoundFX.stir();
    updateOverallBar();
    if (coolClicks >= 3) {
      btnCool.disabled = true;
      btnCool.classList.remove("highlight");
      btnSlice.disabled = false;
      btnSlice.classList.add("highlight");
      labelEl.textContent = "步驟 2/3：沿虛線切開菜頭粿";
      showToast("❄️ 已完全放涼定型！組織Q彈緊實！");
      bossDialogueEl.textContent =
        "「放涼定型了！現在點擊菜頭粿或『🔪 菜刀切塊』切出漂亮的長方塊！」";
    }
  });

  function doSlice() {
    if (coolClicks < 3 || sliceCount >= 3) return;
    sliceCount++;
    SoundFX.slice();
    btnSlice.textContent = `🔪 2. 菜刀切塊 (${sliceCount}/3 刀)`;
    updateOverallBar();
    if (sliceCount >= 3) {
      btnSlice.disabled = true;
      btnSlice.classList.remove("highlight");
      btnFry.disabled = false;
      btnFry.classList.add("highlight");
      labelEl.textContent = "步驟 3/3：香煎至兩面金黃赤赤";
      showToast("🔪 切塊整齊漂亮！準備下鍋香煎！");
      bossDialogueEl.textContent =
        "「切得跟包老闆鐵盤上的一樣漂亮！最後煎個 3 下讓表面金黃恰恰就大功告成！」";
    }
  }

  btnSlice.addEventListener("click", doSlice);
  canvas.addEventListener("pointerdown", () => {
    if (coolClicks < 3) btnCool.click();
    else if (sliceCount < 3) doSlice();
    else if (fryCount < 3) btnFry.click();
  });

  btnFry.addEventListener("click", () => {
    if (sliceCount < 3 || finished) return;
    fryCount++;
    SoundFX.shred();
    updateOverallBar();
    if (fryCount >= 3) {
      finished = true;
      btnFry.disabled = true;
      showToast("🎉 香煎菜頭粿出爐上桌！");
      setTimeout(nextStage, 950);
    }
  });

  startStageTimer(28, () => {
    if (!finished) {
      finished = true;
      adjustScore(-5, 4);
      setTimeout(nextStage, 600);
    }
  });

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 左側展示整塊菜頭粿與切線
    ctx.save();
    ctx.translate(215, 145);

    // 鐵盤（呼應背面.jfif 包老闆手上的鐵盤）
    ctx.fillStyle = "#bdc3c7";
    ctx.strokeStyle = "#7f8c8d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-145, -75, 290, 150, 16);
    ctx.fill();
    ctx.stroke();

    // 菜頭粿本體
    ctx.fillStyle = fryCount > 0 ? "#f9e7bb" : "#fffdf7";
    ctx.strokeStyle = "#d5c3aa";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-115, -52, 230, 104, 10);
    ctx.fill();
    ctx.stroke();

    // 切線與刀痕
    for (let i = 1; i <= 3; i++) {
      const lx = -115 + i * 57.5;
      ctx.beginPath();
      if (sliceCount >= i) {
        ctx.strokeStyle = "#8e5a31";
        ctx.setLineDash([]);
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = "#c82829";
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2;
      }
      ctx.moveTo(lx, -52);
      ctx.lineTo(lx, 52);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // 右側展示成品圖 (正面.jfif) 隨香煎進度浮現
    if (Images.front.complete) {
      ctx.save();
      ctx.globalAlpha = 0.25 + (fryCount / 3) * 0.75;
      ctx.beginPath();
      ctx.roundRect(410, 28, 235, 235, 18);
      ctx.clip();
      ctx.fillStyle = "#fff";
      ctx.fillRect(410, 28, 235, 235);
      ctx.drawImage(Images.front, 410, 28, 235, 235);
      ctx.restore();
    }

    GameState.animFrame = requestAnimationFrame(render);
  }
  render();
}

/* =========================================================
   結算畫面
========================================================= */
function showResultScreen() {
  showScreen("result");
  const score = Math.round(GameState.totalScore);
  const rankBadge = document.getElementById("result-rank-badge");
  const titleEl = document.getElementById("result-title");
  const commentEl = document.getElementById("result-comment");
  const breakdownEl = document.getElementById("score-breakdown");

  if (score >= 95) {
    rankBadge.textContent = "🏆 包記傳人・特級炊粿宗師";
    titleEl.textContent = `滿分神技（${score} 分）！包老闆甘拜下風！`;
    commentEl.textContent =
      "從 1200g 白蘿蔔刨絲、3:1 冷水調在來米漿、微火糊化到蒸籠顧火針試法，你完美掌握了古早味菜頭粿的每一個細節！";
  } else if (score >= 80) {
    rankBadge.textContent = "🥇 黃金比例・炊粿職人";
    titleEl.textContent = `香氣四溢（${score} 分）！真材實料好味道！`;
    commentEl.textContent =
      "菜頭粿軟糯清甜、外皮煎得金黃恰恰！只要注意冷水調粉與蒸籠火候，下次一定能挑戰宗師滿分！";
  } else {
    rankBadge.textContent = "🌱 炊粿學徒・再接再厲";
    titleEl.textContent = `出爐成功（${score} 分）！顧粿真的沒那麼簡單！`;
    commentEl.textContent =
      "誠如包老闆所言：「顧粿沒那麼簡單！」多練習幾次冷水調粉與微火糊化，你也能炊出招牌菜頭粿！";
  }

  const stageNames = [
    "1. 刨蘿蔔絲",
    "2. 冷水調漿",
    "3. 炒料糊化",
    "4. 蒸籠顧粿",
    "5. 放涼香煎"
  ];
  breakdownEl.innerHTML = stageNames
    .map(
      (name, idx) => `
      <div class="score-item">
        <span>${name}</span>
        <strong>${GameState.stageScores[idx]} / 20 分</strong>
      </div>
    `
    )
    .join("");
}

/* =========================================================
   事件綁定與初始化
========================================================= */
window.addEventListener("DOMContentLoaded", () => {
  initBackgroundSteam();

  // 首頁與結算頁 3D 翻卡互動
  document.querySelectorAll(".flip-card").forEach((card) => {
    card.addEventListener("click", () => {
      card.classList.toggle("flipped");
      SoundFX.splash();
    });
  });

  // 開始與重玩按鈕
  document.getElementById("btn-start-game").addEventListener("click", startGame);
  document.getElementById("btn-retry").addEventListener("click", startGame);
  document.getElementById("btn-home").addEventListener("click", () => {
    clearStageTimers();
    showScreen("title");
  });

  // 音效開關
  const btnSound = document.getElementById("btn-sound");
  btnSound.addEventListener("click", () => {
    SoundFX.enabled = !SoundFX.enabled;
    btnSound.textContent = SoundFX.enabled ? "🔊 音效：開" : "🔇 音效：關";
  });

  // 食譜秘笈 Modal 開關
  const modal = document.getElementById("recipe-modal");
  const openModal = () => modal.classList.remove("hidden");
  const closeModal = () => modal.classList.add("hidden");

  document.getElementById("btn-recipe").addEventListener("click", openModal);
  document.getElementById("btn-open-recipe-hero").addEventListener("click", openModal);
  document.getElementById("btn-result-recipe").addEventListener("click", openModal);
  document.getElementById("btn-close-modal").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
});

