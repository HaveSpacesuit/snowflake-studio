import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

for (const appUrl of ["/index.html", "/collection.html"]) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    test(`${appUrl} serves the SVG favicon without fallback requests at ${viewport.width}px`, async ({ page }) => {
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

      const favicon = page.locator('link[rel="icon"]');
      await expect(favicon).toHaveAttribute("type", "image/svg+xml");
      await expect(favicon).toHaveAttribute("href", /^(?:\.\/|\/)favicon\.svg$/);
      const faviconUrl = new URL(await favicon.getAttribute("href"), page.url()).href;
      const response = await page.request.get(faviconUrl);
      expect(response.ok()).toBe(true);
      expect(response.headers()["content-type"]).toContain("image/svg+xml");
      expect(await response.text()).toBe(
        await readFile(new URL("../favicon.svg", import.meta.url), "utf8")
      );
      expect(faviconRequests).toEqual([]);
      expect(failedResources).toEqual([]);
    });
  }
}
