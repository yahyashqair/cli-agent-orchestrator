import * as React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Mail,
  Filter,
  ArrowUpDown,
  Inbox,
  AlertCircle,
  RotateCcw,
  Send,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import MessageCard from '@/components/common/MessageCard'
import type { MessageStatus, InboxMessage } from '@/types'
import { cn } from '@/lib/utils'

interface InboxViewerProps {
  terminalId?: string
  className?: string
  onMessageReply?: (message: InboxMessage) => void
  onMessageForward?: (message: InboxMessage) => void
  onMessageDelete?: (messageId: string) => void
}

type TabType = 'all' | 'received' | 'sent'
type SortOrder = 'newest' | 'oldest'

export function InboxViewer({
  terminalId = 'default-terminal',
  className,
  onMessageReply,
  onMessageForward,
  onMessageDelete
}: InboxViewerProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>('all')
  const [statusFilter, setStatusFilter] = React.useState<MessageStatus | 'all'>('all')
  const [sortOrder, setSortOrder] = React.useState<SortOrder>('newest')
  const [currentPage, setCurrentPage] = React.useState(1)
  const messagesPerPage = 20

  // Fetch inbox messages with auto-refresh every 5 seconds
  const {
    data: messages = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['inbox-messages', terminalId],
    queryFn: () => api.getInboxMessages(terminalId),
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    refetchOnWindowFocus: true,
  })

  // Filter and sort messages based on active filters
  const filteredAndSortedMessages = React.useMemo(() => {
    let filtered = [...messages]

    // Filter by tab
    if (activeTab === 'received') {
      filtered = filtered.filter((msg) => msg.receiver_id === terminalId)
    } else if (activeTab === 'sent') {
      filtered = filtered.filter((msg) => msg.sender_id === terminalId)
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((msg) => msg.status === statusFilter)
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [messages, activeTab, statusFilter, sortOrder, terminalId])

  // Calculate pagination
  const indexOfLastMessage = currentPage * messagesPerPage
  const indexOfFirstMessage = indexOfLastMessage - messagesPerPage
  const currentMessages = filteredAndSortedMessages.slice(indexOfFirstMessage, indexOfLastMessage)
  const totalPages = Math.ceil(filteredAndSortedMessages.length / messagesPerPage)

  // Reset page to 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, statusFilter, sortOrder])

  // Calculate tab counts
  const tabCounts = React.useMemo(() => {
    return {
      all: messages.length,
      received: messages.filter((msg) => msg.receiver_id === terminalId).length,
      sent: messages.filter((msg) => msg.sender_id === terminalId).length,
    }
  }, [messages, terminalId])

  // Calculate pending count for current view
  const pendingCount = React.useMemo(() => {
    return filteredAndSortedMessages.filter((msg) => msg.status === 'pending').length
  }, [filteredAndSortedMessages])

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
  }

  const handleStatusFilterChange = (status: MessageStatus | 'all') => {
    setStatusFilter(status)
  }

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))
  }

  const handleRefresh = () => {
    void refetch()
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (isError) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="flex flex-col items-center justify-center h-96 p-6">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load messages</h3>
          <p className="text-muted-foreground text-center mb-6">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <Button onClick={handleRefresh}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Message Inbox</h2>
          <p className="text-muted-foreground">
            Manage terminal messages and communications
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <Clock className="h-3 w-3 mr-1" />
              {pendingCount} pending
            </Badge>
          )}
          <Button variant="outline" onClick={handleRefresh}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as TabType)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>All</span>
            {tabCounts.all > 0 && (
              <Badge variant="secondary" className="ml-1">
                {tabCounts.all}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center space-x-2">
            <Inbox className="h-4 w-4" />
            <span>Received</span>
            {tabCounts.received > 0 && (
              <Badge variant="secondary" className="ml-1">
                {tabCounts.received}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center space-x-2">
            <Send className="h-4 w-4" />
            <span>Sent</span>
            {tabCounts.sent > 0 && (
              <Badge variant="secondary" className="ml-1">
                {tabCounts.sent}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Filters and controls */}
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Status:</span>
              <Select
                value={statusFilter}
                onValueChange={(value) => handleStatusFilterChange(value as MessageStatus | 'all')}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                {filteredAndSortedMessages.length} messages
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortOrder}
            className="flex items-center space-x-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
          </Button>
        </div>

        <Separator />

        {/* Tab content */}
        <TabsContent value={activeTab} className="mt-0">
          {filteredAndSortedMessages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-96">
                <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No messages</h3>
                <p className="text-muted-foreground text-center">
                  {statusFilter !== 'all'
                    ? `No ${statusFilter} messages found`
                    : activeTab === 'received'
                    ? 'No received messages yet'
                    : activeTab === 'sent'
                    ? 'No sent messages yet'
                    : 'No messages yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Status summary */}
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    {filteredAndSortedMessages.filter(m => m.status === 'delivered').length} delivered
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span>
                    {filteredAndSortedMessages.filter(m => m.status === 'pending').length} pending
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>
                    {filteredAndSortedMessages.filter(m => m.status === 'failed').length} failed
                  </span>
                </div>
              </div>

              {/* Messages list */}
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {currentMessages.map((message) => (
                    <MessageCard
                      key={message.id}
                      message={message}
                      currentTerminalId={terminalId}
                      onReply={onMessageReply}
                      onForward={onMessageForward}
                      onDelete={onMessageDelete}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Pagination controls */}
              {filteredAndSortedMessages.length > messagesPerPage && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {indexOfFirstMessage + 1} to {Math.min(indexOfLastMessage, filteredAndSortedMessages.length)} of {filteredAndSortedMessages.length} messages
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default InboxViewer
