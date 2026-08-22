module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@mobiletrust/shared': './packages/shared/src/index.ts',
        },
      },
    ],
  ],
};
