import babelParser from "@babel/eslint-parser";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import onlyWarn from "eslint-plugin-only-warn";
import turboPlugin from "eslint-plugin-turbo";

/** @type {import("eslint").Linter.Config[]} */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-typescript"],
          // Babel 8 no longer infers JSX from the .tsx extension.
          overrides: [{ test: /\.[jt]sx$/, plugins: ["@babel/plugin-syntax-jsx"] }],
        },
      },
    },
  },
  {
    // The TypeScript compiler already reports undefined names, including type-only globals.
    files: ["**/*.{ts,tsx}"],
    rules: { "no-undef": "off", "no-unused-vars": "off" },
  },
  { plugins: { turbo: turboPlugin }, rules: { "turbo/no-undeclared-env-vars": "warn" } },
  { plugins: { onlyWarn } },
  { ignores: ["dist/**", ".next/**", "next-env.d.ts"] },
];
