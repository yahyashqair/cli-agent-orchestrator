import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, Filter, ArrowUpDown, Inbox, AlertCircle, RotateCw } from 'lucide-react';
import { api } from '../api/client';
import MessageCard from './MessageCard';
import type { MessageStatus } from '../types';
import './InboxViewer.css';

interface InboxViewerProps {
  terminalId: string;
}

type TabType = 'all' | 'received' | 'sent';
type SortOrder = 'newest' | 'oldest';

/**
 * InboxViewer component displays inbox messages for a terminal with filtering,
 * sorting, and tab navigation features.
 *
 * Features:
 * - Three tabs: All, Received, Sent messages
 * - Filter by message status (pending, delivered, failed)
 * - Sort by date (newest/oldest first)
 * - Pagination (20 messages per page)
 * - Auto-refresh every 5 seconds
 * - Empty states and error handling
 *
 * @param terminalId - The ID of the terminal to display messages for
 */
export default function InboxViewer({ terminalId }: InboxViewerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [statusFilter, setStatusFilter] = useState<MessageStatus | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const messagesPerPage = 20;

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
  });

  // Filter and sort messages based on active filters
  const filteredAndSortedMessages = useMemo(() => {
    let filtered = [...messages];

    // Filter by tab
    if (activeTab === 'received') {
      filtered = filtered.filter((msg) => msg.receiver_id === terminalId);
    } else if (activeTab === 'sent') {
      filtered = filtered.filter((msg) => msg.sender_id === terminalId);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((msg) => msg.status === statusFilter);
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [messages, activeTab, statusFilter, sortOrder, terminalId]);

  // Calculate pagination
  const indexOfLastMessage = currentPage * messagesPerPage;
  const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;
  const currentMessages = filteredAndSortedMessages.slice(indexOfFirstMessage, indexOfLastMessage);
  const totalPages = Math.ceil(filteredAndSortedMessages.length / messagesPerPage);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, sortOrder]);

  // Calculate tab counts
  const tabCounts = useMemo(() => {
    return {
      all: messages.length,
      received: messages.filter((msg) => msg.receiver_id === terminalId).length,
      sent: messages.filter((msg) => msg.sender_id === terminalId).length,
    };
  }, [messages, terminalId]);

  // Calculate pending count for current view
  const pendingCount = useMemo(() => {
    return filteredAndSortedMessages.filter((msg) => msg.status === 'pending').length;
  }, [filteredAndSortedMessages]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleStatusFilterChange = (status: MessageStatus | 'all') => {
    setStatusFilter(status);
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'));
  };

  const handleRefresh = () => {
    void refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="inbox-viewer">
        <div className="inbox-loading">
          <RotateCw size={24} className="loading-spinner" />
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="inbox-viewer">
        <div className="inbox-error">
          <AlertCircle size={32} />
          <h3>Failed to load messages</h3>
          <p>{error instanceof Error ? error.message : 'An unknown error occurred'}</p>
          <button className="btn btn-primary" onClick={handleRefresh}>
            <RotateCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-viewer">
      {/* Header with tabs */}
      <div className="inbox-header">
        <div className="inbox-tabs">
          <button
            className={`inbox-tab ${activeTab === 'all' ? 'inbox-tab-active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            <Mail size={16} />
            All
            {tabCounts.all > 0 && <span className="tab-count">{tabCounts.all}</span>}
          </button>
          <button
            className={`inbox-tab ${activeTab === 'received' ? 'inbox-tab-active' : ''}`}
            onClick={() => handleTabChange('received')}
          >
            <Inbox size={16} />
            Received
            {tabCounts.received > 0 && <span className="tab-count">{tabCounts.received}</span>}
          </button>
          <button
            className={`inbox-tab ${activeTab === 'sent' ? 'inbox-tab-active' : ''}`}
            onClick={() => handleTabChange('sent')}
          >
            <Mail size={16} />
            Sent
            {tabCounts.sent > 0 && <span className="tab-count">{tabCounts.sent}</span>}
          </button>
        </div>

        {pendingCount > 0 && (
          <div className="inbox-pending-badge">
            {pendingCount} pending
          </div>
        )}
      </div>

      {/* Filters and controls */}
      <div className="inbox-controls">
        <div className="inbox-filters">
          <Filter size={14} />
          <span className="filter-label">Status:</span>
          <select
            className="inbox-filter-select"
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value as MessageStatus | 'all')}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="inbox-sort">
          <button className="btn btn-sm btn-secondary" onClick={toggleSortOrder}>
            <ArrowUpDown size={14} />
            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </button>
        </div>

        <button className="btn btn-sm btn-secondary" onClick={handleRefresh} title="Refresh messages">
          <RotateCw size={14} />
        </button>
      </div>

      {/* Messages list */}
      <div className="inbox-messages">
        {filteredAndSortedMessages.length === 0 ? (
          <div className="inbox-empty">
            <Mail size={48} />
            <h3>No messages</h3>
            <p>
              {statusFilter !== 'all'
                ? `No ${statusFilter} messages found`
                : activeTab === 'received'
                ? 'No received messages yet'
                : activeTab === 'sent'
                ? 'No sent messages yet'
                : 'No messages yet'}
            </p>
          </div>
        ) : (
          currentMessages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              currentTerminalId={terminalId}
            />
          ))
        )}
      </div>

      {/* Pagination controls */}
      {filteredAndSortedMessages.length > messagesPerPage && (
        <div className="inbox-pagination">
          <button
            onClick={() => setCurrentPage(prev => prev - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
