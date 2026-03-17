import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bot,
  Save,
  AlertTriangle,
  MessageCircle,
  Settings2,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { Spinner } from "@/components/common/Spinner";
import { EmptyState } from "@/components/common/EmptyState";

export default function AIAssistant() {
  const { t } = useTranslation('admin');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [promptContent, setPromptContent] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState<string | null>(null);

  const { data: promptsData, isLoading } = useQuery({
    queryKey: ["ai", "prompts"],
    queryFn: () => gateway.ai.listPrompts(),
  });

  const updatePrompt = useMutation({
    mutationFn: (params: { promptId: string; content: string }) =>
      gateway.ai.updatePrompt(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai", "prompts"] });
      setEditingPrompt(null);
      toast({ title: t('aiAssistant.toasts.promptUpdated'), description: t('aiAssistant.toasts.promptUpdatedDesc') });
    },
    onError: () => {
      toast({ title: t('aiAssistant.toasts.updateFailed'), variant: "destructive" });
    },
  });

  const testChat = useMutation({
    mutationFn: (message: string) =>
      gateway.ai.chat({ message }),
    onSuccess: (data) => {
      setTestResponse(data.reply);
    },
    onError: () => {
      toast({ title: t('aiAssistant.toasts.testFailed'), variant: "destructive" });
    },
  });

  const prompts = promptsData?.prompts ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('aiAssistant.title')}</h2>
        <p className="text-muted-foreground">
          {t('aiAssistant.description')}
        </p>
      </div>

      <Tabs defaultValue="prompts">
        <TabsList>
          <TabsTrigger value="prompts">
            <Settings2 className="h-4 w-4 mr-2" />
            {t('aiAssistant.tabs.prompts')}
          </TabsTrigger>
          <TabsTrigger value="test">
            <MessageCircle className="h-4 w-4 mr-2" />
            {t('aiAssistant.tabs.testConsole')}
          </TabsTrigger>
          <TabsTrigger value="escalations">
            <AlertTriangle className="h-4 w-4 mr-2" />
            {t('aiAssistant.tabs.escalations')}
          </TabsTrigger>
        </TabsList>

        {/* Prompts Tab */}
        <TabsContent value="prompts" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : prompts.length === 0 ? (
            <EmptyState
              icon={Bot}
              title={t('aiAssistant.prompts.emptyTitle')}
              description={t('aiAssistant.prompts.emptyDescription')}
            />
          ) : (
            prompts.map((prompt) => (
              <Card key={prompt.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{prompt.name}</CardTitle>
                        <CardDescription>{prompt.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={prompt.isActive ? "default" : "outline"}>
                        {prompt.isActive ? t('aiAssistant.prompts.active') : t('aiAssistant.prompts.inactive')}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingPrompt(prompt.id);
                          setPromptContent(prompt.content);
                        }}
                      >
                        {t('aiAssistant.prompts.edit')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {editingPrompt === prompt.id ? (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('aiAssistant.prompts.systemPromptLabel')}</Label>
                      <Textarea
                        value={promptContent}
                        onChange={(e) => setPromptContent(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          updatePrompt.mutate({
                            promptId: prompt.id,
                            content: promptContent,
                          })
                        }
                        disabled={updatePrompt.isPending}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {updatePrompt.isPending ? t('aiAssistant.prompts.saving') : t('aiAssistant.prompts.savePrompt')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setEditingPrompt(null)}
                      >
                        {t('aiAssistant.prompts.cancel')}
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent>
                    <pre className="text-xs text-muted-foreground bg-muted p-3 rounded-md whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {prompt.content}
                    </pre>
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('aiAssistant.prompts.lastUpdated', { date: new Date(prompt.updatedAt).toLocaleString() })}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        {/* Test Console Tab */}
        <TabsContent value="test" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t('aiAssistant.testConsole.title')}
              </CardTitle>
              <CardDescription>
                {t('aiAssistant.testConsole.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('aiAssistant.testConsole.testMessageLabel')}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('aiAssistant.testConsole.testMessagePlaceholder')}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        testChat.mutate(testMessage);
                      }
                    }}
                  />
                  <Button
                    onClick={() => testChat.mutate(testMessage)}
                    disabled={!testMessage.trim() || testChat.isPending}
                  >
                    {testChat.isPending ? (
                      <Spinner size="sm" className="mr-2" />
                    ) : (
                      <MessageCircle className="h-4 w-4 mr-2" />
                    )}
                    {t('aiAssistant.testConsole.testButton')}
                  </Button>
                </div>
              </div>
              {testResponse && (
                <div className="space-y-2">
                  <Label>{t('aiAssistant.testConsole.responseLabel')}</Label>
                  <div className="bg-muted rounded-md p-4 text-sm whitespace-pre-wrap">
                    {testResponse}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Escalations Tab */}
        <TabsContent value="escalations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t('aiAssistant.escalations.queueTitle')}
              </CardTitle>
              <CardDescription>
                {t('aiAssistant.escalations.queueDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={AlertTriangle}
                title={t('aiAssistant.escalations.emptyTitle')}
                description={t('aiAssistant.escalations.emptyDescription')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('aiAssistant.escalations.settingsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('aiAssistant.escalations.autoEscalateSupport')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('aiAssistant.escalations.autoEscalateSupportDesc')}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('aiAssistant.escalations.autoEscalateProduct')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('aiAssistant.escalations.autoEscalateProductDesc')}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t('aiAssistant.escalations.notificationOnEscalation')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('aiAssistant.escalations.notificationOnEscalationDesc')}
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
