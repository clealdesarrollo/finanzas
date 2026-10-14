/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          target: 'es2022',
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: false,
            dynamicImport: true,
          },
        },
        module: {
          type: 'commonjs',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },
  testTimeout: 20000,
  collectCoverageFrom: [
    'server/controllers/**/*.ts',
    'server/middlewares/**/*.ts',
    'server/routes/**/*.ts',
  ],
  coverageDirectory: 'coverage',
};
