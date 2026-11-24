import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync("docs", { recursive: true });

const browser = await chromium.launch();

const desktop = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
await desktop.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await desktop.screenshot({ path: "docs/preview.png" });

await desktop.evaluate(async () => {
  const step = Math.round(window.innerHeight * 0.75);
  for (let y = 0; y < document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((resolve) => setTimeout(resolve, 140));
  }
  window.scrollTo(0, 0);
});
await desktop.waitForTimeout(600);
await desktop.screenshot({ path: "docs/preview-full.png", fullPage: true });

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});
await mobile.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await mobile.screenshot({ path: "docs/preview-mobile.png" });

await browser.close();
