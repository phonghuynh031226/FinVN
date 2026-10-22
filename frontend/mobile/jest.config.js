module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          rootDir: '.',
          types: ['jest', 'node'],
          esModuleInterop: true,
          strict: false,
        },
      },
    ],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^expo-secure-store$': '<rootDir>/__tests__/__mocks__/secureStoreMock.js',
    '^react-native$': '<rootDir>/__tests__/__mocks__/reactNativeMock.js',
  },
};
