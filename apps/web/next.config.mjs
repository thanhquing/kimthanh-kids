import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@kimthanh/shared-api-client',
    '@kimthanh/shared-auth',
    '@kimthanh/shared-types',
    '@kimthanh/shared-ui',
    '@kimthanh/shared-utils',
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default withNextIntl(nextConfig);
