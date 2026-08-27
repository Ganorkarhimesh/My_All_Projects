/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Required so ffmpeg.wasm / pdfjs / tesseract.js worker threads can use
  // SharedArrayBuffer for multi-threaded, fully in-browser processing.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
  webpack: (config) => {
    // pdfjs-dist / ffmpeg reference node-only APIs that don't exist in the
    // browser bundle target — stub them out.
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
