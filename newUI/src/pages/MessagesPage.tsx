import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send, Reply, Trash2 } from 'lucide-react';

export function MessagesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Inter-terminal communication and message queue.
          </p>
        </div>
        <Button>
          <Send className="w-4 h-4 mr-2" />
          Send Message
        </Button>
      </div>

      {/* Messages List */}
      <div className="grid gap-4">
        {['Terminal alpha -> Terminal beta', 'Agent notification', 'System update', 'Error report'].map((messageTitle, index) => (
          <Card key={messageTitle} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{messageTitle}</CardTitle>
                    <CardDescription>
                      From: terminal-00{index + 1} • To: terminal-00{(index + 2) % 4 + 1}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={index === 0 ? 'warning' : 'success'}>
                    {index === 0 ? 'Pending' : 'Delivered'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm">
                  {index === 0
                    ? 'Requesting data transfer between sessions for analysis.'
                    : index === 1
                    ? 'Agent configuration has been updated successfully.'
                    : index === 2
                    ? 'System maintenance completed. All services operational.'
                    : 'Error detected in flow execution. Requires attention.'}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{index > 1 ? `${index} hours ago` : `${index * 5} minutes ago`}</span>
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <Button variant="outline" size="sm">
                        <Reply className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}