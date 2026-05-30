import { useCallback, useEffect, useRef, useState } from 'react'

export type LegacyCommand =
  | { type: 'undo' }
  | { type: 'break' }
  | { type: 'reset' }
  | { type: 'toggleMute' }
  | { type: 'setKey'; key: 'a' | 'd' | ' '; down: boolean }
  | { type: 'mode'; value: 'campaign' | 'sandbox' }

export type LegacySnapshot = {
  mode: 'campaign' | 'sandbox'
  tier: string
  stage: number
  score: number
  streak: number
  reward: number
  bossClears: number
  elapsedMs: number
  ready: boolean
  at: number
}

const defaultSnapshot: LegacySnapshot = {
  mode: 'campaign',
  tier: 'basic',
  stage: 1,
  score: 0,
  streak: 0,
  reward: 0,
  bossClears: 0,
  elapsedMs: 0,
  ready: false,
  at: 0
}

export function useLegacyBridge() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [snapshot, setSnapshot] = useState<LegacySnapshot>(defaultSnapshot)

  const onFrameLoad = useCallback(() => {
    setIsReady(true)
  }, [])

  const runCommand = useCallback((command: LegacyCommand) => {
    const targetWindow = iframeRef.current?.contentWindow as
      | (Window & {
          triggerUndo?: () => void
          breakSelectedBlock?: () => void
          resetCurrentLevel?: () => void
          toggleMute?: () => void
          setVirtualKey?: (key: 'a' | 'd' | ' ', isDown: boolean) => void
          setMode?: (mode: 'campaign' | 'sandbox') => void
          getBridgeSnapshot?: () => LegacySnapshot
        })
      | undefined

    if (!targetWindow) return false

    try {
      switch (command.type) {
        case 'undo':
          targetWindow.triggerUndo?.()
          return true
        case 'break':
          targetWindow.breakSelectedBlock?.()
          return true
        case 'reset':
          targetWindow.resetCurrentLevel?.()
          return true
        case 'toggleMute':
          targetWindow.toggleMute?.()
          return true
        case 'setKey':
          targetWindow.setVirtualKey?.(command.key, command.down)
          return true
        case 'mode':
          targetWindow.setMode?.(command.value)
          return true
        default:
          return false
      }
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (!isReady) return

    const pullSnapshot = () => {
      const targetWindow = iframeRef.current?.contentWindow as
        | (Window & { getBridgeSnapshot?: () => LegacySnapshot })
        | undefined

      if (!targetWindow?.getBridgeSnapshot) return

      try {
        const next = targetWindow.getBridgeSnapshot()
        if (!next || typeof next !== 'object') return
        setSnapshot(next)
      } catch {
        // Ignore frame access errors while iframe is still warming up.
      }
    }

    pullSnapshot()
    const timer = window.setInterval(pullSnapshot, 250)
    return () => window.clearInterval(timer)
  }, [isReady])

  return {
    iframeRef,
    isReady,
    onFrameLoad,
    runCommand,
    snapshot
  }
}
