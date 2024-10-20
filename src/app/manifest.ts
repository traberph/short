import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "traberph/short",
        short_name: "short",
        description: "A URL shortener",
        start_url: "/~/dash",
        display: "standalone",
        theme_color: "#111827",
        background_color: "#111827",
        icons: [
            {
                src:'/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src:'/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}

        