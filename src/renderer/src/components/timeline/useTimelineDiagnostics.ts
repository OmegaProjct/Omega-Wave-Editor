import { useState, useRef, useCallback, useEffect } from 'react'
import { shouldLogDiagnostic, writeDiagnosticLog } from '../../lib/diagnosticLogging'
import type { TimelineDiagnosticEvent, TimelinePerformanceStats } from './timelineTypes'

export function useTimelineDiagnostics() {
  const [perfStats, setPerfStats] = useState<TimelinePerformanceStats>({ cpuUsage: 0, processRamBytes: 0, systemRamPct: 0, systemCpuPct: 0 })
  const diagnosticSeqRef = useRef(0)
  const diagnosticBufferRef = useRef<TimelineDiagnosticEvent[]>([])
  const diagnosticFlushTimeoutRef = useRef<number | null>(null)
  const diagnosticPerfTimerRef = useRef<number | null>(null)
  const diagnosticPerfUntilRef = useRef(0)
  const lastDiagnosticPerfSampleRef = useRef(0)
  const lastDiagnosticScrollRef = useRef({ left: 0, top: 0, at: 0 })

  const waveformGestureRef = useRef<{ kind: string; startedAt: number; lastAt: number; steps: number } | null>(null)
  const waveformGestureIdleTimeoutRef = useRef<number | null>(null)

  const flushTimelineDiagnostics = useCallback(() => {
    diagnosticFlushTimeoutRef.current = null
    const events = diagnosticBufferRef.current.splice(0, diagnosticBufferRef.current.length)
    if (events.length === 0) return
    if (!shouldLogDiagnostic('timeline')) return

    writeDiagnosticLog('timeline', 'Timeline-Eingaben und Wirkung', {
      count: events.length,
      events
    })
  }, [])

  const queueTimelineDiagnostic = useCallback((kind: string, details?: Record<string, unknown>) => {
    if (!shouldLogDiagnostic('timeline')) return

    diagnosticBufferRef.current.push({
      seq: ++diagnosticSeqRef.current,
      kind,
      atMs: Math.round(performance.now()),
      details
    })

    while (diagnosticBufferRef.current.length > 80) {
      diagnosticBufferRef.current.shift()
    }

    if (diagnosticFlushTimeoutRef.current === null) {
      diagnosticFlushTimeoutRef.current = window.setTimeout(flushTimelineDiagnostics, 250)
    }
  }, [flushTimelineDiagnostics])

  const flushWaveformGesture = useCallback(() => {
    waveformGestureIdleTimeoutRef.current = null
    const gesture = waveformGestureRef.current
    waveformGestureRef.current = null
    if (!gesture || !shouldLogDiagnostic('waveformTrace')) return

    const durationMs = Math.max(1, gesture.lastAt - gesture.startedAt)
    const stepsPerSecond = gesture.steps / (durationMs / 1000)
    const showRate = gesture.steps >= 3 && durationMs >= 50
    writeDiagnosticLog('waveformTrace', 'Zoom-/Scroll-Geste abgeschlossen', {
      kind: gesture.kind,
      steps: gesture.steps,
      durationMs: Math.round(durationMs),
      ...(showRate ? { stepsPerSecond: Number(stepsPerSecond.toFixed(1)) } : {})
    })
  }, [])

  const recordWaveformGestureTick = useCallback((kind: 'zoom' | 'scroll') => {
    if (!shouldLogDiagnostic('waveformTrace')) return
    const now = performance.now()
    const current = waveformGestureRef.current

    if (!current || now - current.lastAt > 300) {
      waveformGestureRef.current = { kind, startedAt: now, lastAt: now, steps: 1 }
    } else {
      current.lastAt = now
      current.steps += 1
      if (current.kind !== kind) current.kind = 'mixed'
    }

    if (waveformGestureIdleTimeoutRef.current !== null) {
      window.clearTimeout(waveformGestureIdleTimeoutRef.current)
    }
    waveformGestureIdleTimeoutRef.current = window.setTimeout(flushWaveformGesture, 300)
  }, [flushWaveformGesture])

  const sampleDiagnosticPerformance = useCallback(async (reason: string) => {
    if (!shouldLogDiagnostic('timeline') || !shouldLogDiagnostic('performance')) return

    const now = Date.now()
    if (now - lastDiagnosticPerfSampleRef.current < 450) return
    lastDiagnosticPerfSampleRef.current = now

    try {
      const stats = await window.api.getPerformanceStats()
      setPerfStats(stats)
      queueTimelineDiagnostic('performance-sample', {
        reason,
        cpuUsage: stats.cpuUsage,
        systemCpuPct: stats.systemCpuPct,
        processRamMb: Math.round((stats.processRamBytes / (1024 * 1024)) * 10) / 10,
        systemRamPct: stats.systemRamPct,
        gpuProcessCpuPct: stats.gpuProcessCpuPct ?? null,
        gpuProcessRamMb: stats.gpuProcessRamBytes ? Math.round((stats.gpuProcessRamBytes / (1024 * 1024)) * 10) / 10 : null,
        gpuModel: stats.gpuModel || null
      })
    } catch (err: any) {
      queueTimelineDiagnostic('performance-sample-error', {
        reason,
        error: err?.message || String(err)
      })
    }
  }, [queueTimelineDiagnostic])

  const keepDiagnosticPerformanceSampling = useCallback((reason: string) => {
    diagnosticPerfUntilRef.current = Math.max(diagnosticPerfUntilRef.current, Date.now() + 4500)
    sampleDiagnosticPerformance(reason)

    if (diagnosticPerfTimerRef.current !== null) return

    diagnosticPerfTimerRef.current = window.setInterval(() => {
      if (Date.now() > diagnosticPerfUntilRef.current) {
        if (diagnosticPerfTimerRef.current !== null) {
          window.clearInterval(diagnosticPerfTimerRef.current)
          diagnosticPerfTimerRef.current = null
        }
        return
      }
      sampleDiagnosticPerformance('active-window')
    }, 500)
  }, [sampleDiagnosticPerformance])

  const logScrollEvent = useCallback((nextLeft: number, nextTop: number, zoomLevel: number, playhead: number) => {
    const now = performance.now()
    const last = lastDiagnosticScrollRef.current
    const leftDelta = Math.abs(nextLeft - last.left)
    const topDelta = Math.abs(nextTop - last.top)
    if (leftDelta >= 96 || topDelta >= 24 || now - last.at > 300) {
      queueTimelineDiagnostic('scroll-event', {
        scrollLeft: Math.round(nextLeft),
        scrollTop: Math.round(nextTop),
        leftDelta: Math.round(nextLeft - last.left),
        topDelta: Math.round(nextTop - last.top),
        zoomPct: Math.round(zoomLevel * 100),
        playhead: Number(playhead.toFixed(3))
      })
      lastDiagnosticScrollRef.current = { left: nextLeft, top: nextTop, at: now }
      keepDiagnosticPerformanceSampling('scroll-event')
    }
  }, [queueTimelineDiagnostic, keepDiagnosticPerformanceSampling])

  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      try {
        const stats = await window.api.getPerformanceStats()
        if (active && stats) {
          setPerfStats(stats)
        }
      } catch (err) {
        console.error('Error polling performance stats:', err)
      }
    }, 2000)
    return () => {
      active = false;
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (waveformGestureIdleTimeoutRef.current !== null) {
        window.clearTimeout(waveformGestureIdleTimeoutRef.current)
      }
      if (diagnosticFlushTimeoutRef.current !== null) {
        window.clearTimeout(diagnosticFlushTimeoutRef.current)
        diagnosticFlushTimeoutRef.current = null
        flushTimelineDiagnostics()
      }
      if (diagnosticPerfTimerRef.current !== null) {
        window.clearInterval(diagnosticPerfTimerRef.current)
        diagnosticPerfTimerRef.current = null
      }
    }
  }, [flushTimelineDiagnostics])

  return {
    perfStats,
    queueTimelineDiagnostic,
    recordWaveformGestureTick,
    keepDiagnosticPerformanceSampling,
    flushTimelineDiagnostics,
    flushWaveformGesture,
    logScrollEvent
  }
}
