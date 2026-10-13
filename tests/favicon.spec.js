import { test, expect } from "@playwright/test";

for (const appUrl of ["/index.html", "/collection.html"]) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    test(`${appUrl} loads without a favicon request at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const faviconRequests = [];
      const failedResources = [];
      page.on("request", (request) => {
        if (new URL(request.url()).pathname === "/favicon.ico") {
          faviconRequests.push(request.url());
        }
      });
      page.on("requestfailed", (request) => {
        if (request.url().startsWith("http")) failedResources.push(request.url());
      });
      page.on("response", (response) => {
        if (response.status() >= 400) failedResources.push(response.url());
      });

      await page.goto(appUrl, { waitUntil: "networkidle" });

      await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "data:,");
      expect(faviconRequests).toEqual([]);
      expect(failedResources).toEqual([]);
    });
  }
}
