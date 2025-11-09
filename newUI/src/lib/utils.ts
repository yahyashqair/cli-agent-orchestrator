import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'HH:mm')}`;
  }

  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, 'HH:mm')}`;
  }

  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastTime >= wait) {
      lastTime = now;
      func(...args);
    }
  };
}

export function generateId(prefix = '', length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix ? `${prefix}_${result}` : result;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'idle':
      return 'text-status-idle bg-status-idle/10';
    case 'processing':
      return 'text-status-processing bg-status-processing/10';
    case 'completed':
      return 'text-status-completed bg-status-completed/10';
    case 'error':
      return 'text-status-error bg-status-error/10';
    case 'waiting_user_answer':
      return 'text-status-waiting bg-status-waiting/10';
    case 'active':
      return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
    case 'detached':
      return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950';
    case 'terminated':
      return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950';
    default:
      return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950';
  }
}

export function getProviderIcon(provider: string): string {
  switch (provider) {
    case 'claude_code':
      return 'bot';
    case 'q_cli':
      return 'cloud';
    case 'copilot_cli':
      return 'github';
    case 'codex_cli':
      return 'code-2';
    case 'opencode':
      return 'terminal';
    default:
      return 'cpu';
  }
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return Promise.resolve(successful);
    } catch (error) {
      document.body.removeChild(textArea);
      return Promise.resolve(false);
    }
  }
}

export function downloadFile(content: string, filename: string, contentType = 'text/plain') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function validateInput(input: string, rules: {
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  required?: boolean;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (rules.required && !input.trim()) {
    errors.push('This field is required');
  }

  if (rules.minLength && input.length < rules.minLength) {
    errors.push(`Minimum length is ${rules.minLength} characters`);
  }

  if (rules.maxLength && input.length > rules.maxLength) {
    errors.push(`Maximum length is ${rules.maxLength} characters`);
  }

  if (rules.pattern && !rules.pattern.test(input)) {
    errors.push('Invalid format');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}