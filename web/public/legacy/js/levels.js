// --- Campaign Level Layouts ---
const difficultyMeta = {
    basic: {
        label: 'Basic',
        badgeClass: 'bg-emerald-950 text-emerald-400',
        buttonId: 'basicSectionBtn'
    },
    intermediate: {
        label: 'Intermediate',
        badgeClass: 'bg-sky-950 text-sky-400',
        buttonId: 'intermediateSectionBtn'
    },
    expert: {
        label: 'Expert',
        badgeClass: 'bg-rose-950 text-rose-400',
        buttonId: 'expertSectionBtn'
    }
};

function mulberry32(seed) {
    let t = seed >>> 0;
    return function() {
        t += 0x6D2B79F5;
        let next = Math.imul(t ^ (t >>> 15), 1 | t);
        next ^= next + Math.imul(next ^ (next >>> 7), 61 | next);
        return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
    };
}

function hashString(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function pickOne(rng, items) {
    return items[Math.floor(rng() * items.length)];
}

function randomInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}

function addReachRoute(baseX, topY, rng, count = 3) {
    const startX = baseX + randomInt(rng, -20, 20);
    for (let i = 0; i < count; i++) {
        spawnPlatform(startX + i * 110, topY - i * 42, 95, 16);
    }
}

function createBossLevel(tierKey, stageNumber, rng, ramp) {
    const phase = Math.floor((stageNumber - 1) / 10);

    if (tierKey === 'basic') {
        const a = randomInt(rng, 6 + phase, 11 + phase * 2);
        const b = randomInt(rng, 4 + phase, 9 + phase * 2);
        const c = randomInt(rng, 3 + phase, 8 + phase * 2);
        const decoy = randomInt(rng, 2 + phase, 6 + phase);
        const target = a + b + c;
        const expression = `${a} + ${b} + ${c}`;

        return {
            id: stageNumber,
            tierKey,
            isBoss: true,
            title: `Theorem Colossus ${stageNumber}`,
            desc: 'Boss milestone: execute a multi-merge chain and route the final value through the pressure lane.',
            target,
            expression,
            init: () => {
                spawnPlatform(120, 430, 280, 20);
                spawnPlatform(420, 350, 220, 20);
                spawnPlatform(680, 280, 170, 20);
                spawnPlatform(520, 230, 120, 18);
                spawnBlock(180, 240, a);
                spawnBlock(320, 220, b);
                spawnBlock(520, 170, c);
                spawnBlock(750, 140, decoy);
                spawnWeapon(300, 450, 'FACTOR');
                spawnOriginPortal(560, 250);
                spawnGate(860, 260, target);
            }
        };
    }

    if (tierKey === 'intermediate') {
        const core = randomInt(rng, 7 + phase, 12 + phase * 2);
        const bonus = randomInt(rng, 3 + phase, 7 + phase);
        const delta = randomInt(rng, 3 + phase, 8 + phase);
        const sign = rng() > 0.45 ? -1 : 1;
        const target = core + bonus + sign * delta;
        const expression = `abs(-${core}) + ${bonus} + (${sign < 0 ? '-' : ''}${delta})`;

        return {
            id: stageNumber,
            tierKey,
            isBoss: true,
            title: `Theorem Colossus ${stageNumber}`,
            desc: 'Boss milestone: convert signs under pressure and finish with a controlled signed collision.',
            target,
            expression,
            init: () => {
                spawnPlatform(130, 430, 280, 20);
                spawnPlatform(410, 350, 210, 20);
                spawnPlatform(650, 290, 170, 20);
                spawnPlatform(500, 230, 120, 18);
                if (target < 0) addReachRoute(250, 390, rng, 4);
                spawnBlock(190, 240, -core);
                spawnBlock(430, 210, bonus);
                spawnBlock(700, 160, delta);
                spawnBlock(560, 140, randomInt(rng, 2, 7 + phase));
                spawnWeapon(240, 450, 'ABS');
                spawnWeapon(500, 450, 'MINUS');
                spawnWeapon(700, 450, 'FACTOR');
                spawnOriginPortal(560, 255);
                spawnGate(860, target < 0 ? 145 : 275, target);
            }
        };
    }

    const root = randomInt(rng, 6 + Math.floor(phase / 2), 10 + phase);
    const square = root * root;
    const shield = randomInt(rng, 4 + phase, 9 + phase * 2);
    const bonus = randomInt(rng, 3 + phase, 8 + phase * 2);
    const swing = randomInt(rng, 4 + phase, 10 + phase * 2);
    const sign = rng() > 0.4 ? -1 : 1;
    const target = root + shield + bonus + sign * swing;
    const expression = `sqrt(${square}) + abs(-${shield}) + ${bonus} + (${sign < 0 ? '-' : ''}${swing})`;

    return {
        id: stageNumber,
        tierKey,
        isBoss: true,
        title: `Theorem Colossus ${stageNumber}`,
        desc: 'Boss milestone: chain radical extraction, sign recovery, and a final swing operation under pressure.',
        target,
        expression,
        init: () => {
            spawnPlatform(120, 430, 280, 20);
            spawnPlatform(390, 360, 220, 20);
            spawnPlatform(650, 300, 190, 20);
            spawnPlatform(500, 240, 140, 18);
            spawnPlatform(740, 200, 110, 16);
            if (target < 0) addReachRoute(260, 390, rng, 5);
            spawnBlock(170, 250, square);
            spawnBlock(360, 220, -shield);
            spawnBlock(570, 170, bonus);
            spawnBlock(760, 150, swing);
            spawnBlock(620, 120, randomInt(rng, 5, 11 + phase));
            spawnWeapon(220, 450, 'SQRT');
            spawnWeapon(360, 450, 'ABS');
            spawnWeapon(540, 450, 'MINUS');
            spawnWeapon(720, 450, 'FACTOR');
            spawnOriginPortal(560, 250);
            spawnGate(860, target < 0 ? 130 : 250, target);
        }
    };
}

function createLevelDescriptor(tierKey, stageIndex) {
    const stageNumber = stageIndex + 1;
    const rng = mulberry32(hashString(`${tierKey}-${stageNumber}`));
    const phase = Math.floor((stageNumber - 1) / 10);
    const tierBias = tierKey === 'basic' ? 0 : tierKey === 'intermediate' ? 2 : 4;
    const ramp = Math.min(stageNumber, 20) + phase * 2 + tierBias;
    const extraPlatform = phase >= 2;

    if (stageNumber % 10 === 0) {
        return createBossLevel(tierKey, stageNumber, rng, ramp);
    }

    if (tierKey === 'basic') {
        if (phase >= 1) {
            const advancedVariant = stageIndex % 5;

            if (advancedVariant === 0) {
                const terms = [
                    randomInt(rng, 2 + phase, 5 + phase * 2),
                    randomInt(rng, 2 + phase, 6 + phase * 2),
                    randomInt(rng, 2 + phase, 6 + phase * 2),
                    randomInt(rng, 1 + phase, 4 + phase * 2)
                ];
                const target = terms.reduce((sum, value) => sum + value, 0);
                const expression = terms.join(' + ');
                return {
                    id: stageNumber,
                    tierKey,
                    title: 'Momentum Sum Chain',
                    desc: 'Build a four-block combo in order. Control rebounds so each merge lands cleanly.',
                    target,
                    expression,
                    init: () => {
                        spawnPlatform(180, 430, 280, 20);
                        spawnPlatform(460, 360, 200, 20);
                        spawnPlatform(660, 290, 130, 20);
                        spawnBlock(220, 250, terms[0]);
                        spawnBlock(320, 220, terms[1]);
                        spawnBlock(500, 180, terms[2]);
                        spawnBlock(690, 140, terms[3]);
                        spawnGate(840, 390, target);
                    }
                };
            }

            if (advancedVariant === 1) {
                const base = randomInt(rng, 4 + phase, 8 + phase * 2);
                const portalBonus = 2 + Math.floor(phase / 2);
                const target = base + portalBonus;
                const expression = `${base} + ${portalBonus}`;
                return {
                    id: stageNumber,
                    tierKey,
                    title: 'Portal Relay Expansion',
                    desc: 'Use the origin portal repeatedly and convert the small units into a stable finishing value.',
                    target,
                    expression,
                    init: () => {
                        spawnPlatform(170, 420, 260, 20);
                        spawnPlatform(430, 340, 180, 20);
                        spawnPlatform(630, 280, 120, 20);
                        spawnBlock(230, 230, base);
                        spawnOriginPortal(470, 285);
                        spawnGate(840, 390, target);
                    }
                };
            }

            if (advancedVariant === 2) {
                const a = randomInt(rng, 3 + phase, 7 + phase * 2);
                const b = randomInt(rng, 3 + phase, 7 + phase * 2);
                const c = randomInt(rng, 2 + phase, 6 + phase * 2);
                const target = a + b + c;
                const expression = `${a} + ${b} + ${c}`;
                return {
                    id: stageNumber,
                    tierKey,
                    title: 'Tier Ladder Merge',
                    desc: 'Merge across different platform heights and carry the final total to the upper gate lane.',
                    target,
                    expression,
                    init: () => {
                        spawnPlatform(180, 430, 240, 20);
                        spawnPlatform(430, 350, 180, 20);
                        spawnPlatform(640, 270, 130, 20);
                        spawnBlock(220, 250, a);
                        spawnBlock(460, 210, b);
                        spawnBlock(680, 160, c);
                        spawnGate(840, 290, target);
                    }
                };
            }

            if (advancedVariant === 3) {
                const a = randomInt(rng, 7 + phase, 12 + phase * 2);
                const b = randomInt(rng, 3 + phase, 7 + phase);
                const bonus = randomInt(rng, 1, 2 + Math.floor(phase / 2));
                const target = a - b + bonus;
                const expression = `${a} - ${b} + ${bonus}`;
                return {
                    id: stageNumber,
                    tierKey,
                    title: 'Subtraction Combo Route',
                    desc: 'Subtract with the minus blade, then add a small bonus block to finish exactly.',
                    target,
                    expression,
                    init: () => {
                        spawnPlatform(170, 430, 250, 20);
                        spawnPlatform(420, 350, 170, 20);
                        spawnPlatform(610, 300, 120, 20);
                        spawnBlock(210, 250, a);
                        spawnBlock(460, 200, b);
                        spawnBlock(640, 180, bonus);
                        spawnWeapon(540, 450, 'MINUS');
                        spawnGate(840, 330, target);
                    }
                };
            }

            const base = randomInt(rng, 5 + phase, 9 + phase * 2);
            const extra = randomInt(rng, 2 + phase, 5 + phase);
            const bonus = 1;
            const target = base + extra + bonus;
            const expression = `${base} + ${extra} + ${bonus}`;
            return {
                id: stageNumber,
                tierKey,
                title: 'Gate Pressure Sprint',
                desc: 'Assemble the sum under pressure with staggered spawn heights and a narrow finish lane.',
                target,
                expression,
                init: () => {
                    spawnPlatform(170, 430, 250, 20);
                    spawnPlatform(420, 350, 170, 20);
                    spawnPlatform(610, 300, 120, 20);
                    spawnBlock(210, 250, base);
                    spawnBlock(460, 200, extra);
                    spawnOriginPortal(630, 250);
                    spawnGate(840, 330, target);
                }
            };
        }

        const variant = stageIndex % 4;

        if (variant === 0) {
            const a = randomInt(rng, 1, 3 + Math.floor(ramp / 3));
            const b = randomInt(rng, 1, 4 + Math.floor(ramp / 3));
            const expression = `${a} + ${b}`;
            return {
                id: stageNumber,
                tierKey,
                title: 'Addition Relay',
                desc: 'Fuse the two positive blocks into one stable result and drop it into the gate.',
                target: a + b,
                expression,
                init: () => {
                    spawnPlatform(220, 420, 220, 20);
                    spawnPlatform(520, 360, 180, 20);
                    if (extraPlatform) spawnPlatform(360, 300, 120, 20);
                    spawnBlock(250, 240, a);
                    spawnBlock(380, 220, b);
                    spawnGate(800, 410, a + b);
                }
            };
        }

        if (variant === 1) {
            const base = randomInt(rng, 1, 5 + Math.floor(ramp / 4));
            const expression = `${base} + 1`;
            return {
                id: stageNumber,
                tierKey,
                title: 'Origin Portal Starter',
                desc: 'Use the origin portal to mint a fresh 1 block, then combine it with the existing value.',
                target: base + 1,
                expression,
                init: () => {
                    spawnPlatform(180, 410, 240, 20);
                    if (extraPlatform) spawnPlatform(470, 340, 140, 20);
                    spawnBlock(260, 220, base);
                    spawnOriginPortal(470, 290);
                    spawnGate(800, 410, base + 1);
                }
            };
        }

        if (variant === 2) {
            const a = randomInt(rng, 3, 7 + Math.floor(ramp / 4));
            const b = randomInt(rng, 1, Math.max(2, a - 1));
            const expression = `${a} - ${b}`;
            return {
                id: stageNumber,
                tierKey,
                title: 'Subtraction Starter',
                desc: 'Use the minus blade on one block, then fuse to match the subtraction target.',
                target: a - b,
                expression,
                init: () => {
                    spawnPlatform(200, 420, 240, 20);
                    spawnPlatform(500, 350, 160, 20);
                    if (extraPlatform) spawnPlatform(360, 290, 120, 20);
                    spawnBlock(250, 240, a);
                    spawnBlock(420, 210, b);
                    spawnWeapon(520, 450, 'MINUS');
                    spawnGate(800, 410, a - b);
                }
            };
        }

        const values = [
            randomInt(rng, 1, 3 + Math.floor(ramp / 5)),
            randomInt(rng, 1, 3 + Math.floor(ramp / 5)),
            randomInt(rng, 1, 3 + Math.floor(ramp / 5))
        ];
        const expression = values.join(' + ');
        return {
            id: stageNumber,
            tierKey,
            title: 'Stacked Sum Builder',
            desc: 'Cascade a three-block sum. Control the collisions instead of forcing all three together at once.',
            target: values[0] + values[1] + values[2],
            expression,
            init: () => {
                spawnPlatform(180, 430, 260, 20);
                spawnPlatform(440, 350, 170, 20);
                if (extraPlatform) spawnPlatform(620, 280, 120, 20);
                spawnBlock(210, 250, values[0]);
                spawnBlock(320, 220, values[1]);
                spawnBlock(510, 170, values[2]);
                spawnGate(800, 410, values[0] + values[1] + values[2]);
            }
        };
    }

    if (tierKey === 'intermediate') {
        const variant = stageIndex % 3;

        if (variant === 0) {
            const value = randomInt(rng, 2, 6 + Math.floor(ramp / 4));
            const expression = `-${value}`;
            return {
                id: stageNumber,
                tierKey,
                title: 'Sign Inversion Flight',
                desc: 'Flip the sign of the block and route the negative result into the elevated gate.',
                target: -value,
                expression,
                init: () => {
                    spawnPlatform(200, 400, 220, 20);
                    if (extraPlatform) spawnPlatform(520, 300, 130, 20);
                    addReachRoute(230, 380, rng, 3);
                    spawnBlock(260, 220, value);
                    spawnWeapon(450, 450, 'MINUS');
                    spawnGate(800, 150, -value);
                }
            };
        }

        if (variant === 1) {
            const magnitude = randomInt(rng, 3, 7 + Math.floor(ramp / 4));
            const expression = `abs(${-magnitude})`;
            return {
                id: stageNumber,
                tierKey,
                title: 'Absolute Recovery',
                desc: 'Ground the floating negative value with the absolute shield before delivering it to the floor gate.',
                target: magnitude,
                expression,
                init: () => {
                    spawnPlatform(220, 410, 240, 20);
                    if (extraPlatform) spawnPlatform(520, 320, 130, 20);
                    addReachRoute(240, 390, rng, 3);
                    spawnBlock(290, 160, -magnitude);
                    spawnWeapon(220, 450, 'ABS');
                    spawnGate(800, 410, magnitude);
                }
            };
        }

        const a = randomInt(rng, 4, 8 + Math.floor(ramp / 5));
        const b = randomInt(rng, 1, Math.max(2, a - 1));
        const expression = `${a} + (-${b})`;
        return {
            id: stageNumber,
            tierKey,
            title: 'Signed Collision Mix',
            desc: 'Turn one block negative, then fuse the pair to land on the exact signed target.',
            target: a - b,
            expression,
            init: () => {
                spawnPlatform(190, 420, 260, 20);
                spawnPlatform(470, 330, 140, 20);
                if (extraPlatform) spawnPlatform(330, 270, 120, 20);
                    if (a - b < 0) addReachRoute(280, 390, rng, 3);
                spawnBlock(230, 240, a);
                spawnBlock(420, 180, b);
                spawnWeapon(520, 450, 'MINUS');
                spawnGate(800, (a - b) < 0 ? 150 : 410, a - b);
            }
        };
    }

    const variant = stageIndex % 4;

    if (variant === 0) {
        const root = randomInt(rng, 4, 8 + Math.floor(ramp / 6));
        const square = root * root;
        const expression = `sqrt(${square})`;
        return {
            id: stageNumber,
            tierKey,
            title: 'Radical Extraction',
            desc: 'Use the scythe to collapse a perfect square into its root before scoring the theorem.',
            target: root,
            expression,
            init: () => {
                spawnPlatform(220, 410, 250, 20);
                if (extraPlatform) spawnPlatform(520, 300, 130, 20);
                spawnBlock(320, 220, square);
                spawnWeapon(520, 450, 'SQRT');
                spawnGate(800, 410, root);
            }
        };
    }

    if (variant === 1) {
        const factorPairs = [[2, 3], [2, 5], [3, 5], [3, 7]];
        const pair = pickOne(rng, factorPairs);
        const composite = pair[0] * pair[1];
        const expression = `${pair[0]} + ${pair[1]}`;
        return {
            id: stageNumber,
            tierKey,
            title: 'Factor Then Fuse',
            desc: 'Split the composite block into primes, then collide the useful factors into the gate result.',
            target: pair[0] + pair[1],
            expression,
            init: () => {
                spawnPlatform(200, 420, 280, 20);
                if (extraPlatform) spawnPlatform(530, 300, 140, 20);
                if (stageNumber % 2 === 0) addReachRoute(250, 390, rng, 3);
                spawnBlock(320, 210, composite);
                spawnWeapon(210, 450, 'FACTOR');
                spawnGate(800, 410, pair[0] + pair[1]);
            }
        };
    }

    if (variant === 2) {
        const root = randomInt(rng, 3, 7 + Math.floor(ramp / 7));
        const square = root * root;
        const expression = `-sqrt(${square})`;
        return {
            id: stageNumber,
            tierKey,
            title: 'Negative Radical Chain',
            desc: 'Extract the root, negate it, then float the result up into the airborne gate.',
            target: -root,
            expression,
            init: () => {
                spawnPlatform(210, 420, 260, 20);
                if (extraPlatform) spawnPlatform(520, 300, 140, 20);
                addReachRoute(250, 390, rng, 3);
                spawnBlock(260, 220, square);
                spawnWeapon(400, 450, 'SQRT');
                spawnWeapon(520, 450, 'MINUS');
                spawnGate(800, 150, -root);
            }
        };
    }

    const value = randomInt(rng, 3, 6 + Math.floor(ramp / 5));
    const expression = `abs(-${value}) + 1`;
    return {
        id: stageNumber,
        tierKey,
        title: 'Expert Recovery Loop',
        desc: 'Recover a floating negative value with the shield, then add a portal unit to finish the proof.',
        target: value + 1,
        expression,
        init: () => {
            spawnPlatform(170, 420, 260, 20);
            spawnPlatform(470, 330, 150, 20);
            if (extraPlatform) spawnPlatform(320, 270, 120, 20);
            addReachRoute(250, 390, rng, 4);
            spawnBlock(240, 160, -value);
            spawnWeapon(180, 450, 'ABS');
            spawnOriginPortal(520, 280);
            spawnGate(800, 410, value + 1);
        }
    };
}

function formatExpression(expression) {
    return expression
        .replace(/\*/g, 'x')
        .replace(/sqrt\(/g, 'sqrt(');
}

function renderExpressionPreview(level) {
    const formatted = formatExpression(level.expression);

    if (window.math) {
        try {
            const result = math.evaluate(level.expression);
            return `${formatted} = ${result}`;
        } catch (error) {
            return `${formatted} = ${level.target}`;
        }
    }

    return `${formatted} = ${level.target}`;
}

