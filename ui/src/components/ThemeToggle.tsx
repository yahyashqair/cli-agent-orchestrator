import { ChangeEvent } from 'react'
import type { Theme } from '../types'
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
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="cream">Cream</option>
        <option value="lavender">Lavender</option>
        <option value="mint">Mint</option>
        <option value="rose">Rose</option>
        <option value="sky">Sky</option>
        <option value="cyberpunk">Cyberpunk</option>
        <option value="ocean">Ocean</option>
        <option value="forest">Forest</option>
        <option value="sunset">Sunset</option>
        <option value="monospace">Monospace</option>
      </select>
    </div>
  )
}

export default ThemeToggle
