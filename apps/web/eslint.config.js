import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-alert": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
    },
  },
  // Enforce Supabase abstraction: prevent direct Supabase imports outside the provider layer.
  // All Supabase access should go through the backend provider at src/lib/backend/.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [
      "src/lib/backend/supabase-provider.ts",
      "src/integrations/supabase/client.ts",
      "src/lib/supabase.ts",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@supabase/supabase-js",
              message:
                "Do not import Supabase directly. Use the backend provider from @/lib/backend/ instead.",
            },
          ],
          patterns: [
            {
              group: ["@/integrations/supabase/client", "@/integrations/supabase/client.ts"],
              message:
                "Do not import the Supabase client directly. Use the backend provider from @/lib/backend/ instead.",
            },
          ],
        },
      ],
    },
  },
);
