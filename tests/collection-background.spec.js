import { test, expect } from "@playwright/test";

test("Collection renders ambient snowflakes without failed blob requests", async ({ page }) => {
  const failedRequests = [];
  const errors = [];
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/collection.html", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Snowflake Studio" })).toBeVisible();
  await expect.poll(() => page.locator("#backgroundCanvas").evaluate((canvas) => {
    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);

  expect(failedRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test("background cancels pending images before revoking their URLs", async ({ page }) => {
  await page.goto("/collection.html", { waitUntil: "networkidle" });

  const cleanup = await page.evaluate(async () => {
    const { createCollectionBackground } = await import("/src/collection/background.ts");
    const NativeImage = window.Image;
    const nativeRevoke = URL.revokeObjectURL;
    const images = [];
    const revoked = [];
    window.Image = class extends NativeImage {
      constructor() {
        super();
        images.push(this);
      }
    };
    URL.revokeObjectURL = (url) => {
      revoked.push({ url, stillAssigned: images.some((image) => image.getAttribute("src") === url) });
      nativeRevoke.call(URL, url);
    };

    const background = createCollectionBackground(document.createElement("canvas"));
    try {
      background.setItems([]);
      background.setItems([{
        id: "saved",
        previewSvg: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8"/></svg>'
      }]);
      background.destroy();
      background.destroy();
      return { imageCount: images.length, revoked };
    } finally {
      background.destroy();
      window.Image = NativeImage;
      URL.revokeObjectURL = nativeRevoke;
    }
  });

  expect(cleanup.imageCount).toBe(2);
  expect(cleanup.revoked).toHaveLength(2);
  expect(new Set(cleanup.revoked.map(({ url }) => url)).size).toBe(2);
  expect(cleanup.revoked.every(({ stillAssigned }) => !stillAssigned)).toBe(true);
});
