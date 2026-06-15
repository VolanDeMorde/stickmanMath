// --- Save / Restore State (Undo System) ---
function saveBoardState() {
    const state = {
        blocks: activeBlocks.map(b => ({
            x: b.body.position.x,
            y: b.body.position.y,
            vx: b.body.velocity.x,
            vy: b.body.velocity.y,
            angle: b.body.angle,
            value: b.value,
            width: b.width,
            height: b.height,
            isHeld: b.isHeld
        })),
        weapons: activeWeapons.map(w => ({
            x: w.body.position.x,
            y: w.body.position.y,
            vx: w.body.velocity.x,
            vy: w.body.velocity.y,
            angle: w.body.angle,
            type: w.type,
            isHeld: w.isHeld
        })),
        player: {
            x: playerBody.position.x,
            y: playerBody.position.y,
            vx: playerBody.velocity.x,
            vy: playerBody.velocity.y,
            facingRight: playerFacingRight,
            heldBlockIndex: activeBlocks.indexOf(playerHeldBlock),
            heldWeaponIndex: activeWeapons.indexOf(playerHeldWeapon)
        }
    };
    undoStack.push(JSON.stringify(state));
    // Keep stack length reasonable
    if (undoStack.length > 50) undoStack.shift();
}

function triggerUndo() {
    if (undoStack.length === 0) return;
    levelActionStats.undos += 1;
    triggerCameraShake(90, 2.2);
    playSound('undo');
    const stateData = JSON.parse(undoStack.pop());

    // 1. Clear old physical entities from world
    activeBlocks.forEach(b => Composite.remove(world, b.body));
    activeWeapons.forEach(w => Composite.remove(world, w.body));

    activeBlocks = [];
    activeWeapons = [];

    // 2. Restore blocks
    stateData.blocks.forEach(bState => {
        const b = Bodies.rectangle(bState.x, bState.y, bState.width, bState.height, {
            restitution: 0.4,
            friction: 0.2,
            label: 'block'
        });
        Body.setVelocity(b, { x: bState.vx, y: bState.vy });
        Body.setAngle(b, bState.angle);
        
        const blockData = {
            body: b,
            value: bState.value,
            width: bState.width,
            height: bState.height,
            isHeld: bState.isHeld,
            fuseCooldown: 0
        };
        b.customData = blockData;
        World.add(world, b);
        activeBlocks.push(blockData);

        if (bState.isHeld) {
            b.collisionFilter.mask = 0;
            Body.setStatic(b, true);
        }
    });

    // 3. Restore weapons
    stateData.weapons.forEach(wState => {
        const w = Bodies.rectangle(wState.x, wState.y, 35, 35, {
            restitution: 0.2,
            friction: 0.2,
            label: 'weapon'
        });
        Body.setVelocity(w, { x: wState.vx, y: wState.vy });
        Body.setAngle(w, wState.angle);

        const toolData = {
            body: w,
            type: wState.type,
            isHeld: wState.isHeld
        };
        w.customData = toolData;
        World.add(world, w);
        activeWeapons.push(toolData);

        if (wState.isHeld) {
            w.collisionFilter.mask = 0;
            Body.setStatic(w, true);
        }
    });

    // 4. Restore player state
    Body.setPosition(playerBody, { x: stateData.player.x, y: stateData.player.y });
    Body.setVelocity(playerBody, { x: stateData.player.vx, y: stateData.player.vy });
    playerFacingRight = stateData.player.facingRight;

    playerHeldBlock = stateData.player.heldBlockIndex !== -1 ? activeBlocks[stateData.player.heldBlockIndex] : null;
    playerHeldWeapon = stateData.player.heldWeaponIndex !== -1 ? activeWeapons[stateData.player.heldWeaponIndex] : null;

    spawnParticle(playerBody.position.x, playerBody.position.y, 'R', '#f59e0b');
}

function loadLevelIndex(idx) {
    initAudio();
    currentLevel = idx;
    tierProgress[currentTier] = idx;
    isCleared = false;
    levelElapsedMs = 0;
    levelActionStats = { fusions: 0, strikes: 0, portalUses: 0, undos: 0 };
    motionFx.cinematicMs = 0;
    motionFx.targetZoom = 1;
    undoStack.length = 0; // Clear undo history for new level

    currentLevelData = createLevelDescriptor(currentTier, idx);
    applyLevelMeta(currentLevelData);

    buildLevelSelector();

    if (engine) {
        engine.gravity.y = 1.0;
    }

    // Clear physical worlds
    if (world) {
        World.clear(world, false);
    }
    activeBlocks = [];
    activeWeapons = [];
    activePlatforms = [];
    activeGates = [];
    visualParticles = [];
    originPortals = [];

    // Spawn standard boundaries
    spawnRigidBoundary(-20, 0, 20, V_HEIGHT); // Left wall
    spawnRigidBoundary(V_WIDTH, 0, 20, V_HEIGHT); // Right wall
    spawnRigidBoundary(0, V_HEIGHT - 70, V_WIDTH, 70); // Ground Floor
    spawnRigidBoundary(0, -20, V_WIDTH, 20); // Ceiling

    // Spawn Stickman physics capsule body
    playerBody = Bodies.rectangle(150, 400, 30, 58, {
        inertia: Infinity, // Prevent falling/rolling over
        friction: 0.1,
        label: 'player'
    });
    World.add(world, playerBody);

    playerHeldBlock = null;
    playerHeldWeapon = null;
    isFlying = false;

    // Run specific level init layout
    currentLevelData.init();
    saveProfile();
    updateRunHud();
}

function setDifficulty(tierKey) {
    currentTier = tierKey;
    currentStreak = 0;
    lastReward = 0;
    loadLevelIndex(tierProgress[tierKey] || 0);
    saveProfile();
}

function setMode(mode) {
    initAudio();
    gameMode = mode;
    document.getElementById('campaignBtn').className = `px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'campaign' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`;
    document.getElementById('sandboxBtn').className = `px-4 py-1.5 rounded-md text-xs font-bold transition-all ${mode === 'sandbox' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`;
    
    document.getElementById('campaignPanel').classList.toggle('hidden', mode !== 'campaign');
    document.getElementById('sandboxPanel').classList.toggle('hidden', mode !== 'sandbox');
    const equationBackdrop = document.getElementById('equationBackdropDisplay');
    if (equationBackdrop) {
        equationBackdrop.style.display = mode === 'campaign' ? 'block' : 'none';
    }

    if (mode === 'sandbox') {
        clearSandbox();
    } else {
        loadLevelIndex(currentLevel);
    }
}

function clearSandbox() {
    if (world) World.clear(world, false);
    activeBlocks = [];
    activeWeapons = [];
    activePlatforms = [];
    activeGates = [];
    visualParticles = [];
    originPortals = [];
    undoStack.length = 0;

    // Boundaries
    spawnRigidBoundary(-20, 0, 20, V_HEIGHT);
    spawnRigidBoundary(V_WIDTH, 0, 20, V_HEIGHT);
    spawnRigidBoundary(0, V_HEIGHT - 70, V_WIDTH, 70);
    spawnRigidBoundary(0, -20, V_WIDTH, 20);

    playerBody = Bodies.rectangle(150, 400, 30, 58, { inertia: Infinity, friction: 0.1, label: 'player' });
    World.add(world, playerBody);
    playerHeldBlock = null;
    playerHeldWeapon = null;
    isFlying = false;

    if (engine) {
        engine.gravity.y = 1.0;
    }
    document.getElementById('gravDisplay').innerText = 'Normal';

    spawnGate(800, 410, 42);
    spawnOriginPortal(500, 280);
    populateSandboxBoard('full');
    updateSandboxAutoUi();
}

function updateSandboxAutoUi() {
    const stateEl = document.getElementById('sandboxAutoState');
    if (!stateEl) return;
    stateEl.innerText = sandboxAutoPopulate ? 'ON' : 'OFF';
    stateEl.className = sandboxAutoPopulate ? 'text-emerald-400' : 'text-rose-400';
}

function toggleSandboxAutoPopulate() {
    sandboxAutoPopulate = !sandboxAutoPopulate;
    updateSandboxAutoUi();
    setStoryBeat(sandboxAutoPopulate ? 'SANDBOX AUTO POPULATE ENABLED' : 'SANDBOX AUTO POPULATE DISABLED', 1800);
}

function randomSandboxValue() {
    const picks = [-9, -6, -3, -1, 1, 2, 3, 4, 6, 8, 12, 16, 20, 24];
    return picks[Math.floor(Math.random() * picks.length)];
}

function populateSandboxBoard(mode = 'refill') {
    if (!world || gameMode !== 'sandbox') return;

    const blockTarget = mode === 'full' ? 12 : 7;
    const weaponTarget = mode === 'full' ? 6 : 4;
    const existingWeapons = activeWeapons.length;
    const existingBlocks = activeBlocks.length;

    for (let i = existingBlocks; i < blockTarget; i++) {
        spawnBlock(170 + Math.random() * 620, 130 + Math.random() * 260, randomSandboxValue());
    }

    const weaponCycle = ['MINUS', 'ABS', 'FACTOR', 'SQRT'];
    for (let i = existingWeapons; i < weaponTarget; i++) {
        spawnWeapon(180 + Math.random() * 600, 120 + Math.random() * 220, weaponCycle[i % weaponCycle.length]);
    }

    if (originPortals.length < 2) {
        spawnOriginPortal(320, 260);
        spawnOriginPortal(680, 230);
    }

    sandboxRefillTimerMs = 2200;
}

function setSandboxGravity(dir) {
    if (dir === 1) {
        engine.gravity.y = 1.0;
        document.getElementById('gravDisplay').innerText = "Normal";
    } else if (dir === -1) {
        engine.gravity.y = -1.0;
        document.getElementById('gravDisplay').innerText = "Inverted";
    } else {
        engine.gravity.y = 0.0;
        document.getElementById('gravDisplay').innerText = "Zero-G";
    }
}

function resetCurrentLevel() {
    if (gameMode === 'campaign') {
        loadLevelIndex(currentLevel);
    } else {
        clearSandbox();
    }
}

// --- Physics Spawners ---

function spawnRigidBoundary(x, y, w, h) {
    const b = Bodies.rectangle(x + w/2, y + h/2, w, h, { isStatic: true, label: 'ground' });
    World.add(world, b);
    activePlatforms.push({ body: b, width: w, height: h });
}

function spawnPlatform(x, y, w, h) {
    const b = Bodies.rectangle(x + w/2, y + h/2, w, h, { isStatic: true, label: 'ground' });
    World.add(world, b);
    activePlatforms.push({ body: b, width: w, height: h });
}

function spawnBlock(x, y, val) {
    const absVal = Math.abs(val);
    const size = Math.min(Math.max(40 + absVal * 1.5, 42), 85);
    const densityMultiplier = 0.001 * (1 + absVal * 0.05);

    const b = Bodies.rectangle(x + size/2, y + size/2, size, size, {
        restitution: 0.4,
        friction: 0.2,
        density: densityMultiplier,
        label: 'block'
    });

    const blockData = {
        body: b,
        value: val,
        width: size,
        height: size,
        isHeld: false,
        fuseCooldown: 0
    };
    
    b.customData = blockData;
    World.add(world, b);
    activeBlocks.push(blockData);
    return blockData;
}

function spawnWeapon(x, y, type) {
    const b = Bodies.rectangle(x, y, 35, 35, {
        restitution: 0.2,
        friction: 0.2,
        label: 'weapon'
    });
    const toolData = {
        body: b,
        type: type,
        isHeld: false
    };
    b.customData = toolData;
    World.add(world, b);
    activeWeapons.push(toolData);
    return toolData;
}

function spawnGate(x, y, target) {
    activeGates.push({
        x: x,
        y: y,
        width: 65,
        height: 110,
        target: target,
        isOpen: false
    });
}

function spawnOriginPortal(x, y) {
    originPortals.push({
        x: x,
        y: y,
        radius: 35,
        pulse: 0,
        cooldown: 0
    });
}

// Sandbox triggers
function spawnSandboxBlock(val) {
    saveBoardState();
    spawnBlock(300 + Math.random() * 200, 200, val);
    playSound('factor');
}

function spawnCustomBlock() {
    saveBoardState();
    const val = parseInt(document.getElementById('customInput').value) || 1;
    spawnBlock(300 + Math.random() * 200, 200, val);
    playSound('factor');
}

function spawnSandboxWeapon(type) {
    saveBoardState();
    spawnWeapon(300 + Math.random() * 200, 200, type);
    playSound('factor');
}

function splitBlockValue(value) {
    if (value === 0) return [0, 0];

    const sign = value < 0 ? -1 : 1;
    const magnitude = Math.abs(value);

    if (magnitude === 1) {
        return [0, value];
    }

    const firstMagnitude = Math.floor(magnitude / 2);
    const secondMagnitude = magnitude - firstMagnitude;

    return [firstMagnitude * sign, secondMagnitude * sign];
}

function armBlockColliderLater(blockData, delayMs = 180) {
    blockData.body.collisionFilter.mask = 0;

    setTimeout(() => {
        if (!blockData.body || !world) return;
        blockData.body.collisionFilter.mask = 0xFFFFFFFF;
    }, delayMs);
}

function breakSelectedBlock() {
    initAudio();
    const target = playerHeldBlock;

    if (!target) return;
    if (!target.isHeld) {
        setStoryBeat('HOLD A BLOCK TO BREAK IT', 1400);
        spawnParticle(playerBody.position.x, playerBody.position.y - 20, 'HOLD', '#fb7185');
        return;
    }

    const splitValues = splitBlockValue(target.value);

    if (splitValues[0] === target.value && splitValues[1] === target.value) {
        setStoryBeat('BLOCK TOO SMALL TO SPLIT', 1600);
        spawnParticle(target.body.position.x, target.body.position.y, 'NO', '#fb7185');
        return;
    }

    saveBoardState();
    if (target === playerHeldBlock) {
        playerHeldBlock = null;
    }

    const pos = target.body.position;
    const angle = target.body.angle;
    Composite.remove(world, target.body);
    activeBlocks = activeBlocks.filter(b => b !== target);

    const leftOffset = -target.width * 0.22;
    const rightOffset = target.width * 0.22;
    const childY = pos.y - 8;

    const leftBlock = spawnBlock(pos.x + leftOffset - target.width * 0.12, childY, splitValues[0]);
    const rightBlock = spawnBlock(pos.x + rightOffset + target.width * 0.12, childY, splitValues[1]);

    Body.setAngle(leftBlock.body, angle);
    Body.setAngle(rightBlock.body, angle);
    Body.setVelocity(leftBlock.body, { x: target.body.velocity.x - 1.2, y: target.body.velocity.y - 2 });
    Body.setVelocity(rightBlock.body, { x: target.body.velocity.x + 1.2, y: target.body.velocity.y - 2 });
    leftBlock.fuseCooldown = 45;
    rightBlock.fuseCooldown = 45;
    armBlockColliderLater(leftBlock, 180);
    armBlockColliderLater(rightBlock, 180);

    triggerHitstop(28, 0.28);
    triggerCameraShake(100, 3.4);
    playSound('strike');
    spawnParticle(pos.x, pos.y, `${splitValues[0]}+${splitValues[1]}`, '#fb7185');
    setStoryBeat(`SPLIT ${target.value} -> ${splitValues[0]} + ${splitValues[1]}`, 1800);
}

// --- Mathematics Operations ---

function getPrimeFactors(n) {
    let factors = [];
    let d = 2;
    n = Math.abs(n);
    if (n <= 1) return [n];
    while (n > 1) {
        while (n % d === 0) {
            factors.push(d);
            n /= d;
        }
        d++;
        if (d*d > n) {
            if (n > 1) {
                factors.push(n);
                break;
            }
        }
    }
    return factors;
}

function applyWeaponAttack(block, type) {
    saveBoardState();
    const oldVal = block.value;
    const pos = block.body.position;
    triggerHitstop(36, 0.22);
    triggerCameraShake(110, 3.2);

    if (type === 'MINUS') {
        block.value = -oldVal;
        playSound('strike');
        spawnParticle(pos.x, pos.y, '-', '#a855f7');
    }
    else if (type === 'ABS') {
        block.value = Math.abs(oldVal);
        playSound('fuse');
        spawnParticle(pos.x, pos.y, '||', '#10b981');
        // Return to normal physics immediately
        Body.setStatic(block.body, false);
    }
    else if (type === 'FACTOR') {
        if (Math.abs(oldVal) > 1) {
            const factors = getPrimeFactors(oldVal);
            if (factors.length > 1) {
                // Destroy current block
                Composite.remove(world, block.body);
                activeBlocks = activeBlocks.filter(b => b !== block);

                // Spawn individual prime factor physical blocks
                factors.forEach((f, idx) => {
                    const offset = (idx - (factors.length - 1) / 2) * 35;
                    spawnBlock(pos.x + offset, pos.y - 15, f);
                });
                playSound('factor');
                spawnParticle(pos.x, pos.y, '/', '#f43f5e');
                return; // Done
            }
        }
        Body.applyForce(block.body, pos, { x: (Math.random() - 0.5) * 0.05, y: -0.05 });
    }
    else if (type === 'SQRT') {
        if (oldVal > 0) {
            const root = Math.round(Math.sqrt(oldVal));
            block.value = root;
            playSound('fuse');
            spawnParticle(pos.x, pos.y, 'sqrt', '#14b8a6');
        } else {
            block.value = Math.round(Math.sqrt(Math.abs(oldVal)));
            playSound('strike');
            spawnParticle(pos.x, pos.y, 'i', '#ef4444');
        }

        // Adjust body scale matching new math properties
        const size = Math.min(Math.max(40 + Math.abs(block.value) * 1.5, 42), 85);
        resizeBlockBody(block, size);
    }
}

function resizeBlockBody(block, size) {
    const currentWidth = block.body.bounds.max.x - block.body.bounds.min.x;
    const currentHeight = block.body.bounds.max.y - block.body.bounds.min.y;

    if (currentWidth > 0 && currentHeight > 0) {
        Body.scale(block.body, size / currentWidth, size / currentHeight);
    }

    block.width = size;
    block.height = size;
}

// --- Interaction Event Handlers ---

function toggleGrab() {
    initAudio();
    // 1. Drop/throw if holding anything
    if (playerHeldBlock) {
        saveBoardState();
        const b = playerHeldBlock;
        b.isHeld = false;
        Body.setStatic(b.body, false);
        b.body.collisionFilter.mask = 0xFFFFFFFF;

        // Throw!
        Body.setVelocity(b.body, { 
            x: playerBody.velocity.x + (playerFacingRight ? 5.5 : -5.5), 
            y: playerBody.velocity.y - 4.5
        });
        playerHeldBlock = null;
        playSound('strike');
        return;
    }

    if (playerHeldWeapon) {
        saveBoardState();
        const w = playerHeldWeapon;
        w.isHeld = false;
        Body.setStatic(w.body, false);
        w.body.collisionFilter.mask = 0xFFFFFFFF;

        Body.setVelocity(w.body, { 
            x: playerBody.velocity.x + (playerFacingRight ? 6.5 : -6.5), 
            y: playerBody.velocity.y - 3.5 
        });
        playerHeldWeapon = null;
        playSound('strike');
        return;
    }

    // 2. Scan and grab closest reachable item
    const pickupRange = 85;
    const pPos = playerBody.position;

    let closestWeapon = null;
    let minWeaponDist = Infinity;
    for (let w of activeWeapons) {
        if (!w.isHeld) {
            const dist = Vector.magnitude(Vector.sub(pPos, w.body.position));
            if (dist < pickupRange && dist < minWeaponDist) {
                minWeaponDist = dist;
                closestWeapon = w;
            }
        }
    }

    if (closestWeapon) {
        saveBoardState();
        playerHeldWeapon = closestWeapon;
        closestWeapon.isHeld = true;
        Body.setStatic(closestWeapon.body, true);
        closestWeapon.body.collisionFilter.mask = 0; // Eliminate pushbacks
        playSound('factor');
        return;
    }

    let closestBlock = null;
    let minBlockDist = Infinity;
    for (let b of activeBlocks) {
        if (!b.isHeld) {
            const dist = Vector.magnitude(Vector.sub(pPos, b.body.position));
            if (dist < pickupRange && dist < minBlockDist) {
                minBlockDist = dist;
                closestBlock = b;
            }
        }
    }

    if (closestBlock) {
        saveBoardState();
        playerHeldBlock = closestBlock;
        closestBlock.isHeld = true;
        Body.setStatic(closestBlock.body, true);
        closestBlock.body.collisionFilter.mask = 0; // Eliminate pushbacks
        playSound('factor');
        return;
    }
}

function triggerStrike() {
    if (!playerHeldWeapon || swingTimer > 0) return;
    levelActionStats.strikes += 1;
    triggerHitstop(20, 0.35);
    triggerCameraShake(80, 2.4);
    swingTimer = 18; // 18 frames of swing action
    playSound('strike');

    // Strike sweep zone around the stickman
    const strikeRange = 100;
    const pPos = playerBody.position;

    // Find closest reachable block to strike
    let targetBlock = null;
    let minTargetDist = Infinity;

    for (let b of activeBlocks) {
        if (b.isHeld) continue;
        const dist = Vector.magnitude(Vector.sub(pPos, b.body.position));
        if (dist < strikeRange && dist < minTargetDist) {
            minTargetDist = dist;
            targetBlock = b;
        }
    }

    if (targetBlock) {
        applyWeaponAttack(targetBlock, playerHeldWeapon.type);
    }
}

// --- Core Engine Loop ---

function updateGame(stepMs = 1000 / 60) {
    if (!playerBody) return;
    if (gameMode === 'campaign' && !isCleared) {
        levelElapsedMs += stepMs;
    }

    if (gameMode === 'sandbox') {
        sandboxRefillTimerMs = Math.max(0, sandboxRefillTimerMs - stepMs);
        if (sandboxAutoPopulate && sandboxRefillTimerMs <= 0 && activeBlocks.length < 6) {
            populateSandboxBoard('refill');
        }
    }

    if (gameMode === 'campaign') {
        const tierIntensity = currentTier === 'basic' ? 0.2 : currentTier === 'intermediate' ? 0.45 : 0.65;
        const streakIntensity = Math.min(0.3, currentStreak * 0.03);
        const solveIntensity = isCleared ? 1 : 0;
        updateMusicIntensity(tierIntensity + streakIntensity + solveIntensity);
    } else {
        updateMusicIntensity(0.15);
    }

    // Grounding check
    const feetSensor = {
        x: playerBody.position.x,
        y: playerBody.position.y + 30
    };
    playerGrounded = false;
    activePlatforms.forEach(plat => {
        if (Matter.Bounds.contains(plat.body.bounds, feetSensor)) {
            playerGrounded = true;
        }
    });

    // Flying Logic (Defy gravity while holding a negative block!)
    isFlying = playerHeldBlock && playerHeldBlock.value < 0;

    if (isFlying) {
        // Fly Controls using A/D (lateral) and W/S (vertical)
        let flyX = 0;
        let flyY = 0;

        if (keys['a'] || keys['arrowleft']) { flyX = -4.5; playerFacingRight = false; }
        if (keys['d'] || keys['arrowright']) { flyX = 4.5; playerFacingRight = true; }
        if (keys['w'] || keys['arrowup']) { flyY = -4.5; }
        if (keys['s'] || keys['arrowdown']) { flyY = 4.5; }

        Body.setVelocity(playerBody, { x: flyX, y: flyY });
        walkFrame++;
    } else {
        // Normal Platformer Physics
        if (keys['a'] || keys['arrowleft']) {
            Body.setVelocity(playerBody, { x: -4.5, y: playerBody.velocity.y });
            playerFacingRight = false;
            walkFrame++;
        } else if (keys['d'] || keys['arrowright']) {
            Body.setVelocity(playerBody, { x: 4.5, y: playerBody.velocity.y });
            playerFacingRight = true;
            walkFrame++;
        } else {
            Body.setVelocity(playerBody, { x: playerBody.velocity.x * 0.75, y: playerBody.velocity.y });
        }

        // Normal Jump
        if ((keys[' '] || keys['w'] || keys['arrowup']) && playerGrounded) {
            Body.setVelocity(playerBody, { x: playerBody.velocity.x, y: -11.5 });
            playSound('jump');
        }
    }

    // Sync held items
    const pPos = playerBody.position;
    if (playerHeldBlock) {
        Body.setPosition(playerHeldBlock.body, {
            x: pPos.x,
            y: pPos.y - playerHeldBlock.height/2 - 28
        });
    }

    if (playerHeldWeapon) {
        Body.setPosition(playerHeldWeapon.body, {
            x: pPos.x + (playerFacingRight ? 24 : -24),
            y: pPos.y + 4
        });
    }

    // Custom buoyant gravity logic for negative blocks (gentler float-up)
    activeBlocks.forEach(b => {
        if (b.isHeld) return;
        
        if (b.value < 0) {
            // Float up gently rather than rocket upwards
            const upForce = -0.0011 * b.body.mass * engine.gravity.y;
            Body.applyForce(b.body, b.body.position, { x: 0, y: upForce });
        }

        if (b.fuseCooldown > 0) b.fuseCooldown--;
    });

    // Origin Portal logic (Spawn fresh units if player enters or triggers it)
    originPortals.forEach(portal => {
        portal.pulse += 0.05;
        if (portal.cooldown > 0) portal.cooldown--;
        const pDist = Vector.magnitude(Vector.sub(playerBody.position, { x: portal.x, y: portal.y }));
        
        // If player touches portal, or throws a block into it:
        if (pDist < portal.radius + 15 && portal.cooldown === 0) {
            // Pull back slightly, trigger sound, spawn a '1'
            Body.setPosition(playerBody, { x: playerBody.position.x - 30, y: playerBody.position.y });
            saveBoardState();
            spawnBlock(portal.x, portal.y + 50, 1);
            playSound('factor');
            spawnParticle(portal.x, portal.y, '0->1', '#f59e0b');
            portal.cooldown = 45;
            levelActionStats.portalUses += 1;
            triggerCameraShake(70, 1.6);
        }
    });

    // Combinations / Synthesizing (Matter.js overlapping body collisions)
    for (let i = 0; i < activeBlocks.length; i++) {
        for (let j = i + 1; j < activeBlocks.length; j++) {
            const b1 = activeBlocks[i];
            const b2 = activeBlocks[j];
            if (b1.isHeld || b2.isHeld) continue;
            if (b1.fuseCooldown > 0 || b2.fuseCooldown > 0) continue;

            const coll = Matter.Collision.collides(b1.body, b2.body);
            if (coll) {
                saveBoardState();
                const sum = b1.value + b2.value;
                const fusePos = b1.body.position;

                Composite.remove(world, b2.body);
                activeBlocks = activeBlocks.filter(b => b !== b2);

                b1.value = sum;
                b1.fuseCooldown = 40; // Guard against infinite repeat loop
                levelActionStats.fusions += 1;
                triggerHitstop(30, 0.25);
                triggerCameraShake(90, 3.8);

                const size = Math.min(Math.max(40 + Math.abs(sum) * 1.5, 42), 85);
                resizeBlockBody(b1, size);

                playSound('fuse');
                spawnParticle(fusePos.x, fusePos.y, '+', '#f59e0b');
                
                j--;
            }
        }
    }

    // Gates goals validations
    activeGates.forEach(gate => {
        gate.isOpen = false;
        activeBlocks.forEach(b => {
            if (b.isHeld) return;

            const pos = b.body.position;
            if (pos.x > gate.x && pos.x < gate.x + gate.width &&
                pos.y > gate.y && pos.y < gate.y + gate.height) {
                
                if (b.value === gate.target) {
                    gate.isOpen = true;
                    
                    if (gameMode === 'campaign' && !isCleared) {
                        isCleared = true;
                        applyClearRewards(gate.target);
                            triggerCinematicSolve();
                            setStoryBeat(currentLevelData.isBoss ? 'BOSS THEOREM COLLAPSED' : 'PROOF STABILIZED');
                        playSound('win');
                            spawnParticle(gate.x + gate.width/2, gate.y + gate.height/2, "SOLVE", "#34d399");

                        setTimeout(() => {
                            showSolverModal(
                                "Theorem Proved!",
                                `Perfect Logic. You aligned ${gate.target}. Reward +${lastReward} | Streak x${currentStreak}`
                            );
                        }, 600);
                    }
                }
            }
        });
    });

    // Particles timelines
    for (let i = visualParticles.length - 1; i >= 0; i--) {
        const p = visualParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.02;
        if (p.alpha <= 0) {
            visualParticles.splice(i, 1);
        }
    }

    if (swingTimer > 0) swingTimer--;

    // Tick Matter.js engine with a fixed simulation step.
    Engine.update(engine, stepMs);
}

