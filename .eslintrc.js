/* eslint-env node */
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/explicit-member-accessibility': 'warn',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/no-misused-promises': 0,
    '@typescript-eslint/no-floating-promises': 0,
    'max-len': [
      'warn',
      {
        'code': 180
      }
    ],
    'comma-dangle': 0,
    'no-console': 1,
    'no-extra-boolean-cast': 0,
    'semi': 1,
    'indent': ['warn', 2, {'SwitchCase': 1}],
    'quotes': ['warn', 'single'],
    'node/no-missing-import': 0,
    'node/no-unpublished-import': 0
  }
};