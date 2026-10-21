import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium, webkit } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// A bounded foreground check: the server and browsers close before this script exits.
const out = resolve("test/scratch/interactions");
await mkdir(out, { recursive: true });
const dist = resolve("dist");
const posts = JSON.parse(await readFile("src/posts.json", "utf8"));
const mime = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://local").pathname);
    if (!path.startsWith("/preview/")) {
      res.writeHead(404).end();
      return;
    }
    const file = resolve(dist, path.slice("/preview/".length) || "index.html");
    if (!file.startsWith(dist + "/")) {
      res.writeHead(403).end();
      return;
    }
    const bytes = await readFile(file);
    res
      .writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
      })
      .end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const url = `${origin}/preview/`;
const report = {
  tests: [],
  limitations: [],
  viewports: [],
  accessibility: [],
  errors: [],
  externalRuntimeRequests: [],
};
const key = "pond-intel-bookmarks-v1";
async function test(name, fn) {
  await fn();
  report.tests.push({ name, passed: true });
}
async function waitCount(page, n) {
  await page.waitForFunction(
    (n) => document.querySelectorAll(".tweet").length === n,
    n,
  );
  assert.equal(await page.locator(".tweet").count(), n);
}
async function reset(page) {
  await page.goto(url);
  await page.locator(".tweet").first().waitFor();
}
async function run(engine, name) {
  let browser;
  try {
    browser = await engine.launch({ headless: true });
  } catch (error) {
    if (
      name === "webkit" &&
      /missing dependencies|error while loading shared libraries/.test(
        error.message,
      )
    ) {
      report.limitations.push(
        "WebKit could not launch because this runtime lacks its system libraries. Chromium results do not establish Safari behavior.",
      );
      return;
    }
    throw error;
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await context.route("**/*", (route) => {
    const u = route.request().url();
    if (u.startsWith(origin)) return route.continue();
    report.externalRuntimeRequests.push(u);
    return route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      report.errors.push(
        `HTTP ${response.status()}: ${new URL(response.url()).pathname}`,
      );
  });
  try {
    await test(`${name}: export loads offline at a static subpath`, async () => {
      await reset(page);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.title(),
        "Pond Intel · The Identity.md conversation",
      );
      assert.equal(await page.locator(".tweet").count(), posts.length);
      assert.equal(
        await page.evaluate(() =>
          [...document.images].every((i) => i.complete && i.naturalWidth > 0),
        ),
        true,
      );
      assert.equal(
        await page.evaluate(() => document.fonts.check('16px "DM Sans"')),
        true,
      );
    });
    for (const width of [320, 390, 760, 1040, 1440]) {
      await test(`${name}: ${width}px reflow and primary action`, async () => {
        await page.setViewportSize({
          width,
          height: width > 1000 ? 1000 : 844,
        });
        await page.evaluate(() => scrollTo(0, 0));
        const data = await page.evaluate(() => ({
          page: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
          action: document
            .querySelector(".hero button")
            .getBoundingClientRect()
            .toJSON(),
          post: document
            .querySelector(".tweet")
            .getBoundingClientRect()
            .toJSON(),
        }));
        assert.ok(data.scroll <= data.page, `Overflow at ${width}`);
        assert.ok(data.action.top > 0 && data.action.bottom < 844);
        if (width === 390)
          assert.ok(
            data.post.top < 844,
            "Product must appear on the first screen",
          );
        report.viewports.push({
          engine: name,
          width,
          scrollWidth: data.scroll,
          actionBottom: data.action.bottom,
          firstTweetTop: data.post.top,
        });
        if ([320, 390, 1440].includes(width))
          await page.screenshot({ path: resolve(out, `${name}-${width}.png`) });
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await test(`${name}: search by author, empty result, reset`, async () => {
      const search = page.getByRole("searchbox");
      await search.fill("0xfinne");
      await waitCount(page, 1);
      assert.equal(
        await page.locator(".tweet").getAttribute("data-post-id"),
        "2086684806344303086",
      );
      await search.fill("no-such-pepe-983");
      await waitCount(page, 0);
      assert.equal(
        await page.getByRole("heading", { name: "No tweets found" }).count(),
        1,
      );
      await page
        .getByRole("button", { name: "Clear filters", exact: true })
        .click();
      await waitCount(page, 8);
    });
    await test(`${name}: topic filters and combined search`, async () => {
      const group = page.getByRole("group", { name: "Filter tweets by topic" });
      await group
        .getByRole("button", { name: "AI agents", exact: true })
        .click();
      await waitCount(page, 2);
      await page.getByRole("searchbox").fill("LastToSign");
      await waitCount(page, 1);
      assert.equal(
        await page.locator(".tweet").getAttribute("data-post-id"),
        "2090891870486348070",
      );
      await page.getByRole("button", { name: "Clear search" }).click();
      await waitCount(page, 2);
      await group
        .getByRole("button", { name: "Community", exact: true })
        .click();
      await waitCount(page, 2);
      assert.ok(
        (await page.locator(".tweet").allTextContents()).every((s) =>
          s.includes("Community"),
        ),
      );
      await group
        .getByRole("button", { name: "All tweets", exact: true })
        .click();
      await waitCount(page, 8);
    });
    await test(`${name}: all ranking modes`, async () => {
      for (const sort of ["likes", "reposts", "views", "newest"]) {
        await page
          .getByRole("combobox", { name: "Sort tweets" })
          .selectOption(sort);
        const actual = await page
          .locator(".tweet")
          .evaluateAll((els) => els.map((e) => e.dataset.postId));
        const expected = posts
          .slice()
          .sort((a, b) =>
            sort === "newest"
              ? Date.parse(b.date) - Date.parse(a.date)
              : b[sort] - a[sort] || Date.parse(b.date) - Date.parse(a.date),
          )
          .map((p) => p.id);
        assert.deepEqual(actual, expected);
      }
    });
    await test(`${name}: month filtering`, async () => {
      const select = page.getByRole("combobox", { name: "Filter by month" });
      for (const [month, count] of [
        ["9", 1],
        ["8", 1],
        ["7", 6],
        ["all", 8],
      ]) {
        await select.selectOption(month);
        await waitCount(page, count);
      }
    });
    await test(`${name}: tweet topic is an active filter`, async () => {
      await page.locator(".tweet .topic-link").first().click();
      await waitCount(page, 2);
      await page
        .getByRole("group")
        .getByRole("button", { name: "All tweets", exact: true })
        .click();
      await waitCount(page, 8);
    });
    await test(`${name}: hash navigation supports browser Back and Forward`, async () => {
      await reset(page);
      const nav = page.getByRole("navigation", { name: "Mobile main" });
      await nav.getByRole("link", { name: /Bookmarks/ }).click();
      await waitCount(page, 0);
      await page.goBack();
      await waitCount(page, 8);
      assert.equal(new URL(page.url()).hash, "");
      assert.match(
        await page.locator("#feed-title").textContent(),
        /From the pond/,
      );
      await page.goForward();
      await waitCount(page, 0);
      assert.equal(new URL(page.url()).hash, "#bookmarks");
      await nav.getByRole("link", { name: "Explore", exact: true }).click();
      await waitCount(page, 8);
    });
    await test(`${name}: bookmark persistence, view, removal, empty recovery`, async () => {
      await page.locator(".bookmark-button").first().click();
      assert.equal(
        await page
          .locator(".bookmark-button")
          .first()
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.ok(
        (
          await page.evaluate(
            (key) => JSON.parse(localStorage.getItem(key)),
            key,
          )
        ).length === 1,
      );
      await page.getByRole("button", { name: "Dismiss notification" }).click();
      await page
        .getByRole("navigation", { name: "Mobile main" })
        .getByRole("link", { name: /Bookmarks/ })
        .click();
      await waitCount(page, 1);
      await page.reload();
      await waitCount(page, 1);
      await page.locator(".bookmark-button").first().click();
      await waitCount(page, 0);
      assert.ok(
        await page
          .getByRole("heading", { name: "Keep the good signal." })
          .isVisible(),
      );
      await page
        .locator(".empty-state")
        .getByRole("button", { name: "Explore tweets" })
        .click();
      await waitCount(page, 8);
    });
    await test(`${name}: keyboard primary action and visible search focus`, async () => {
      await page.locator(".hero button").focus();
      await page.keyboard.press("Enter");
      assert.equal(
        await page
          .getByRole("searchbox")
          .evaluate((e) => e === document.activeElement),
        true,
      );
      await page.keyboard.type("finne");
      await waitCount(page, 1);
      const outline = await page.getByRole("searchbox").evaluate((e) => ({
        width: getComputedStyle(e).outlineWidth,
        style: getComputedStyle(e).outlineStyle,
      }));
      assert.equal(outline.width, "2px");
      assert.equal(outline.style, "solid");
      await page.getByRole("searchbox").fill("");
      await waitCount(page, 8);
    });
    await test(`${name}: about dialog, sources, focus trap and return`, async () => {
      const trigger = page
        .getByRole("navigation", { name: "Mobile main" })
        .getByRole("button", { name: "About", exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "About the feed" });
      assert.ok(await dialog.isVisible());
      await page.keyboard.press("Shift+Tab");
      assert.ok(
        await dialog.evaluate((d) => d.contains(document.activeElement)),
      );
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      report.accessibility.push({
        engine: name,
        state: "about dialog",
        violations: axe.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
      assert.equal(
        axe.violations.length,
        0,
        JSON.stringify(axe.violations.map((v) => v.id)),
      );
      await dialog.locator("summary").click();
      assert.equal(await dialog.locator(".source-list>li").count(), 8);
      await page.keyboard.press("Escape");
      assert.equal(await dialog.isVisible(), false);
      assert.ok(await trigger.evaluate((e) => e === document.activeElement));
    });
    await test(`${name}: dialog padding stays open and backdrop closes`, async () => {
      const trigger = page
        .getByRole("navigation", { name: "Mobile main" })
        .getByRole("button", { name: "About", exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "About the feed" });
      await dialog.click({ position: { x: 8, y: 8 } });
      assert.ok(await dialog.isVisible());
      await page.mouse.click(2, 2);
      await dialog.waitFor({ state: "hidden" });
      assert.ok(await trigger.evaluate((e) => e === document.activeElement));
    });
    if (name === "chromium") {
      await test(`${name}: native clipboard writes the original tweet link`, async () => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page
          .locator(".tweet-actions")
          .first()
          .getByRole("button", { name: /Share tweet/ })
          .click();
        const expected = await page.locator("#share-link").inputValue();
        await page
          .getByRole("button", { name: "Copy link", exact: true })
          .click();
        await page
          .getByRole("dialog", { name: "Share this tweet" })
          .waitFor({ state: "hidden" });
        assert.equal(
          await page.evaluate(() => navigator.clipboard.readText()),
          expected,
        );
        await page
          .getByRole("button", { name: "Dismiss notification" })
          .click();
        await context.clearPermissions();
      });
    }
    await test(`${name}: share dialog and clipboard fallback`, async () => {
      const trigger = page
        .locator(".tweet-actions")
        .first()
        .getByRole("button", { name: /Share tweet/ });
      await trigger.click();
      const dialog = page.getByRole("dialog", { name: "Share this tweet" });
      assert.ok(await dialog.isVisible());
      assert.match(
        await dialog.locator("#share-link").inputValue(),
        /^https:\/\/x\.com\/\w+\/status\/\d+$/,
      );
      assert.match(
        await dialog
          .getByRole("link", { name: "Share on X" })
          .getAttribute("href"),
        /^https:\/\/x.com\/intent\/tweet\?url=/,
      );
      await page.evaluate(() =>
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async () => {
              throw new Error("Clipboard unavailable");
            },
          },
        }),
      );
      await dialog.getByRole("button", { name: "Copy link" }).click();
      assert.ok(
        await dialog
          .getByText("Copy isn’t available in this browser.", { exact: false })
          .isVisible(),
      );
      await page.keyboard.press("Escape");
      assert.ok(await trigger.evaluate((e) => e === document.activeElement));
    });
    await test(`${name}: copy success UI`, async () => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text) => {
              window.__copied = text;
            },
          },
        });
      });
      await page
        .locator(".tweet-actions")
        .first()
        .getByRole("button", { name: /Share tweet/ })
        .click();
      const value = await page.locator("#share-link").inputValue();
      await page
        .getByRole("button", { name: "Copy link", exact: true })
        .click();
      assert.equal(await page.evaluate(() => window.__copied), value);
      assert.equal(
        await page
          .getByRole("dialog", { name: "Share this tweet" })
          .isVisible(),
        false,
      );
      assert.ok(
        await page.getByText("Tweet link copied.", { exact: true }).isVisible(),
      );
      await page.getByRole("button", { name: "Dismiss notification" }).click();
    });
    await test(`${name}: reduced motion`, async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page
          .locator(".hero button")
          .evaluate((e) => getComputedStyle(e).transitionDuration),
        "0s",
      );
      assert.equal(
        await page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((a) => a.effect.getTiming().iterations === Infinity)
              .length,
        ),
        0,
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
    });
    for (const width of [390, 1440]) {
      await test(`${name}: accessibility scan at ${width}px`, async () => {
        await page.setViewportSize({ width, height: 1000 });
        await page.evaluate(() => scrollTo(0, 0));
        const axe = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        report.accessibility.push({
          engine: name,
          state: `${width}px feed`,
          violations: axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
        });
        assert.equal(
          axe.violations.length,
          0,
          JSON.stringify(
            axe.violations.map((v) => ({
              id: v.id,
              nodes: v.nodes.map((n) => n.target),
            })),
          ),
        );
      });
    }
    await test(`${name}: 200% text enlargement and RTL reflow`, async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addStyleTag({ content: "html{font-size:200%}" });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({ path: resolve(out, `${name}-text-200.png`) });
      await page.reload();
      await page.evaluate(() => (document.documentElement.dir = "rtl"));
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({ path: resolve(out, `${name}-rtl.png`) });
    });
    await test(`${name}: unavailable local storage and corrupt stored data`, async () => {
      const c = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      await c.addInitScript(() =>
        Object.defineProperty(Storage.prototype, "setItem", {
          value: () => {
            throw new Error("Storage unavailable");
          },
        }),
      );
      const p = await c.newPage();
      await p.goto(url);
      await p.locator(".bookmark-button").first().click();
      assert.ok(
        await p
          .getByText(
            "Bookmarked for this visit. Browser storage is unavailable.",
            { exact: true },
          )
          .isVisible(),
      );
      await p
        .getByRole("navigation", { name: "Mobile main" })
        .getByRole("link", { name: /Bookmarks/ })
        .click();
      await waitCount(p, 1);
      assert.ok(
        await p
          .getByText(
            "Storage is unavailable. Bookmarks last for this visit only.",
            { exact: true },
          )
          .isVisible(),
      );
      await c.close();
      const broken = await browser.newContext();
      await broken.addInitScript(
        (key) => localStorage.setItem(key, "{bad json"),
        key,
      );
      const bp = await broken.newPage();
      await bp.goto(url);
      await waitCount(bp, 8);
      await broken.close();
    });
    assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
    assert.equal(
      report.externalRuntimeRequests.length,
      0,
      "Runtime must not require external resources",
    );
  } finally {
    await context.close();
    await browser.close();
  }
}
try {
  await run(chromium, "chromium");
  await run(webkit, "webkit");
} catch (error) {
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  await new Promise((r) => server.close(r));
  await writeFile(
    resolve(out, "results.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        passed: report.tests.length,
        limitations: report.limitations,
        accessibilityScans: report.accessibility,
        errors: report.errors,
        externalRuntimeRequests: report.externalRuntimeRequests,
        failure: report.failure,
      },
      null,
      2,
    ),
  );
}
