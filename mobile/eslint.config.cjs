// ESLint v9+ flat config (keeps parity with the previous .eslintrc.json)
// See: https://eslint.org/docs/latest/use/configure/migration-guide

const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const prettier = require('eslint-config-prettier');

let eslintRecommendedRules = {};
try {
  // eslint ships this dependency; keeping it optional makes this file more robust.
  // eslint-disable-next-line import/no-extraneous-dependencies
  const js = require('@eslint/js');
  eslintRecommendedRules = js?.configs?.recommended?.rules || {};
} catch (_) {
  eslintRecommendedRules = {};
}

const browserAndJestGlobals = {
  // Browser-ish
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  fetch: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  console: 'readonly',

  // Jest
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  jest: 'readonly',

  // React Native
  __DEV__: 'readonly',
};

function getPluginRecommendedRules(plugin, configKey) {
  // Some plugins expose recommended configs differently across versions.
  return (
    plugin?.configs?.[configKey]?.rules ||
    plugin?.configs?.recommended?.rules ||
    plugin?.configs?.['flat/recommended']?.rules ||
    {}
  );
}

module.exports = [
  {
    ignores: ['node_modules/**', 'ios/**', 'android/**', 'web/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: browserAndJestGlobals,
    },
    settings: {
      react: { version: 'detect' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...eslintRecommendedRules,
      ...getPluginRecommendedRules(react, 'recommended'),
      ...getPluginRecommendedRules(reactHooks, 'recommended'),
      ...(prettier?.rules || {}),

      'react/prop-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];

