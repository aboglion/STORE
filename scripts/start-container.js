#!/usr/bin/env node
process.env.TZ = process.env.TZ || "Asia/Jerusalem";
const net = require("net");
const { spawn } = require("child_process");

// Transparent TCP forwarder from 127.0.0.1:54321 to host.docker.internal:54321
// Ensures Next.js Image Optimizer and SSR calls inside Docker container
// connecting to 127.0.0.1:54321 reach local Supabase on the host.
try {
    const server = net.createServer((client) => {
        const target = net.connect(54321, "host.docker.internal");
        client.pipe(target).pipe(client);
        client.on("error", () => { });
        target.on("error", () => { });
    });

    server.listen(54321, "127.0.0.1", () => {
        console.log("🔗 Storage forwarder active: 127.0.0.1:54321 -> host.docker.internal:54321");
    });
} catch (err) {
    console.warn("⚠️ Forwarder error:", err.message);
}

// Start Next.js standalone server
const nextServer = spawn("node", ["server.js"], {
    stdio: "inherit",
    env: process.env,
});

nextServer.on("exit", (code) => {
    process.exit(code || 0);
});

process.on("SIGTERM", () => nextServer.kill("SIGTERM"));
process.on("SIGINT", () => nextServer.kill("SIGINT"));
