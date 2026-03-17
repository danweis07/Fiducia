import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import {
  THEME_PRESETS,
  PRESET_LABELS,
  FONT_LABELS,
  LAYOUT_LABELS,
  type ThemeFont,
  type ThemeLayout,
  type ThemeMode,
} from '@/lib/theme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Palette, Sun, Moon, Monitor } from 'lucide-react';

/**
 * Comprehensive theme settings panel.
 * Includes preset selector, mode toggle, font selector,
 * layout selector, and accessibility toggles.
 */
export function ThemeSelector() {
  const { t } = useTranslation();
  const { theme, updateTheme, resetTheme } = useTheme();

  const handlePreset = (preset: string) => {
    const values = THEME_PRESETS[preset];
    if (values) updateTheme(values);
  };

  const handleMode = (mode: ThemeMode) => {
    updateTheme({ mode });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" aria-hidden="true" />
          {t('settings.appearance')}
        </CardTitle>
        <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Preset */}
        <div className="space-y-2">
          <Label>{t('settings.theme')}</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {Object.keys(THEME_PRESETS).map((key) => {
              const preset = THEME_PRESETS[key];
              const isActive =
                preset.primaryColor === theme.primaryColor &&
                preset.layout === theme.layout;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePreset(key)}
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-colors
                    min-h-[44px] min-w-[44px]
                    ${isActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                  `}
                  aria-pressed={isActive}
                  aria-label={`${t('settings.theme')}: ${PRESET_LABELS[key]}`}
                >
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: `hsl(${preset.primaryColor})` }}
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium">{PRESET_LABELS[key]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Color Mode */}
        <div className="space-y-2">
          <Label>{t('settings.darkMode')}</Label>
          <div className="flex gap-2">
            {([
              { mode: 'light' as ThemeMode, icon: Sun, label: t('settings.lightMode') },
              { mode: 'dark' as ThemeMode, icon: Moon, label: t('settings.darkMode') },
              { mode: 'system' as ThemeMode, icon: Monitor, label: t('settings.systemMode') },
            ]).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleMode(mode)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors
                  min-h-[44px] min-w-[44px]
                  ${theme.mode === mode ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                `}
                aria-pressed={theme.mode === mode}
                aria-label={label}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Font Selection */}
        <div className="space-y-2">
          <Label htmlFor="font-select">{t('settings.font')}</Label>
          <Select
            value={theme.font}
            onValueChange={(v) => updateTheme({ font: v as ThemeFont })}
          >
            <SelectTrigger id="font-select" className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FONT_LABELS) as ThemeFont[]).map((font) => (
                <SelectItem key={font} value={font} className="min-h-[44px]">
                  {FONT_LABELS[font]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Layout Selection */}
        <div className="space-y-2">
          <Label htmlFor="layout-select">{t('settings.layout')}</Label>
          <Select
            value={theme.layout}
            onValueChange={(v) => updateTheme({ layout: v as ThemeLayout })}
          >
            <SelectTrigger id="layout-select" className="min-h-[44px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LAYOUT_LABELS) as ThemeLayout[]).map((layout) => (
                <SelectItem key={layout} value={layout} className="min-h-[44px]">
                  {LAYOUT_LABELS[layout]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Accessibility Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.highContrast')}</p>
              <p className="text-sm text-muted-foreground">
                {t('settings.highContrastDesc')}
              </p>
            </div>
            <Switch
              checked={theme.highContrast}
              onCheckedChange={(checked) => updateTheme({ highContrast: checked })}
              aria-label={t('settings.highContrast')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('settings.reducedMotion')}</p>
              <p className="text-sm text-muted-foreground">
                {t('settings.reducedMotionDesc')}
              </p>
            </div>
            <Switch
              checked={theme.reducedMotion}
              onCheckedChange={(checked) => updateTheme({ reducedMotion: checked })}
              aria-label={t('settings.reducedMotion')}
            />
          </div>
        </div>

        <Separator />

        <Button
          variant="outline"
          onClick={resetTheme}
          className="min-h-[44px]"
        >
          {t('settings.resetDefaults')}
        </Button>
      </CardContent>
    </Card>
  );
}
