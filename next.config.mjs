/* eslint-disable */
// @ts-nocheck
/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";
import withPWA from 'next-pwa';

/** @type {import("next").NextConfig} */
const config = {
  experimental: {
    turbo: {
      enabled: true
    }
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/api/cron/process-notifications',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json',
          },
        ],
      },
    ];
  }
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  publicExcludes: ['!firebase-messaging-sw.js'],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\./,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
        }
      }
    }
  ]
})(config);

