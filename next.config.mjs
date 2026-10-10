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
const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co http://127.0.0.1:54321 http://host.docker.internal:54321",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:54321 http://host.docker.internal:54321",
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
    output: "standalone",
    images: {
        // Local demo placeholders in /public/products are SVGs.
        dangerouslyAllowSVG: true,
        // Sandboxed SVG optimization endpoint (no scripts allowed).
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        // Serve modern formats to mobile browsers.
        formats: ["image/avif", "image/webp"],
        // Cache optimized images for at least an hour.
        minimumCacheTTL: 3600,
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
};

export default withNextIntl(nextConfig);
