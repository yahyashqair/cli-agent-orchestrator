import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { endpoints } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getStatusColor, formatRelativeTime } from '@/lib/utils';
import {
  Terminal,
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  Archive,
  Search,
  RefreshCw,
  MoreVertical,
  Eye,
} from 'lucide-react';

export function SessionsPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const queryClient = useQueryClient();

  const { data: sessions, isLoading, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => endpoints.sessions.list().then(res => res.data),
  });

  const archiveMutation = useMutation({
    mutationFn: (sessionName: string) => endpoints.sessions.archive(sessionName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionName: string) => endpoints.sessions.delete(sessionName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const filteredSessions = sessions?.filter((session: any) =>
    session.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleArchive = (sessionName: string) => {
    if (confirm(`Archive session "${sessionName}"?`)) {
      archiveMutation.mutate(sessionName);
    }
  };

  const handleDelete = (sessionName: string) => {
    if (confirm(`Delete session "${sessionName}"? This action cannot be undone.`)) {
      deleteMutation.mutate(sessionName);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="skeleton h-20 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">
            Manage terminal sessions and their associated terminals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Session
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredSessions.length} of {sessions?.length || 0} sessions
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      <div className="grid gap-4">
        {filteredSessions.map((session: any) => (
          <Card key={session.name} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{session.name}</CardTitle>
                    <CardDescription>
                      {session.terminal_count} terminal{session.terminal_count !== 1 ? 's' : ''}
                      {session.terminals?.length > 0 && (
                        <>
                          {' • '}
                          {session.terminals[0].provider}
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="status" className="capitalize">
                    {session.status}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  {session.terminals?.slice(0, 3).map((terminal: any) => (
                    <div key={terminal.id} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(terminal.status).split(' ')[1]}`} />
                      <span className="font-mono text-xs">{terminal.id}</span>
                      <Badge variant="outline" className="text-xs">
                        {terminal.status}
                      </Badge>
                      {terminal.agent_profile && (
                        <Badge variant="secondary" className="text-xs">
                          {terminal.agent_profile}
                        </Badge>
                      )}
                    </div>
                  ))}
                  {session.terminals?.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{session.terminals.length - 3} more terminals
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/sessions/${session.name}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                  {session.status === 'active' && (
                    <Button variant="outline" size="sm">
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  {session.status === 'detached' && (
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Resume
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleArchive(session.name)}
                    disabled={archiveMutation.isPending}
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(session.name)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSessions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Terminal className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sessions found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first session.'}
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Session
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}