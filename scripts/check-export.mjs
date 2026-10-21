import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve("dist");
const html = await readFile(resolve(root, "index.html"), "utf8");
for (const requirement of [
  /<title>[^<]+<\/title>/,
  /name="description"/,
  /rel="icon"/,
  /property="og:title"/,
  /property="og:image"/,
])
  assert.match(html, requirement);
let checked = 0;
async function validateLink(link, from) {
  if (/^(https?:|data:|#)/.test(link)) return;
  assert.ok(!link.startsWith("/"), `Absolute runtime asset: ${link}`);
  const target = resolve(from, link.split(/[?#]/)[0]);
  assert.ok(target.startsWith(root + "/"), `Escaped export: ${link}`);
  assert.ok((await stat(target)).isFile(), `Missing asset: ${link}`);
  checked++;
}
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g))
  await validateLink(match[1], root);
const og = html.match(/property="og:image" content="([^"]+)"/);
assert.ok(og);
await validateLink(og[1], root);
for (const name of await readdir(resolve(root, "assets"))) {
  if (extname(name) === ".css") {
    const css = await readFile(resolve(root, "assets", name), "utf8");
    for (const match of css.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g))
      await validateLink(match[1], resolve(root, "assets"));
  }
}
const posts = JSON.parse(await readFile("src/posts.json", "utf8"));
assert.equal(new Set(posts.map((p) => p.id)).size, posts.length);
for (const p of posts) {
  assert.equal(p.url, `https://x.com/${p.handle}/status/${p.id}`);
  assert.ok(Number.isFinite(Date.parse(p.date)));
  assert.ok(p.excerpt.trim().length > 10);
  for (const key of ["likes", "reposts", "replies", "views"])
    assert.ok(Number.isInteger(p[key]) && p[key] >= 0);
  if (p.avatar) await validateLink(p.avatar, root);
}
const excluded = new Set([
  ".git",
  ".github",
  ".agents",
  ".aws",
  ".codex",
  ".imd",
  "node_modules",
]);
async function countFiles(dir, relative = "") {
  let bytes = 0,
    files = 0;
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (
      excluded.has(item.name) ||
      (relative === "test" && item.name === "scratch")
    )
      continue;
    assert.ok(
      !item.isSymbolicLink(),
      `Unexpected symlink: ${relative}/${item.name}`,
    );
    const next = resolve(dir, item.name);
    if (item.isDirectory()) {
      const sub = await countFiles(
        next,
        relative ? `${relative}/${item.name}` : item.name,
      );
      bytes += sub.bytes;
      files += sub.files;
    } else {
      bytes += (await stat(next)).size;
      files++;
    }
  }
  return { bytes, files };
}
const bundle = await countFiles(resolve("."));
assert.ok(bundle.bytes < 8388608, `Submission exceeds 8 MiB: ${bundle.bytes}`);
const output = {
  result: "PASS",
  localAssetsChecked: checked,
  sourcedTweets: posts.length,
  submissionFiles: bundle.files,
  submissionBytes: bundle.bytes,
  limitBytes: 8388608,
};
console.log(JSON.stringify(output, null, 2));
