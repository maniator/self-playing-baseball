const fs = require("node:fs");

const isDocker = fs.existsSync("/.dockerenv");
const allowed = process.env.ALLOW_DOCKER_SNAPSHOT_UPDATE === "1";

if (!isDocker || !allowed) {
  console.error(
    [
      "Refusing to update Playwright visual snapshots on this environment.",
      "Run snapshot updates only in the CI-matching Docker container:",
      "  mcr.microsoft.com/playwright:v1.58.2-noble",
      "",
      "Allowed paths:",
      "1) GitHub Actions workflow: update-visual-snapshots",
      "2) Docker run with ALLOW_DOCKER_SNAPSHOT_UPDATE=1",
    ].join("\n"),
  );
  process.exit(1);
}
