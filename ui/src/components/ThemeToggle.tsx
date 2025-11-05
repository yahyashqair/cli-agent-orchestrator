import { ChangeEvent } from 'react'
import { THEMES, type Theme } from '../types'
import './ThemeToggle.css'

interface ThemeToggleProps {
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onThemeChange(event.target.value as Theme)
  }

  return (
    <div className="theme-toggle">
      <label className="theme-toggle__label" htmlFor="theme-select">
        Theme
      </label>
      <select
        id="theme-select"
        className="theme-toggle__select"
        value={theme}
        onChange={handleChange}
        aria-label="Select color theme"
      >
        {THEMES.map((availableTheme) => (
          <option key={availableTheme} value={availableTheme}>
            {availableTheme.charAt(0).toUpperCase() + availableTheme.slice(1)}
          </option>
        ))}
      </select>
    </div>
  )
}

export default ThemeToggle
