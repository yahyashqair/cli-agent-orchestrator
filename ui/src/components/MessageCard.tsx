import { formatDistanceToNow } from 'date-fns';
import { Mail, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import type { InboxMessage } from '../types';
import './MessageCard.css';

interface MessageCardProps {
  message: InboxMessage;
  currentTerminalId?: string;
}

/**
 * MessageCard component displays a single inbox message with sender/receiver info,
 * status badge, timestamp, and message content.
 *
 * @param message - The inbox message to display
 * @param currentTerminalId - Optional ID of the current terminal to highlight sent vs received
 */
export default function MessageCard({ message, currentTerminalId }: MessageCardProps) {
  const isSent = currentTerminalId && message.sender_id === currentTerminalId;
  const isReceived = currentTerminalId && message.receiver_id === currentTerminalId;

  const getStatusIcon = () => {
    switch (message.status) {
      case 'delivered':
        return <CheckCircle size={14} />;
      case 'pending':
        return <Clock size={14} />;
      case 'failed':
        return <XCircle size={14} />;
      default:
        return <Mail size={14} />;
    }
  };

  const getStatusClass = () => {
    switch (message.status) {
      case 'delivered':
        return 'message-status-delivered';
      case 'pending':
        return 'message-status-pending';
      case 'failed':
        return 'message-status-failed';
      default:
        return 'message-status-unknown';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      console.error('Failed to format timestamp:', timestamp, error);
      return 'unknown time';
    }
  };

  // Truncate terminal IDs only if they're longer than 16 characters
  const truncatedSender = message.sender_id.length > 16
    ? message.sender_id.substring(0, 16) + '...'
    : message.sender_id;

  const truncatedReceiver = message.receiver_id.length > 16
    ? message.receiver_id.substring(0, 16) + '...'
    : message.receiver_id;

  return (
    <div className={`message-card ${isSent ? 'message-sent' : isReceived ? 'message-received' : ''}`}>
      <div className="message-header">
        <div className="message-participants">
          <div className="message-participant">
            <Send size={12} />
            <span className="message-participant-label">From:</span>
            <span className="message-participant-id" title={message.sender_id}>
              {truncatedSender}
            </span>
          </div>
          <div className="message-participant">
            <Mail size={12} />
            <span className="message-participant-label">To:</span>
            <span className="message-participant-id" title={message.receiver_id}>
              {truncatedReceiver}
            </span>
          </div>
        </div>
        <div className={`message-status ${getStatusClass()}`}>
          {getStatusIcon()}
          <span>{message.status}</span>
        </div>
      </div>

      <div className="message-content">
        {message.message}
      </div>

      <div className="message-footer">
        <div className="message-timestamp">
          <Clock size={12} />
          {formatTimestamp(message.created_at)}
        </div>
        {message.delivered_at && (
          <div className="message-delivered">
            <CheckCircle size={12} />
            Delivered {formatTimestamp(message.delivered_at)}
          </div>
        )}
        <div className="message-id" title={message.id}>
          ID: {message.id}
        </div>
      </div>
    </div>
  );
}
