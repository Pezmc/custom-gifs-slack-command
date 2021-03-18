module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  overrides: [
    // node
    {
      files: ['.eslintrc.js', '.prettierrc.js'],
      env: {
        node: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
  rules: {
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
}
