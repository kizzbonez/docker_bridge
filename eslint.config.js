import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Size budgets keep every file single-purpose: split before it grows.
const budgets = {
  'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
  complexity: ['error', 10],
};

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules', 'playwright-report', 'test-results', 'security/reports'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}', 'portal/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules, ...budgets },
  },
  {
    // Node code; Playwright callbacks passed to page.evaluate() run in the browser.
    files: ['*.{js,ts}', 'scripts/**/*.mjs', 'tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: { 'max-lines': budgets['max-lines'] },
  },
  {
    files: ['auth/**/*.ts', 'bridge/**/*.ts', 'console/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: budgets,
  },
  {
    // A describe() block is one "function"; the per-function budget would only add noise.
    files: ['src/**/*.test.{ts,tsx}', 'auth/**/*.test.ts', 'auth/test-harness.ts', 'bridge/**/*.test.ts', 'bridge/test-support/**/*.ts', 'console/**/*.test.ts', 'console/test-harness.ts', 'tests/**/*.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
);
