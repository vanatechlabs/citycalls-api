// Runtime regression run; TypeScript is checked separately with npm run typecheck.
module.exports = {
  ...require('./jest.config.js'),
  transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { isolatedModules: true } }] },
};
