module.exports = {
  presets: ["babel-preset-expo"],
  plugins: [
    [
      "module-resolver",
      {
        root: ["."],
        alias: {
          utils: "./utils",
        },
      },
    ],
    "react-native-reanimated/plugin",
  ],
};
