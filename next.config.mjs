/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'img.logo.dev',
            }
        ]
    },
    output: "standalone",
    experimental: {
        serverActions: {
            bodySizeLimit: "5mb"
        }
    }
};


export default nextConfig;
