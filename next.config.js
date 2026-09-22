/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  experimental: {
    optimizePackageImports: ["xlsx"],
  },
  images: {
    // biar foto paslon terkompres otomatis jika pakai next/image nanti
    formats: ["image/avif", "image/webp"],
  },
};

module.exports = nextConfig;
