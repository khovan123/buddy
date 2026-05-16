/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  setupFiles: ['<rootDir>/test/integration/setup-env.ts'],
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/main.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'cobertura'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@libs/common(|/.*)$': '<rootDir>/../../libs/common/src/$1',
    '^@libs/contracts(|/.*)$': '<rootDir>/../../libs/contracts/src/$1',
    '^@libs/testing(|/.*)$': '<rootDir>/../../libs/testing/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/test/e2e'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
};
