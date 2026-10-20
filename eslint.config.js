// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'scripts/*'],
    rules: {
      'react-hooks/immutability': 'off', // Reanimated shared values mutate .value by design
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
