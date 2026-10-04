/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        // Local demo placeholders in /public/products are SVGs.
        dangerouslyAllowSVG: true,
        remotePatterns: [
            {
                protocol: "https",
                hostname: "*.supabase.co",
                pathname: "/storage/v1/object/public/**",
            },
            {
                // Local Supabase (Docker) — product images from Storage
                protocol: "http",
                hostname: "127.0.0.1",
                port: "54321",
                pathname: "/storage/v1/object/public/**",
            },
        ],
    },
};

export default nextConfig;
