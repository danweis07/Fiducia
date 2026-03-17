import { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface PasswordStrengthProps {
  password: string;
}

function calcStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  // Map 0-5 score to 0-3 level
  if (score <= 1) return 0;
  if (score === 2) return 1;
  if (score === 3) return 2;
  return 3;
}

const COLORS = [
  "bg-red-500", // weak
  "bg-orange-500", // fair
  "bg-yellow-500", // good
  "bg-green-500", // strong
];

const LABEL_KEYS = [
  "auth.strengthWeak",
  "auth.strengthFair",
  "auth.strengthGood",
  "auth.strengthStrong",
];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useTranslation("common");
  const level = useMemo(() => calcStrength(password), [password]);

  if (!password) return null;

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= level ? COLORS[level] : "bg-muted"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{t(LABEL_KEYS[level])}</p>
    </div>
  );
}
