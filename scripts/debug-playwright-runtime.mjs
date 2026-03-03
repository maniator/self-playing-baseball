import { chromium, webkit } from "playwright";

async function probe(browserType, viewport) {
  const browser = await browserType.launch();
  const page = await browser.newPage({ viewport });

  page.on("console", (message) => {
    console.log(`[${browserType.name()} console] ${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    console.log(`[${browserType.name()} pageerror] ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    console.log(
      `[${browserType.name()} requestfailed] ${request.url()} ${request.failure()?.errorText ?? ""}`,
    );
  });

  await page.goto("http://localhost:5173/", { waitUntil: "load" });
  await page.waitForTimeout(5000);

  const homeCount = await page.locator('[data-testid="home-screen"]').count();
  const loadingCount = await page.getByText("Loading game…").count();
  const bodyText = ((await page.textContent("body")) ?? "").slice(0, 300);

  console.log(
    `[${browserType.name()} summary] home=${homeCount} loading=${loadingCount} url=${page.url()} title=${await page.title()}`,
  );
  console.log(`[${browserType.name()} body] ${bodyText}`);

  await browser.close();
}

(async () => {
  await probe(chromium, { width: 1280, height: 800 });
  await probe(webkit, { width: 430, height: 739 });
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
