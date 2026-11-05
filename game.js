// 《包記炊粿：顧粿大挑戰！》— 2.5D 等距斜角整合廚房場景 ＆ 即時風雲排行榜引擎

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
  playTone(freq = 440, duration = 0.09, type = "sine", vol = 0.12) {
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
  dash() {
    this.playTone(320, 0.06, "triangle", 0.12);
    setTimeout(() => this.playTone(540, 0.08, "triangle", 0.1), 35);
  },
  pick() {
    this.playTone(460, 0.07, "sine", 0.12);
  },
  chop() {
    this.playTone(230 + Math.random() * 140, 0.06, "sawtooth", 0.12);
  },
  fireUp() {
    this.playTone(280, 0.1, "triangle", 0.14);
    setTimeout(() => this.playTone(440, 0.12, "triangle", 0.12), 45);
  },
  splash() {
    this.playTone(360, 0.1, "sine", 0.12);
    setTimeout(() => this.playTone(540, 0.1, "sine", 0.1), 45);
  },
  hitRat() {
    this.playTone(620, 0.08, "square", 0.14);
    setTimeout(() => this.playTone(880, 0.1, "triangle", 0.12), 40);
  },
  alarm() {
    this.playTone(580, 0.08, "square", 0.1);
  },
  burn() {
    this.playTone(125, 0.3, "sawtooth", 0.18);
  },
  tapRush() {
    this.playTone(480 + Math.random() * 260, 0.06, "triangle", 0.13);
  },
  serve() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.16, "triangle", 0.15), idx * 70);
    });
  },
  fail() {
    [340, 290, 220, 150].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.22, "sawtooth", 0.15), idx * 110);
    });
  }
};

// 預載入所有場景與角色美術圖
const Images = {
  isoRoom: new Image(),
  front: new Image(),
  back: new Image(),
  panic: new Image(),
  rushTruck: new Image(),
  winPoster: new Image(),
  losePoster: new Image()
};
Images.isoRoom.src = "assets/iso_kitchen_room.jpg";
Images.front.src = "正面.jfif";
Images.back.src = "背面.jfif";
Images.panic.src = "assets/boss_panic.jpg";
Images.rushTruck.src = "assets/ui_rush_truck.jpg";
Images.winPoster.src = "assets/ui_win.jpg";
Images.losePoster.src = "assets/ui_lose.jpg";

// 關卡設定 (緊湊高節奏版：縮短等待、提高危機頻率與爽快連擊！)
const LEVELS = {
  1: {
    id: 1,
    name: "關卡 1：老街早市攤",
    targetScore: 1500,
    duration: 75,
    fireDecay: 4.5,
    wokBurnRate: 7.5,
    ratInterval: 10
  },
  2: {
    id: 2,
    name: "關卡 2：廟口夜市爆單",
    targetScore: 2600,
    duration: 80,
    fireDecay: 5.8,
    wokBurnRate: 9.2,
    ratInterval: 7.5
  },
  3: {
    id: 3,
    name: "關卡 3：年貨大街決戰",
    targetScore: 3800,
    duration: 85,
    fireDecay: 7.2,
    wokBurnRate: 11.0,
    ratInterval: 5.5
  }
};

// 玩家手持物品定義 (精簡為 3 種直覺核心料理階段！)
const ITEM_TYPES = {
  NONE: { id: "NONE", name: "空手", icon: "✋", color: "#dfe6e9" },
  RAW_BATTER: { id: "RAW_BATTER", name: "3:1在來米漿盆", icon: "🥣", color: "#f6e58d" },
  PASTE: { id: "PASTE", name: "半熟濃稠米糰", icon: "🥟", color: "#ffbe76" },
  STEAMED_GUA: { id: "STEAMED_GUA", name: "剛出爐熟菜頭粿", icon: "🍱", color: "#badc58" }
};

/* =========================================================
   🏆 風雲排行榜管理系統 (支援 localStorage 持久化與即時名次追擊)
========================================================= */
const LB_STORAGE_KEY = "bao_gua_leaderboard_v2";

const DEFAULT_LEADERBOARD = [
  { name: "阿嬤炊粿王", score: 4280, orders: 6, combo: 6, isNPC: true },
  { name: "包記大掌櫃", score: 3450, orders: 5, combo: 5, isNPC: true },
  { name: "廟口快手阿伯", score: 2680, orders: 4, combo: 4, isNPC: true },
  { name: "夜市大姊頭", score: 1850, orders: 3, combo: 3, isNPC: true },
  { name: "早市小學徒", score: 1150, orders: 2, combo: 2, isNPC: true }
];

const Leaderboard = {
  entries: [],
  load() {
    try {
      const raw = localStorage.getItem(LB_STORAGE_KEY);
      if (raw) {
        this.entries = JSON.parse(raw);
      } else {
        this.entries = [...DEFAULT_LEADERBOARD];
        this.save();
      }
    } catch {
      this.entries = [...DEFAULT_LEADERBOARD];
    }
    this.sort();
  },
  save() {
    try {
      localStorage.setItem(LB_STORAGE_KEY, JSON.stringify(this.entries));
    } catch {
      // ignore storage quota errors
    }
  },
  reset() {
    this.entries = [...DEFAULT_LEADERBOARD];
    this.save();
    this.renderAll();
  },
  sort() {
    this.entries.sort((a, b) => b.score - a.score);
    this.entries = this.entries.slice(0, 12);
  },
  addRecord(name, score, orders, combo) {
    const cleanName = (name || "炊粿快手").trim().slice(0, 10) || "炊粿快手";
    const newEntry = {
      name: cleanName,
      score: Math.round(score),
      orders,
      combo,
      isPlayer: true,
      justAdded: true,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    this.entries.forEach((e) => (e.justAdded = false));
    this.entries.push(newEntry);
    this.sort();
    this.save();
    this.renderAll();
  },
  getLiveListWithCurrentRun(playerName, currentScore, currentOrders, currentCombo) {
    const cleanName = (playerName || "炊粿快手").trim() || "炊粿快手";
    const temp = this.entries.map((e) => ({ ...e, isCurrentLive: false }));
    temp.push({
      name: `${cleanName} (本局)`,
      score: Math.round(currentScore),
      orders: currentOrders,
      combo: currentCombo,
      isPlayer: true,
      isCurrentLive: true
    });
    temp.sort((a, b) => b.score - a.score);
    return temp;
  },
  renderHTML(list, maxCount = 8) {
    return list
      .slice(0, maxCount)
      .map((item, idx) => {
        const rank = idx + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : "";
        const playerClass = item.isCurrentLive || item.justAdded ? "is-player" : "";
        const medal = rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;
        return `
          <div class="lb-row ${rankClass} ${playerClass}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${item.name}</span>
            <span class="lb-meta">${item.orders || 0}籠 / x${item.combo || 1}</span>
            <span class="lb-score">${item.score} 分</span>
          </div>
        `;
      })
      .join("");
  },
  renderAll() {
    const hubEl = document.getElementById("hub-leaderboard-list");
    const modalEl = document.getElementById("modal-leaderboard-list");
    const resultEl = document.getElementById("result-leaderboard-list");
    if (hubEl) hubEl.innerHTML = this.renderHTML(this.entries, 7);
    if (modalEl) modalEl.innerHTML = this.renderHTML(this.entries, 10);
    if (resultEl) resultEl.innerHTML = this.renderHTML(this.entries, 6);
  }
};

// 玩家養成資料
const PlayerData = {
  name: "炊粿快手",
  coins: 300,
  selectedLevel: 1,
  stars: { 1: 0, 2: 0, 3: 0 },
  upgrades: {
    steamer: 1,
    fire: 1,
    truck: 1
  }
};

// 2.5D 等距斜角廚房房間中的 5 大精簡工作站座標 (畫面更清爽、字體超大、動線一目了然！)
// Canvas 尺寸: 1120 x 630
const ISO_STATIONS = [
  {
    id: "PREP_STATION",
    title: "① 刨絲調漿台",
    hint: "連按刨絲 ➔ 端起3:1米漿",
    labelX: 255,
    labelY: 205,
    standX: 300,
    standY: 365,
    color: "#16a085"
  },
  {
    id: "WOK_STATION",
    title: "② 大鐵鑊糊化",
    hint: "倒米漿＋揮鏟翻炒防起火！",
    labelX: 555,
    labelY: 110,
    standX: 555,
    standY: 295,
    color: "#8e44ad"
  },
  {
    id: "FIRE_STOVE",
    title: "🔥 紅磚大灶火",
    hint: "按空白鍵添柴旺火！",
    labelX: 335,
    labelY: 545,
    standX: 335,
    standY: 495,
    color: "#d35400"
  },
  {
    id: "STEAMER_STATION",
    title: "③ 巨型竹蒸籠",
    hint: "放米糰蒸熟 ➔ 端出菜頭粿",
    labelX: 510,
    labelY: 255,
    standX: 435,
    standY: 425,
    color: "#e67e22"
  },
  {
    id: "CUT_DELIVER_STATION",
    title: "④ 切塊淋醬出貨",
    hint: "放熟粿切塊 ➔ 直送發財車！",
    labelX: 790,
    labelY: 245,
    standX: 695,
    standY: 430,
    color: "#c0392b"
  }
];

// 遊戲即時狀態
const State = {
  running: false,
  inRush: false,
  rushTimeLeft: 0,
  rushClicks: 0,
  rushBonus: 0,
  rushTimerId: null,

  levelId: 1,
  maxDuration: 95,
  timeLeft: 95,
  satisfaction: 100,
  score: 0,
  targetScore: 1200,
  ordersCompleted: 0,
  combo: 1,
  maxCombo: 1,
  mistakes: 0,

  // 包老闆 2.5D 等距全身角色狀態
  player: {
    x: 415,
    y: 420,
    facing: 1,
    holding: "NONE",
    walkCycle: 0,
    dashTimer: 0,
    dashCooldown: 0,
    swingTimer: 0,
    targetX: null,
    targetY: null,
    autoInteractStation: null,
    trail: []
  },

  keys: {
    up: false,
    down: false,
    left: false,
    right: false
  },

  // 廚房各站點狀態
  fireTemp: 76, // 紅磚大灶溫度
  shredHasRadish: true,
  shredProgress: 60, // 刨絲盆進度

  slurryHasShreds: true,
  slurryHasWater: true,
  slurryProgress: 70, // 3:1 米漿盆攪拌進度

  wokState: "COOKING", // EMPTY, COOKING, READY, BURNING
  wokCook: 45,
  wokBurn: 15,

  steamState: "STEAMING", // EMPTY, STEAMING, READY
  steamCook: 70,
  steamWater: 82,
  steamOvercook: 0,

  cutState: "EMPTY", // EMPTY, CUTTING
  cutProgress: 0,

  // 動態粒子（蒸氣、火星）與貪吃鼠
  steamPuffs: [],
  rats: [],
  ratSpawnTimer: 8,
  floatingTexts: [],

  lastFrameTime: 0,
  animFrame: null
};

const screens = {
  title: document.getElementById("screen-title"),
  play: document.getElementById("screen-play"),
  result: document.getElementById("screen-result")
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  if (name === "title") {
    refreshHubUI();
    Leaderboard.renderAll();
  }
}

function showFloatingPop(text, color = "#ffdf6b") {
  const el = document.createElement("div");
  el.className = "floating-pop";
  el.style.color = color;
  el.style.borderColor = color;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 850);
}

function addCanvasFloatText(text, x, y, color = "#ffdf6b") {
  State.floatingTexts.push({
    text,
    x,
    y,
    vy: -42,
    alpha: 1,
    color
  });
}

/* =========================================================
   主畫面：關卡地圖、升級商店與排行榜更新
========================================================= */
function getUpgradeCost(type) {
  return 150 * PlayerData.upgrades[type];
}

function refreshHubUI() {
  document.getElementById("top-coins").textContent = PlayerData.coins;

  [1, 2, 3].forEach((id) => {
    const s = PlayerData.stars[id] || 0;
    document.getElementById(`map-stars-${id}`).textContent =
      "⭐".repeat(s) + "☆".repeat(3 - s);
  });

  document.querySelectorAll(".map-node-btn").forEach((btn) => {
    const lv = Number(btn.dataset.level);
    btn.classList.toggle("selected", lv === PlayerData.selectedLevel);
  });

  const lvInfo = LEVELS[PlayerData.selectedLevel];
  document.getElementById("selected-level-tag").textContent = lvInfo.name;
  document.getElementById("selected-level-desc").innerHTML =
    `目標：<strong>${lvInfo.targetScore} 分</strong>（限時 ${lvInfo.duration} 秒）｜在 2.5D 整合廚房房間內穿梭刨絲、調漿、翻炒、添柴、蒸粿出餐！`;

  ["steamer", "fire", "truck"].forEach((type) => {
    const lvl = PlayerData.upgrades[type];
    const cost = getUpgradeCost(type);
    document.getElementById(`upg-${type}-lvl`).textContent = `Lv.${lvl}`;
    const btn = document.getElementById(`btn-upg-${type}`);
    if (lvl >= 5) {
      btn.textContent = "已滿級 MAX";
      btn.disabled = true;
    } else {
      btn.innerHTML = `🪙 <span>${cost}</span> 升級`;
      btn.disabled = PlayerData.coins < cost;
    }
  });
}

function buyUpgrade(type) {
  const lvl = PlayerData.upgrades[type];
  if (lvl >= 5) return;
  const cost = getUpgradeCost(type);
  if (PlayerData.coins < cost) {
    SoundFX.burn();
    showFloatingPop("🪙 金幣不足！快進 2.5D 廚房炊粿賺金幣！", "#ff7675");
    return;
  }
  PlayerData.coins -= cost;
  PlayerData.upgrades[type] += 1;
  SoundFX.serve();
  const msg = {
    steamer: "♨️ 蒸籠升級！炊粿加速＆外鍋更耐燒！",
    fire: "🔥 火力升級！大鐵鑊糊化加速＆更不易燒焦！",
    truck: "👟 跑鞋＆發財車升級！跑速提升＆出貨得分暴增！"
  };
  showFloatingPop(msg[type], "#55efc4");
  refreshHubUI();
}

/* =========================================================
   2.5D 廚房動作遊戲核心：啟動、移動、工作站互動
========================================================= */
function startIsoActionGame() {
  SoundFX.init();
  const nameInput = document.getElementById("player-name-input");
  if (nameInput && nameInput.value.trim()) {
    PlayerData.name = nameInput.value.trim();
  }

  const lv = LEVELS[PlayerData.selectedLevel];

  State.running = true;
  State.inRush = false;
  State.levelId = lv.id;
  State.maxDuration = lv.duration;
  State.timeLeft = lv.duration;
  State.satisfaction = 100;
  State.score = 0;
  State.targetScore = lv.targetScore;
  State.ordersCompleted = 0;
  State.combo = 1;
  State.maxCombo = 1;
  State.mistakes = 0;

  // 包老闆起始站在竹蒸籠與紅磚大灶前的磨石子地板中央
  State.player.x = 460;
  State.player.y = 415;
  State.player.facing = 1;
  State.player.holding = "NONE";
  State.player.walkCycle = 0;
  State.player.dashTimer = 0;
  State.player.dashCooldown = 0;
  State.player.swingTimer = 0;
  State.player.targetX = null;
  State.player.targetY = null;
  State.player.autoInteractStation = null;
  State.player.trail = [];

  // 開局各區皆有進行中進度，立刻進入高節奏多工搶救！
  State.fireTemp = 72;
  State.prepProgress = 50;

  State.wokState = "COOKING";
  State.wokCook = 55;
  State.wokBurn = 25;

  State.steamState = "STEAMING";
  State.steamCook = 68;
  State.steamOvercook = 0;

  State.cutState = "EMPTY";
  State.cutProgress = 0;

  State.rats = [];
  State.ratSpawnTimer = 4.5;
  State.floatingTexts = [];
  State.steamPuffs = Array.from({ length: 10 }, () => ({
    x: 495 + (Math.random() - 0.5) * 45,
    y: 280 + Math.random() * 40,
    r: 10 + Math.random() * 14,
    alpha: 0.25 + Math.random() * 0.35,
    vy: 22 + Math.random() * 18
  }));

  document.getElementById("rush-overlay").classList.add("hidden");
  showScreen("play");
  updateTopAndSidebarHUD();

  State.lastFrameTime = performance.now();
  if (State.animFrame) cancelAnimationFrame(State.animFrame);
  State.animFrame = requestAnimationFrame(gameLoop);
}

function stopGame() {
  State.running = false;
  State.inRush = false;
  if (State.animFrame) {
    cancelAnimationFrame(State.animFrame);
    State.animFrame = null;
  }
  if (State.rushTimerId) {
    clearInterval(State.rushTimerId);
    State.rushTimerId = null;
  }
  document.getElementById("rush-overlay").classList.add("hidden");
}

function getNearestIsoStation(maxDist = 92) {
  let best = null;
  let bestDist = maxDist;
  for (const st of ISO_STATIONS) {
    const d = Math.hypot(State.player.x - st.standX, State.player.y - st.standY);
    if (d < bestDist) {
      bestDist = d;
      best = st;
    }
  }
  return best;
}

function triggerDash() {
  if (!State.running || State.inRush) return;
  const p = State.player;
  if (p.dashCooldown > 0) return;
  p.dashTimer = 0.22;
  p.dashCooldown = 0.7;
  SoundFX.dash();
  addCanvasFloatText("💨 衝刺！", p.x, p.y - 55, "#74b9ff");
}

function triggerInteract() {
  if (!State.running) return;
  if (State.inRush) {
    handleRushTap();
    return;
  }

  const p = State.player;
  p.swingTimer = 0.24;

  // 1. 先檢查身邊是否有貪吃鼠可打飛
  for (let i = State.rats.length - 1; i >= 0; i--) {
    const rat = State.rats[i];
    if (Math.hypot(p.x - rat.x, p.y - rat.y) < 92) {
      State.rats.splice(i, 1);
      PlayerData.coins += 25;
      State.score += 80;
      SoundFX.hitRat();
      addCanvasFloatText("💥 打飛貪吃鼠 +80分 (🪙+25)！", rat.x, rat.y - 25, "#55efc4");
      updateTopAndSidebarHUD();
      return;
    }
  }

  // 2. 與最近的 2.5D 家具工作站互動
  const st = getNearestIsoStation(96);
  if (!st) {
    SoundFX.chop();
    addCanvasFloatText("👟 請走到發光圓圈工作站旁再按空白鍵！(或直接點擊家具)", p.x, p.y - 55, "#ffeaa7");
    return;
  }

  interactWithIsoStation(st);
  updateTopAndSidebarHUD();
}

function interactWithIsoStation(st) {
  const p = State.player;
  const fireMult = 1 + (PlayerData.upgrades.fire - 1) * 0.2;

  switch (st.id) {
    case "PREP_STATION":
      if (p.holding === "RAW_BATTER") {
        addCanvasFloatText("🥣 手上已經端著米漿了！快去中上[②大鐵鑊]！", st.labelX, st.labelY, "#ffeaa7");
        return;
      }
      State.prepProgress = Math.min(100, (State.prepProgress || 0) + 50);
      SoundFX.chop();
      if (State.prepProgress >= 100) {
        p.holding = "RAW_BATTER";
        State.prepProgress = 0;
        SoundFX.serve();
        addCanvasFloatText("🥣 3:1 在來米漿調好了！快去中上[②大鐵鑊]下鍋！", st.labelX, st.labelY, "#55efc4");
      } else {
        addCanvasFloatText(`🥕 刨蘿蔔絲＆冷水調漿 (${Math.round(State.prepProgress)}%) 再按一次！`, st.labelX, st.labelY, "#ffeaa7");
      }
      break;

    case "WOK_STATION":
      if (State.wokState === "BURNING") {
        // 簡化操作：起火時不用再跑去提水，直接在大鐵鑊按空白鍵就能緊急拍滅火勢！
        State.wokState = "COOKING";
        State.wokBurn = 15;
        SoundFX.splash();
        addCanvasFloatText("🧯 緊急壓滅大鐵鑊火勢！保住米糊了！", st.labelX, st.labelY, "#74b9ff");
      } else if (State.wokState === "EMPTY") {
        if (p.holding === "RAW_BATTER") {
          p.holding = "NONE";
          State.wokState = "COOKING";
          State.wokCook = 20;
          State.wokBurn = 0;
          SoundFX.splash();
          addCanvasFloatText("🧅 油蔥酥爆香！米漿入鍋開始快速糊化！", st.labelX, st.labelY, "#a29bfe");
        } else {
          addCanvasFloatText("⚠️ 請先去左邊[①刨絲調漿台]端米漿過來！", st.labelX, st.labelY, "#ffeaa7");
        }
      } else if (State.wokState === "COOKING") {
        State.wokBurn = Math.max(0, State.wokBurn - 55);
        State.wokCook = Math.min(100, State.wokCook + 34 * fireMult);
        SoundFX.chop();
        addCanvasFloatText(`🍳 揮鏟翻炒防燒焦！(${Math.round(State.wokCook)}%)`, st.labelX, st.labelY, "#ffeaa7");
        if (State.wokCook >= 100) {
          p.holding = "PASTE";
          State.wokState = "EMPTY";
          State.wokCook = 0;
          State.wokBurn = 0;
          SoundFX.serve();
          addCanvasFloatText("🥟 糊化完成直接端起「半熟米糰」！快放進[③竹蒸籠]！", st.labelX, st.labelY, "#55efc4");
        }
      } else if (State.wokState === "READY") {
        p.holding = "PASTE";
        State.wokState = "EMPTY";
        State.wokCook = 0;
        State.wokBurn = 0;
        SoundFX.pick();
        addCanvasFloatText("🥟 端起「半熟米糰」！快放進中央[③竹蒸籠]！", st.labelX, st.labelY, "#55efc4");
      }
      break;

    case "FIRE_STOVE":
      State.fireTemp = Math.min(98, State.fireTemp + 32);
      SoundFX.fireUp();
      addCanvasFloatText(`🔥 添柴拉風櫃！大灶火力全開 (${Math.round(State.fireTemp)}°C)！`, st.labelX, st.labelY - 25, "#ff9f1a");
      break;

    case "STEAMER_STATION":
      if (State.steamState === "EMPTY") {
        if (p.holding === "PASTE") {
          p.holding = "NONE";
          State.steamState = "STEAMING";
          State.steamCook = 20;
          State.steamOvercook = 0;
          SoundFX.splash();
          addCanvasFloatText("♨️ 米糰入籠大火快蒸！", st.labelX, st.labelY, "#55efc4");
        } else {
          addCanvasFloatText("⚠️ 請端[②大鐵鑊]炒好的「🥟半熟米糰」來蒸！", st.labelX, st.labelY, "#ffeaa7");
        }
      } else if (State.steamState === "STEAMING") {
        State.steamCook = Math.min(100, State.steamCook + 28);
        SoundFX.fireUp();
        if (State.steamCook >= 100) {
          p.holding = "STEAMED_GUA";
          State.steamState = "EMPTY";
          State.steamCook = 0;
          State.steamOvercook = 0;
          SoundFX.serve();
          addCanvasFloatText("🍱 竹籤驗收熟透！直接端去右邊[④切塊淋醬出貨]！", st.labelX, st.labelY, "#55efc4");
        } else {
          addCanvasFloatText(`♨️ 催火加速蒸熟 (${Math.round(State.steamCook)}%)`, st.labelX, st.labelY, "#ffeaa7");
        }
      } else if (State.steamState === "READY") {
        p.holding = "STEAMED_GUA";
        State.steamState = "EMPTY";
        State.steamCook = 0;
        State.steamOvercook = 0;
        SoundFX.serve();
        addCanvasFloatText("🍱 端出「剛出爐菜頭粿」！快去右邊[④切塊淋醬出貨]！", st.labelX, st.labelY, "#55efc4");
      }
      break;

    case "CUT_DELIVER_STATION":
      if (State.cutState === "EMPTY") {
        if (p.holding === "STEAMED_GUA") {
          p.holding = "NONE";
          State.cutState = "CUTTING";
          State.cutProgress = 50;
          SoundFX.chop();
          addCanvasFloatText("🔪 菜頭粿上桌切塊！再按一次淋醬直接送上發財車！", st.labelX, st.labelY, "#ffeaa7");
        } else {
          addCanvasFloatText("⚠️ 請先把[③竹蒸籠]蒸熟的「🍱菜頭粿」端過來！", st.labelX, st.labelY, "#ffeaa7");
        }
      } else if (State.cutState === "CUTTING") {
        State.cutState = "EMPTY";
        State.cutProgress = 0;
        completeOrderDelivery();
      }
      break;
  }
}

function completeOrderDelivery() {
  const truckLvl = PlayerData.upgrades.truck;
  const basePoints = 380 + (truckLvl - 1) * 85;
  const earned = Math.round(basePoints * State.combo);
  const earnedCoins = Math.round(earned * 0.25);

  State.score += earned;
  PlayerData.coins += earnedCoins;
  State.ordersCompleted += 1;
  State.combo += 1;
  State.maxCombo = Math.max(State.maxCombo, State.combo);
  State.satisfaction = Math.min(100, State.satisfaction + 25);

  SoundFX.serve();
  updateTopAndSidebarHUD();

  // 觸發三輪發財車瘋狂連打拋粿挑戰
  triggerFeverRushChallenge();
}

/* =========================================================
   瘋狂點擊 / 出貨挑戰 (ui_rush_truck.jpg)
========================================================= */
function triggerFeverRushChallenge() {
  State.inRush = true;
  State.rushTimeLeft = 4.2;
  State.rushClicks = 0;
  State.rushBonus = 0;

  document.getElementById("rush-overlay").classList.remove("hidden");
  updateRushModalUI();

  if (State.rushTimerId) clearInterval(State.rushTimerId);
  State.rushTimerId = setInterval(() => {
    State.rushTimeLeft = Math.max(0, State.rushTimeLeft - 0.1);
    updateRushModalUI();
    if (State.rushTimeLeft <= 0) {
      finishFeverRushChallenge();
    }
  }, 100);
}

function handleRushTap() {
  if (!State.running || !State.inRush) return;
  const perTap = 38 + (PlayerData.upgrades.truck - 1) * 16;
  State.rushClicks += 1;
  State.rushBonus += perTap;
  State.score += perTap;
  PlayerData.coins += 8;
  SoundFX.tapRush();
  updateRushModalUI();
  updateTopAndSidebarHUD();
}

function updateRushModalUI() {
  document.getElementById("rush-timer-text").textContent = `剩餘 ${State.rushTimeLeft.toFixed(1)} 秒`;
  document.getElementById("rush-clicks-val").textContent = State.rushClicks;
  document.getElementById("rush-bonus-val").textContent = State.rushBonus;
  document.getElementById("top-coins").textContent = PlayerData.coins;
}

function finishFeverRushChallenge() {
  if (State.rushTimerId) {
    clearInterval(State.rushTimerId);
    State.rushTimerId = null;
  }
  State.inRush = false;
  document.getElementById("rush-overlay").classList.add("hidden");
  SoundFX.serve();
  showFloatingPop(
    `🚚 發財車滿載出發！連打拋上 ${State.rushClicks} 塊粿額外大賺 +${State.rushBonus} 分！`,
    "#55efc4"
  );
}

/* =========================================================
   60FPS 2.5D 房間物理與廚房狀態更新
========================================================= */
function gameLoop(now) {
  if (!State.running) return;
  const dt = Math.min(0.05, (now - State.lastFrameTime) / 1000);
  State.lastFrameTime = now;

  if (!State.inRush) {
    updatePhysicsAndKitchen(dt);
  }
  renderIsoKitchenScene(now * 0.005);

  State.animFrame = requestAnimationFrame(gameLoop);
}

function updatePhysicsAndKitchen(dt) {
  const lv = LEVELS[State.levelId];
  const p = State.player;

  // 1. 時間倒數
  State.timeLeft = Math.max(0, State.timeLeft - dt);
  if (State.timeLeft <= 0) {
    const passed = State.score >= State.targetScore && State.satisfaction > 0;
    stopGame();
    if (passed) SoundFX.serve();
    else SoundFX.fail();
    finishGameAndRecordLeaderboard(
      passed,
      passed ? "時間到！成功達成營業額目標，榮登包記職人榜！" : "時間到！未達目標分數，升級裝備再挑戰一次！"
    );
    return;
  }

  // 2. 包老闆在 2.5D 磨石子地板上的移動
  if (p.dashTimer > 0) p.dashTimer = Math.max(0, p.dashTimer - dt);
  if (p.dashCooldown > 0) p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  if (p.swingTimer > 0) p.swingTimer = Math.max(0, p.swingTimer - dt);

  let mx = 0;
  let my = 0;
  if (State.keys.left) mx -= 1;
  if (State.keys.right) mx += 1;
  if (State.keys.up) my -= 1;
  if (State.keys.down) my += 1;

  if (mx === 0 && my === 0 && p.targetX !== null && p.targetY !== null) {
    const dx = p.targetX - p.x;
    const dy = p.targetY - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 12) {
      mx = dx / dist;
      my = dy / dist;
    } else {
      p.targetX = null;
      p.targetY = null;
      if (p.autoInteractStation) {
        const st = p.autoInteractStation;
        p.autoInteractStation = null;
        interactWithIsoStation(st);
      }
    }
  } else if (mx !== 0 || my !== 0) {
    p.targetX = null;
    p.targetY = null;
    p.autoInteractStation = null;
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
  }

  if (mx < -0.1) p.facing = -1;
  else if (mx > 0.1) p.facing = 1;

  const isMoving = Math.abs(mx) > 0.01 || Math.abs(my) > 0.01;
  if (isMoving) {
    p.walkCycle += dt * (p.dashTimer > 0 ? 18 : 11);
  }

  const baseSpeed = 330 + (PlayerData.upgrades.truck - 1) * 32;
  const curSpeed = p.dashTimer > 0 ? baseSpeed * 2.25 : baseSpeed;

  p.x = Math.max(150, Math.min(840, p.x + mx * curSpeed * dt));
  p.y = Math.max(275, Math.min(545, p.y + my * curSpeed * dt));

  if (p.dashTimer > 0) {
    p.trail.push({ x: p.x, y: p.y, alpha: 0.6 });
  }
  for (let i = p.trail.length - 1; i >= 0; i--) {
    p.trail[i].alpha -= dt * 3.2;
    if (p.trail[i].alpha <= 0) p.trail.splice(i, 1);
  }

  // 3. 紅磚大灶火溫自然衰減 (節奏更緊湊，需隨時添柴！)
  const fireResist = Math.max(0.45, 1 - (PlayerData.upgrades.fire - 1) * 0.12);
  State.fireTemp = Math.max(10, State.fireTemp - lv.fireDecay * fireResist * dt);

  const heatFactor =
    State.fireTemp >= 48
      ? 1.55
      : State.fireTemp < 35
      ? 0.35
      : 1.05;

  // 4. 大鐵鑊糊化與燒焦起火 (煮更快、焦更快，刺激感加倍！)
  const fireUpgMult = 1 + (PlayerData.upgrades.fire - 1) * 0.18;
  if (State.wokState === "COOKING") {
    State.wokCook = Math.min(100, State.wokCook + 9.5 * heatFactor * fireUpgMult * dt);
    State.wokBurn += lv.wokBurnRate * fireResist * dt;
    if (State.wokCook >= 100) {
      State.wokState = "READY";
      SoundFX.serve();
      addCanvasFloatText("✅ 大鐵鑊米糰好了！快來端進[③竹蒸籠]！", 555, 130, "#55efc4");
    } else if (State.wokBurn >= 100) {
      State.wokState = "BURNING";
      SoundFX.burn();
      addCanvasFloatText("🔥 大鐵鑊起火啦！快跑去按[空白鍵]拍滅火勢！", 555, 130, "#ff7675");
    }
  } else if (State.wokState === "READY") {
    State.wokBurn += lv.wokBurnRate * 0.9 * dt;
    if (State.wokBurn >= 100) {
      State.wokState = "BURNING";
      SoundFX.burn();
    }
  } else if (State.wokState === "BURNING") {
    State.satisfaction = Math.max(0, State.satisfaction - 7.5 * dt);
  }

  // 5. 竹蒸籠高速炊熟與烤焦倒數
  const steamerUpgMult = 1 + (PlayerData.upgrades.steamer - 1) * 0.2;
  if (State.steamState === "STEAMING") {
    State.steamCook = Math.min(
      100,
      State.steamCook + 9.2 * heatFactor * steamerUpgMult * dt
    );
    if (State.steamCook >= 100) {
      State.steamState = "READY";
      SoundFX.serve();
      addCanvasFloatText("🍱 竹蒸籠菜頭粿熟透啦！快端去右邊[④切塊出貨]！", 510, 250, "#55efc4");
    }
  } else if (State.steamState === "READY") {
    State.steamOvercook += 9.5 * dt;
    if (State.steamOvercook >= 100) {
      State.steamState = "EMPTY";
      State.steamCook = 0;
      State.steamOvercook = 0;
      State.mistakes += 1;
      State.combo = 1;
      State.satisfaction = Math.max(0, State.satisfaction - 28);
      SoundFX.burn();
      addCanvasFloatText("💥 糟糕！蒸太久沒拿出來烤焦了 (-28%滿意度)！", 510, 250, "#ff7675");
    }
  }

  // 6. 蒸氣粒子更新
  for (const sp of State.steamPuffs) {
    sp.y -= sp.vy * dt;
    sp.alpha -= dt * 0.25;
    if (sp.alpha <= 0 || sp.y < 150) {
      sp.x = 485 + (Math.random() - 0.5) * 50;
      sp.y = 310 + Math.random() * 20;
      sp.alpha = State.steamState !== "EMPTY" ? 0.48 : 0.15;
    }
  }

  // 7. 貪吃鼠高頻率突襲
  State.ratSpawnTimer -= dt;
  if (State.ratSpawnTimer <= 0 && State.rats.length < 2) {
    State.ratSpawnTimer = lv.ratInterval;
    State.rats.push({
      x: 780,
      y: 510,
      targetX: 300,
      targetY: 365,
      speed: 85 + State.levelId * 16
    });
    SoundFX.alarm();
    addCanvasFloatText("🐭 貪吃鼠衝過來了！快按空白鍵一鍋鏟打飛牠！", 560, 440, "#ff7675");
  }

  for (let i = State.rats.length - 1; i >= 0; i--) {
    const rat = State.rats[i];
    const dx = rat.targetX - rat.x;
    const dy = rat.targetY - rat.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 12) {
      rat.x += (dx / dist) * rat.speed * dt;
      rat.y += (dy / dist) * rat.speed * dt;
    } else {
      State.rats.splice(i, 1);
      State.prepProgress = Math.max(0, (State.prepProgress || 0) - 50);
      State.satisfaction = Math.max(0, State.satisfaction - 14);
      SoundFX.burn();
      addCanvasFloatText("🐭 慘！貪吃鼠偷吃蘿蔔絲 (-14%滿意度)！", rat.x, rat.y, "#ff7675");
    }
  }

  // 8. 浮動文字更新
  for (let i = State.floatingTexts.length - 1; i >= 0; i--) {
    const ft = State.floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.alpha -= dt * 0.85;
    if (ft.alpha <= 0) State.floatingTexts.splice(i, 1);
  }

  // 9. 顧客滿意度歸零檢查
  if (State.satisfaction <= 0) {
    stopGame();
    SoundFX.fail();
    finishGameAndRecordLeaderboard(false, "顧客滿意度歸零！菜頭粿烤焦失控啦！");
    return;
  }

  updateTopAndSidebarHUD();
}

function updateTopAndSidebarHUD() {
  const nameInput = document.getElementById("player-name-input");
  if (nameInput && nameInput.value.trim()) {
    PlayerData.name = nameInput.value.trim();
  }

  document.getElementById("top-coins").textContent = PlayerData.coins;
  document.getElementById("hud-timer").textContent = `${State.timeLeft.toFixed(1)}s`;
  document.getElementById("time-bar-fill").style.width = `${
    (State.timeLeft / State.maxDuration) * 100
  }%`;

  document.getElementById("hud-satisfaction").textContent = `${Math.round(State.satisfaction)}%`;
  document.getElementById("sat-bar-fill").style.width = `${State.satisfaction}%`;

  document.getElementById("hud-score").textContent = State.score;
  document.getElementById("hud-target").textContent = `/ ${State.targetScore}`;

  const itemInfo = ITEM_TYPES[State.player.holding] || ITEM_TYPES.NONE;
  document.getElementById("hud-holding").textContent = `${itemInfo.icon} ${itemInfo.name}`;
  document.getElementById("hud-combo").textContent = `x${State.combo}`;

  // 更新右側即時排行榜追擊欄
  const liveList = Leaderboard.getLiveListWithCurrentRun(
    PlayerData.name,
    State.score,
    State.ordersCompleted,
    State.maxCombo
  );
  const myRankIdx = liveList.findIndex((e) => e.isCurrentLive);
  const myRank = myRankIdx + 1;
  const rankBanner = document.getElementById("live-rank-banner");
  if (myRank === 1) {
    rankBanner.textContent = `👑 目前暫居全服第 1 名！（${State.score} 分）`;
  } else {
    const prev = liveList[myRankIdx - 1];
    const diff = prev.score - State.score;
    rankBanner.textContent = `🔥 目前第 ${myRank} 名｜再拿 ${diff} 分超越「${prev.name}」！`;
  }
  const liveLbEl = document.getElementById("live-leaderboard-list");
  if (liveLbEl) {
    liveLbEl.innerHTML = Leaderboard.renderHTML(liveList, 6);
  }

  // 包老闆頭像與提示
  const bossBox = document.getElementById("boss-live-box");
  const bossImg = document.getElementById("boss-live-img");
  const bossTag = document.getElementById("boss-state-tag");
  const bossText = document.getElementById("boss-dialogue");

  const isEmergency =
    State.wokState === "BURNING" ||
    State.wokBurn > 65 ||
    (State.steamState === "READY" && State.steamOvercook > 50) ||
    State.fireTemp < 42 ||
    State.rats.length > 0;

  if (isEmergency) {
    bossBox.classList.add("panic-mode");
    if (!bossImg.src.includes("boss_panic.jpg")) bossImg.src = "assets/boss_panic.jpg";
    bossTag.textContent = "🚨 緊急搶救！";
    if (State.wokState === "BURNING") {
      bossText.textContent = "「大鐵鑊起火啦！快去[②大鐵鑊]按空白鍵拍滅火勢！」";
    } else if (State.rats.length > 0) {
      bossText.textContent = "「有貪吃鼠！快跑過去按[空白鍵]一鍋鏟打飛牠！」";
    } else if (State.wokBurn > 65) {
      bossText.textContent = "「大鐵鑊快燒焦了！快去中上方[②大鐵鑊]翻炒！」";
    } else if (State.steamState === "READY" && State.steamOvercook > 50) {
      bossText.textContent = "「蒸籠菜頭粿快蒸焦了！快去[③竹蒸籠]端出來！」";
    } else {
      bossText.textContent = "「紅磚大灶火太小了！快去左下[🔥紅磚大灶]添柴！」";
    }
  } else {
    bossBox.classList.remove("panic-mode");
    if (!bossImg.src.includes("%E8%83%8C%E9%9D%A2.jfif") && !bossImg.src.includes("背面.jfif")) {
      bossImg.src = "背面.jfif";
    }
    bossTag.textContent = "⚡ 極速炊粿導引";
    if (State.player.holding === "STEAMED_GUA") {
      bossText.textContent = "「快把剛出爐的菜頭粿端去右邊『④切塊淋醬出貨』！」";
    } else if (State.steamState === "READY") {
      bossText.textContent = "「竹蒸籠熟透了！快去『③竹蒸籠』端出菜頭粿！」";
    } else if (State.player.holding === "PASTE" || State.wokState === "READY") {
      bossText.textContent = "「米糰好了！快端進中央『③竹蒸籠』蒸熟！」";
    } else if (State.player.holding === "RAW_BATTER") {
      bossText.textContent = "「端好米漿了！快倒進中上『②大鐵鑊』翻炒！」";
    } else {
      bossText.textContent = "「①刨絲調漿 ➔ ②鐵鑊翻炒 ➔ ③蒸籠炊熟 ➔ ④切塊出貨！」";
    }
  }
}

/* =========================================================
   繪製單一整合式 2.5D 等距斜角廚房房間場景 (1120 x 630)
========================================================= */
function renderIsoKitchenScene(t) {
  const canvas = document.getElementById("action-canvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // 1. 繪製完整無縫的 2.5D 等距斜角廚房全景背景圖 (iso_kitchen_room.jpg)
  if (Images.isoRoom.complete) {
    ctx.drawImage(Images.isoRoom, 0, 0, W, H);
  } else {
    ctx.fillStyle = "#e8d5b7";
    ctx.fillRect(0, 0, W, H);
  }

  // 2. 繪製紅磚大灶的動態火光與竹蒸籠上升白煙特效
  drawDynamicRoomEffects(ctx, t);

  // 3. 繪製地板上的 2.5D 等距操作圓圈（讓玩家清楚看到每個家具的站位點）
  const nearestSt = getNearestIsoStation(96);
  for (const st of ISO_STATIONS) {
    const isNear = nearestSt && nearestSt.id === st.id;
    drawFloorTargetRing(ctx, st, isNear, t);
  }

  // 4. 繪製貪吃鼠與 2.5D 全身包老闆角色（依 Y 軸深度排序）
  const entities = [
    ...State.rats.map((r) => ({ type: "RAT", y: r.y, data: r })),
    { type: "PLAYER", y: State.player.y }
  ];
  entities.sort((a, b) => a.y - b.y);

  for (const ent of entities) {
    if (ent.type === "RAT") drawIsoRat(ctx, ent.data, t);
    else drawIsoFullBodyPlayer(ctx, t);
  }

  // 5. 繪製懸浮於各 2.5D 家具上方的小巧狀態牌與進度條（不遮擋家具本體！）
  for (const st of ISO_STATIONS) {
    const isNear = nearestSt && nearestSt.id === st.id;
    drawFloatingStationBadge(ctx, st, isNear, t);
  }

  // 6. 繪製浮動得分/提示文字 (加大字體與描邊，手機直立也能一眼看清！)
  for (const ft of State.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = "900 26px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = "center";
    ctx.strokeStyle = "#1e120d";
    ctx.lineWidth = 7;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function drawDynamicRoomEffects(ctx, t) {
  // 紅磚大灶灶門動態火光 (座標約 415, 495)
  const fireRatio = Math.max(0.15, State.fireTemp / 100);
  const fireGrad = ctx.createRadialGradient(418, 492, 4, 418, 492, 68 * fireRatio);
  fireGrad.addColorStop(0, `rgba(255, 140, 0, ${0.45 * fireRatio + Math.sin(t * 8) * 0.08})`);
  fireGrad.addColorStop(1, "rgba(255, 80, 0, 0)");
  ctx.fillStyle = fireGrad;
  ctx.beginPath();
  ctx.arc(418, 492, 70, 0, Math.PI * 2);
  ctx.fill();

  // 竹蒸籠動態白煙粒子
  for (const sp of State.steamPuffs) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${sp.alpha})`;
    ctx.beginPath();
    ctx.arc(sp.x + Math.sin(t * 3 + sp.y * 0.05) * 6, sp.y, sp.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 若大鐵鑊起火或快燒焦，在鐵鑊位置 (545, 195) 繪製火焰與黑煙特效
  if (State.wokState === "BURNING" || State.wokBurn > 60) {
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle =
        State.wokState === "BURNING"
          ? "rgba(231, 76, 60, 0.75)"
          : "rgba(45, 52, 54, 0.55)";
      ctx.beginPath();
      ctx.arc(
        525 + i * 18 + Math.sin(t * 6 + i) * 6,
        175 - ((t * 22 + i * 14) % 45),
        12 + i * 3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
}

function drawFloorTargetRing(ctx, st, isNear, t) {
  ctx.save();
  ctx.translate(st.standX, st.standY);
  const pulse = isNear ? 1 + Math.sin(t * 8) * 0.1 : 1;
  ctx.scale(pulse, pulse * 0.52); // 2.5D 等距橢圓透視

  ctx.strokeStyle = isNear ? "#f1c40f" : "rgba(255, 255, 255, 0.65)";
  ctx.fillStyle = isNear ? "rgba(241, 196, 15, 0.28)" : "rgba(35, 23, 16, 0.18)";
  ctx.lineWidth = isNear ? 4 : 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// 繪製 2.5D 等距全身小人角色（像參考圖 Habbo / Tuber Simulator 的立體卡通人物！）
function drawIsoFullBodyPlayer(ctx, t) {
  const p = State.player;

  // 衝刺殘影
  for (const tr of p.trail) {
    ctx.save();
    ctx.globalAlpha = tr.alpha * 0.35;
    ctx.fillStyle = "#ff7675";
    ctx.beginPath();
    ctx.ellipse(tr.x, tr.y - 28, 18, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  const isWalking =
    State.keys.up || State.keys.down || State.keys.left || State.keys.right || p.targetX !== null;
  const bounce = isWalking ? Math.abs(Math.sin(p.walkCycle)) * -5 : 0;
  const legSwing = isWalking ? Math.sin(p.walkCycle) * 7 : 0;

  ctx.translate(p.x, p.y);

  // 1. 地面等距橢圓陰影
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 24, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, bounce);

  // 2. 雙腿與鞋子（深藍牛仔褲＋白邊布鞋）
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#1e120d";
  // 左腿
  ctx.fillStyle = "#2c3e50";
  ctx.beginPath();
  ctx.roundRect(-11, -18 + legSwing * 0.5, 9, 18, 4);
  ctx.fill();
  ctx.stroke();
  // 右腿
  ctx.beginPath();
  ctx.roundRect(2, -18 - legSwing * 0.5, 9, 18, 4);
  ctx.fill();
  ctx.stroke();

  // 3. 身體軀幹（包記紅背心＋藍白條紋袖＋胸前「包」字）
  ctx.fillStyle = "#c82829";
  ctx.beginPath();
  ctx.roundRect(-16, -46, 32, 30, 8);
  ctx.fill();
  ctx.stroke();

  // 藍白條紋袖子與雙手
  const armAngle = p.swingTimer > 0 ? Math.sin(t * 25) * 0.8 : legSwing * 0.04;
  ctx.save();
  ctx.translate(-17, -40);
  ctx.rotate(armAngle);
  ctx.fillStyle = "#74b9ff";
  ctx.beginPath();
  ctx.roundRect(-6, 0, 8, 18, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(17, -40);
  ctx.rotate(-armAngle);
  ctx.fillStyle = "#74b9ff";
  ctx.beginPath();
  ctx.roundRect(-2, 0, 8, 18, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 背心上的白色「包」字
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("包", 5 * p.facing, -26);

  // 4. 揮鏟金色弧光特效
  if (p.swingTimer > 0) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 215, 0, 0.9)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, -32, 42, -0.7, 1.1);
    ctx.stroke();
    ctx.restore();
  }

  // 5. 頭部（使用背面.jfif 的包老闆臉部特寫或卡通五官，帶粗黑外框）
  ctx.fillStyle = "#f5cba7";
  ctx.beginPath();
  ctx.arc(0, -62, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (Images.back.complete) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, -62, 17, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      Images.back,
      Images.back.width * 0.34,
      Images.back.height * 0.21,
      Images.back.width * 0.32,
      Images.back.height * 0.3,
      -18,
      -80,
      36,
      36
    );
    ctx.restore();
  }

  // 6. 頭頂顯示玩家暱稱與目前手持的料理物品！(加大高對比字體，手機直立清晰可見)
  if (p.holding !== "NONE") {
    const item = ITEM_TYPES[p.holding];
    ctx.fillStyle = "rgba(25, 14, 8, 0.96)";
    ctx.strokeStyle = item.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(-96, -124, 192, 38, 999);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 19px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${item.icon} ${item.name}`, 0, -99);
  } else {
    ctx.fillStyle = "rgba(25, 14, 8, 0.9)";
    ctx.strokeStyle = "#ffdf6b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-64, -118, 128, 30, 999);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffdf6b";
    ctx.font = "900 16px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(PlayerData.name, 0, -98);
  }

  ctx.restore();
}

function drawIsoRat(ctx, rat, t) {
  ctx.save();
  ctx.translate(rat.x, rat.y);
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 24, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = "40px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🐭", 0, -4 + Math.sin(t * 15) * 4);

  ctx.fillStyle = "#c0392b";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(-84, -52, 168, 30, 999);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "900 16px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
  ctx.fillText("🐭 偷吃鼠 (點牠打飛!)", 0, -32);
  ctx.restore();
}

// 繪製懸浮在 2.5D 家具上方的大字清晰狀態牌與進度條
function drawFloatingStationBadge(ctx, st, isNear, t) {
  const x = st.labelX;
  const y = st.labelY + (isNear ? Math.sin(t * 7) * 4 : 0);
  const w = 238;
  const h = 72;

  const isDanger =
    (st.id === "WOK_STATION" && (State.wokState === "BURNING" || State.wokBurn > 60)) ||
    (st.id === "STEAMER_STATION" && State.steamState === "READY" && State.steamOvercook > 45) ||
    (st.id === "FIRE_STOVE" && State.fireTemp < 42);

  ctx.save();
  ctx.translate(x, y);

  // 高對比深色膠囊底板，字體超清晰
  ctx.fillStyle = isDanger
    ? "rgba(192, 57, 43, 0.96)"
    : isNear
    ? "rgba(28, 16, 10, 0.98)"
    : "rgba(28, 16, 10, 0.92)";
  ctx.strokeStyle = isDanger ? "#ff7675" : isNear ? "#f1c40f" : st.color;
  ctx.lineWidth = isNear || isDanger ? 4.5 : 3.5;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 16);
  ctx.fill();
  ctx.stroke();

  // 大字標題
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 18.5px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(st.title, 0, -10);

  // 依站點繪製超清楚進度條或狀態字
  const barX = -w / 2 + 12;
  const barY = 3;
  const barW = w - 24;
  const barH = 26;

  if (st.id === "PREP_STATION") {
    const prog = State.prepProgress || 0;
    drawCompactBar(
      ctx,
      barX,
      barY,
      barW,
      barH,
      prog / 100,
      "#1abc9c",
      prog > 0 ? `刨絲調漿 ${Math.round(prog)}% (再按!)` : "點此刨絲調 3:1 米漿"
    );
  } else if (st.id === "WOK_STATION") {
    if (State.wokState === "BURNING") {
      drawCompactBar(ctx, barX, barY, barW, barH, 1, "#e74c3c", "🔥起火！點此拍滅火勢");
    } else if (State.wokState === "COOKING") {
      drawCompactBar(
        ctx,
        barX,
        barY,
        barW,
        barH,
        State.wokCook / 100,
        State.wokBurn > 55 ? "#e74c3c" : "#8e44ad",
        `糊化${Math.round(State.wokCook)}%｜焦度${Math.round(State.wokBurn)}%`
      );
    } else if (State.wokState === "READY") {
      drawCompactBar(ctx, barX, barY, barW, barH, 1, "#27ae60", "✅米糰好了！點此端起");
    } else {
      drawCompactBar(ctx, barX, barY, barW, barH, 0, "#8e44ad", "等待倒入 🥣3:1米漿");
    }
  } else if (st.id === "FIRE_STOVE") {
    drawCompactBar(
      ctx,
      barX,
      barY,
      barW,
      barH,
      State.fireTemp / 100,
      State.fireTemp >= 48 ? "#e67e22" : "#e74c3c",
      `🔥灶火 ${Math.round(State.fireTemp)}°C (點此添柴)`
    );
  } else if (st.id === "STEAMER_STATION") {
    if (State.steamState === "READY") {
      drawCompactBar(
        ctx,
        barX,
        barY,
        barW,
        barH,
        1,
        State.steamOvercook > 50 ? "#e74c3c" : "#27ae60",
        `🍱熟透！快端出(防焦${Math.round(100 - State.steamOvercook)}%)`
      );
    } else if (State.steamState === "STEAMING") {
      drawCompactBar(
        ctx,
        barX,
        barY,
        barW,
        barH,
        State.steamCook / 100,
        "#f39c12",
        `♨️大火蒸熟中 ${Math.round(State.steamCook)}%`
      );
    } else {
      drawCompactBar(ctx, barX, barY, barW, barH, 0, "#e67e22", "等待放入 🥟半熟米糰");
    }
  } else if (st.id === "CUT_DELIVER_STATION") {
    drawCompactBar(
      ctx,
      barX,
      barY,
      barW,
      barH,
      State.cutProgress / 100,
      "#e74c3c",
      State.cutState === "CUTTING" ? "🔪再點一次淋醬送上車！" : "放🍱熟粿切塊直送發財車"
    );
  }

  ctx.restore();
}

function drawCompactBar(ctx, x, y, w, h, ratio, color, text) {
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 7);
  ctx.fill();

  const fw = Math.max(0, Math.min(w, w * ratio));
  if (fw > 0) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, fw, h, 7);
    ctx.fill();
  }

  ctx.font = "900 15.5px 'Noto Sans TC', 'Microsoft JhengHei', sans-serif";
  ctx.textAlign = "center";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.9)";
  ctx.lineWidth = 3.5;
  ctx.strokeText(text, x + w / 2, y + h - 6);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + w / 2, y + h - 6);
}

/* =========================================================
   結算與登錄排行榜
========================================================= */
function finishGameAndRecordLeaderboard(isWin, reasonText) {
  // 無論通關或失敗，只要有得分就登錄進風雲排行榜！
  if (State.score > 0) {
    Leaderboard.addRecord(
      PlayerData.name,
      State.score,
      State.ordersCompleted,
      State.maxCombo
    );
  } else {
    Leaderboard.renderAll();
  }

  showScreen("result");
  const posterImg = document.getElementById("result-main-img");
  const rankBadge = document.getElementById("result-rank-badge");
  const titleEl = document.getElementById("result-title");
  const commentEl = document.getElementById("result-comment");
  const breakdownEl = document.getElementById("score-breakdown");
  const btnAction = document.getElementById("btn-next-or-retry");

  if (isWin) {
    posterImg.src = "assets/ui_win.jpg";
    let stars = 1;
    if (State.score >= State.targetScore * 1.4 && State.mistakes === 0) stars = 3;
    else if (State.score >= State.targetScore * 1.15) stars = 2;

    PlayerData.stars[State.levelId] = Math.max(PlayerData.stars[State.levelId] || 0, stars);
    const clearBonusCoins = stars * 120;
    PlayerData.coins += clearBonusCoins;

    rankBadge.textContent = `${"⭐".repeat(stars)} 通關成功・大豐收！`;
    rankBadge.style.background = "#27ae60";
    titleEl.textContent = `通關成功！大豐收！（得分：${State.score}）`;
    commentEl.textContent = `${reasonText} 成績已登錄至右側「🏆 風雲排行榜」，並獲得獎勵 🪙 +${clearBonusCoins} 金幣！`;

    if (State.levelId < 3) {
      btnAction.textContent = `🔥 下一關（挑戰關卡 ${State.levelId + 1}）`;
      btnAction.onclick = () => {
        PlayerData.selectedLevel = State.levelId + 1;
        startIsoActionGame();
      };
    } else {
      btnAction.textContent = "🔥 再次挑戰刷更高排行榜分數";
      btnAction.onclick = () => startIsoActionGame();
    }
  } else {
    posterImg.src = "assets/ui_lose.jpg";
    rankBadge.textContent = "💥 挑戰失敗・糟糕！烤焦了！";
    rankBadge.style.background = "#c82829";
    titleEl.textContent = `糟糕！烤焦了！（得分：${State.score} / 目標 ${State.targetScore}）`;
    commentEl.textContent = `${reasonText} 回主畫面用金幣升級「蒸籠 ⚡」、「火力 🔥」與「跑鞋 👟」，再挑戰一次衝上排行榜！`;

    btnAction.textContent = "🔄 重新挑戰本關";
    btnAction.onclick = () => startIsoActionGame();
  }

  breakdownEl.innerHTML = `
    <div class="score-item">
      <span>👤 職人暱稱</span>
      <strong>${PlayerData.name}</strong>
    </div>
    <div class="score-item">
      <span>🎯 本局得分 / 目標</span>
      <strong>${State.score} / ${State.targetScore}</strong>
    </div>
    <div class="score-item">
      <span>🍱 出爐籠數 / 最高連擊</span>
      <strong>${State.ordersCompleted} 籠 (x${State.maxCombo})</strong>
    </div>
    <div class="score-item">
      <span>🪙 目前持有總金幣</span>
      <strong>${PlayerData.coins}</strong>
    </div>
  `;
}

/* =========================================================
   事件綁定
========================================================= */
window.addEventListener("DOMContentLoaded", () => {
  Leaderboard.load();
  Leaderboard.renderAll();
  refreshHubUI();

  // 玩家名稱輸入同步
  const nameInput = document.getElementById("player-name-input");
  nameInput.addEventListener("input", () => {
    PlayerData.name = nameInput.value.trim() || "炊粿快手";
  });

  // 關卡地圖節點
  document.querySelectorAll(".map-node-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      PlayerData.selectedLevel = Number(btn.dataset.level);
      SoundFX.pick();
      refreshHubUI();
    });
  });

  // 升級商店按鈕
  document.getElementById("btn-upg-steamer").addEventListener("click", () => buyUpgrade("steamer"));
  document.getElementById("btn-upg-fire").addEventListener("click", () => buyUpgrade("fire"));
  document.getElementById("btn-upg-truck").addEventListener("click", () => buyUpgrade("truck"));

  // 開始與返回
  document.getElementById("btn-start-game").addEventListener("click", startIsoActionGame);
  document.getElementById("btn-quick-start-preview").addEventListener("click", startIsoActionGame);
  document.getElementById("btn-back-map").addEventListener("click", () => {
    stopGame();
    showScreen("title");
  });
  document.getElementById("btn-home").addEventListener("click", () => {
    stopGame();
    showScreen("title");
  });

  // 重置排行榜
  document.getElementById("btn-reset-lb").addEventListener("click", () => {
    Leaderboard.reset();
    showFloatingPop("🏆 排行榜已重置為預設職人紀錄！");
  });

  // 音效開關
  const btnSound = document.getElementById("btn-sound");
  btnSound.addEventListener("click", () => {
    SoundFX.enabled = !SoundFX.enabled;
    btnSound.textContent = SoundFX.enabled ? "🔊 音效：開" : "🔇 音效：關";
  });

  // 鍵盤控制（若焦點在名稱輸入框則不攔截）
  window.addEventListener("keydown", (e) => {
    if (document.activeElement === nameInput) return;
    if (!State.running) return;

    if (State.inRush) {
      if (e.code === "Space" || e.key === "j" || e.key === "J" || e.key === "Enter") {
        e.preventDefault();
        handleRushTap();
      }
      return;
    }

    const k = e.key.toLowerCase();
    if (k === "w" || e.key === "ArrowUp") State.keys.up = true;
    if (k === "s" || e.key === "ArrowDown") State.keys.down = true;
    if (k === "a" || e.key === "ArrowLeft") State.keys.left = true;
    if (k === "d" || e.key === "ArrowRight") State.keys.right = true;

    if (e.code === "Space" || k === "j" || e.key === "Enter") {
      e.preventDefault();
      triggerInteract();
    } else if (e.key === "Shift" || k === "k") {
      e.preventDefault();
      triggerDash();
    }
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || e.key === "ArrowUp") State.keys.up = false;
    if (k === "s" || e.key === "ArrowDown") State.keys.down = false;
    if (k === "a" || e.key === "ArrowLeft") State.keys.left = false;
    if (k === "d" || e.key === "ArrowRight") State.keys.right = false;
  });

  // 點擊 2.5D 房間畫布：點家具或地板圓圈自動走過去並操作！
  const actionCanvas = document.getElementById("action-canvas");
  actionCanvas.addEventListener("pointerdown", (e) => {
    if (!State.running || State.inRush) return;
    const rect = actionCanvas.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * actionCanvas.width;
    const cy = ((e.clientY - rect.top) / rect.height) * actionCanvas.height;

    // 1. 是否點在貪吃鼠身上
    for (const rat of State.rats) {
      if (Math.hypot(cx - rat.x, cy - rat.y) < 52) {
        State.player.targetX = rat.x;
        State.player.targetY = rat.y;
        if (Math.hypot(State.player.x - rat.x, State.player.y - rat.y) < 92) {
          triggerInteract();
        }
        return;
      }
    }

    // 2. 是否點在某個 2.5D 家具標籤或地板圓圈附近 (加大手機直立觸控判定範圍！)
    let clickedStation = null;
    for (const st of ISO_STATIONS) {
      const distLabel = Math.hypot(cx - st.labelX, cy - st.labelY);
      const distStand = Math.hypot(cx - st.standX, cy - st.standY);
      if (distLabel < 115 || distStand < 85) {
        clickedStation = st;
        break;
      }
    }

    if (clickedStation) {
      goToAndInteractStation(clickedStation);
    } else {
      State.player.targetX = Math.max(150, Math.min(840, cx));
      State.player.targetY = Math.max(275, Math.min(545, cy));
      State.player.autoInteractStation = null;
    }
  });

  // 電腦與手機直立皆適用的「5大工作站一鍵直達按鈕列」
  function goToAndInteractStation(st) {
    if (!State.running || State.inRush || !st) return;
    const d = Math.hypot(State.player.x - st.standX, State.player.y - st.standY);
    if (d < 96) {
      interactWithIsoStation(st);
      updateTopAndSidebarHUD();
    } else {
      State.player.targetX = st.standX;
      State.player.targetY = st.standY;
      State.player.autoInteractStation = st;
      SoundFX.pick();
    }
  }

  document.querySelectorAll(".quick-st-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const stId = btn.dataset.st;
      const st = ISO_STATIONS.find((s) => s.id === stId);
      goToAndInteractStation(st);
    });
  });

  // 畫面下方虛擬搖桿與動作按鈕
  document.querySelectorAll(".dpad-btn").forEach((btn) => {
    const dir = btn.dataset.dir;
    const startDir = (e) => {
      e.preventDefault();
      State.keys[dir] = true;
    };
    const endDir = (e) => {
      e.preventDefault();
      State.keys[dir] = false;
    };
    btn.addEventListener("pointerdown", startDir);
    btn.addEventListener("pointerup", endDir);
    btn.addEventListener("pointerleave", endDir);
  });

  document.getElementById("btn-act-main").addEventListener("click", triggerInteract);
  document.getElementById("btn-act-dash").addEventListener("click", triggerDash);

  // 瘋狂點擊出貨視窗
  document.getElementById("rush-click-zone").addEventListener("pointerdown", handleRushTap);
  document.getElementById("btn-rush-tap").addEventListener("click", handleRushTap);

  // 排行榜 Modal 與食譜 Modal
  const lbModal = document.getElementById("lb-modal");
  document.getElementById("btn-leaderboard").addEventListener("click", () => {
    Leaderboard.renderAll();
    lbModal.classList.remove("hidden");
  });
  document.getElementById("btn-close-lb-modal").addEventListener("click", () => {
    lbModal.classList.add("hidden");
  });
  lbModal.addEventListener("click", (e) => {
    if (e.target === lbModal) lbModal.classList.add("hidden");
  });

  const recipeModal = document.getElementById("recipe-modal");
  document.getElementById("btn-recipe").addEventListener("click", () => {
    recipeModal.classList.remove("hidden");
  });
  document.getElementById("btn-close-modal").addEventListener("click", () => {
    recipeModal.classList.add("hidden");
  });
  recipeModal.addEventListener("click", (e) => {
    if (e.target === recipeModal) recipeModal.classList.add("hidden");
  });
});
