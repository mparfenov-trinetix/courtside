// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Everything is used through a folder's index.ts: `@/features/game`, `@/components`, `@/lib/espn`, never a file
    // inside one. Inside a feature, reach a sibling as `../OtherComponent` and the feature's own components as `../../components`.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.stories.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/components/*/*', '@/features/*/*', '@/lib/*/*', '@/hooks/*', '@/state/*', '@/navigation/*'],
              message: "Import a folder's index ('@/features/game', '@/components', '@/lib/espn'), never a file inside it.",
            },
          ],
        },
      ],
    },
  },
]);
