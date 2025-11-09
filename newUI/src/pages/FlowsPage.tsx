import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GitBranch, Plus, Play, Pause, Edit, Trash2 } from 'lucide-react';

export function FlowsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Flows</h1>
          <p className="text-muted-foreground">
            Automated workflows and scheduled tasks.
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Flow
        </Button>
      </div>

      {/* Flows List */}
      <div className="grid gap-4">
        {['Data Pipeline', 'Security Scan', 'Backup Process', 'Report Generation'].map((flowName, index) => (
          <Card key={flowName} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <GitBranch className="w-5 h-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{flowName}</CardTitle>
                    <CardDescription>
                      Schedule: {index % 2 === 0 ? '0 */6 * * *' : '0 2 * * *'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={index % 3 === 0 ? 'success' : 'secondary'}>
                    {index % 3 === 0 ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Button variant="ghost" size="icon">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Agent: {['Claude Code', 'Amazon Q', 'GitHub Copilot'][index % 3]}</span>
                  <span>Last run: {index > 0 ? '2 hours ago' : 'Never'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {index % 3 === 0 ? (
                    <Button variant="outline" size="sm">
                      <Pause className="w-4 h-4 mr-2" />
                      Disable
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Enable
                    </Button>
                  )}
                  <Button variant="outline" size="sm">
                    Run Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}