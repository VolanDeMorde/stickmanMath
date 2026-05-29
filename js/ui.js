// --- Controls Routing ---

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

// Mobile touch buttons
document.getElementById('leftTouch').addEventListener('touchstart', e => { e.preventDefault(); keys['a'] = true; });
document.getElementById('leftTouch').addEventListener('touchend', e => { e.preventDefault(); keys['a'] = false; });
document.getElementById('rightTouch').addEventListener('touchstart', e => { e.preventDefault(); keys['d'] = true; });
document.getElementById('rightTouch').addEventListener('touchend', e => { e.preventDefault(); keys['d'] = false; });
document.getElementById('jumpTouch').addEventListener('touchstart', e => { e.preventDefault(); keys[' '] = true; });
document.getElementById('jumpTouch').addEventListener('touchend', e => { e.preventDefault(); keys[' '] = false; });
document.getElementById('grabTouch').addEventListener('touchstart', e => { e.preventDefault(); toggleGrab(); });

function handleResize() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    scaleX = V_WIDTH / canvas.width;
    scaleY = V_HEIGHT / canvas.height;
}
window.addEventListener('resize', handleResize);
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
