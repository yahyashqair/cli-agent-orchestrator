export type Theme = 'dark' | 'light' | 'cream' | 'lavender' | 'mint' | 'rose' | 'sky' | 'cyberpunk' | 'ocean' | 'forest' | 'firefox' | 'sunset' | 'monospace'

export interface ThemeConfig {
  name: string
  colors: {
    background: string
    foreground: string
    card: string
    cardForeground: string
    primary: string
    primaryForeground: string
    secondary: string
    secondaryForeground: string
    muted: string
    mutedForeground: string
    accent: string
    accentForeground: string
    destructive: string
    destructiveForeground: string
    border: string
    input: string
    ring: string
  }
}

export const themes: Record<Theme, ThemeConfig> = {
  dark: {
    name: 'Dark',
    colors: {
      background: '222.2 84% 4.9%',
      foreground: '210 40% 98%',
      card: '222.2 84% 4.9%',
      cardForeground: '210 40% 98%',
      primary: '210 40% 98%',
      primaryForeground: '222.2 47.4% 11.2%',
      secondary: '217.2 32.6% 17.5%',
      secondaryForeground: '210 40% 98%',
      muted: '217.2 32.6% 17.5%',
      mutedForeground: '215 20.2% 65.1%',
      accent: '217.2 32.6% 17.5%',
      accentForeground: '210 40% 98%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '210 40% 98%',
      border: '217.2 32.6% 17.5%',
      input: '217.2 32.6% 17.5%',
      ring: '212.7 26.8% 83.9%',
    },
  },
  light: {
    name: 'Light',
    colors: {
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      card: '0 0% 100%',
      cardForeground: '222.2 84% 4.9%',
      primary: '222.2 47.4% 11.2%',
      primaryForeground: '210 40% 98%',
      secondary: '210 40% 96.1%',
      secondaryForeground: '222.2 47.4% 11.2%',
      muted: '210 40% 96.1%',
      mutedForeground: '215.4 16.3% 46.9%',
      accent: '210 40% 96.1%',
      accentForeground: '222.2 47.4% 11.2%',
      destructive: '0 84.2% 60.2%',
      destructiveForeground: '210 40% 98%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '222.2 84% 4.9%',
    },
  },
  cream: {
    name: 'Cream',
    colors: {
      background: '45 30% 98%',
      foreground: '30 20% 15%',
      card: '45 25% 95%',
      cardForeground: '30 20% 15%',
      primary: '30 40% 20%',
      primaryForeground: '45 30% 98%',
      secondary: '45 20% 90%',
      secondaryForeground: '30 20% 15%',
      muted: '45 15% 88%',
      mutedForeground: '30 15% 45%',
      accent: '35 25% 85%',
      accentForeground: '30 20% 15%',
      destructive: '15 70% 55%',
      destructiveForeground: '45 30% 98%',
      border: '45 20% 85%',
      input: '45 20% 85%',
      ring: '30 40% 50%',
    },
  },
  lavender: {
    name: 'Lavender',
    colors: {
      background: '270 25% 97%',
      foreground: '260 30% 20%',
      card: '270 20% 94%',
      cardForeground: '260 30% 20%',
      primary: '270 45% 35%',
      primaryForeground: '270 25% 97%',
      secondary: '270 15% 90%',
      secondaryForeground: '260 30% 20%',
      muted: '270 10% 85%',
      mutedForeground: '260 20% 50%',
      accent: '275 25% 88%',
      accentForeground: '260 30% 20%',
      destructive: '330 65% 50%',
      destructiveForeground: '270 25% 97%',
      border: '270 15% 82%',
      input: '270 15% 82%',
      ring: '270 45% 60%',
    },
  },
  mint: {
    name: 'Mint',
    colors: {
      background: '160 25% 96%',
      foreground: '155 25% 18%',
      card: '160 20% 93%',
      cardForeground: '155 25% 18%',
      primary: '160 40% 25%',
      primaryForeground: '160 25% 96%',
      secondary: '160 15% 88%',
      secondaryForeground: '155 25% 18%',
      muted: '160 10% 82%',
      mutedForeground: '155 20% 48%',
      accent: '165 20% 85%',
      accentForeground: '155 25% 18%',
      destructive: '10 70% 52%',
      destructiveForeground: '160 25% 96%',
      border: '160 15% 78%',
      input: '160 15% 78%',
      ring: '160 40% 55%',
    },
  },
  rose: {
    name: 'Rose',
    colors: {
      background: '350 30% 96%',
      foreground: '345 25% 18%',
      card: '350 25% 93%',
      cardForeground: '345 25% 18%',
      primary: '350 40% 30%',
      primaryForeground: '350 30% 96%',
      secondary: '350 15% 88%',
      secondaryForeground: '345 25% 18%',
      muted: '350 10% 82%',
      mutedForeground: '345 20% 48%',
      accent: '355 25% 85%',
      accentForeground: '345 25% 18%',
      destructive: '0 70% 52%',
      destructiveForeground: '350 30% 96%',
      border: '350 15% 78%',
      input: '350 15% 78%',
      ring: '350 40% 55%',
    },
  },
  sky: {
    name: 'Sky',
    colors: {
      background: '200 30% 96%',
      foreground: '195 25% 18%',
      card: '200 25% 93%',
      cardForeground: '195 25% 18%',
      primary: '200 40% 30%',
      primaryForeground: '200 30% 96%',
      secondary: '200 15% 88%',
      secondaryForeground: '195 25% 18%',
      muted: '200 10% 82%',
      mutedForeground: '195 20% 48%',
      accent: '205 25% 85%',
      accentForeground: '195 25% 18%',
      destructive: '10 70% 52%',
      destructiveForeground: '200 30% 96%',
      border: '200 15% 78%',
      input: '200 15% 78%',
      ring: '200 40% 55%',
    },
  },
  cyberpunk: {
    name: 'Cyberpunk',
    colors: {
      background: '280 20% 8%',
      foreground: '120 60% 85%',
      card: '280 25% 10%',
      cardForeground: '120 60% 85%',
      primary: '120 80% 60%',
      primaryForeground: '280 20% 8%',
      secondary: '280 15% 20%',
      secondaryForeground: '120 50% 75%',
      muted: '280 10% 15%',
      mutedForeground: '120 30% 55%',
      accent: '300 70% 50%',
      accentForeground: '280 20% 8%',
      destructive: '0 90% 65%',
      destructiveForeground: '280 20% 8%',
      border: '280 15% 25%',
      input: '280 15% 25%',
      ring: '120 80% 70%',
    },
  },
  ocean: {
    name: 'Ocean',
    colors: {
      background: '210 40% 8%',
      foreground: '190 30% 95%',
      card: '210 35% 12%',
      cardForeground: '190 30% 95%',
      primary: '190 50% 40%',
      primaryForeground: '210 40% 8%',
      secondary: '210 20% 18%',
      secondaryForeground: '190 25% 85%',
      muted: '210 15% 15%',
      mutedForeground: '190 20% 65%',
      accent: '200 40% 35%',
      accentForeground: '210 40% 8%',
      destructive: '5 80% 55%',
      destructiveForeground: '210 40% 8%',
      border: '210 20% 25%',
      input: '210 20% 25%',
      ring: '190 50% 60%',
    },
  },
  forest: {
    name: 'Forest',
    colors: {
      background: '120 20% 10%',
      foreground: '120 15% 90%',
      card: '120 25% 12%',
      cardForeground: '120 15% 90%',
      primary: '120 30% 35%',
      primaryForeground: '120 20% 10%',
      secondary: '120 15% 20%',
      secondaryForeground: '120 10% 80%',
      muted: '120 10% 15%',
      mutedForeground: '120 8% 60%',
      accent: '110 25% 30%',
      accentForeground: '120 20% 10%',
      destructive: '30 70% 50%',
      destructiveForeground: '120 20% 10%',
      border: '120 15% 22%',
      input: '120 15% 22%',
      ring: '120 30% 50%',
    },
  },
  firefox: {
    name: 'Firefox',
    colors: {
      background: '15 30% 12%',
      foreground: '15 10% 95%',
      card: '15 25% 15%',
      cardForeground: '15 10% 95%',
      primary: '15 50% 45%',
      primaryForeground: '15 30% 12%',
      secondary: '15 15% 25%',
      secondaryForeground: '15 8% 85%',
      muted: '15 10% 20%',
      mutedForeground: '15 6% 65%',
      accent: '10 40% 40%',
      accentForeground: '15 30% 12%',
      destructive: '0 80% 55%',
      destructiveForeground: '15 30% 12%',
      border: '15 15% 28%',
      input: '15 15% 28%',
      ring: '15 50% 60%',
    },
  },
  sunset: {
    name: 'Sunset',
    colors: {
      background: '25 40% 12%',
      foreground: '20 15% 92%',
      card: '25 35% 15%',
      cardForeground: '20 15% 92%',
      primary: '25 60% 50%',
      primaryForeground: '25 40% 12%',
      secondary: '25 20% 25%',
      secondaryForeground: '20 10% 82%',
      muted: '25 12% 20%',
      mutedForeground: '20 8% 62%',
      accent: '30 45% 45%',
      accentForeground: '25 40% 12%',
      destructive: '340 75% 52%',
      destructiveForeground: '25 40% 12%',
      border: '25 20% 30%',
      input: '25 20% 30%',
      ring: '25 60% 65%',
    },
  },
  monospace: {
    name: 'Monospace',
    colors: {
      background: '0 0% 8%',
      foreground: '0 0% 92%',
      card: '0 0% 10%',
      cardForeground: '0 0% 92%',
      primary: '0 0% 88%',
      primaryForeground: '0 0% 8%',
      secondary: '0 0% 20%',
      secondaryForeground: '0 0% 88%',
      muted: '0 0% 15%',
      mutedForeground: '0 0% 60%',
      accent: '0 0% 25%',
      accentForeground: '0 0% 92%',
      destructive: '0 70% 50%',
      destructiveForeground: '0 0% 92%',
      border: '0 0% 22%',
      input: '0 0% 22%',
      ring: '0 0% 70%',
    },
  },
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  const themeConfig = themes[theme]

  Object.entries(themeConfig.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value)
  })

  root.setAttribute('data-theme', theme)
}