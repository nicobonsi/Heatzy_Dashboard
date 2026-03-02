/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  // basePath is set via NEXT_PUBLIC_BASE_PATH at build time:
  //   - local dev: empty (runs at localhost:3000)
  //   - GitHub Pages: /Heatzy_Dashboard
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
