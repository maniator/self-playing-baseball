const fs = require("node:fs");

const isDocker = fs.existsSync("/.dockerenv");

if (!isDocker) {
  console.error(
    [
      "Refusing to update Playwright visual snapshots on this environment.",
      "Run snapshot updates only in the CI-matching Docker container:",
      "  mcr.microsoft.com/playwright:v1.58.2-noble",
      "",
      "Allowed paths:",
      "1) GitHub Actions workflow: update-visual-snapshots",
      "2) Docker run inside mcr.microsoft.com/playwright:v1.58.2-noble",
    ].join("\n"),
  );
  process.exit(1);
}
