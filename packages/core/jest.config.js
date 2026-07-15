/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@agenda/core$': '<rootDir>/src/index.ts',
  },
};
