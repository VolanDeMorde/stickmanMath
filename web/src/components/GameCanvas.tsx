import { useEffect, useRef } from 'react'

type GameCanvasProps = {
  className?: string
  mode: 'campaign' | 'sandbox'
  expression: string
  target: number
  stage: number
  isBoss: boolean
  layout: 'relay' | 'tower' | 'aerial'
  activeWeapon: 'MINUS' | 'ABS' | 'FACTOR' | 'SQRT'
  cameraMode: 'auto' | 'portrait' | 'landscape'
  followStrength: number
  resetTick: number
  commandTicks: {
    grab: number
    swing: number
    break: number
    undo: number
  }
  onLevelSolved: (reward: number) => void
  inputState: {
    left: boolean
    right: boolean
    up: boolean
    down: boolean
  }
}

type CameraRig = {
  x: number
  y: number
  viewW: number
  viewH: number
  isPortrait: boolean
}

export function GameCanvas({
  className,
  mode,
  expression,
  target,
  stage,
  isBoss,
  layout,
  activeWeapon,
  cameraMode,
  followStrength,
  resetTick,
  commandTicks,
  onLevelSolved,
  inputState
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const inputRef = useRef(inputState)
  const commandTicksRef = useRef(commandTicks)
  const onLevelSolvedRef = useRef(onLevelSolved)

  useEffect(() => {
    inputRef.current = inputState
  }, [inputState])

  useEffect(() => {
    commandTicksRef.current = commandTicks
  }, [commandTicks])

  useEffect(() => {
    onLevelSolvedRef.current = onLevelSolved
  }, [onLevelSolved])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let lastFrameTime = 0
    const WORLD_W = 1000
    const WORLD_H = 600
    let solved = false
    let gateOpen = false
    let processedCommands = { ...commandTicksRef.current }
    let storyBeat = isBoss ? `BOSS THEOREM ${stage}` : `STAGE ${stage}`
    let storyBeatTtl = 220

    const player = {
      x: 220,
      y: 360,
      vx: 0,
      vy: 0,
      r: 16,
      facingRight: true
    }
    const playerHalfW = 12
    const playerFeetOffset = 24
    const jumpVelocity = -500
    let playerGrounded = false
    let jumpLocked = false

    const expressionNumbers = expression
      .match(/-?\d+/g)
      ?.map((value) => Number.parseInt(value, 10))
      .slice(0, 4) ?? [2, 3]

    const expressionBlocks = expressionNumbers.map((value, index) => ({
      x: 280 + index * 90,
      y: 195 + (index % 2) * 36,
      value,
      vx: 0,
      vy: 0,
      cooldown: 0,
      held: false
    }))

    const minusWeapon = {
      x: 530,
      y: 452,
      held: false,
      type: activeWeapon
    }

    const originPortal = {
      x: 500,
      y: 280,
      radius: 34,
      cooldown: 0
    }

    const platforms =
      layout === 'relay'
        ? [
            { x: 180, y: 430, w: 260, h: 20 },
            { x: 460, y: 350, w: 180, h: 20 },
            { x: 680, y: 290, w: 140, h: 20 }
          ]
        : layout === 'tower'
          ? [
              { x: 170, y: 430, w: 220, h: 20 },
              { x: 390, y: 360, w: 180, h: 20 },
              { x: 590, y: 290, w: 150, h: 20 },
              { x: 760, y: 220, w: 100, h: 18 }
            ]
          : [
              { x: 130, y: 420, w: 220, h: 20 },
              { x: 380, y: 335, w: 170, h: 20 },
              { x: 580, y: 255, w: 130, h: 18 },
              { x: 740, y: 190, w: 110, h: 16 }
            ]

    let heldBlockIndex = -1
    const undoStack: string[] = []

    const cloneState = () => {
      return JSON.stringify({
        player: { x: player.x, y: player.y, vx: player.vx, vy: player.vy, facingRight: player.facingRight },
        blocks: expressionBlocks,
        heldBlockIndex,
        minusWeapon,
        solved
      })
    }

    const saveState = () => {
      undoStack.push(cloneState())
      if (undoStack.length > 50) undoStack.shift()
    }

    const restoreState = () => {
      const snapshot = undoStack.pop()
      if (!snapshot) return
      const parsed = JSON.parse(snapshot) as {
        player: typeof player
        blocks: typeof expressionBlocks
        heldBlockIndex: number
        minusWeapon: typeof minusWeapon
        solved: boolean
      }
      player.x = parsed.player.x
      player.y = parsed.player.y
      player.vx = parsed.player.vx
      player.vy = parsed.player.vy
      player.facingRight = parsed.player.facingRight
      heldBlockIndex = parsed.heldBlockIndex
      solved = parsed.solved

      parsed.blocks.forEach((block, index) => {
        expressionBlocks[index] = { ...block }
      })

      minusWeapon.x = parsed.minusWeapon.x
      minusWeapon.y = parsed.minusWeapon.y
      minusWeapon.held = parsed.minusWeapon.held
    }

    const dist = (ax: number, ay: number, bx: number, by: number) => {
      const dx = ax - bx
      const dy = ay - by
      return Math.sqrt(dx * dx + dy * dy)
    }

    const toggleGrab = () => {
      if (heldBlockIndex >= 0) {
        const held = expressionBlocks[heldBlockIndex]
        held.held = false
        held.vx = player.facingRight ? 240 : -240
        held.vy = -130
        held.cooldown = 20
        heldBlockIndex = -1
        return
      }

      let nearestIndex = -1
      let nearestDistance = 78

      expressionBlocks.forEach((block, index) => {
        const current = dist(player.x, player.y, block.x, block.y)
        if (current < nearestDistance) {
          nearestDistance = current
          nearestIndex = index
        }
      })

      if (nearestIndex >= 0) {
        saveState()
        heldBlockIndex = nearestIndex
        expressionBlocks[nearestIndex].held = true
        expressionBlocks[nearestIndex].vx = 0
        expressionBlocks[nearestIndex].vy = 0
        return
      }

      if (dist(player.x, player.y, minusWeapon.x, minusWeapon.y) < 88) {
        saveState()
        minusWeapon.held = !minusWeapon.held
      }
    }

    const triggerStrike = () => {
      if (!minusWeapon.held) return
      saveState()

      let nearestIndex = -1
      let nearestDistance = 95

      expressionBlocks.forEach((block, index) => {
        const current = dist(player.x, player.y, block.x, block.y)
        if (current < nearestDistance) {
          nearestDistance = current
          nearestIndex = index
        }
      })

      if (nearestIndex >= 0) {
        const targetBlock = expressionBlocks[nearestIndex]

        if (minusWeapon.type === 'MINUS') {
          targetBlock.value = -targetBlock.value
        } else if (minusWeapon.type === 'ABS') {
          targetBlock.value = Math.abs(targetBlock.value)
        } else if (minusWeapon.type === 'SQRT') {
          const value = Math.abs(targetBlock.value)
          targetBlock.value = Math.round(Math.sqrt(value))
        } else if (minusWeapon.type === 'FACTOR') {
          const n = Math.abs(targetBlock.value)
          if (n > 1) {
            const factors: number[] = []
            let remaining = n
            let d = 2
            while (remaining > 1 && factors.length < 4) {
              while (remaining % d === 0 && factors.length < 4) {
                factors.push(d)
                remaining /= d
              }
              d += 1
              if (d * d > remaining && remaining > 1) {
                factors.push(remaining)
                break
              }
            }

            if (factors.length > 1) {
              expressionBlocks.splice(nearestIndex, 1)
              factors.forEach((factor, index) => {
                expressionBlocks.push({
                  x: targetBlock.x + (index - (factors.length - 1) / 2) * 30,
                  y: targetBlock.y - 12,
                  value: targetBlock.value < 0 ? -factor : factor,
                  vx: (index - 1) * 35,
                  vy: -50,
                  cooldown: 14,
                  held: false
                })
              })
            }
          }
        }
      }
    }

    const breakHeldBlock = () => {
      if (heldBlockIndex < 0) return
      const block = expressionBlocks[heldBlockIndex]
      const first = Math.trunc(block.value / 2)
      const second = block.value - first
      saveState()
      block.value = first
      block.held = false
      block.vx = player.facingRight ? 150 : -150
      block.vy = -80
      block.cooldown = 20

      expressionBlocks.push({
        x: block.x + 28,
        y: block.y - 16,
        value: second,
        vx: -(player.facingRight ? 120 : -120),
        vy: -75,
        cooldown: 20,
        held: false
      })
      heldBlockIndex = -1
    }

    const resetPlayer = () => {
      player.x = 220
      player.y = 360
      player.vx = 0
      player.vy = 0
      heldBlockIndex = -1
      minusWeapon.held = false
      minusWeapon.type = activeWeapon
      solved = false
      gateOpen = false
      undoStack.length = 0
      originPortal.cooldown = 0
      storyBeat = isBoss ? `BOSS THEOREM ${stage}` : `STAGE ${stage}`
      storyBeatTtl = 220
    }

    resetPlayer()

    const camera: CameraRig = {
      x: WORLD_W * 0.5,
      y: WORLD_H * 0.5,
      viewW: WORLD_W,
      viewH: WORLD_H,
      isPortrait: false
    }

    const resize = () => {
      const parent = canvas.parentElement
      const width = parent?.clientWidth || 960
      const height = parent?.clientHeight || 640
      canvas.width = Math.max(1, width)
      canvas.height = Math.max(1, height)
    }

    const draw = (timestamp: number) => {
      if (!lastFrameTime) {
        lastFrameTime = timestamp
      }

      const frameMs = Math.min(50, Math.max(1, timestamp - lastFrameTime))
      lastFrameTime = timestamp
      const dt = frameMs / 1000

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      if (storyBeatTtl > 0) storyBeatTtl = Math.max(0, storyBeatTtl - dt * 60)

      const queuedCommands = commandTicksRef.current
      if (queuedCommands.grab !== processedCommands.grab) {
        processedCommands.grab = queuedCommands.grab
        toggleGrab()
      }
      if (queuedCommands.swing !== processedCommands.swing) {
        processedCommands.swing = queuedCommands.swing
        triggerStrike()
      }
      if (queuedCommands.break !== processedCommands.break) {
        processedCommands.break = queuedCommands.break
        breakHeldBlock()
      }
      if (queuedCommands.undo !== processedCommands.undo) {
        processedCommands.undo = queuedCommands.undo
        restoreState()
      }

      const desiredPortrait =
        cameraMode === 'auto'
          ? canvas.height > canvas.width
          : cameraMode === 'portrait'

      const aspect = Math.max(0.1, canvas.width / Math.max(1, canvas.height))
      camera.isPortrait = desiredPortrait

      if (camera.isPortrait) {
        camera.viewW = WORLD_W
        camera.viewH = camera.viewW / aspect
      } else {
        camera.viewH = WORLD_H
        camera.viewW = camera.viewH * aspect
      }

      const maxVX = 320
      const maxVY = 860
      const accel = 900
      const gravity = 1350
      const groundDrag = 0.78
      const airDrag = 0.95
      const prevY = player.y

      if (inputRef.current.left) player.vx -= accel * dt
      if (inputRef.current.right) player.vx += accel * dt

      const heldNegative = heldBlockIndex >= 0 && expressionBlocks[heldBlockIndex]?.value < 0
      const canFly = heldNegative

      if (canFly) {
        if (inputRef.current.up) player.vy -= 980 * dt
        if (inputRef.current.down) player.vy += 980 * dt
      } else {
        player.vy += gravity * dt
        if (inputRef.current.up && playerGrounded && !jumpLocked) {
          player.vy = jumpVelocity
          playerGrounded = false
          jumpLocked = true
        }
        if (!inputRef.current.up) {
          jumpLocked = false
        }
        if (inputRef.current.down && !playerGrounded) {
          player.vy += 420 * dt
        }
      }

      if (Math.abs(player.vx) > 5) {
        player.facingRight = player.vx >= 0
      }

      player.vx *= Math.pow(playerGrounded ? groundDrag : airDrag, dt * 60)
      if (canFly) {
        player.vy *= Math.pow(0.92, dt * 60)
      }
      player.vx = Math.max(-maxVX, Math.min(maxVX, player.vx))
      player.vy = Math.max(-maxVY, Math.min(maxVY, player.vy))

      player.x += player.vx * dt
      player.y += player.vy * dt

      player.x = Math.max(player.r, Math.min(WORLD_W - player.r, player.x))
      player.y = Math.max(player.r, Math.min(WORLD_H - player.r, player.y))

      playerGrounded = false

      const floorTop = WORLD_H - 52
      const feetY = player.y + playerFeetOffset
      if (feetY >= floorTop && player.vy >= 0) {
        player.y = floorTop - playerFeetOffset
        player.vy = 0
        playerGrounded = true
      }

      const prevFeetY = prevY + playerFeetOffset
      platforms.forEach((platform) => {
        const top = platform.y
        const left = platform.x
        const right = platform.x + platform.w
        const overlapsX = player.x + playerHalfW > left && player.x - playerHalfW < right
        const nowFeetY = player.y + playerFeetOffset

        if (overlapsX && player.vy >= 0 && prevFeetY <= top && nowFeetY >= top) {
          player.y = top - playerFeetOffset
          player.vy = 0
          playerGrounded = true
        }
      })

      const lookAhead = camera.isPortrait ? 16 : 52
      const targetX = player.x + (player.vx >= 0 ? lookAhead : -lookAhead)
      const targetY = player.y - (camera.isPortrait ? 70 : 42)
      const blend = Math.max(0.02, Math.min(0.3, followStrength))

      camera.x += (targetX - camera.x) * blend
      camera.y += (targetY - camera.y) * blend

      const halfW = camera.viewW * 0.5
      const halfH = camera.viewH * 0.5

      if (camera.viewW >= WORLD_W) {
        camera.x = WORLD_W * 0.5
      } else {
        camera.x = Math.max(halfW, Math.min(WORLD_W - halfW, camera.x))
      }

      if (camera.viewH >= WORLD_H) {
        camera.y = WORLD_H * 0.5
      } else {
        camera.y = Math.max(halfH, Math.min(WORLD_H - halfH, camera.y))
      }

      const scale = canvas.width / camera.viewW

      expressionBlocks.forEach((block) => {
        if (block.cooldown > 0) block.cooldown = Math.max(0, block.cooldown - dt * 60)

        if (block.held) {
          block.x = player.x + (player.facingRight ? 38 : -38)
          block.y = player.y - 30
          block.vx = 0
          block.vy = 0
          return
        }

        block.vy += 650 * dt
        block.vx *= Math.pow(0.985, dt * 60)
        block.vy *= Math.pow(0.995, dt * 60)
        block.x += block.vx * dt
        block.y += block.vy * dt

        if (block.x < 24) {
          block.x = 24
          block.vx *= -0.4
        }
        if (block.x > WORLD_W - 24) {
          block.x = WORLD_W - 24
          block.vx *= -0.4
        }

        const floorY = WORLD_H - 52
        if (block.y > floorY) {
          block.y = floorY
          block.vy *= -0.22
          block.vx *= Math.pow(0.95, dt * 60)
        }

        platforms.forEach((platform) => {
          const top = platform.y
          const left = platform.x
          const right = platform.x + platform.w
          if (block.x > left && block.x < right && block.y > top - 18 && block.y < top + 14 && block.vy >= 0) {
            block.y = top - 18
            block.vy *= -0.18
            block.vx *= Math.pow(0.96, dt * 60)
          }
        })
      })

      if (originPortal.cooldown > 0) originPortal.cooldown = Math.max(0, originPortal.cooldown - dt * 60)
      if (originPortal.cooldown <= 0 && dist(player.x, player.y, originPortal.x, originPortal.y) < originPortal.radius + 16) {
        saveState()
        expressionBlocks.push({
          x: originPortal.x + 20,
          y: originPortal.y - 28,
          value: 1,
          vx: 60,
          vy: -120,
          cooldown: 24,
          held: false
        })
        originPortal.cooldown = 180
      }

      for (let i = 0; i < expressionBlocks.length; i += 1) {
        for (let j = i + 1; j < expressionBlocks.length; j += 1) {
          const a = expressionBlocks[i]
          const b = expressionBlocks[j]
          if (a.held || b.held || a.cooldown > 0 || b.cooldown > 0) continue
          if (dist(a.x, a.y, b.x, b.y) > 42) continue

          saveState()
          a.value += b.value
          a.vx = (a.vx + b.vx) * 0.5
          a.vy = -90
          a.cooldown = 18
          expressionBlocks.splice(j, 1)
          if (heldBlockIndex === j) heldBlockIndex = i
          break
        }
      }

      if (minusWeapon.held) {
        minusWeapon.x = player.x + (player.facingRight ? 26 : -26)
        minusWeapon.y = player.y - 10
      }

      ctx.save()
      ctx.translate(canvas.width * 0.5, canvas.height * 0.5)
      ctx.scale(scale, scale)
      ctx.translate(-camera.x, -camera.y)

      const grad = ctx.createLinearGradient(0, 0, 0, WORLD_H)
      grad.addColorStop(0, '#07111f')
      grad.addColorStop(1, '#0f1f2e')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)

      ctx.strokeStyle = 'rgba(143, 181, 220, 0.12)'
      ctx.lineWidth = 1
      for (let x = 0; x <= WORLD_W; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, WORLD_H)
        ctx.stroke()
      }
      for (let y = 0; y <= WORLD_H; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(WORLD_W, y)
        ctx.stroke()
      }

      ctx.fillStyle = '#13324b'
      ctx.fillRect(0, WORLD_H - 28, WORLD_W, 28)

      platforms.forEach((platform) => {
        ctx.fillStyle = '#1f3347'
        ctx.strokeStyle = '#35526d'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(platform.x, platform.y, platform.w, platform.h, 8)
        ctx.fill()
        ctx.stroke()
      })

      ctx.fillStyle = 'rgba(34, 211, 238, 0.2)'
      ctx.font = '900 58px "Fira Code", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${expression} = ${target}`, WORLD_W * 0.5, 110)

      const gateX = 850
      const gateY = target < 0 ? 150 : 390
      const gateW = 72
      const gateH = 112
      ctx.strokeStyle = gateOpen ? '#10b981' : '#f43f5e'
      ctx.lineWidth = 4
      ctx.fillStyle = gateOpen ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.04)'
      ctx.fillRect(gateX, gateY, gateW, gateH)
      ctx.beginPath()
      ctx.moveTo(gateX + 15, gateY)
      ctx.lineTo(gateX, gateY)
      ctx.lineTo(gateX, gateY + gateH)
      ctx.lineTo(gateX + 15, gateY + gateH)
      ctx.moveTo(gateX + gateW - 15, gateY)
      ctx.lineTo(gateX + gateW, gateY)
      ctx.lineTo(gateX + gateW, gateY + gateH)
      ctx.lineTo(gateX + gateW - 15, gateY + gateH)
      ctx.stroke()
      ctx.fillStyle = gateOpen ? '#10b981' : '#f43f5e'
      ctx.font = 'bold 16px "Fira Code", monospace'
      ctx.fillText(`[x = ${target}]`, gateX + gateW / 2, gateY - 12)
      if (!gateOpen) {
        ctx.fillStyle = '#f43f5e'
        ctx.font = '11px "Fira Code", monospace'
        ctx.fillText('Formula Lock', gateX + gateW / 2, gateY + gateH / 2 + 4)
      }

      expressionBlocks.forEach((block) => {
        const isNeg = block.value < 0
        const strokeColor = isNeg ? '#a855f7' : '#d97706'
        const fillColor = isNeg ? '#c084fc' : '#f59e0b'
        const size = Math.min(80, Math.max(46, 42 + Math.abs(block.value) * 2))

        ctx.fillStyle = '#090d16'
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.roundRect(block.x - size / 2, block.y - size / 2, size, size, 8)
        ctx.fill()
        ctx.stroke()

        ctx.fillStyle = fillColor
        ctx.font = 'bold 26px "Fira Code", monospace'
        ctx.fillText(String(block.value), block.x, block.y + 8)
      })

      ctx.fillStyle = '#0f172a'
      const weaponColor =
        minusWeapon.type === 'MINUS'
          ? '#a855f7'
          : minusWeapon.type === 'ABS'
            ? '#10b981'
            : minusWeapon.type === 'FACTOR'
              ? '#f43f5e'
              : '#14b8a6'
      const weaponSymbol =
        minusWeapon.type === 'MINUS' ? '-' : minusWeapon.type === 'ABS' ? '||' : minusWeapon.type === 'FACTOR' ? '/' : 'sqrt'

      ctx.strokeStyle = weaponColor
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(minusWeapon.x, minusWeapon.y, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = weaponColor
      ctx.font = minusWeapon.type === 'SQRT' ? 'bold 9px "Fira Code", monospace' : 'bold 15px "Fira Code", monospace'
      ctx.fillText(weaponSymbol, minusWeapon.x, minusWeapon.y + 5)

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(originPortal.x, originPortal.y, originPortal.radius, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'
      ctx.beginPath()
      ctx.arc(originPortal.x, originPortal.y, originPortal.radius - 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#f59e0b'
      ctx.font = 'bold 20px "Fira Code", monospace'
      ctx.fillText('0', originPortal.x, originPortal.y + 7)

      if (mode === 'sandbox') {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.88)'
        ctx.font = '900 24px "Fira Code", monospace'
        ctx.fillText('SANDBOX MODE', WORLD_W * 0.5, WORLD_H - 56)
      }

      if (!solved) {
        const gateCx = gateX + gateW * 0.5
        const gateCy = gateY + gateH * 0.5
        const solvedBlock = expressionBlocks.find((block) => dist(block.x, block.y, gateCx, gateCy) < 45 && block.value === target)
        gateOpen = !!solvedBlock
        if (solvedBlock) {
          solved = true
          const reward = Math.max(80, 220 + Math.abs(target) * 10)
          onLevelSolvedRef.current(reward)
          storyBeat = isBoss ? `BOSS CLEAR +${reward}` : `THEOREM SOLVED +${reward}`
          storyBeatTtl = 180
        }
      } else {
        gateOpen = true
      }

      if (solved) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.92)'
        ctx.font = '900 22px "Space Grotesk", sans-serif'
        ctx.fillText('THEOREM SOLVED', WORLD_W * 0.5, 152)
      }

      const headY = player.y - 22
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 3.5
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(player.x, headY, 9, 0, Math.PI * 2)
      ctx.stroke()

      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.arc(player.x - 3, headY - 1, 1.5, 0, Math.PI * 2)
      ctx.arc(player.x + 3, headY - 1, 1.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(player.x, headY + 10)
      ctx.lineTo(player.x, player.y + 10)
      ctx.moveTo(player.x, player.y - 2)
      ctx.lineTo(player.x + (player.facingRight ? 13 : -13), player.y + 5)
      ctx.moveTo(player.x, player.y - 2)
      ctx.lineTo(player.x + (player.facingRight ? -11 : 11), player.y + 4)
      ctx.moveTo(player.x, player.y + 10)
      ctx.lineTo(player.x + 10, player.y + 24)
      ctx.moveTo(player.x, player.y + 10)
      ctx.lineTo(player.x - 10, player.y + 24)
      ctx.stroke()

      ctx.restore()

      ctx.font = '600 12px "Fira Code", monospace'
      ctx.fillStyle = 'rgba(157, 180, 202, 0.85)'
      ctx.fillText(`${mode.toUpperCase()} | ${minusWeapon.type}`, 24, 34)

      if (storyBeatTtl > 0) {
        const alpha = Math.min(1, storyBeatTtl / 36)
        const bannerW = Math.min(canvas.width - 40, 420)
        const bannerX = canvas.width * 0.5 - bannerW * 0.5
        const bannerY = 14
        ctx.fillStyle = `rgba(8, 20, 33, ${0.82 * alpha})`
        ctx.strokeStyle = `rgba(45, 212, 191, ${0.42 * alpha})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(bannerX, bannerY, bannerW, 34, 16)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = `rgba(165, 243, 252, ${alpha})`
        ctx.font = '700 12px "Fira Code", monospace'
        ctx.textAlign = 'center'
        ctx.fillText(storyBeat, canvas.width * 0.5, bannerY + 22)
      }

      raf = requestAnimationFrame(draw)
    }

    resize()
    resetPlayer()
    saveState()
    raf = requestAnimationFrame(draw)

    window.addEventListener('resize', resize)

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      triggerStrike()
    }

    const handleCanvasClick = () => {
      toggleGrab()
    }

    canvas.addEventListener('click', handleCanvasClick)
    canvas.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('click', handleCanvasClick)
      canvas.removeEventListener('contextmenu', handleContextMenu)
      cancelAnimationFrame(raf)
    }
  }, [activeWeapon, cameraMode, expression, followStrength, isBoss, layout, mode, resetTick, stage, target])

  return <canvas ref={canvasRef} className={className} />
}
