import { useRef, useEffect, forwardRef } from 'react'
import { Send } from 'lucide-react'

interface TerminalInputProps {
  input: string
  onInputChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  isPending: boolean
  placeholder?: string
}

export default forwardRef<HTMLInputElement, TerminalInputProps>(function TerminalInput({
  input,
  onInputChange,
  onSubmit,
  isPending,
  placeholder = 'Send input to terminal...',
}: TerminalInputProps, ref) {
  const internalRef = useRef<HTMLInputElement>(null)
  const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef

  // Focus input when component mounts or when pending state changes
  useEffect(() => {
    if (!isPending) {
      inputRef.current?.focus()
    }
  }, [isPending])

  return (
    <form onSubmit={onSubmit} className="terminal-input-form">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder={placeholder}
        className="terminal-input"
        disabled={isPending}
      />
      <button
        type="submit"
        className="btn btn-primary"
        disabled={!input.trim() || isPending}
      >
        <Send size={16} />
        Send
      </button>
    </form>
  )
})