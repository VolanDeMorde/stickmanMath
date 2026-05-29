// --- Render System ---

function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const viewAspect = Math.max(0.1, cameraRig.viewW / Math.max(1, cameraRig.viewH));
    const scale = canvas.width / cameraRig.viewW;

    if (playerBody) {
        const lookAhead = cameraRig.isPortrait ? 18 : 58;
        const targetX = playerBody.position.x + (playerFacingRight ? lookAhead : -lookAhead);
        const targetY = playerBody.position.y - (cameraRig.isPortrait ? 70 : 42);
        const followLerp = cameraRig.isPortrait ? 0.14 : 0.1;

        cameraRig.x += (targetX - cameraRig.x) * followLerp;
        cameraRig.y += (targetY - cameraRig.y) * followLerp;
    } else {
        cameraRig.x += (V_WIDTH * 0.5 - cameraRig.x) * 0.08;
        cameraRig.y += (V_HEIGHT * 0.5 - cameraRig.y) * 0.08;
    }

    const halfW = cameraRig.viewW * 0.5;
    const halfH = cameraRig.viewH * 0.5;

    if (cameraRig.viewW >= V_WIDTH) {
        cameraRig.x = V_WIDTH * 0.5;
    } else {
        cameraRig.x = Math.max(halfW, Math.min(V_WIDTH - halfW, cameraRig.x));
    }

    if (cameraRig.viewH >= V_HEIGHT) {
        cameraRig.y = V_HEIGHT * 0.5;
    } else {
        cameraRig.y = Math.max(halfH, Math.min(V_HEIGHT - halfH, cameraRig.y));
    }

    const letterboxHeight = cameraRig.viewW / Math.max(0.1, viewAspect);
    if (Math.abs(letterboxHeight - cameraRig.viewH) > 0.001) {
        cameraRig.viewH = letterboxHeight;
    }
    
    ctx.save();

    const shakeX = motionFx.shakeMs > 0 ? (Math.random() - 0.5) * motionFx.shakePower : 0;
    const shakeY = motionFx.shakeMs > 0 ? (Math.random() - 0.5) * motionFx.shakePower : 0;
    ctx.translate(canvas.width * 0.5 + shakeX, canvas.height * 0.5 + shakeY);
    ctx.scale(scale * motionFx.zoom, scale * motionFx.zoom);
    ctx.translate(-cameraRig.x, -cameraRig.y);

    // Draw Cartesian X / Y Axes Guidelines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    // Horizontal X-Axis
    ctx.beginPath();
    ctx.moveTo(0, V_HEIGHT / 2);
    ctx.lineTo(V_WIDTH, V_HEIGHT / 2);
    ctx.stroke();
    // Vertical Y-Axis
    ctx.beginPath();
    ctx.moveTo(V_WIDTH / 2, 0);
    ctx.lineTo(V_WIDTH / 2, V_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels for X/Y Origin Space
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '10px "Fira Code", monospace';
    ctx.fillText("x-axis (y=0)", 20, V_HEIGHT / 2 - 8);
    ctx.fillText("y-axis", V_WIDTH / 2 + 8, 20);

    // 1. Draw static and dynamic platforms
    activePlatforms.forEach(plat => {
        const pos = plat.body.position;
        if (pos.x < 0 || pos.x > V_WIDTH) return;

        ctx.fillStyle = '#111827';
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 3;
        ctx.fillRect(pos.x - plat.width/2, pos.y - plat.height/2, plat.width, plat.height);
        ctx.strokeRect(pos.x - plat.width/2, pos.y - plat.height/2, plat.width, plat.height);
    });

    // 2. Draw origin portals (0)
    originPortals.forEach(portal => {
        ctx.save();
        ctx.translate(portal.x, portal.y);
        
        // Draw multiple glowing rings
        const sizeMod = Math.sin(portal.pulse) * 4;
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius + sizeMod, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw central '0'
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 24px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('0', 0, 0);
        ctx.restore();
    });

    // 3. Draw Equations Gates
    activeGates.forEach(gate => {
        const open = gate.isOpen;
        ctx.strokeStyle = open ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 4;
        ctx.fillStyle = open ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.03)';
        
        ctx.beginPath();
        // Left Bracket [
        ctx.moveTo(gate.x + 15, gate.y);
        ctx.lineTo(gate.x, gate.y);
        ctx.lineTo(gate.x, gate.y + gate.height);
        ctx.lineTo(gate.x + 15, gate.y + gate.height);
        // Right Bracket ]
        ctx.moveTo(gate.x + gate.width - 15, gate.y);
        ctx.lineTo(gate.x + gate.width, gate.y);
        ctx.lineTo(gate.x + gate.width, gate.y + gate.height);
        ctx.lineTo(gate.x + gate.width - 15, gate.y + gate.height);
        ctx.stroke();
        ctx.fillRect(gate.x, gate.y, gate.width, gate.height);

        ctx.fillStyle = open ? '#10b981' : '#f43f5e';
        ctx.font = 'bold 16px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`[x = ${gate.target}]`, gate.x + gate.width/2, gate.y - 12);
        
        if (open) {
            ctx.save();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.5;
            ctx.translate(gate.x + gate.width/2, gate.y + gate.height/2);
            ctx.rotate(Date.now() * 0.005);
            ctx.beginPath();
            for (let r = 0; r < 24; r += 4) {
                ctx.arc(0, 0, r, 0, Math.PI);
            }
            ctx.stroke();
            ctx.restore();
        } else {
            ctx.font = '11px Arial';
            ctx.fillText("Formula Lock", gate.x + gate.width/2, gate.y + gate.height/2 + 4);
        }
    });

    // 4. Draw Weapons
    activeWeapons.forEach(w => {
        const pos = w.body.position;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(w.body.angle);

        let color = '#a855f7';
        let sym = '-';
        if (w.type === 'MINUS') { color = '#a855f7'; sym = '-'; }
        if (w.type === 'ABS') { color = '#10b981'; sym = '||'; }
        if (w.type === 'FACTOR') { color = '#f43f5e'; sym = '/'; }
        if (w.type === 'SQRT') { color = '#14b8a6'; sym = 'sqrt'; }

        if (!w.isHeld) {
            ctx.translate(0, Math.sin(Date.now() * 0.005) * 2);
        } else if (swingTimer > 0) {
            const swingAngle = (18 - swingTimer) * 0.22 * (playerFacingRight ? 1 : -1);
            ctx.rotate(swingAngle);
        }

        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = w.type === 'SQRT' ? 'bold 9px "Fira Code", monospace' : 'bold 15px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sym, 0, 0);

        ctx.restore();
    });

    // 5. Draw Slash Visual Effects Arc
    if (swingTimer > 0 && playerHeldWeapon) {
        const pos = playerBody.position;
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.globalAlpha = swingTimer / 18;
        
        ctx.beginPath();
        const startAngle = playerFacingRight ? -Math.PI/3 : Math.PI - Math.PI/3;
        const endAngle = playerFacingRight ? Math.PI/3 : Math.PI + Math.PI/3;
        ctx.arc(pos.x + (playerFacingRight ? 35 : -35), pos.y, 50, startAngle, endAngle);
        ctx.stroke();
        ctx.restore();
    }

    // 6. Draw Arithmetic Blocks
    activeBlocks.forEach(b => {
        const pos = b.body.position;
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(b.body.angle);

        const isNeg = b.value < 0;
        const tintColor = isNeg ? '#c084fc' : '#f59e0b';
        const strokeColor = isNeg ? '#a855f7' : '#d97706';

        ctx.fillStyle = '#090d16';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = b.isHeld ? 4 : 2.5;

        ctx.beginPath();
        ctx.roundRect(-b.width/2, -b.height/2, b.width, b.height, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = tintColor;
        ctx.font = `bold ${Math.min(b.width * 0.45, 26)}px "Fira Code", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.value, 0, 0);

        ctx.fillStyle = isNeg ? 'rgba(168, 85, 247, 0.3)' : 'rgba(245, 158, 11, 0.2)';
        ctx.font = '9px Arial';
        ctx.fillText(isNeg ? '^' : 'v', 0, b.height/2 - 7);

        ctx.restore();
    });

    // 7. Draw Stickman Character
    if (playerBody) {
        const pos = playerBody.position;
        ctx.save();
        
        const speed = Math.abs(playerBody.velocity.x);
        const stride = speed > 0.1 ? Math.sin(walkFrame * 0.16) : 0;

        ctx.strokeStyle = isFlying ? '#a855f7' : '#ffffff'; // Neon purple outline if flying!
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const pY = pos.y - 29;

        // Head
        const hY = pY + 11;
        ctx.beginPath();
        ctx.arc(pos.x, hY, 9, 0, Math.PI * 2);
        ctx.stroke();

        // Eyes
        ctx.fillStyle = isFlying ? '#c084fc' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(pos.x - 3, hY - 1, 1.5, 0, Math.PI * 2);
        ctx.arc(pos.x + 3, hY - 1, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Spine
        const spineBottom = pY + 37;
        ctx.beginPath();
        ctx.moveTo(pos.x, hY + 9);
        ctx.lineTo(pos.x, spineBottom);
        ctx.stroke();

        // Arms Animation
        const shoulderY = hY + 14;
        if (playerHeldBlock) {
            ctx.beginPath();
            ctx.moveTo(pos.x, shoulderY);
            ctx.lineTo(pos.x - 12, shoulderY - 8);
            ctx.lineTo(pos.x - 14, pY - 8);
            ctx.moveTo(pos.x, shoulderY);
            ctx.lineTo(pos.x + 12, shoulderY - 8);
            ctx.lineTo(pos.x + 14, pY - 8);
            ctx.stroke();
        } else if (playerHeldWeapon) {
            const isRight = playerFacingRight;
            ctx.beginPath();
            ctx.moveTo(pos.x, shoulderY);
            ctx.lineTo(pos.x + (isRight ? 12 : -12), shoulderY + 4);
            ctx.lineTo(pos.x + (isRight ? 22 : -22), pY + 22);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pos.x, shoulderY);
            ctx.lineTo(pos.x - (isRight ? 12 : -12), shoulderY + 10 + stride * 4);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(pos.x, shoulderY);
            ctx.lineTo(pos.x - 12 - stride * 5, shoulderY + 14 + stride * 3);
            ctx.moveTo(pos.x, shoulderY);
            ctx.lineTo(pos.x + 12 + stride * 5, shoulderY + 14 - stride * 3);
            ctx.stroke();
        }

        // Legs (Smooth floating/trailing leg cycles if flying)
        if (isFlying) {
            const flyCycle = Math.sin(Date.now() * 0.01) * 6;
            ctx.beginPath();
            ctx.moveTo(pos.x, spineBottom);
            ctx.lineTo(pos.x - 6, spineBottom + 12 + flyCycle);
            ctx.lineTo(pos.x - 4, spineBottom + 22 + flyCycle);
            ctx.moveTo(pos.x, spineBottom);
            ctx.lineTo(pos.x + 6, spineBottom + 12 - flyCycle);
            ctx.lineTo(pos.x + 8, spineBottom + 22 - flyCycle);
            ctx.stroke();
        } else if (!playerGrounded) {
            ctx.beginPath();
            ctx.moveTo(pos.x, spineBottom);
            ctx.lineTo(pos.x - 10, spineBottom + 10);
            ctx.lineTo(pos.x - 6, spineBottom + 18);
            ctx.moveTo(pos.x, spineBottom);
            ctx.lineTo(pos.x + 10, spineBottom + 10);
            ctx.lineTo(pos.x + 12, spineBottom + 16);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(pos.x, spineBottom);
            ctx.lineTo(pos.x - (stride * 12), spineBottom + 12);
            ctx.lineTo(pos.x - (stride * 12) - 4, spineBottom + 22);
            ctx.moveTo(pos.x, spineBottom);
            ctx.lineTo(pos.x + (stride * 12), spineBottom + 12);
            ctx.lineTo(pos.x + (stride * 12) + 4, spineBottom + 22);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 8. Draw flying particles
    visualParticles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.font = 'bold 15px "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
    });

    if (motionFx.cinematicMs > 0) {
        const alpha = Math.min(0.35, motionFx.cinematicMs / 1000);
        const overlayX = cameraRig.x - cameraRig.viewW * 0.5;
        const overlayY = cameraRig.y - cameraRig.viewH * 0.5;
        ctx.save();
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.fillRect(overlayX, overlayY, cameraRig.viewW, cameraRig.viewH);
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = 'bold 42px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('THEOREM SOLVED', cameraRig.x, cameraRig.y - 10);
        ctx.font = 'bold 16px "Fira Code", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillText(`REWARD +${lastReward} | STREAK x${currentStreak}`, cameraRig.x, cameraRig.y + 28);
        ctx.restore();
    }

    ctx.restore();
}

function spawnParticle(x, y, text, color) {
    for (let i = 0; i < 6; i++) {
        visualParticles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 2,
            text: text,
            color: color,
            alpha: 1.0
        });
    }
}

