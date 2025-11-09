import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'

interface FullscreenPortalProps {
  children: ReactNode
}

export default function FullscreenPortal({ children }: FullscreenPortalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const container = document.createElement('div')
    container.className = 'terminal-fullscreen-overlay'
    document.body.appendChild(container)
    containerRef.current = container
    document.body.classList.add('terminal-fullscreen-active')
    setIsMounted(true)

    return () => {
      document.body.classList.remove('terminal-fullscreen-active')
      if (containerRef.current) {
        document.body.removeChild(containerRef.current)
        containerRef.current = null
      }
    }
  }, [])

  if (!isMounted || !containerRef.current) {
    return null
  }

  return createPortal(children, containerRef.current)
}
