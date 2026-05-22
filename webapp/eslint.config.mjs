import path from "node:path";

import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import cssModule from "eslint-plugin-css-modules";
import prettier from "eslint-plugin-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.{js,jsx,tsx,ts}"],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      "react-refresh": reactRefresh,
      prettier,
      "css-modules": cssModule,
    },
    settings: {
      react: { version: "detect" },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/resolver": {
        typescript: { project: path.resolve("./tsconfig.json") },
        node: { extensions: [".js", ".jsx", ".ts", ".tsx"] },
      },
    },
    rules: {
      ...(reactHooks.configs.recommended?.rules ?? {}),

      "react-refresh/only-export-components": "off",

      // CSS Modules
      "css-modules/no-unused-class": 1,
      "css-modules/no-undef-class": 1,

      // Common rules
      curly: 2,
      "linebreak-style": 0,
      "max-len": [
        2,
        {
          code: 120,
          ignoreTemplateLiterals: true,
          ignoreStrings: true,
          ignoreComments: true,
        },
      ],
      "no-case-declarations": 1,
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-use-before-define": 0,
      "no-useless-escape": 1,

      // React
      "react/no-deprecated": 1,
      "react/no-string-refs": 1,
      "react/no-array-index-key": 1,
      "react/jsx-filename-extension": 0,
      "react/jsx-props-no-spreading": 0,
      "react/prop-types": 0,
      "react/require-default-props": 0,

      // Accessibility
      "jsx-a11y/click-events-have-key-events": 0,
      "jsx-a11y/no-static-element-interactions": 0,
      "jsx-a11y/label-has-associated-control": 0,
      "jsx-a11y/alt-text": 0,
      "jsx-a11y/anchor-is-valid": 0,

      // Import rules
      "import/prefer-default-export": 0,
      "import/extensions": [
        "error",
        "ignorePackages",
        { js: "never", jsx: "never", ts: "never", tsx: "never" },
      ],
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          pathGroups: [
            {
              pattern: "react",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next-auth",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next-auth/**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/newline-after-import": 2,
      "import/no-unresolved": "error",
      "no-restricted-globals": [
        "error",
        {
          name: "window",
          message:
            'Direct use of "window" may cause Hydration Mismatch. Wrap it in useEffect or use a "typeof window !== undefined" check.',
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            "Math.random() generates different values between Server and Client. Initialize random values inside useEffect to avoid Hydration errors.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            "Date.now() varies depending on render time. Use it inside useEffect or useSyncExternalStore for consistent SSR/CSR rendering.",
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-refresh": reactRefresh,
      prettier,
      "css-modules": cssModule,
    },
    settings: {
      react: { version: "detect" },
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"],
      },
      "import/resolver": {
        typescript: { project: path.resolve("./tsconfig.json") },
        node: { extensions: [".js", ".jsx", ".ts", ".tsx"] },
      },
    },
    rules: {
      ...(reactHooks.configs.recommended?.rules ?? {}),

      "react-refresh/only-export-components": "off",

      // TypeScript & Prettier
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^(_|err|error|action|state)",
          varsIgnorePattern: "^(_|err|error|action|state)",
          caughtErrorsIgnorePattern: "^(_|err|error|action|state)",
        },
      ],

      // CSS Modules
      "css-modules/no-unused-class": 1,
      "css-modules/no-undef-class": 1,

      // Common rules
      curly: 2,
      "linebreak-style": 0,
      "max-len": [
        2,
        {
          code: 120,
          ignoreTemplateLiterals: true,
          ignoreStrings: true,
          ignoreComments: true,
        },
      ],
      "no-case-declarations": 1,
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-use-before-define": 0,
      "no-useless-escape": 1,

      // React
      "react/no-deprecated": 1,
      "react/no-string-refs": 1,
      "react/no-array-index-key": 1,
      "react/jsx-filename-extension": 0,
      "react/jsx-props-no-spreading": 0,
      "react/prop-types": 0,
      "react/require-default-props": 0,

      // Accessibility
      "jsx-a11y/click-events-have-key-events": 0,
      "jsx-a11y/no-static-element-interactions": 0,
      "jsx-a11y/label-has-associated-control": 0,
      "jsx-a11y/alt-text": 0,
      "jsx-a11y/anchor-is-valid": 0,

      // Import rules
      "import/prefer-default-export": 0,
      "import/extensions": [
        "error",
        "ignorePackages",
        { js: "never", jsx: "never", ts: "never", tsx: "never" },
      ],
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
          ],
          "newlines-between": "always",
          pathGroups: [
            {
              pattern: "react",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next/**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next-auth",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "next-auth/**",
              group: "builtin",
              position: "before",
            },
            {
              pattern: "@/**",
              group: "internal",
              position: "before",
            },
          ],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
      "import/newline-after-import": 2,
      "import/no-unresolved": "error",
      "no-restricted-globals": [
        "error",
        {
          name: "window",
          message:
            'Direct use of "window" may cause Hydration Mismatch. Wrap it in useEffect or use a "typeof window !== undefined" check.',
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message:
            "Math.random() generates different values between Server and Client. Initialize random values inside useEffect to avoid Hydration errors.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message:
            "Date.now() varies depending on render time. Use it inside useEffect or useSyncExternalStore for consistent SSR/CSR rendering.",
        },
      ],
    },
  },
  {
    files: ["*.config.js", "*.config.mjs", "*.config.cjs"],
    rules: {
      "import/order": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Test files — no test runner configured yet (no jest.config, no test script).
    // Ignored to prevent @typescript-eslint/parser errors from tsconfig exclusion.
    "__tests__/**",
  ]),
])

export default eslintConfig;
