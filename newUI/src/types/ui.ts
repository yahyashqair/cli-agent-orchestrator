// UI-specific types and interfaces
export interface Theme {
  name: string;
  colors: Record<string, string>;
  isDark: boolean;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  badge?: number;
  children?: NavigationItem[];
}

export interface Command {
  id: string;
  label: string;
  icon: string;
  shortcut?: string[];
  action: () => void;
  category?: string;
}

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    action: () => void;
  };
}

export interface WebSocketMessage {
  type: 'terminal_output' | 'session_update' | 'message_notification' | 'connection_status';
  data: any;
  timestamp: string;
}

export interface Activity {
  id: string;
  type: 'terminal' | 'session' | 'flow' | 'message';
  action: string;
  target: string;
  timestamp: string;
  details?: Record<string, any>;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  action: () => void;
  disabled?: boolean;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'table' | 'list';
  size: 'small' | 'medium' | 'large';
  data: any;
  refreshInterval?: number;
}

export interface UserPreferences {
  theme: string;
  language: string;
  notifications: boolean;
  autoRefresh: boolean;
  keyboardShortcuts: boolean;
  compactMode: boolean;
}