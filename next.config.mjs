/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    distDir: 'dist',
    eslint: {
        // This option allows Vercel to successfully deploy your project even if it has ESLint errors.
        ignoreDuringBuilds: true,
      }
};

export default nextConfig;
