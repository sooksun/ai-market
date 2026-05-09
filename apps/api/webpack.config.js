// Custom webpack config for NestJS API.
// Default Nest webpack externalizes everything in node_modules. We want
// workspace packages (@ai-market/*) bundled so the runtime doesn't try
// to load TS source via Node ESM resolver.

const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    externals: [
      function ({ context, request }, callback) {
        // Always bundle workspace packages
        if (request && request.startsWith('@ai-market/')) {
          return callback();
        }
        // Externalize anything else from node_modules
        if (request && /^[a-z@][a-z0-9-_/.@]+$/i.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        // Relative imports — bundle as usual
        callback();
      },
    ],
    resolve: {
      ...(options.resolve || {}),
      extensions: ['.ts', '.tsx', '.js', '.json'],
      alias: {
        ...((options.resolve && options.resolve.alias) || {}),
        '@ai-market/shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@ai-market/db': path.resolve(__dirname, '../../packages/db/src'),
      },
    },
  };
};
