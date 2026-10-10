import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
    resolve: {
        alias: {
            "@": path.resolve(process.cwd()),
            // Next.js provides `server-only` as a built-in; stub it for tests.
            "server-only": path.resolve(
                process.cwd(),
                "tests/stubs/server-only.ts"
            ),
        },
    },
});