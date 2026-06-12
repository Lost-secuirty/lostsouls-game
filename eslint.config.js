import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';

export default [
  { ignores: ['dist', 'node_modules', 'public/models', 'public/audio'] },
  js.configs.recommended,
  security.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      // Entity/system registries use constrained game-state keys, not user input.
      'security/detect-object-injection': 'off',
    },
  },
  prettier,
];
