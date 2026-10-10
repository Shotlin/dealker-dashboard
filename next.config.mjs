/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Pre-existing lint errors in other modules should not block production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "api.dealker.agnixstudio.in",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "4500",
      },
    ],
  },
  // Proxy API requests to backend (optional — can also use direct CORS)
  async rewrites() {
    return [
      // Uncomment below to proxy API calls through Next.js:
      // {
      //   source: "/api/v1/:path*",
      //   destination: "http://localhost:3000/api/v1/:path*",
      // },
    ];
  },
};

export default nextConfig;
