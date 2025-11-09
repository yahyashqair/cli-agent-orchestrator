import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, RotateCcw, Download, Upload } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure your CLI Agent Orchestrator preferences.
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Basic application configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Server Host</label>
              <Input defaultValue="127.0.0.1:9889" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Refresh Interval</label>
              <Input defaultValue="30 seconds" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Default Working Directory</label>
            <Input defaultValue="/home/user/projects" />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <div className="grid gap-2 md:grid-cols-3">
              {['Dark', 'Light', 'System'].map((theme) => (
                <div key={theme} className="flex items-center space-x-2">
                  <input type="radio" id={theme.toLowerCase()} name="theme" className="rounded" />
                  <label htmlFor={theme.toLowerCase()} className="text-sm">{theme}</label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Compact Mode</label>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="compact" className="rounded" />
              <label htmlFor="compact" className="text-sm">Enable compact layout</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Providers</CardTitle>
          <CardDescription>
            Configure default providers for each agent type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { agent: 'Claude Code', provider: 'claude_code', status: 'connected' },
            { agent: 'Amazon Q CLI', provider: 'q_cli', status: 'connected' },
            { agent: 'GitHub Copilot', provider: 'copilot_cli', status: 'disconnected' },
          ].map((config) => (
            <div key={config.agent} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">{config.agent}</p>
                <p className="text-sm text-muted-foreground">Provider: {config.provider}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.status === 'connected' ? 'success' : 'error'}>
                  {config.status}
                </Badge>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Import, export, and manage your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Configuration
            </Button>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import Configuration
            </Button>
          </div>
          <div className="pt-4 border-t">
            <Button variant="destructive">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}