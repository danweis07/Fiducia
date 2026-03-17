/**
 * Admin: SDUI Screen Manifest Manager
 *
 * Manage personas and per-screen component layouts.
 * Admins define which widgets appear on each screen for each persona.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Users,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Monitor,
} from 'lucide-react';
import { gateway } from '@/lib/gateway';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/common/Spinner';
import type { ScreenManifest, UserPersona } from '@/types/sdui';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScreenManifests() {
  useTranslation('admin');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'manifests' | 'personas'>('manifests');
  const [expandedManifest, setExpandedManifest] = useState<string | null>(null);

  // Fetch data
  const { data: manifests = [], isLoading: manifestsLoading } = useQuery({
    queryKey: ['sdui', 'manifests'],
    queryFn: () => gateway.sdui.manifests.list(),
  });

  const { data: personas = [], isLoading: personasLoading } = useQuery({
    queryKey: ['sdui', 'personas'],
    queryFn: () => gateway.sdui.personas.list(),
  });

  // Mutations
  const deleteManifestMutation = useMutation({
    mutationFn: (id: string) => gateway.sdui.manifests.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sdui', 'manifests'] }),
  });

  const toggleManifestMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      gateway.sdui.manifests.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sdui', 'manifests'] }),
  });

  const deletePersonaMutation = useMutation({
    mutationFn: (id: string) => gateway.sdui.personas.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sdui', 'personas'] }),
  });

  const isLoading = manifestsLoading || personasLoading;

  // Group manifests by screen key
  const manifestsByScreen = (manifests as ScreenManifest[]).reduce<Record<string, ScreenManifest[]>>((acc, m) => {
    const key = m.screenKey;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6" />
            Server-Driven UI
          </h1>
          <p className="text-slate-500 mt-1">
            Configure personalized screen layouts per user persona
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('manifests')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'manifests' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Monitor className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          Screen Manifests
        </button>
        <button
          onClick={() => setActiveTab('personas')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'personas' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
          Personas
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      )}

      {/* Manifests Tab */}
      {activeTab === 'manifests' && !isLoading && (
        <div className="space-y-6">
          {Object.entries(manifestsByScreen).map(([screenKey, screenManifests]) => (
            <Card key={screenKey}>
              <CardHeader>
                <CardTitle className="text-lg capitalize">{screenKey.replace(/_/g, ' ')} Screen</CardTitle>
                <CardDescription>
                  {screenManifests.length} persona layout{screenManifests.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {screenManifests.map((manifest) => (
                    <div
                      key={manifest.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
                        onClick={() => setExpandedManifest(expandedManifest === manifest.id ? null : manifest.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant={manifest.isActive ? 'default' : 'secondary'}>
                            {manifest.personaId}
                          </Badge>
                          <span className="text-sm font-medium">{manifest.label}</span>
                          <span className="text-xs text-slate-400">v{manifest.version}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {manifest.components.length} component{manifest.components.length !== 1 ? 's' : ''}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleManifestMutation.mutate({ id: manifest.id, isActive: !manifest.isActive });
                            }}
                          >
                            {manifest.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteManifestMutation.mutate(manifest.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                          {expandedManifest === manifest.id ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                      {expandedManifest === manifest.id && (
                        <div className="border-t p-4 bg-slate-50">
                          <p className="text-xs font-medium text-slate-500 uppercase mb-2">Components</p>
                          <div className="space-y-1.5">
                            {manifest.components.map((c, i) => (
                              <div key={c.id ?? i} className="flex items-center gap-2 text-sm">
                                <span className="w-6 text-center text-slate-400 text-xs">{i + 1}</span>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {c.componentType}
                                </Badge>
                                {c.className && (
                                  <span className="text-xs text-slate-400">{c.className}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {Object.keys(manifestsByScreen).length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <LayoutDashboard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-1">No screen manifests yet</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Create manifests to define personalized screen layouts for each user persona.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Personas Tab */}
      {activeTab === 'personas' && !isLoading && (
        <div className="space-y-4">
          {(personas as Array<UserPersona & { id: string; isActive: boolean; createdAt: string }>).map((persona) => (
            <Card key={persona.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{persona.label}</h3>
                      <Badge variant="outline" className="font-mono text-xs">{persona.personaId}</Badge>
                      {!persona.isActive && <Badge variant="secondary">Disabled</Badge>}
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">{persona.description}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Priority: {persona.priority} &middot; {persona.rules.length} rule{persona.rules.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePersonaMutation.mutate(persona.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {personas.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-1">No personas defined</h3>
                <p className="text-sm text-slate-500">
                  Create personas with rule-based targeting to personalize screen layouts.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
