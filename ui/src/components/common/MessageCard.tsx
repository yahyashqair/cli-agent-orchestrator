import * as React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  MessageCircle,
  User,
  ArrowRight,
  MoreHorizontal,
  Reply,
  Forward,
  Trash2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { InboxMessage } from '@/types'
import { cn } from '@/lib/utils'

interface MessageCardProps {
  message: InboxMessage
  currentTerminalId?: string
  className?: string
  onReply?: (message: InboxMessage) => void
  onForward?: (message: InboxMessage) => void
  onDelete?: (messageId: string) => void
}

export function MessageCard({
  message,
  currentTerminalId,
  className,
  onReply,
  onForward,
  onDelete
}: MessageCardProps) {
  const [showActions, setShowActions] = React.useState(false)

  const isSent = currentTerminalId && message.sender_id === currentTerminalId
  const isReceived = currentTerminalId && message.receiver_id === currentTerminalId

  const getStatusIcon = () => {
    switch (message.status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Mail className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusVariant = (): "default" | "destructive" | "outline" | "secondary" => {
    switch (message.status) {
      case 'delivered':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const getDirectionColor = () => {
    if (isSent) return 'border-blue-200 bg-blue-50/50'
    if (isReceived) return 'border-green-200 bg-green-50/50'
    return 'border-gray-200'
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch (error) {
      console.error('Failed to format timestamp:', timestamp, error)
      return 'unknown time'
    }
  }

  const truncateId = (id: string, maxLength: number = 16) => {
    return id.length > maxLength ? id.substring(0, maxLength) + '...' : id
  }

  const handleReply = () => {
    onReply?.(message)
    setShowActions(false)
  }

  const handleForward = () => {
    onForward?.(message)
    setShowActions(false)
  }

  const handleDelete = () => {
    onDelete?.(message.id)
    setShowActions(false)
  }

  return (
    <Card className={cn(
      'relative transition-all hover:shadow-md',
      getDirectionColor(),
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div className="flex items-center space-x-1 text-sm">
                <Send className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium truncate" title={message.sender_id}>
                  {truncateId(message.sender_id)}
                </span>
              </div>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <div className="flex items-center space-x-1 text-sm">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium truncate" title={message.receiver_id}>
                  {truncateId(message.receiver_id)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={getStatusVariant()} className="flex items-center space-x-1">
              {getStatusIcon()}
              <span className="text-xs capitalize">{message.status}</span>
            </Badge>

            <div className="relative">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setShowActions(!showActions)}
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>

              {showActions && (
                <div className="absolute right-0 top-8 z-10 bg-popover border rounded-md shadow-md p-1 min-w-[120px]">
                  {onReply && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start h-8 px-2"
                      onClick={handleReply}
                    >
                      <Reply className="h-3 w-3 mr-2" />
                      Reply
                    </Button>
                  )}
                  {onForward && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start h-8 px-2"
                      onClick={handleForward}
                    >
                      <Forward className="h-3 w-3 mr-2" />
                      Forward
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full justify-start h-8 px-2 text-destructive hover:text-destructive"
                      onClick={handleDelete}
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        <div className="text-sm leading-relaxed">
          <p className="break-words">{message.message}</p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Created {formatTimestamp(message.created_at)}</span>
            </div>

            {message.delivered_at && (
              <div className="flex items-center space-x-1">
                <CheckCircle className="h-3 w-3" />
                <span>Delivered {formatTimestamp(message.delivered_at)}</span>
              </div>
            )}
          </div>

          <div className="font-mono bg-muted px-2 py-1 rounded" title={message.id}>
            ID: {message.id.substring(0, 8)}
          </div>
        </div>

        {/* Direction Indicator */}
        <div className="flex items-center justify-center">
          <div className={cn(
            'flex items-center space-x-2 text-xs px-2 py-1 rounded-full',
            isSent ? 'bg-blue-100 text-blue-700' :
            isReceived ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-700'
          )}>
            {isSent && (
              <>
                <Send className="h-3 w-3" />
                <span>Sent</span>
              </>
            )}
            {isReceived && (
              <>
                <Mail className="h-3 w-3" />
                <span>Received</span>
              </>
            )}
            {!isSent && !isReceived && (
              <>
                <MessageCircle className="h-3 w-3" />
                <span>System</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MessageCard