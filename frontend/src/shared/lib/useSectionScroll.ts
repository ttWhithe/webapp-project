import { useCallback, useEffect, useRef, useState } from 'react'

export function useSectionScroll(totalSections: number, animMs = 700) {
  const [current, setCurrent] = useState(0)
  const isScrolling = useRef(false)
  const touchStartY = useRef<number | null>(null)
  const currentRef = useRef(0)

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
    // Проверяем, находится ли элемент внутри прокручиваемого контейнера
    function isInsideScrollable(el: EventTarget | null): boolean {
      let node = el as HTMLElement
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node)
        if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') {
          return true
        }
        node = node.parentElement as HTMLElement
      }
      return false
    }

    function onWheel(e: WheelEvent) {
      // Если курсор над прокручиваемым блоком — не переключаем зоны
      if (isInsideScrollable(e.target)) return

      if (Math.abs(e.deltaY) < 5) return
      e.preventDefault()
      goTo(e.deltaY > 0 ? currentRef.current + 1 : currentRef.current - 1)
    }

    function onKeyDown(e: KeyboardEvent) {
      // Игнорируем, если фокус в инпуте или селекте
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

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
      // Если тач начался на прокручиваемом блоке, не начинаем свайп зон
      if (isInsideScrollable(e.target)) {
        touchStartY.current = null
        return
      }
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
