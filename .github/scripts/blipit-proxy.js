#!/usr/bin/env node
/**
 * blipit-proxy.js
 *
 * Reverse proxy: http://localhost:3456  →  https://blipit.net
 *
 * The Playwright browser sandbox is hardcoded to localhost-only navigation
 * regardless of any --allowed-origins config. Node.js processes can reach
 * blipit.net freely (repo-level network firewall allows it). This proxy
 * bridges the two: the browser navigates to http://localhost:3456 and Node.js
 * forwards the request to the live production site.
 *
 * Usage:
 *   node .github/scripts/blipit-proxy.js
 *   # or with a custom port:
 *   BLIPIT_PROXY_PORT=8080 node .github/scripts/blipit-proxy.js
 */

"use strict";

const http = require("http");
const https = require("https");

const TARGET_HOST = "blipit.net";
const PORT = parseInt(process.env.BLIPIT_PROXY_PORT || "3456", 10);

const server = http.createServer((req, res) => {
  const options = {
    hostname: TARGET_HOST,
    port: 443,
    path: req.url || "/",
    method: req.method,
    headers: {
      ...req.headers,
      host: TARGET_HOST,
    },
  };

  // Remove headers that can cause issues with the upstream server
  delete options.headers["accept-encoding"];

  const proxyReq = https.request(options, (proxyRes) => {
    const headers = Object.assign({}, proxyRes.headers);

    // Rewrite any redirect Location headers so they stay on localhost
    if (headers.location) {
      headers.location = headers.location.replace(
        /https?:\/\/(www\.)?blipit\.net/gi,
        `http://localhost:${PORT}`,
      );
    }

    res.writeHead(proxyRes.statusCode, headers);
    proxyRes.pipe(res, { end: true });

    // Clean up upstream if the client disconnects mid-response
    res.on("close", () => proxyRes.destroy());
  });

  proxyReq.on("error", (err) => {
    console.error("[blipit-proxy] upstream error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "text/plain" });
    }
    res.end(`Proxy error: ${err.message}\n`);
  });

  // Clean up upstream request if the client aborts before a response begins
  req.on("close", () => proxyReq.destroy());

  req.pipe(proxyReq, { end: true });
});

server.on("error", (err) => {
  console.error("[blipit-proxy] server error:", err.message);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `[blipit-proxy] Listening on http://localhost:${PORT}  →  https://${TARGET_HOST}`,
  );
});
