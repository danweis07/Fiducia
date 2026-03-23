import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { useCreateCredentials } from "@/hooks/useActivation";
import type { ActivationConfig } from "@/types/activation";
import { computePasswordStrength } from "./constants";

export function StepCredentials({
  config,
  activationToken,
  onComplete,
  onBack,
}: {
  config: ActivationConfig;
  activationToken: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverErrors, setServerErrors] = useState<{ field: string; message: string }[]>([]);
  const createCredentials = useCreateCredentials();

  const { credentials } = config;
  const passwordStrength = useMemo(
    () => computePasswordStrength(password, credentials.password),
    [password, credentials.password],
  );

  const usernameValid = useMemo(() => {
    if (!username) return null;
    const { minLength, maxLength, pattern } = credentials.username;
    if (username.length < minLength) return `Must be at least ${minLength} characters`;
    if (username.length > maxLength) return `Must be at most ${maxLength} characters`;
    if (pattern) {
      try {
        if (!new RegExp(pattern).test(username)) return credentials.username.patternDescription;
      } catch {
        // Invalid regex from config — skip validation
      }
    }
    return true;
  }, [username, credentials.username]);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordError =
    confirmPassword.length > 0 && password !== confirmPassword ? "Passwords do not match" : null;

  const canSubmit =
    usernameValid === true &&
    passwordStrength.score === 100 &&
    passwordsMatch &&
    !createCredentials.isPending;

  const handleSubmit = () => {
    setServerErrors([]);
    createCredentials.mutate(
      { activationToken, username, password },
      {
        onSuccess: (result) => {
          if (result.success) {
            // Clear password from state immediately
            setPassword("");
            setConfirmPassword("");
            onComplete();
          } else if (result.errors) {
            setServerErrors(result.errors);
          }
        },
      },
    );
  };

  const usernameServerError = serverErrors.find((e) => e.field === "username");
  const passwordServerError = serverErrors.find((e) => e.field === "password");

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" aria-hidden="true" />
          Create Your Sign-In Credentials
        </CardTitle>
        <CardDescription>
          Choose a username and password for your online banking access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="cred-username">Username</Label>
          <Input
            id="cred-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="min-h-[44px]"
            aria-label="Choose a username"
            aria-describedby="username-hint"
            autoComplete="username"
          />
          <p id="username-hint" className="text-xs text-muted-foreground">
            {credentials.username.patternDescription}
            {credentials.username.allowEmail && " — You may also use your email address."}
          </p>
          {usernameValid !== null && usernameValid !== true && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              {usernameValid}
            </p>
          )}
          {usernameServerError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              {usernameServerError.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="cred-password">Password</Label>
          <div className="relative">
            <Input
              id="cred-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[44px] pr-10"
              aria-label="Choose a password"
              autoComplete="new-password"
              maxLength={credentials.password.maxLength}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </Button>
          </div>

          {/* Strength meter */}
          {password.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>
                <span className="text-xs font-medium min-w-[48px]">{passwordStrength.label}</span>
              </div>
              <ul className="space-y-1">
                {passwordStrength.checks.map((check) => (
                  <li
                    key={check.label}
                    className={`text-xs flex items-center gap-1.5 ${
                      check.met ? "text-green-600" : "text-muted-foreground"
                    }`}
                  >
                    {check.met ? (
                      <Check className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    )}
                    {check.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {passwordServerError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              {passwordServerError.message}
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="cred-confirm-password">Confirm Password</Label>
          <div className="relative">
            <Input
              id="cred-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="min-h-[44px] pr-10"
              aria-label="Confirm your password"
              autoComplete="new-password"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              onClick={() => setShowConfirmPassword((v) => !v)}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </Button>
          </div>
          {passwordError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3" aria-hidden="true" />
              {passwordError}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          className="min-h-[44px] gap-2"
          onClick={onBack}
          aria-label="Go back to previous step"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          className="min-h-[44px] gap-2"
          onClick={handleSubmit}
          disabled={!canSubmit}
          aria-label="Create credentials and continue"
        >
          {createCredentials.isPending ? "Creating..." : "Create Credentials"}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
