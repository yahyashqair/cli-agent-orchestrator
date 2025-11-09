import { useState, useCallback, useRef, useEffect } from 'react'

export type CopyStatus = 'idle' | 'copied' | 'error'

export const useCopyToClipboard = (resetDelay: number = 2000) => {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const copyResetTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
        copyResetTimeoutRef.current = null
      }
    }
  }, [])

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.position = 'absolute'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }

      setCopyStatus('copied')

      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setCopyStatus('idle')
      }, resetDelay)

      return true
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      setCopyStatus('error')

      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current)
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setCopyStatus('idle')
      }, resetDelay)

      return false
    }
  }, [resetDelay])

  return {
    copyStatus,
    copyToClipboard,
    isCopied: copyStatus === 'copied',
    isError: copyStatus === 'error',
  }
}