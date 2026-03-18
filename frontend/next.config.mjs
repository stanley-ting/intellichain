/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['mapbox-gl', 'react-map-gl'],
};

export default nextConfig;
