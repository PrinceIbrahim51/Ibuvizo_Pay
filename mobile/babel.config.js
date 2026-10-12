module.exports = function (api) {
  api.cache(true);
  const plugins = [];
  // Release builds: strip every console.* call so nothing sensitive can ever reach device logs.
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }
  return { presets: ['babel-preset-expo'], plugins };
};
