/**
 * BrandingEditor — Full Design System Configurator
 *
 * Two modes:
 *   Easy Mode: Pick a preset → override primary/accent → upload logo → done
 *   Advanced Mode: Full token-level control over every CSS variable
 *
 * Saves the complete DesignSystemConfig to the database via gateway.
 */

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Wand2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DesignSystemConfig } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { gateway } from "@/lib/gateway";
import { DEFAULT_DESIGN_SYSTEM } from "@/lib/theme/presets";
import { applyDesignSystem } from "@/lib/theme/apply-design-system";
import { EasyModePanel } from "./branding/EasyModePanel";
import { AdvancedModePanel } from "./branding/AdvancedModePanel";
import { LivePreview } from "./branding/LivePreview";

export default function BrandingEditor() {
  const { t } = useTranslation("admin");
  const [config, setConfig] = useState<DesignSystemConfig>(DEFAULT_DESIGN_SYSTEM);
  const [darkPreview, setDarkPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load existing config from DB on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const result = await gateway.request<{
          designSystem: DesignSystemConfig | null;
        }>("admin.designSystem.get", {});
        if (result?.designSystem) {
          setConfig(result.designSystem);
        }
      } catch {
        // Use default preset if load fails
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Apply preview in real-time as user edits
  useEffect(() => {
    applyDesignSystem(config, darkPreview ? "dark" : "light");
  }, [config, darkPreview]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await gateway.request("admin.designSystem.update", {
        designSystem: config,
      });
      toast({
        title: t("brandingEditor.toast.saved", "Design system saved"),
        description: t(
          "brandingEditor.toast.savedDescription",
          "Changes are live across all channels.",
        ),
      });
    } catch {
      toast({
        title: t("brandingEditor.toast.saveFailed", "Save failed"),
        description: t(
          "brandingEditor.toast.saveFailedDescription",
          "Could not save design system. Please try again.",
        ),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleModeChange = (mode: string) => {
    setConfig((prev) => ({
      ...prev,
      mode: mode as "easy" | "advanced",
    }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("brandingEditor.title", "Design System")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "brandingEditor.subtitle",
              "Configure your institution's visual identity across all channels",
            )}
          </p>
        </div>
        <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t("brandingEditor.saveAndPublish", "Save & Publish")}
        </Button>
      </div>

      {/* Main layout: Controls + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls */}
        <div className="lg:col-span-3">
          <Tabs value={config.mode} onValueChange={handleModeChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="easy" className="gap-1.5">
                <Wand2 className="h-3.5 w-3.5" />
                Easy Mode
              </TabsTrigger>
              <TabsTrigger value="advanced" className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="easy">
              <EasyModePanel config={config} onChange={setConfig} />
            </TabsContent>

            <TabsContent value="advanced">
              <AdvancedModePanel config={config} onChange={setConfig} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <LivePreview config={config} darkPreview={darkPreview} onToggleDark={setDarkPreview} />
        </div>
      </div>
    </div>
  );
}
