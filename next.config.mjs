/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www.google.com',
            },
            {
                protocol: 'https',
                hostname: 'logo.clearbit.com',
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
