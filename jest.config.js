module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // For CSS Modules
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/__mocks__/fileMock.js', // For other static assets
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Jest will look for test files in __tests__ folders, or files with .test or .spec extensions
};
