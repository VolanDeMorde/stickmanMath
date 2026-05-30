import { useEffect, useRef } from 'react'

type GameCanvasProps = {
  className?: string
  cameraMode: 'auto' | 'portrait' | 'landscape'
  followStrength: number
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

export function GameCanvas({ className, cameraMode, followStrength, inputState }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const inputRef = useRef(inputState)

  useEffect(() => {
    inputRef.current = inputState
  }, [inputState])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    const WORLD_W = 1000
    const WORLD_H = 600

    const player = {
      x: 220,
      y: 360,
      vx: 0,
      vy: 0,
      r: 16
    }

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

    const draw = () => {
      const dt = 1 / 60
      ctx.clearRect(0, 0, canvas.width, canvas.height)

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
      const maxVY = 260
      const accel = 820
      const drag = 0.88

      if (inputRef.current.left) player.vx -= accel * dt
      if (inputRef.current.right) player.vx += accel * dt
      if (inputRef.current.up) player.vy -= accel * dt
      if (inputRef.current.down) player.vy += accel * dt

      player.vx *= drag
      player.vy *= drag
      player.vx = Math.max(-maxVX, Math.min(maxVX, player.vx))
      player.vy = Math.max(-maxVY, Math.min(maxVY, player.vy))

      player.x += player.vx * dt
      player.y += player.vy * dt

      player.x = Math.max(player.r, Math.min(WORLD_W - player.r, player.x))
      player.y = Math.max(player.r, Math.min(WORLD_H - player.r, player.y))

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

      ctx.fillStyle = '#ffb703'
      ctx.beginPath()
      ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#ffd36a'
      ctx.lineWidth = 2.4
      ctx.beginPath()
      ctx.moveTo(player.x - 8, player.y + 3)
      ctx.lineTo(player.x + 9, player.y + 3)
      ctx.stroke()

      ctx.restore()

      ctx.font = '700 20px "Space Grotesk", sans-serif'
      ctx.fillStyle = '#d4e4f6'
      ctx.fillText('React Canvas Adapter', 24, 44)

      ctx.font = '500 13px "Fira Code", monospace'
      ctx.fillStyle = '#9db4ca'
      const modeText = camera.isPortrait ? 'Portrait Camera' : 'Landscape Camera'
      ctx.fillText(`${modeText} | Follow ${(followStrength * 100).toFixed(0)}%`, 24, 68)
      ctx.fillText('Input: WASD / Arrows / Touch pad buttons', 24, 88)

      raf = requestAnimationFrame(draw)
    }

    resize()
    draw()

    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [cameraMode, followStrength])

  return <canvas ref={canvasRef} className={className} />
}
