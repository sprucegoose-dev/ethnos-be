import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    verbose: true,
    rootDir: 'src',
    testRegex: '(setup|test)\\.[jt]sx?$',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'],
    moduleNameMapper: {
        '^@controllers/(.*)$': '<rootDir>/controllers/$1',
        '^@helpers/(.*)$': '<rootDir>/helpers/$1',
        '^@middleware/(.*)$': '<rootDir>/middleware/$1',
        '^@models/(.*)$': '<rootDir>/models/$1',
        '^@services/(.*)$': '<rootDir>/services/$1',
        '^@tasks/(.*)$': '<rootDir>/tasks/$1',
        '^@interfaces/(.*)$': '<rootDir>/interfaces/$1',
        '^@jest.setup$': '<rootDir>/../jest.setup'
      },
    preset: 'ts-jest',
    transform: {
        '^.+\\.(js|ts|tsx)?$': 'ts-jest',
        "^.+\\.(js|jsx)$": "babel-jest",
    },
    collectCoverage: process.env.COVERAGE === 'true',
    collectCoverageFrom: [
        '**/*.{ts,tsx}',
        '!**/*.interface.ts',
        '!**/*.model.ts',
        '!**/*.test.ts',
        '!**/index.ts'
    ],
    coverageDirectory: '<rootDir>/../coverage',
    coverageReporters: ['text', 'lcov'],
};

export default config;
