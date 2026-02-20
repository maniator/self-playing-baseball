// Copies the OG image to dist/ at a stable, non-hashed path so the absolute
// URL used in og:image and twitter:image meta tags remains valid across builds.
const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "../src/images/baseball-512.png");
const distDir = path.join(__dirname, "../dist");
const destPath = path.join(distDir, "og-image.png");

fs.mkdirSync(distDir, { recursive: true });
fs.copyFileSync(srcPath, destPath);
