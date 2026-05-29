// --- Controls Routing ---

const touchControlsOverlay = document.getElementById('touchControlsOverlay');
if (touchControlsOverlay) {
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    if (hasTouch) {
        touchControlsOverlay.classList.remove('hidden');
    }
}

window.addEventListener('keydown', e => {
    const key = e.key.toLowerCase();
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'e', 'q', 'x', 'z', 'p'].includes(key)) {
        e.preventDefault();
    }
    keys[key] = true;
    if (key === 'e') toggleGrab();
    if (key === 'q') {
        if (playerHeldWeapon) triggerStrike();
    }
    if (key === 'z') {
        triggerUndo();
    }
    if (key === 'x') {
        breakSelectedBlock();
    }
    if (key === 'p') {
        console.log('Playtest Snapshot', {
            tier: currentTier,
            level: currentLevel + 1,
            score: runScore,
            streak: currentStreak,
            solved: playerProfile.totalSolved || 0,
            bossClears
        });
    }
});

window.addEventListener('keyup', e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousedown', e => {
    if (e.button === 0) { // Left-click
        if (playerHeldWeapon) {
            triggerStrike();
        } else {
            toggleGrab();
        }
    } else if (e.button === 2) { // Right-click (strike)
        e.preventDefault();
        if (playerHeldWeapon) triggerStrike();
    }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (playerHeldWeapon) {
        triggerStrike();
    } else {
        toggleGrab();
    }
}, { passive: false });

// Mobile touch buttons
function bindTouchHold(buttonId, key) {
    const el = document.getElementById(buttonId);
    if (!el) return;

    const onStart = e => { e.preventDefault(); keys[key] = true; };
    const onEnd = e => { e.preventDefault(); keys[key] = false; };

    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchend', onEnd, { passive: false });
    el.addEventListener('touchcancel', onEnd, { passive: false });
}

function bindTouchTap(buttonId, callback) {
    const el = document.getElementById(buttonId);
    if (!el) return;
    el.addEventListener('touchstart', e => {
        e.preventDefault();
        callback();
    }, { passive: false });
}

bindTouchHold('leftTouch', 'a');
bindTouchHold('rightTouch', 'd');
bindTouchHold('jumpTouch', ' ');
bindTouchTap('grabTouch', () => toggleGrab());
bindTouchTap('swingTouch', () => {
    if (playerHeldWeapon) triggerStrike();
});
bindTouchTap('breakTouch', () => breakSelectedBlock());

function setSidebarOpen(isOpen) {
    document.body.classList.toggle('sidebar-open', !!isOpen);
}

window.toggleSidePanel = function() {
    setSidebarOpen(!document.body.classList.contains('sidebar-open'));
};

window.closeSidePanel = function() {
    setSidebarOpen(false);
};

const desktopMq = window.matchMedia('(min-width: 1024px)');
if (desktopMq && desktopMq.addEventListener) {
    desktopMq.addEventListener('change', e => {
        if (e.matches) {
            setSidebarOpen(false);
        }
    });
}

function handleResize() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    scaleX = V_WIDTH / canvas.width;
    scaleY = V_HEIGHT / canvas.height;
    updateViewportMode();
}
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
    setTimeout(handleResize, 90);
});
setTimeout(handleResize, 150);

// --- Modals UI ---

function showSolverModal(title, desc) {
    document.getElementById('solverTitle').innerText = title;
    document.getElementById('solverDesc').innerText = desc;

    document.getElementById('nextBtn').innerText = 'Next Proof';
    document.getElementById('solverOverlay').classList.remove('hidden');
}

function closeSolverModal() {
    document.getElementById('solverOverlay').classList.add('hidden');
}

function onNextProof() {
    closeSolverModal();
    loadLevelIndex(currentLevel + 1);
}

// --- Setup Bootstrap ---
window.onload = function() {
    loadProfile();
    initMatter();
    updateDifficultyButtons();
    loadLevelIndex(tierProgress[currentTier] || 0);

    const TARGET_FPS = 60;
    const FIXED_STEP_MS = 1000 / TARGET_FPS;
    const MAX_FRAME_DELTA_MS = 100;
    let lastTimestamp = 0;
    let accumulator = 0;
    
    function runEngine(timestamp) {
        if (!lastTimestamp) {
            lastTimestamp = timestamp;
        }

        let frameDelta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        frameDelta = Math.min(frameDelta, MAX_FRAME_DELTA_MS);
        accumulator += frameDelta;

        const banner = document.getElementById('storyBeatBanner');
        if (banner) {
            banner.style.opacity = storyBeat.ttlMs > 0 ? '1' : '0.55';
        }

        while (accumulator >= FIXED_STEP_MS) {
            updateMotionFx(FIXED_STEP_MS);
            const scaledStep = Math.max(2, FIXED_STEP_MS * motionFx.timeScale);
            updateGame(scaledStep);
            accumulator -= FIXED_STEP_MS;
        }

        drawGame();
        requestAnimationFrame(runEngine);
    }
    requestAnimationFrame(runEngine);
};
