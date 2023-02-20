import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    verbose: true,
    rootDir: 'src',
    testRegex: '(setup|test)\\.[jt]sx?$',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'],
    preset: 'ts-jest',
    transform: {
        '^.+\\.(js|ts|tsx)?$': 'ts-jest',
        "^.+\\.(js|jsx)$": "babel-jest",
    },
};

export default config;
