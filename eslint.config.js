const js = require('@eslint/js')
const prettier = require('eslint-config-prettier')
const importPlugin = require('eslint-plugin-import')
const globals = require('globals')

module.exports = [
  js.configs.recommended,
  importPlugin.flatConfigs.errors,
  importPlugin.flatConfigs.warnings,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      // eslint:recommended
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],

      // eslint - styles
      'linebreak-style': ['error', 'unix'],

      // eslint - es6
      'no-var': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'error',

      // plugin:import
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc' },
          'newlines-between': 'always-and-inside-groups',
        },
      ],
      'import/no-unresolved': ['error', { commonjs: true }],
      'import/no-cycle': ['error', { commonjs: true }],
    },
  },
]
