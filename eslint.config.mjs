import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import convex from "@convex-dev/eslint-plugin";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...convex.configs.recommended,
  {
    // Better Auth's generated indexes also form part of the adapter's lookup contract.
    files: ["convex/betterAuth/schema.generated.ts"],
    rules: { "@convex-dev/no-duplicate-indexes": "off" },
  },
  {
    files: ["convex/**/*.ts"],
    languageOptions: { parserOptions: { projectService: true } },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/**/_generated/**",
  ]),
]);

export default eslintConfig;
