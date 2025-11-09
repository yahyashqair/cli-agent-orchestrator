import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Status-specific variants
        success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        warning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
        error: "border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        info: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        // Terminal status variants
        status: "border-transparent",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  const statusColor = React.useMemo(() => {
    if (variant === 'status' && props.children) {
      const status = props.children as string;
      switch (status) {
        case 'idle':
          return 'border-transparent bg-status-idle/10 text-status-idle border-status-idle/20';
        case 'processing':
          return 'border-transparent bg-status-processing/10 text-status-processing border-status-processing/20';
        case 'completed':
          return 'border-transparent bg-status-completed/10 text-status-completed border-status-completed/20';
        case 'error':
          return 'border-transparent bg-status-error/10 text-status-error border-status-error/20';
        case 'waiting_user_answer':
          return 'border-transparent bg-status-waiting/10 text-status-waiting border-status-waiting/20';
        case 'active':
          return 'border-transparent bg-green-500/10 text-green-600 border-green-500/20';
        case 'detached':
          return 'border-transparent bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
        case 'terminated':
          return 'border-transparent bg-red-500/10 text-red-600 border-red-500/20';
        default:
          return '';
      }
    }
    return '';
  }, [variant, props.children]);

  return (
    <div className={cn(badgeVariants({ variant, size }), statusColor, className)} {...props} />
  )
}

export { Badge, badgeVariants }