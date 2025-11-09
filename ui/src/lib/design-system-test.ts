// Test file to verify design system functionality
// This file is for testing purposes and can be removed

import { applyTheme, themes } from './theme'
import { buttonVariants, cardVariants, inputVariants, badgeVariants } from './variants'

// Test theme system
console.log('Available themes:', Object.keys(themes))
console.log('Dark theme colors:', themes.dark.colors)

// Test applyTheme function
try {
  applyTheme('dark')
  console.log('✅ applyTheme function works')
} catch (error) {
  console.error('❌ applyTheme function failed:', error)
}

// Test component variants
try {
  const buttonClass = buttonVariants({ variant: 'default', size: 'default' })
  const cardClass = cardVariants({ variant: 'glass', padding: 'lg' })
  const inputClass = inputVariants({ variant: 'error', size: 'sm' })
  const badgeClass = badgeVariants({ variant: 'success', size: 'lg' })

  console.log('✅ Component variants work')
  console.log('Button classes:', buttonClass)
  console.log('Card classes:', cardClass)
  console.log('Input classes:', inputClass)
  console.log('Badge classes:', badgeClass)
} catch (error) {
  console.error('❌ Component variants failed:', error)
}

export default function testDesignSystem() {
  console.log('🎨 Design System Test Complete')
}
