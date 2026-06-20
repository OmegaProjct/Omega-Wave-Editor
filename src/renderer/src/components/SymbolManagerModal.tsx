import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { X, GripVertical, Eye, EyeOff, RotateCcw, Sliders, Check, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  TIMELINE_TOOLBAR_VISIBILITY_STORAGE_KEY,
  TIMELINE_TOOLBAR_ORDER_STORAGE_KEY,
  TIMELINE_TOOLBAR_SEPARATORS_STORAGE_KEY,
  TIMELINE_TOOLBAR_COLORS_STORAGE_KEY,
  TIMELINE_TOOLBAR_EDIT_LOCKED_STORAGE_KEY,
  ToolbarVisibilityKey,
  ToolbarSeparatorState,
  ToolbarColorKey,
  ToolbarColorState,
  DEFAULT_TOOLBAR_ORDER,
  TOOLBAR_LABELS,
  TOOLBAR_DESCRIPTIONS,
  TOOLBAR_GROUPS,
  createDefaultToolbarSeparators,
  createDefaultToolbarColors
} from './Timeline'

interface SymbolManagerModalProps {
  onClose: () => void
}

export function SymbolManagerModal({ onClose }: SymbolManagerModalProps) {
  const { t } = useTranslation()
  const isPopout = new URLSearchParams(window.location.search).get('window') === 'symbol-manager';

  const [toolbarVisibility, setToolbarVisibility] = useState<Record<ToolbarVisibilityKey, boolean>>(() => {
    try {
      const raw = localStorage.getItem(TIMELINE_TOOLBAR_VISIBILITY_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      return {
        selectTool: parsed?.selectTool !== false,
        cutTool: parsed?.cutTool !== false,
        transport: parsed?.transport !== false,
        record: parsed?.record !== false,
        undo: parsed?.undo !== false,
        redo: parsed?.redo !== false,
        snap: parsed?.snap !== false,
        group: parsed?.group !== false,
        ungroup: parsed?.ungroup !== false,
        gapClose: parsed?.gapClose !== false,
        timeDisplay: parsed?.timeDisplay !== false,
        selectionDisplay: parsed?.selectionDisplay !== false,
        autoScrollMode: parsed?.autoScrollMode !== false,
        export: parsed?.export !== false
      }
    } catch {
      return {
        selectTool: true,
        cutTool: true,
        transport: true,
        record: true,
        undo: true,
        redo: true,
        snap: true,
        group: true,
        ungroup: true,
        gapClose: true,
        timeDisplay: true,
        selectionDisplay: true,
        autoScrollMode: true,
        export: true
      }
    }
  })

  const [toolbarOrder, setToolbarOrder] = useState<ToolbarVisibilityKey[]>(() => {
    try {
      const raw = localStorage.getItem(TIMELINE_TOOLBAR_ORDER_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      if (!Array.isArray(parsed)) return DEFAULT_TOOLBAR_ORDER
      const filtered = parsed.filter((item): item is ToolbarVisibilityKey => DEFAULT_TOOLBAR_ORDER.includes(item))
      const missing = DEFAULT_TOOLBAR_ORDER.filter((item) => !filtered.includes(item))
      return [...filtered, ...missing]
    } catch {
      return DEFAULT_TOOLBAR_ORDER
    }
  })

  const [draggingKey, setDraggingKey] = useState<ToolbarVisibilityKey | null>(null)
  const [dropTarget, setDropTarget] = useState<{ key: ToolbarVisibilityKey; position: 'before' | 'after' } | null>(null)

  // Save changes to localStorage and dispatch custom event for local synchronization
  useEffect(() => {
    localStorage.setItem(TIMELINE_TOOLBAR_VISIBILITY_STORAGE_KEY, JSON.stringify(toolbarVisibility))
    window.dispatchEvent(new CustomEvent('omega-toolbar-update'))
  }, [toolbarVisibility])

  useEffect(() => {
    localStorage.setItem(TIMELINE_TOOLBAR_ORDER_STORAGE_KEY, JSON.stringify(toolbarOrder))
    window.dispatchEvent(new CustomEvent('omega-toolbar-update'))
  }, [toolbarOrder])

  const visibleToolbarSectionCount = useMemo(() => {
    return toolbarOrder.filter((key) => toolbarVisibility[key]).length
  }, [toolbarOrder, toolbarVisibility])

  const handleResetOrder = () => {
    setToolbarOrder(DEFAULT_TOOLBAR_ORDER)
  }

  const handleShowAll = () => {
    setToolbarVisibility({
      selectTool: true,
      cutTool: true,
      transport: true,
      record: true,
      undo: true,
      redo: true,
      snap: true,
      group: true,
      ungroup: true,
      gapClose: true,
      timeDisplay: true,
      selectionDisplay: true,
      autoScrollMode: true,
      export: true
    })
  }

  const handleResetAll = () => {
    setToolbarVisibility({
      selectTool: true,
      cutTool: true,
      transport: true,
      record: true,
      undo: true,
      redo: true,
      snap: true,
      group: true,
      ungroup: true,
      gapClose: true,
      timeDisplay: true,
      selectionDisplay: true,
      autoScrollMode: true,
      export: true
    })
    setToolbarOrder(DEFAULT_TOOLBAR_ORDER)
    localStorage.setItem(TIMELINE_TOOLBAR_SEPARATORS_STORAGE_KEY, JSON.stringify(createDefaultToolbarSeparators()))
    localStorage.setItem(TIMELINE_TOOLBAR_COLORS_STORAGE_KEY, JSON.stringify(createDefaultToolbarColors()))
    localStorage.setItem(TIMELINE_TOOLBAR_EDIT_LOCKED_STORAGE_KEY, 'true')
    window.dispatchEvent(new CustomEvent('omega-toolbar-update'))
  }

  const setToolbarGroupVisibility = (keys: ToolbarVisibilityKey[], visible: boolean) => {
    setToolbarVisibility((current) => {
      const next = { ...current }
      keys.forEach((key) => {
        next[key] = visible
      })
      return next
    })
  }

  const showOnlyToolbarGroup = (keys: ToolbarVisibilityKey[]) => {
    setToolbarVisibility(() => {
      const next = {} as Record<ToolbarVisibilityKey, boolean>
      DEFAULT_TOOLBAR_ORDER.forEach((key) => {
        next[key] = keys.includes(key)
      })
      return next
    })
  }

  const reorderToolbarSection = useCallback(
    (draggedKey: ToolbarVisibilityKey, targetKey: ToolbarVisibilityKey, position: 'before' | 'after') => {
      if (draggedKey === targetKey) return

      setToolbarOrder((current) => {
        const draggedIndex = current.indexOf(draggedKey)
        const targetIndex = current.indexOf(targetKey)

        if (draggedIndex === -1 || targetIndex === -1) return current

        const next = [...current]
        next.splice(draggedIndex, 1)

        const adjustedTargetIndex = next.indexOf(targetKey)
        const insertIndex = position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1
        next.splice(insertIndex, 0, draggedKey)

        return next
      })
    },
    []
  )

  const handleCheckboxChange = (key: ToolbarVisibilityKey, checked: boolean) => {
    setToolbarVisibility((current) => ({
      ...current,
      [key]: checked
    }))
  }

  const modalWrapperClass = isPopout
    ? 'h-screen w-screen bg-[#1c1f22] flex flex-col overflow-hidden text-omega-text select-none'
    : 'fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[5000] animate-in fade-in duration-200 text-omega-text select-none'

  const contentWrapperClass = isPopout
    ? 'h-full w-full flex flex-col overflow-hidden'
    : 'bg-[#24272c]/95 border border-gray-700/60 w-[480px] h-[650px] rounded-xl shadow-2xl overflow-hidden flex flex-col backdrop-blur-md animate-in zoom-in-95 duration-200'

  return (
    <div className={modalWrapperClass} onClick={!isPopout ? onClose : undefined}>
      <div className={contentWrapperClass} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-[#1a1d21]/60 px-5 py-3.5 border-b border-gray-800/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Sliders className="text-omega-accent" size={18} />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-omega-accent block">
                {t('symbol_manager.title', { defaultValue: 'Symbol-Manager' })}
              </span>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                {visibleToolbarSectionCount} von {toolbarOrder.length} Symbolen aktiv
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[9px] font-semibold text-blue-100 uppercase tracking-wider">
              Anordnen + Sichtbarkeit
            </div>
            {!isPopout && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-gray-800/50 rounded"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Global Toolbar Quick Actions */}
        <div className="bg-[#181a1e] px-4 py-2.5 border-b border-gray-800/80 flex items-center justify-between flex-shrink-0 gap-2">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wide">
            Globale Aktionen
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={handleShowAll}
              className="px-2.5 py-1 text-[10px] font-medium border border-gray-700 bg-gray-800/40 text-gray-200 rounded hover:border-blue-500/40 hover:text-white transition-all active:scale-[0.97]"
            >
              Alle einblenden
            </button>
            <button
              onClick={handleResetOrder}
              className="px-2.5 py-1 text-[10px] font-medium border border-gray-700 bg-gray-800/40 text-gray-200 rounded hover:border-blue-500/40 hover:text-white transition-all active:scale-[0.97]"
            >
              Reihenfolge Standard
            </button>
            <button
              onClick={handleResetAll}
              className="px-2.5 py-1 text-[10px] font-medium border border-amber-500/30 bg-amber-500/10 text-amber-100 rounded hover:border-amber-400/60 hover:text-white transition-all active:scale-[0.97] flex items-center gap-1"
            >
              <RotateCcw size={10} />
              Standard
            </button>
          </div>
        </div>

        {/* Scrollable list of symbols grouped */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {TOOLBAR_GROUPS.map((group) => {
            const groupKeys = toolbarOrder.filter((key) => group.keys.includes(key))
            if (groupKeys.length === 0) return null

            const visibleCount = groupKeys.filter((key) => toolbarVisibility[key]).length

            return (
              <div
                key={`group-${group.id}`}
                className="bg-[#1e2124]/40 border border-gray-800/80 rounded-lg overflow-hidden"
              >
                {/* Group Header */}
                <div className="bg-[#1b1e22] px-3 py-2 flex items-center justify-between border-b border-gray-800/60">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wide truncate">
                      {group.label}
                    </span>
                    <span className="rounded bg-black/25 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">
                      {visibleCount}/{groupKeys.length}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setToolbarGroupVisibility(groupKeys, true)}
                      className="px-1.5 py-0.5 text-[9px] font-medium border border-gray-700 bg-gray-800/40 text-gray-300 rounded hover:border-blue-500/40 hover:text-white transition-colors"
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setToolbarGroupVisibility(groupKeys, false)}
                      className="px-1.5 py-0.5 text-[9px] font-medium border border-gray-700 bg-gray-800/40 text-gray-300 rounded hover:border-blue-500/40 hover:text-white transition-colors"
                    >
                      Aus
                    </button>
                    <button
                      onClick={() => showOnlyToolbarGroup(groupKeys)}
                      className="px-1.5 py-0.5 text-[9px] font-medium border border-gray-700 bg-gray-800/40 text-gray-300 rounded hover:border-blue-500/40 hover:text-white transition-colors"
                    >
                      Nur diese
                    </button>
                  </div>
                </div>

                {/* Group Items */}
                <div className="divide-y divide-gray-800/40">
                  {groupKeys.map((key) => {
                    const isDragging = draggingKey === key
                    const showBeforeDropHint =
                      dropTarget?.key === key && dropTarget.position === 'before'
                    const showAfterDropHint =
                      dropTarget?.key === key && dropTarget.position === 'after'

                    return (
                      <div key={`item-${key}`} className="relative">
                        {showBeforeDropHint && (
                          <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-500 z-10 animate-pulse" />
                        )}

                        <div
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData('text/plain', key)
                            setDraggingKey(key)
                            setDropTarget(null)
                          }}
                          onDragEnd={() => {
                            setDraggingKey(null)
                            setDropTarget(null)
                          }}
                          onDragOver={(event) => {
                            event.preventDefault()
                            const bounds = event.currentTarget.getBoundingClientRect()
                            const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
                            setDropTarget({ key, position })
                          }}
                          onDrop={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            const draggedKey = event.dataTransfer.getData('text/plain') as ToolbarVisibilityKey
                            const bounds = event.currentTarget.getBoundingClientRect()
                            const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after'
                            reorderToolbarSection(draggedKey, key, position)
                            setDraggingKey(null)
                            setDropTarget(null)
                          }}
                          className={`flex items-center justify-between gap-3 px-3 py-2.5 transition-all cursor-grab group/item ${
                            isDragging
                              ? 'bg-blue-500/10 opacity-50'
                              : 'hover:bg-gray-800/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Drag handle */}
                            <div className="text-gray-600 group-hover/item:text-gray-400 cursor-grab active:cursor-grabbing">
                              <GripVertical size={14} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-gray-200">
                                {TOOLBAR_LABELS[key]}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                {TOOLBAR_DESCRIPTIONS[key]}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Checkbox */}
                            <label className="relative flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={toolbarVisibility[key]}
                                onChange={(e) => handleCheckboxChange(key, e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-8 h-4 bg-gray-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                            </label>
                          </div>
                        </div>

                        {showAfterDropHint && (
                          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500 z-10 animate-pulse" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="bg-[#1a1d21]/60 px-5 py-3 border-t border-gray-800/80 flex items-center justify-end flex-shrink-0">
          <button
            onClick={isPopout ? () => window.close() : onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs font-bold rounded-lg shadow-md transition-all"
          >
            {isPopout ? 'Schließen' : 'Fertig'}
          </button>
        </div>
      </div>
    </div>
  )
}
