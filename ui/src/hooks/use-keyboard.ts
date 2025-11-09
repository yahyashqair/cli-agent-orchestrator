import * as React from 'react'

interface KeyboardOptions {
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  preventDefault?: boolean
}

export function useKeyboard(
  key: string,
  callback: () => void,
  options: KeyboardOptions = {}
) {
  const {
    ctrl = false,
    shift = false,
    alt = false,
    meta = false,
    preventDefault = true,
  } = options

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key matches
      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return
      }

      // Check modifier keys
      if (ctrl !== event.ctrlKey) return
      if (shift !== event.shiftKey) return
      if (alt !== event.altKey) return
      if (meta !== event.metaKey) return

      // Prevent default if requested
      if (preventDefault) {
        event.preventDefault()
      }

      // Execute callback
      callback()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, callback, ctrl, shift, alt, meta, preventDefault])
}