import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Smartphone, Monitor, Sun, Moon, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { BrandingConfig } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { gateway } from "@/lib/gateway";

// ---------------------------------------------------------------------------
// Mock state
// ---------------------------------------------------------------------------

const defaultBranding: BrandingConfig = {
  primaryColor: "#1e40af",
  secondaryColor: "#64748b",
  accentColor: "#0ea5e9",
  logoUrl: null,
  fontFamily: "Inter",
  layoutTheme: "modern",
  customCss: "",
};

const fontOptions = ["Inter", "Roboto", "Open Sans", "Poppins", "DM Sans", "IBM Plex Sans"];

const layoutThemes: { value: BrandingConfig["layoutTheme"]; label: string; description: string }[] = [
  { value: "modern", label: "Modern", description: "Clean lines, rounded cards, generous spacing" },
  { value: "classic", label: "Classic", description: "Traditional banking look with sharp edges" },
  { value: "minimal", label: "Minimal", description: "Stripped-down, content-focused design" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BrandingEditor() {
  const { t } = useTranslation('admin');
  const [branding, setBranding] = useState<BrandingConfig>(defaultBranding);
  const [darkPreview, setDarkPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await gateway.request('admin.branding.update', branding);
      toast({ title: t('brandingEditor.toast.saved'), description: t('brandingEditor.toast.savedDescription') });
    } catch {
      toast({ title: t('brandingEditor.toast.saveFailed'), description: t('brandingEditor.toast.saveFailedDescription'), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const update = (partial: Partial<BrandingConfig>) => {
    setBranding((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('brandingEditor.title')}</h1>
          <p className="text-sm text-slate-500">{t('brandingEditor.subtitle')}</p>
        </div>
        <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t('brandingEditor.saveAndPublish')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Controls */}
        <div className="lg:col-span-2 space-y-4">
          {/* Colors */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('brandingEditor.colors')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="primary">{t('brandingEditor.primaryColor')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primary"
                    value={branding.primaryColor}
                    onChange={(e) => update({ primaryColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={branding.primaryColor}
                    onChange={(e) => update({ primaryColor: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary">{t('brandingEditor.secondaryColor')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="secondary"
                    value={branding.secondaryColor}
                    onChange={(e) => update({ secondaryColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={branding.secondaryColor}
                    onChange={(e) => update({ secondaryColor: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accent">{t('brandingEditor.accentColor')}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="accent"
                    value={branding.accentColor}
                    onChange={(e) => update({ accentColor: e.target.value })}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={branding.accentColor}
                    onChange={(e) => update({ accentColor: e.target.value })}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('brandingEditor.logo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <p className="text-sm text-slate-500">{t('brandingEditor.logoDragDrop')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('brandingEditor.logoFormats')}</p>
                <Button variant="outline" size="sm" className="mt-3">
                  {t('brandingEditor.uploadLogo')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Font */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('brandingEditor.typography')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Label>{t('brandingEditor.fontFamily')}</Label>
              <Select value={branding.fontFamily} onValueChange={(v) => update({ fontFamily: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fontOptions.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Layout theme */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('brandingEditor.layoutTheme')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {layoutThemes.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => update({ layoutTheme: theme.value })}
                    className={`text-left border rounded-lg p-3 transition-colors ${
                      branding.layoutTheme === theme.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-medium">{theme.label}</p>
                    <p className="text-xs text-slate-500">{theme.description}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom CSS */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('brandingEditor.customCss')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={branding.customCss}
                onChange={(e) => update({ customCss: e.target.value })}
                placeholder="/* Your custom CSS overrides */"
                className="font-mono text-sm min-h-[120px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-3">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{t('brandingEditor.preview')}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant={!darkPreview ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDarkPreview(false)}
                  >
                    <Sun className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={darkPreview ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDarkPreview(true)}
                  >
                    <Moon className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`rounded-lg border overflow-hidden ${
                  darkPreview ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                }`}
                style={{ fontFamily: branding.fontFamily }}
              >
                {/* Mock app header */}
                <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: branding.primaryColor }}>
                  <div className="h-7 w-7 bg-white/20 rounded" />
                  <span className="text-white text-sm font-semibold">{t('brandingEditor.previewDemo.institutionName')}</span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Balance card */}
                  <div className={`rounded-lg p-4 ${darkPreview ? "bg-slate-800" : "bg-slate-50"}`}>
                    <p className="text-xs opacity-60">{t('brandingEditor.previewDemo.totalBalance')}</p>
                    <p className="text-2xl font-bold mt-1">$18,077.73</p>
                    <p className="text-xs opacity-50 mt-0.5">{t('brandingEditor.previewDemo.acrossAccounts')}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-4 gap-2">
                    {["Transfer", "Pay", "Deposit", "Cards"].map((label) => (
                      <div key={label} className="text-center">
                        <div
                          className="mx-auto h-10 w-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: branding.accentColor + "22", color: branding.accentColor }}
                        >
                          <Monitor className="h-4 w-4" />
                        </div>
                        <p className="text-xs mt-1">{label}</p>
                      </div>
                    ))}
                  </div>

                  <Separator className={darkPreview ? "bg-slate-700" : undefined} />

                  {/* Transaction list */}
                  {["Whole Foods", "Netflix", "Payroll"].map((name) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-8 w-8 rounded-full ${darkPreview ? "bg-slate-700" : "bg-slate-200"}`} />
                        <div>
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs opacity-50">Mar 9</p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">-$32.00</p>
                    </div>
                  ))}
                </div>

                {/* Bottom nav */}
                <div
                  className="flex justify-around py-2 border-t text-xs"
                  style={{ borderColor: darkPreview ? "#334155" : undefined }}
                >
                  {["Home", "Accounts", "Transfer", "More"].map((t) => (
                    <div key={t} className="text-center">
                      <Smartphone className="h-4 w-4 mx-auto opacity-50" />
                      <p className="opacity-50 mt-0.5">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
