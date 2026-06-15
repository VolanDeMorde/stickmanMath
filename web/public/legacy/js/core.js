// --- Core Physics Configuration ---
const { Engine, World, Bodies, Body, Composite, Vector } = Matter;

let engine, world;
let canvas = document.getElementById('physicsCanvas');
let ctx = canvas.getContext('2d');
let gameMode = 'campaign';
let currentLevel = 0;
let currentTier = 'basic';
let currentLevelData = null;
const STYLE_PILLARS = [
    'SNAP + CLARITY + IMPACT',
    'MATH AS WEAPONRY',
    'CINEMATIC SILHOUETTES',
    'PUZZLE-COMBAT RHYTHM'
];
let tierProgress = {
    basic: 0,
    intermediate: 0,
    expert: 0
};
const STORAGE_KEY = 'stickman-math-profile-v2';
let runScore = 0;
let currentStreak = 0;
let lastReward = 0;
let levelElapsedMs = 0;
let bossClears = 0;
let levelActionStats = {
    fusions: 0,
    strikes: 0,
    portalUses: 0,
    undos: 0
};
let lastClearedInfo = { tier: null, index: -1 };
const profileDefaults = () => ({
    tierProgress: { basic: 0, intermediate: 0, expert: 0 },
    bestScore: { basic: 0, intermediate: 0, expert: 0 },
    bestStage: { basic: 1, intermediate: 1, expert: 1 },
    bestStreak: 0,
    totalSolved: 0,
    bossClears: 0,
    selectedTier: 'basic'
});
let playerProfile = profileDefaults();
let isCleared = false;
let storyBeat = { text: 'CALIBRATING MATH REALM', ttlMs: 2200 };
let sandboxAutoPopulate = true;
let sandboxRefillTimerMs = 0;
let motionFx = {
    timeScale: 1,
    hitstopMs: 0,
    shakeMs: 0,
    shakePower: 0,
    cinematicMs: 0,
    zoom: 1,
    targetZoom: 1
};
let baseCameraZoom = 1;
let cameraRig = {
    x: 500,
    y: 300,
    viewW: 1000,
    viewH: 600,
    isPortrait: false
};

// Entities Arrays
let activeBlocks = [];
let activeWeapons = [];
let activePlatforms = [];
let activeGates = [];
let visualParticles = [];
let originPortals = [];

// History Undo Stack
const undoStack = [];

// Game boundaries
const V_WIDTH = 1000;
const V_HEIGHT = 600;
let scaleX = 1, scaleY = 1;

// Inputs
const keys = {};

// Player custom properties
let playerBody;
let playerFacingRight = true;
let playerGrounded = false;
let playerHeldBlock = null;
let playerHeldWeapon = null;
let walkFrame = 0;
let swingTimer = 0;
let isFlying = false;

// --- Initialization ---
function initMatter() {
    engine = Engine.create({
        gravity: { y: 1.0, scale: 0.001 }
    });
    world = engine.world;
}

function buildLevelSelector() {
    const grid = document.getElementById('levelGrid');
    grid.innerHTML = '';
    const windowStart = Math.floor(currentLevel / 10) * 10;
    document.getElementById('stageRangeLabel').innerText = `Stages ${windowStart + 1}-${windowStart + 10}`;

    for (let i = windowStart; i < windowStart + 10; i++) {
        const lvl = createLevelDescriptor(currentTier, i);
        const btn = document.createElement('button');
        btn.className = `w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all border ${
            i === currentLevel 
            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg' 
            : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
        }`;
        btn.innerText = lvl.id;
        btn.onclick = () => loadLevelIndex(i);
        grid.appendChild(btn);
    }
}

function updateDifficultyButtons() {
    Object.entries(difficultyMeta).forEach(([tierKey, meta]) => {
        const button = document.getElementById(meta.buttonId);
        if (!button) return;

        if (tierKey === currentTier) {
            button.className = 'px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide bg-amber-500 text-slate-950';
        } else {
            button.className = 'px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide bg-slate-950 text-slate-400 border border-slate-800 hover:text-white transition-all';
        }
    });
}

function applyLevelMeta(level) {
    const tier = difficultyMeta[level.tierKey];
    const badge = document.getElementById('tierBadge');
    const expressionPreview = renderExpressionPreview(level);

    document.getElementById('lvlLabel').innerText = `${tier.label} Theorem ${level.id}`;
    document.getElementById('lvlTitle').innerText = level.title;
    document.getElementById('lvlDesc').innerText = level.desc;
    document.getElementById('lvlGoal').innerText = level.target;
    document.getElementById('lvlExpr').innerText = expressionPreview;
    const equationBackdrop = document.getElementById('equationBackdropDisplay');
    if (equationBackdrop) {
        equationBackdrop.innerText = expressionPreview;
    }
    document.getElementById('stylePillarDisplay').innerText = STYLE_PILLARS[level.id % STYLE_PILLARS.length];

    badge.className = `text-[10px] font-bold px-1.5 py-0.5 rounded ${tier.badgeClass}`;
    badge.innerText = `${tier.label.toUpperCase()} ${level.isBoss ? 'BOSS' : 'RUN'}`;

    if (level.isBoss) {
        setStoryBeat(`BOSS THEOREM ${level.id}: ${level.title}`);
    } else {
        const phase = Math.floor((level.id - 1) / 10) + 1;
        setStoryBeat(`${tier.label.toUpperCase()} ARC ${phase}: ${level.title}`);
    }

    updateDifficultyButtons();
    updateRunHud();
}

function loadProfile() {
    const defaults = profileDefaults();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            playerProfile = defaults;
        } else {
            const parsed = JSON.parse(raw);
            playerProfile = {
                ...defaults,
                ...parsed,
                bestScore: { ...defaults.bestScore, ...(parsed.bestScore || {}) },
                bestStage: { ...defaults.bestStage, ...(parsed.bestStage || {}) }
            };
        }
    } catch (error) {
        playerProfile = defaults;
    }

    tierProgress = { ...defaults.tierProgress };
    bossClears = playerProfile.bossClears || 0;
    currentTier = 'basic';
    playerProfile.selectedTier = 'basic';
    playerProfile.tierProgress = { ...defaults.tierProgress };
}

function saveProfile() {
    playerProfile.tierProgress = { basic: 0, intermediate: 0, expert: 0 };
    playerProfile.bossClears = bossClears;
    playerProfile.selectedTier = 'basic';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playerProfile));
}

function setStoryBeat(text, ttlMs = 2400) {
    storyBeat.text = text;
    storyBeat.ttlMs = ttlMs;
    const banner = document.getElementById('storyBeatBanner');
    if (banner) {
        banner.innerText = `STORY BEAT: ${text}`;
    }
}

function triggerHitstop(ms = 45, slowScale = 0.18) {
    motionFx.hitstopMs = Math.max(motionFx.hitstopMs, ms);
    motionFx.timeScale = Math.min(motionFx.timeScale, slowScale);
}

function triggerCameraShake(ms = 130, power = 4) {
    motionFx.shakeMs = Math.max(motionFx.shakeMs, ms);
    motionFx.shakePower = Math.max(motionFx.shakePower, power);
}

function triggerCinematicSolve() {
    motionFx.cinematicMs = 780;
    motionFx.targetZoom = 1.05;
    triggerCameraShake(220, 7);
    triggerHitstop(70, 0.12);
}

function updateMotionFx(stepMs) {
    if (motionFx.hitstopMs > 0) {
        motionFx.hitstopMs = Math.max(0, motionFx.hitstopMs - stepMs);
        motionFx.timeScale = Math.max(0.12, motionFx.timeScale * 0.88);
    } else {
        motionFx.timeScale += (1 - motionFx.timeScale) * 0.22;
    }

    if (motionFx.shakeMs > 0) {
        motionFx.shakeMs = Math.max(0, motionFx.shakeMs - stepMs);
        motionFx.shakePower *= 0.94;
    } else {
        motionFx.shakePower = 0;
    }

    if (motionFx.cinematicMs > 0) {
        motionFx.cinematicMs = Math.max(0, motionFx.cinematicMs - stepMs);
        motionFx.targetZoom = 1.05;
    } else {
        motionFx.targetZoom = baseCameraZoom;
    }

    motionFx.zoom += (motionFx.targetZoom - motionFx.zoom) * 0.14;

    if (storyBeat.ttlMs > 0) {
        storyBeat.ttlMs = Math.max(0, storyBeat.ttlMs - stepMs);
    }
}

function updateViewportMode() {
    const safeWidth = Math.max(1, canvas.width || 1);
    const safeHeight = Math.max(1, canvas.height || 1);
    const aspect = safeWidth / safeHeight;
    cameraRig.isPortrait = aspect < 1;

    if (cameraRig.isPortrait) {
        // Portrait keeps world shapes intact while showing more vertical space.
        cameraRig.viewW = V_WIDTH;
        cameraRig.viewH = cameraRig.viewW / aspect;
        baseCameraZoom = 0.95;
    } else {
        // Landscape uses normal framing and adapts width to the device ratio.
        cameraRig.viewH = V_HEIGHT;
        cameraRig.viewW = cameraRig.viewH * aspect;
        baseCameraZoom = 1;
    }

    motionFx.zoom = baseCameraZoom;
    motionFx.targetZoom = baseCameraZoom;
}

function getRankByScore(score) {
    if (score >= 12000) return { label: 'Master', className: 'bg-rose-950 text-rose-300' };
    if (score >= 7000) return { label: 'Diamond', className: 'bg-sky-950 text-sky-300' };
    if (score >= 3500) return { label: 'Gold', className: 'bg-amber-950 text-amber-300' };
    if (score >= 1400) return { label: 'Silver', className: 'bg-slate-700 text-slate-200' };
    return { label: 'Bronze', className: 'bg-amber-950 text-amber-400' };
}

function updateRunHud() {
    const rank = getRankByScore(runScore);
    const rankBadge = document.getElementById('runRankBadge');
    rankBadge.className = `text-[10px] font-black px-2 py-0.5 rounded ${rank.className}`;
    rankBadge.innerText = rank.label;

    document.getElementById('runScoreDisplay').innerText = runScore.toLocaleString();
    document.getElementById('streakDisplay').innerText = String(currentStreak);
    document.getElementById('bestStreakDisplay').innerText = String(playerProfile.bestStreak || 0);
    document.getElementById('tierBestScoreDisplay').innerText = (playerProfile.bestScore[currentTier] || 0).toLocaleString();
    document.getElementById('bestStageDisplay').innerText = String(playerProfile.bestStage[currentTier] || 1);
    document.getElementById('levelTimerDisplay').innerText = `${(levelElapsedMs / 1000).toFixed(1)}s`;
    document.getElementById('lastRewardDisplay').innerText = `+${lastReward}`;
    document.getElementById('playtestDisplay').innerText = `Solved ${playerProfile.totalSolved || 0} | Boss ${bossClears}`;
}

function getBridgeSnapshot() {
    return {
        mode: gameMode,
        tier: currentTier,
        stage: currentLevel + 1,
        score: runScore,
        streak: currentStreak,
        reward: lastReward,
        bossClears,
        elapsedMs: levelElapsedMs,
        ready: !!playerBody,
        at: Date.now()
    };
}

function applyClearRewards(target) {
    const clearSeconds = levelElapsedMs / 1000;
    const tierBase = currentTier === 'basic' ? 180 : currentTier === 'intermediate' ? 280 : 420;
    const paceBonus = Math.max(0, Math.round(220 - clearSeconds * 22));
    const actionWeight =
        levelActionStats.fusions +
        levelActionStats.strikes +
        levelActionStats.portalUses * 2 +
        levelActionStats.undos * 3;
    const efficiencyBonus = Math.max(0, 120 - actionWeight * 12);

    if (lastClearedInfo.tier === currentTier && lastClearedInfo.index === currentLevel - 1) {
        currentStreak += 1;
    } else {
        currentStreak = 1;
    }

    const streakBonus = (currentStreak - 1) * 35;
    const depthBonus = Math.floor(currentLevel / 5) * 15;
    const precisionBonus = Math.max(0, 35 - Math.abs(target) * 2);
    const reward = Math.max(80, tierBase + paceBonus + efficiencyBonus + streakBonus + depthBonus + precisionBonus);

    lastReward = reward;
    runScore += reward;
    lastClearedInfo = { tier: currentTier, index: currentLevel };

    playerProfile.bestStreak = Math.max(playerProfile.bestStreak || 0, currentStreak);
    playerProfile.bestScore[currentTier] = Math.max(playerProfile.bestScore[currentTier] || 0, runScore);
    playerProfile.bestStage[currentTier] = Math.max(playerProfile.bestStage[currentTier] || 1, currentLevel + 1);
    playerProfile.totalSolved = (playerProfile.totalSolved || 0) + 1;
    if (currentLevelData && currentLevelData.isBoss) {
        bossClears += 1;
    }
    tierProgress[currentTier] = Math.max(tierProgress[currentTier] || 0, currentLevel + 1);

    saveProfile();
    updateRunHud();
}

