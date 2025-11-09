# Component Library Documentation

## Overview
This is a comprehensive component library built with Radix UI primitives and Tailwind CSS. All components are fully accessible, responsive, and follow modern React patterns.

## Design System

### Colors
The design system uses CSS custom properties for theming:
- `--background`: Main background color
- `--foreground`: Main text color
- `--primary`: Primary brand color
- `--secondary`: Secondary color
- `--muted`: Muted/gray colors
- `--accent`: Accent color for highlights
- `--destructive`: Error/danger color

### Typography
- **Font Family**: Inter for UI, JetBrains Mono for code
- **Font Sizes**: Responsive scaling from `text-xs` to `text-3xl`
- **Font Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

### Spacing
Consistent spacing scale using Tailwind's spacing units:
- Padding: `p-1` to `p-8`
- Margin: `m-1` to `m-8`
- Gap: `gap-1` to `gap-8`

## Components

### Base Components

#### Button
```tsx
import { Button } from '@/components/ui/button'

<Button variant="default" size="md">
  Click me
</Button>
```

**Variants:** `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `glass`
**Sizes:** `xs`, `sm`, `default`, `lg`, `icon`

#### Card
```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content goes here
  </CardContent>
</Card>
```

#### Input
```tsx
import { Input } from '@/components/ui/input'

<Input placeholder="Enter text" label="Label" error="Error message" />
```

#### Select
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Layout Components

#### Panel
```tsx
import { Panel } from '@/components/layout/panel'

<Panel glass elevated>
  Panel content
</Panel>
```

### Feature Components

#### Dashboard
```tsx
import { Dashboard } from '@/components/features/dashboard/Dashboard'

<Dashboard />
```

#### TerminalViewer
```tsx
import { TerminalViewer } from '@/components/features/terminal/TerminalViewer'

<TerminalViewer sessionId="session-123" terminalId="/dev/pts/0" />
```

#### SessionList
```tsx
import { SessionList } from '@/components/features/sessions/SessionList'

<SessionList
  onSessionSelect={(id) => console.log(id)}
  selectedSessionId="session-123"
/>
```

## Hooks

### useTheme
```tsx
import { useTheme } from '@/hooks/use-theme'

const { theme, setTheme } = useTheme()
```

### useKeyboard
```tsx
import { useKeyboard } from '@/hooks/use-keyboard'

useKeyboard('k', () => console.log('Ctrl+K pressed'), { ctrl: true })
```

## Patterns

### Form Patterns
Use the `Input` component with proper labeling and error handling:
```tsx
<Input
  id="email"
  type="email"
  label="Email Address"
  placeholder="Enter your email"
  error={errors.email}
  {...register('email')}
/>
```

### Loading States
Use loading spinners and skeleton states:
```tsx
{isLoading ? (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
) : (
  <Content />
)}
```

### Error Handling
Display errors gracefully:
```tsx
{error && (
  <div className="text-destructive text-sm">
    {error.message}
  </div>
)}
```

## Accessibility

All components follow WCAG 2.1 guidelines:
- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## Responsive Design

Components are responsive by default:
- Mobile-first approach
- Breakpoint-specific classes
- Flexible layouts
- Touch-friendly interactions

## Customization

### Theme Customization
Extend the theme in `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      brand: {
        50: '#eff6ff',
        500: '#3b82f6',
        900: '#1e3a8a',
      }
    }
  }
}
```

### Component Variants
Use Class Variance Authority for component variants:
```tsx
const buttonVariants = cva(baseClasses, {
  variants: {
    variant: {
      primary: 'bg-brand-500 text-white',
      secondary: 'bg-gray-100 text-gray-900',
    }
  }
})
```

## Best Practices

1. **Composition over inheritance** - Combine components to create complex UIs
2. **Consistent props** - Use similar prop names across components
3. **TypeScript first** - All components are fully typed
4. **Performance** - Use `React.memo` for expensive components
5. **Testing** - All components should be tested
6. **Documentation** - Document complex components and patterns

## Migration Guide

When migrating from the old UI system:

1. Replace custom CSS classes with Tailwind utilities
2. Use new component variants instead of inline styles
3. Implement proper TypeScript types
4. Add accessibility attributes
5. Test responsive behavior
6. Update error handling patterns

## Contributing

When adding new components:

1. Follow existing patterns and conventions
2. Add proper TypeScript types
3. Include accessibility features
4. Write documentation
5. Add responsive design
6. Test with different themes
7. Ensure keyboard navigation works