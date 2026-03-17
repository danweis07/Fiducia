import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useAuth } from "@/contexts/TenantContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { SecureInput } from "@/components/common/SecureInput";
import { PasswordStrength } from "@/components/common/PasswordStrength";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z
  .object({
    email: z.string().trim().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    firmName: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const resetSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
});

export default function Auth() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { signIn, signUp, resetPassword, isAuthenticated } = useAuth();

  const [tab, setTab] = useState<string>("signin");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firmName, setFirmName] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const clearErrors = () => setErrors({});

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const result = signInSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast({ title: t("auth.signInFailed"), description: error.message, variant: "destructive" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const result = signUpSchema.safeParse({ email, password, confirmPassword, firmName });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, firmName || undefined);
    setLoading(false);
    if (error) {
      toast({ title: t("auth.signUpFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.checkYourEmail"), description: t("auth.confirmationLinkSent") });
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    const result = resetSchema.safeParse({ email: resetEmail });
    if (!result.success) {
      setErrors({ resetEmail: result.error.errors[0]?.message ?? "Invalid email" });
      return;
    }
    setLoading(true);
    const { error } = await resetPassword(resetEmail);
    setLoading(false);
    if (error) {
      toast({ title: t("auth.resetFailed"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("auth.checkYourEmail"), description: t("auth.resetLinkSent") });
      setShowForgot(false);
    }
  };

  const fieldError = (field: string) =>
    errors[field] ? <p className="text-sm text-destructive mt-1">{errors[field]}</p> : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-2 overflow-hidden">
            <span className="text-primary-foreground font-bold text-xl">
              {t("auth.brandInitial", { defaultValue: "F" })}
            </span>
          </div>
          <CardTitle className="text-2xl">{t("auth.brandName")}</CardTitle>
          <CardDescription>{t("auth.brandTagline")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v);
              clearErrors();
              setShowForgot(false);
            }}
          >
            {/* Sign Up tab hidden for now */}
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
            </TabsList>

            {/* Sign In */}
            <TabsContent value="signin">
              {showForgot ? (
                <form onSubmit={handleReset} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">{t("auth.email")}</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        clearErrors();
                      }}
                      placeholder={t("auth.emailPlaceholder")}
                    />
                    {fieldError("resetEmail")}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("auth.sendResetLink")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowForgot(false)}
                  >
                    {t("auth.backToSignIn")}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signInEmail">{t("auth.email")}</Label>
                    <Input
                      id="signInEmail"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearErrors();
                      }}
                      placeholder={t("auth.emailPlaceholder")}
                    />
                    {fieldError("email")}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signInPassword">{t("auth.password")}</Label>
                    <SecureInput
                      id="signInPassword"
                      value={password}
                      onChange={(val) => {
                        setPassword(val);
                        clearErrors();
                      }}
                    />
                    {fieldError("password")}
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {t("auth.signIn")}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowForgot(true)}
                  >
                    {t("auth.forgotPassword")}
                  </Button>

                  <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      {t("common.or")}
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => {
                      const baseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
                      const tenantSubdomain = window.location.hostname.split(".")[0];
                      window.location.href = `${baseUrl}/functions/v1/sso-initiate?tenant=${tenantSubdomain}`;
                    }}
                  >
                    <Shield className="w-4 h-4" />
                    {t("auth.signInWithSSO")}
                  </Button>
                </form>
              )}
            </TabsContent>

            {/* Sign Up */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="signUpEmail">{t("auth.email")}</Label>
                  <Input
                    id="signUpEmail"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearErrors();
                    }}
                    placeholder={t("auth.emailPlaceholder")}
                  />
                  {fieldError("email")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signUpPassword">{t("auth.password")}</Label>
                  <SecureInput
                    id="signUpPassword"
                    value={password}
                    onChange={(val) => {
                      setPassword(val);
                      clearErrors();
                    }}
                    placeholder={t("auth.minCharacters")}
                  />
                  <PasswordStrength password={password} />
                  {fieldError("password")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
                  <SecureInput
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(val) => {
                      setConfirmPassword(val);
                      clearErrors();
                    }}
                  />
                  {fieldError("confirmPassword")}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firmName">
                    {t("auth.firmName")}{" "}
                    <span className="text-muted-foreground text-xs">({t("common.optional")})</span>
                  </Label>
                  <Input
                    id="firmName"
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder={t("auth.firmNamePlaceholder")}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("auth.createAccount")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
