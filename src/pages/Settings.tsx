import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Shield,
  Bell,
  Lock,
  MapPin,
  FileText,
  Hash,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  LogOut,
  Send,
  Palette,
} from "lucide-react";
import { Spinner } from "@/components/common/Spinner";
import { ThemeSelector } from "@/components/common/ThemeSelector";
import { LanguageSelector } from "@/components/common/LanguageSelector";
import { useProfile, useUpdateProfile } from "@/hooks/useProfile";
import {
  useMemberAddresses,
  useMemberDocuments,
  useMemberIdentifiers,
} from "@/hooks/useMemberProfile";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useTestNotification,
} from "@/hooks/useNotificationPreferences";
import { useSessions, useRevokeSession, useRevokeAllSessions } from "@/hooks/useSessions";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import type { DocumentStatus } from "@/types";

const documentStatusVariant = (status: DocumentStatus) => {
  switch (status) {
    case "verified":
      return "secondary" as const;
    case "expired":
    case "rejected":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

const deviceTypeIcon = (deviceType: string) => {
  switch (deviceType) {
    case "mobile":
      return <Smartphone className="w-5 h-5" aria-hidden="true" />;
    case "tablet":
      return <Tablet className="w-5 h-5" aria-hidden="true" />;
    default:
      return <Monitor className="w-5 h-5" aria-hidden="true" />;
  }
};

export default function Settings() {
  const { t, i18n } = useTranslation("settings");
  const { data: profileData, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const user = profileData?.user;

  const { data: addressesData, isLoading: addressesLoading } = useMemberAddresses();
  const { data: documentsData, isLoading: documentsLoading } = useMemberDocuments();
  const { data: identifiersData, isLoading: identifiersLoading } = useMemberIdentifiers();

  // Notification Preferences
  const { data: notifPrefsData, isLoading: notifPrefsLoading } = useNotificationPreferences();
  const updateNotifPrefs = useUpdateNotificationPreferences();
  const testNotification = useTestNotification();

  // Sessions
  const { data: sessionsData, isLoading: sessionsLoading } = useSessions();
  const revokeSession = useRevokeSession();
  const revokeAllSessions = useRevokeAllSessions();

  const addresses = addressesData?.addresses ?? [];
  const documents = documentsData?.documents ?? [];
  const identifiers = identifiersData?.identifiers ?? [];
  const preferences = notifPrefsData?.preferences;
  const sessions = sessionsData?.sessions ?? [];

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setPhone(user.phone ?? "");
    }
  }, [user]);

  // --- Locale-aware date formatting ---
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleString(i18n.language, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // --- Handlers ---
  const handleSaveProfile = async () => {
    try {
      await updateProfile.mutateAsync({ firstName, lastName, phone });
      toast({ title: t("settings.saveChanges"), description: t("settings.profileUpdated") });
    } catch (err) {
      handleError(err, { fallbackTitle: t("settings.updateFailed") });
    }
  };

  const handleToggleChannel = useCallback(
    async (channel: string, enabled: boolean) => {
      if (!preferences) return;
      try {
        await updateNotifPrefs.mutateAsync({
          channels: { ...preferences.channels, [channel]: enabled },
        });
      } catch (err) {
        handleError(err, { fallbackTitle: t("settings.updateFailed") });
      }
    },
    [preferences, updateNotifPrefs, handleError, t],
  );

  const handleToggleCategory = useCallback(
    async (category: string, enabled: boolean) => {
      if (!preferences) return;
      const current = preferences.categories[category];
      try {
        await updateNotifPrefs.mutateAsync({
          categories: {
            ...preferences.categories,
            [category]: { ...current, enabled },
          },
        });
      } catch (err) {
        handleError(err, { fallbackTitle: t("settings.updateFailed") });
      }
    },
    [preferences, updateNotifPrefs, handleError, t],
  );

  const handleTestNotification = useCallback(
    async (channel: string) => {
      try {
        const result = await testNotification.mutateAsync(channel);
        toast({ title: t("settings.testSent"), description: result.message });
      } catch (err) {
        handleError(err, { fallbackTitle: t("settings.testFailed") });
      }
    },
    [testNotification, toast, handleError, t],
  );

  const handleRevokeSession = useCallback(
    async (sessionId: string) => {
      try {
        await revokeSession.mutateAsync(sessionId);
        toast({
          title: t("settings.sessionRevoked"),
          description: t("settings.sessionRevokedDesc"),
        });
      } catch (err) {
        handleError(err, { fallbackTitle: t("settings.revokeFailed") });
      }
    },
    [revokeSession, toast, handleError, t],
  );

  const handleRevokeAllSessions = useCallback(async () => {
    const currentSession = sessions.find((s) => s.isCurrent);
    try {
      await revokeAllSessions.mutateAsync(currentSession?.id);
      toast({
        title: t("settings.allSessionsRevoked"),
        description: t("settings.allSessionsRevokedDesc"),
      });
    } catch (err) {
      handleError(err, { fallbackTitle: t("settings.revokeFailed") });
    }
  }, [revokeAllSessions, sessions, toast, handleError, t]);

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
            <p className="text-muted-foreground">{t("settings.subtitle")}</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4">
              <TabsTrigger value="profile" className="gap-1.5">
                <User className="w-4 h-4 hidden sm:inline" aria-hidden="true" />
                {t("settings.profile")}
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5">
                <Shield className="w-4 h-4 hidden sm:inline" aria-hidden="true" />
                {t("settings.security")}
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-1.5">
                <Bell className="w-4 h-4 hidden sm:inline" aria-hidden="true" />
                {t("settings.notifications")}
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-1.5">
                <Palette className="w-4 h-4 hidden sm:inline" aria-hidden="true" />
                {t("settings.appearance")}
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* Profile Tab */}
            {/* ============================================================ */}
            <TabsContent value="profile" className="space-y-6">
              {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" aria-hidden="true" />
                    {t("settings.profile")}
                  </CardTitle>
                  <CardDescription>{t("settings.profileDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileLoading ? (
                    <div
                      className="flex justify-center py-4"
                      role="status"
                      aria-label={t("settings.loading")}
                    >
                      <Spinner />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">{t("settings.firstName")}</Label>
                          <Input
                            id="firstName"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="min-h-[44px]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">{t("settings.lastName")}</Label>
                          <Input
                            id="lastName"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="min-h-[44px]"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("settings.email")}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={user?.email ?? ""}
                          disabled
                          className="min-h-[44px]"
                        />
                        <p className="text-xs text-muted-foreground">{t("settings.emailHelp")}</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t("settings.phone")}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="min-h-[44px]"
                        />
                      </div>
                      <Button
                        className="min-h-[44px]"
                        onClick={handleSaveProfile}
                        disabled={updateProfile.isPending}
                      >
                        {updateProfile.isPending ? t("settings.saving") : t("settings.saveChanges")}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Member Identifiers */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="w-5 h-5" aria-hidden="true" />
                    {t("settings.memberIdentifiers")}
                  </CardTitle>
                  <CardDescription>{t("settings.memberIdentifiersDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {identifiersLoading ? (
                    <div
                      className="flex justify-center py-4"
                      role="status"
                      aria-label={t("settings.loading")}
                    >
                      <Spinner />
                    </div>
                  ) : identifiers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("settings.noIdentifiers")}</p>
                  ) : (
                    <div className="space-y-3">
                      {identifiers.map((identifier) => (
                        <div key={identifier.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {t(`settings.identifierType.${identifier.type}`, {
                                defaultValue: identifier.type,
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{identifier.valueMasked}</span>
                            {identifier.isPrimary && (
                              <Badge variant="secondary">{t("settings.primary")}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Addresses */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" aria-hidden="true" />
                    {t("settings.addresses")}
                  </CardTitle>
                  <CardDescription>{t("settings.addressesDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {addressesLoading ? (
                    <div
                      className="flex justify-center py-4"
                      role="status"
                      aria-label={t("settings.loading")}
                    >
                      <Spinner />
                    </div>
                  ) : addresses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("settings.noAddresses")}</p>
                  ) : (
                    <div className="space-y-4">
                      {addresses.map((address, i) => (
                        <div key={address.id}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm capitalize">
                                  {t(`settings.addressType.${address.type}`, {
                                    defaultValue: address.type,
                                  })}{" "}
                                  {t("settings.address")}
                                </p>
                                {address.isPrimary && (
                                  <Badge variant="secondary">{t("settings.primary")}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {address.line1}
                                {address.line2 && `, ${address.line2}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {address.city}, {address.state} {address.zip}
                              </p>
                              {address.verifiedAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {t("settings.verified")} {formatDate(address.verifiedAt)}
                                </p>
                              )}
                            </div>
                          </div>
                          {i < addresses.length - 1 && <Separator className="mt-4" />}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" aria-hidden="true" />
                    {t("settings.documentsOnFile")}
                  </CardTitle>
                  <CardDescription>{t("settings.documentsDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {documentsLoading ? (
                    <div
                      className="flex justify-center py-4"
                      role="status"
                      aria-label={t("settings.loading")}
                    >
                      <Spinner />
                    </div>
                  ) : documents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("settings.noDocuments")}</p>
                  ) : (
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">{doc.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {doc.type.replace("_", " ")}
                              {doc.documentNumberMasked && ` \u00B7 ${doc.documentNumberMasked}`}
                              {doc.expirationDate &&
                                ` \u00B7 ${t("settings.expires")} ${formatDate(doc.expirationDate)}`}
                            </p>
                          </div>
                          <Badge variant={documentStatusVariant(doc.status)} className="capitalize">
                            {doc.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* Security Tab */}
            {/* ============================================================ */}
            <TabsContent value="security" className="space-y-6">
              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" aria-hidden="true" />
                    {t("settings.security")}
                  </CardTitle>
                  <CardDescription>{t("settings.securityDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t("settings.twoFactor")}</p>
                      <p className="text-sm text-muted-foreground">{t("settings.twoFactorDesc")}</p>
                    </div>
                    <Switch defaultChecked aria-label={t("settings.twoFactor")} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t("settings.biometric")}</p>
                      <p className="text-sm text-muted-foreground">{t("settings.biometricDesc")}</p>
                    </div>
                    <Switch aria-label={t("settings.biometric")} />
                  </div>
                  <Separator />
                  <Button variant="outline" className="gap-2 min-h-[44px]">
                    <Lock className="w-4 h-4" aria-hidden="true" />
                    {t("settings.changePassword")}
                  </Button>
                </CardContent>
              </Card>

              {/* Session Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" aria-hidden="true" />
                    {t("settings.activeSessions")}
                  </CardTitle>
                  <CardDescription>{t("settings.activeSessionsDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sessionsLoading ? (
                    <div
                      className="flex justify-center py-4"
                      role="status"
                      aria-label={t("settings.loading")}
                    >
                      <Spinner />
                    </div>
                  ) : sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("settings.noSessions")}</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {sessions
                          .filter((s) => !s.isRevoked)
                          .map((session, i, arr) => (
                            <div key={session.id}>
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 text-muted-foreground">
                                    {deviceTypeIcon(session.deviceType)}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm">{session.deviceName}</p>
                                      {session.isCurrent && (
                                        <Badge variant="secondary" className="text-xs">
                                          {t("settings.current")}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {session.browser} {t("settings.on")} {session.os}
                                    </p>
                                    {session.location && (
                                      <p className="text-xs text-muted-foreground">
                                        {session.location}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground">
                                      {t("settings.lastActive")}:{" "}
                                      {formatDateTime(session.lastActiveAt)}
                                    </p>
                                  </div>
                                </div>
                                {!session.isCurrent && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                    onClick={() => handleRevokeSession(session.id)}
                                    disabled={revokeSession.isPending}
                                    aria-label={t("settings.revokeSessionOn", {
                                      device: session.deviceName,
                                    })}
                                  >
                                    <LogOut className="w-4 h-4 mr-1" aria-hidden="true" />
                                    {t("settings.revoke")}
                                  </Button>
                                )}
                              </div>
                              {i < arr.length - 1 && <Separator className="mt-3" />}
                            </div>
                          ))}
                      </div>
                      {sessions.filter((s) => !s.isRevoked && !s.isCurrent).length > 0 && (
                        <>
                          <Separator />
                          <Button
                            variant="destructive"
                            className="w-full min-h-[44px]"
                            onClick={handleRevokeAllSessions}
                            disabled={revokeAllSessions.isPending}
                          >
                            <LogOut className="w-4 h-4 mr-2" aria-hidden="true" />
                            {revokeAllSessions.isPending
                              ? t("settings.revoking")
                              : t("settings.revokeAllOther")}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* Notifications Tab */}
            {/* ============================================================ */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" aria-hidden="true" />
                    {t("settings.notifications")}
                  </CardTitle>
                  <CardDescription>{t("settings.notificationsDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {notifPrefsLoading ? (
                    <div
                      className="flex justify-center py-4"
                      role="status"
                      aria-label={t("settings.loading")}
                    >
                      <Spinner />
                    </div>
                  ) : preferences ? (
                    <>
                      {/* Notification Channels */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">
                          {t("settings.notificationChannels")}
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(preferences.channels).map(
                            ([channel, enabled], i, arr) => (
                              <div key={channel}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div>
                                      <p className="font-medium text-sm">
                                        {t(`settings.channel.${channel}`, {
                                          defaultValue: channel,
                                        })}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {t("settings.receiveVia", {
                                          channel: t(`settings.channel.${channel}`, {
                                            defaultValue: channel,
                                          }).toLowerCase(),
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 px-2"
                                      disabled={!enabled || testNotification.isPending}
                                      onClick={() => handleTestNotification(channel)}
                                      aria-label={t("settings.sendTest", {
                                        channel: t(`settings.channel.${channel}`, {
                                          defaultValue: channel,
                                        }),
                                      })}
                                    >
                                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                                    </Button>
                                    <Switch
                                      checked={enabled}
                                      onCheckedChange={(checked) =>
                                        handleToggleChannel(channel, checked)
                                      }
                                      aria-label={t("settings.toggleChannel", {
                                        channel: t(`settings.channel.${channel}`, {
                                          defaultValue: channel,
                                        }),
                                      })}
                                    />
                                  </div>
                                </div>
                                {i < arr.length - 1 && <Separator className="mt-3" />}
                              </div>
                            ),
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Notification Categories */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3">
                          {t("settings.notificationCategories")}
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(preferences.categories).map(
                            ([category, config], i, arr) => (
                              <div key={category}>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm">
                                      {t(`settings.category.${category}.label`, {
                                        defaultValue: category,
                                      })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {t(`settings.category.${category}.description`, {
                                        defaultValue: `${t("settings.notificationsFor")} ${category}`,
                                      })}
                                    </p>
                                    {config.channels.length > 0 && (
                                      <div className="flex gap-1 mt-1">
                                        {config.channels.map((ch) => (
                                          <Badge
                                            key={ch}
                                            variant="outline"
                                            className="text-xs py-0 px-1.5"
                                          >
                                            {t(`settings.channel.${ch}`, { defaultValue: ch })}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <Switch
                                    checked={config.enabled}
                                    onCheckedChange={(checked) =>
                                      handleToggleCategory(category, checked)
                                    }
                                    aria-label={t("settings.toggleCategory", {
                                      category: t(`settings.category.${category}.label`, {
                                        defaultValue: category,
                                      }),
                                    })}
                                  />
                                </div>
                                {i < arr.length - 1 && <Separator className="mt-3" />}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t("settings.unableToLoadPreferences")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============================================================ */}
            {/* Appearance Tab */}
            {/* ============================================================ */}
            <TabsContent value="appearance" className="space-y-6">
              {/* Theme */}
              <ThemeSelector />

              {/* Language */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("settings.language")}</CardTitle>
                  <CardDescription>{t("settings.languageDesc")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <LanguageSelector />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </AppShell>
  );
}
