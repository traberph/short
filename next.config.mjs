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

};


export default nextConfig;
