const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@shakenbake/web', '@shakenbake/core', '@shakenbake/linear'],

  webpack: (config, { isServer }) => {
    // @shakenbake/core uses `import { randomUUID } from 'node:crypto'` in its
    // ReportBuilder. This is tree-shaken at runtime (not actually called from
    // the web provider path), but webpack still needs to resolve the import.
    //
    // On the server, Node.js handles `node:crypto` natively.
    // On the client, we redirect `node:crypto` to `crypto` (the builtin
    // browser polyfill slot) and set it to `false` so webpack provides an
    // empty module. The code has a try/catch fallback when randomUUID is
    // unavailable.
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
      };

      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:crypto$/,
          'crypto',
        ),
      );
    }

    return config;
  },
};

module.exports = nextConfig;
