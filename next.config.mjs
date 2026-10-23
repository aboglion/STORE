process.env.TZ = "Asia/Jerusalem";

import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const isProd = process.env.NODE_ENV === "production";
const isHttps = (process.env.NEXT_PUBLIC_SITE_URL ?? "").startsWith("https://");

/**
 * Content-Security-Policy.
 * - Production: strict baseline. `script-src 'unsafe-inline'` is required by
 *   Next.js inline bootstrap scripts; everything else is locked down.
 * - Development: CSP is skipped so webpack HMR / React DevTools keep working.
 */
const extraSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL ? [process.env.NEXT_PUBLIC_SUPABASE_URL] : [];
const extraSupabaseWs = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? [process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/^http/i, "ws")]
    : [];

const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    [
        "img-src 'self' data: blob: https://*.supabase.co http://127.0.0.1:54321 http://localhost:54321 http://host.docker.internal:54321",
        ...extraSupabase,
    ].join(" "),
    "font-src 'self' data:",
    [
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:54321 ws://127.0.0.1:54321 http://localhost:54321 ws://localhost:54321 http://host.docker.internal:54321 ws://host.docker.internal:54321",
        ...extraSupabase,
        ...extraSupabaseWs,
    ].join(" "),
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self), payment=()",
    },
];

if (isProd) {
    securityHeaders.push({ key: "Content-Security-Policy", value: csp });
}

if (isHttps) {
    securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: process.env.STANDALONE === "true" ? "standalone" : undefined,
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        // Local demo placeholders in /public/products are SVGs.
        dangerouslyAllowSVG: true,
        // Sandboxed SVG optimization endpoint (no scripts allowed).
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        // Serve modern WebP first for fast CPU transcoding, followed by AVIF.
        formats: ["image/webp", "image/avif"],
        // Cache optimized images for 30 days (avoids repeated CPU transcoding).
        minimumCacheTTL: 2592000,
        // Tailored device & image sizes to avoid oversized mobile payloads
        deviceSizes: [360, 480, 640, 750, 828, 1080, 1200],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
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
            {
                // Local Supabase reachable from inside the app container
                protocol: "http",
                hostname: "host.docker.internal",
                port: "54321",
                pathname: "/storage/v1/object/public/**",
            },
        ],
    },
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: securityHeaders,
            },
        ];
    },
    experimental: {
        optimizePackageImports: [
            "lucide-react",
            "recharts",
            "date-fns",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
        ],
    },
    webpack(config) {
        config.infrastructureLogging = {
            level: "error",
        };
        return config;
    },
};

export default withNextIntl(nextConfig);
