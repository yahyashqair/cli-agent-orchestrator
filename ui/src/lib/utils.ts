import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleString()
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'idle':
      return 'text-blue-500'
    case 'processing':
      return 'text-yellow-500'
    case 'completed':
      return 'text-green-500'
    case 'error':
      return 'text-red-500'
    case 'waiting_user_answer':
      return 'text-orange-500'
    default:
      return 'text-gray-500'
  }
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}