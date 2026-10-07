import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Vertical section scrolling with wheel + touch + keyboard.
 * Locks during animation to avoid skipping sections.
 */
export function useSectionScroll(totalSections: number, animMs = 700) {
  const [current, setCurrent] = useState(0)
  const isScrolling = useRef(false)
  const touchStartY = useRef<number | null>(null)
  const currentRef = useRef(0)

  // Keep ref in sync — avoids stale closures without adding current to deps.
  // Synced in an effect, not during render, to satisfy react-hooks/refs.
  useEffect(() => {
    currentRef.current = current
  }, [current])

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSections) return
      if (isScrolling.current) return
      if (index === currentRef.current) return
      isScrolling.current = true
      setCurrent(index)
      setTimeout(() => {
        isScrolling.current = false
      }, animMs)
    },
    [totalSections, animMs],
  )

  useEffect(() => {
    function onWheel(e: WheelEvent) {
      if (Math.abs(e.deltaY) < 5) return
      e.preventDefault()
      goTo(e.deltaY > 0 ? currentRef.current + 1 : currentRef.current - 1)
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        goTo(currentRef.current + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        goTo(currentRef.current - 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        goTo(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        goTo(totalSections - 1)
      }
    }

    function onTouchStart(e: TouchEvent) {
      touchStartY.current = e.touches[0].clientY
    }

    function onTouchEnd(e: TouchEvent) {
      if (touchStartY.current === null) return
      const delta = touchStartY.current - e.changedTouches[0].clientY
      touchStartY.current = null
      if (Math.abs(delta) < 50) return
      goTo(delta > 0 ? currentRef.current + 1 : currentRef.current - 1)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [goTo, totalSections])

  return { current, goTo }
}
