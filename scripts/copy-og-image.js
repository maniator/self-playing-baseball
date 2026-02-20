// Copies the OG image to dist/ at a stable, non-hashed path so the absolute
// URL used in og:image and twitter:image meta tags remains valid across builds.
const fs = require("fs");
fs.copyFileSync("src/images/baseball-512.png", "dist/og-image.png");
