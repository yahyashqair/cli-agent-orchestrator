import * as React from "react"
import { cn } from "@/lib/utils"

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  glass?: boolean
  elevated?: boolean
}

const Panel = React.forwardRef<HTMLDivElement, PanelProps>(
  ({ className, children, glass, elevated, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg border bg-card text-card-foreground shadow-sm',
          glass && 'bg-white/10 backdrop-blur-sm border-white/20 text-white',
          elevated && 'shadow-lg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Panel.displayName = "Panel"

export { Panel }