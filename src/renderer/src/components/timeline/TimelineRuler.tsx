import React from 'react'
import { motion, MotionValue } from 'framer-motion'
import { Unlock, Zap, ChevronDown } from 'lucide-react'

export interface TimelineRulerProps {
  playheadMotionX: MotionValue<number>
  playheadRulerMotionWidth: MotionValue<number>
  scrollLeft: number
  pixelsPerSecond: number
  onRulerMouseDown: (e: React.MouseEvent) => void
  onPlayheadDragMouseDown: (e: React.MouseEvent) => void
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  playheadMotionX,
  playheadRulerMotionWidth,
  scrollLeft,
  pixelsPerSecond,
  onRulerMouseDown,
  onPlayheadDragMouseDown
}) => {
  return (
    <>
      {/* Playhead vertical line & drag handle */}
      <motion.div
        className="absolute top-0 bottom-8 w-[17px] z-[150] cursor-ew-resize flex justify-center pointer-events-auto transform -translate-x-1/2"
        style={{ left: playheadMotionX }}
        onMouseDown={onPlayheadDragMouseDown}
      >
        <div className="w-px bg-red-600 h-full shadow-[0_0_8px_rgba(255,0,0,0.5)] pointer-events-none"></div>
        <div className="absolute top-[8px] w-3.5 h-3.5 bg-red-600 rotate-45 border border-red-400 z-[160] shadow pointer-events-none"></div>
      </motion.div>

      {/* Timecode Ruler bar */}
      <div className="h-8 border-b border-omega-border flex items-center bg-[#1a1d21] z-[130] relative">
        <div className="w-32 h-full flex-shrink-0 bg-omega-panel border-r border-omega-border flex items-center justify-end px-3 gap-2 shadow-[2px_0_5px_rgba(0,0,0,0.3)] z-[140]">
          <Unlock size={12} className="text-gray-500" />
          <Zap size={12} className="text-gray-500" />
          <ChevronDown size={12} className="text-gray-500" />
        </div>
        <div
          className="flex-1 h-full relative overflow-hidden cursor-ew-resize select-none"
          onMouseDown={onRulerMouseDown}
        >
          <div
            className="absolute inset-0 flex items-center"
            style={{ transform: `translateX(-${scrollLeft}px)` }}
          >
            <motion.div
              className="absolute top-0 h-1 bg-blue-500/80 rounded-b shadow-[0_0_5px_rgba(59,130,246,0.5)]"
              style={{ width: playheadRulerMotionWidth, left: 0 }}
            ></motion.div>
            {[...Array(300)].map((_, i) => (
              <div
                key={i}
                className="absolute h-full border-l border-gray-800 text-[9px] text-gray-500 pl-1 flex items-end pb-1.5"
                style={{ left: pixelsPerSecond * (i * 5) }}
              >
                {i * 5}s
              </div>
            ))}
          </div>
        </div>
        <div className="w-6 border-l border-omega-border bg-[#282b30] h-full z-[140]"></div>
      </div>
    </>
  )
}
