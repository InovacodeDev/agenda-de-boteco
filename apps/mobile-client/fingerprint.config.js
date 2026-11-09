const { SourceSkips } = require('@expo/fingerprint');

module.exports = {
  sourceSkips: SourceSkips.ExpoConfigVersions | SourceSkips.ExpoConfigRuntimeVersionIfString,
  ignorePaths: [
    'CHANGELOG-*.md',
    '**/*.test.ts',
    '**/*.test.tsx',
    'docs/**',
    '../web*/**',
    '../admin/**',
    '../landing/**',
  ],
};
